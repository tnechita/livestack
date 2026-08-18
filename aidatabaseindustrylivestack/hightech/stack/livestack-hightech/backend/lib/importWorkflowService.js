const AdmZip = require('adm-zip');
const { parse: parseCsvSync } = require('csv-parse/sync');
const db = require('../config/database');
const {
  IMPORT_VERSION,
  TABLE_BY_NAME,
  INSERT_ORDER,
  DELETE_ORDER,
  REQUIRED_TABLE_NAMES,
  OPTIONAL_TABLE_NAMES,
  TABLES,
  buildManifest,
} = require('./importCatalog');
const {
  createJob,
  updateJob,
  getJob,
} = require('./importJobs');
const { getBundledDemoArchive } = require('./demoDatasetBundle');
const { getStoredDatasetState, saveDatasetState } = require('./datasetStateStore');
const {
  runDemoDateValidation,
  summarizeDemoDateValidation,
} = require('./demoDateValidation');
const {
  beginOperation,
  updateOperation,
  endOperation,
  getActiveOperation,
} = require('./datasetOperationLock');
const {
  getDatasetReadiness,
  saveActiveDatasetReadiness,
  markDatasetReadinessFailed,
} = require('./datasetReadinessStore');
const { recordDatasetEvent } = require('./usageCounterService');
const {
  ensureMlPersistenceSchema,
  refreshHighTechOmlModels,
  refreshPersistentMlData,
} = require('./mlPersistenceService');

let ollamaAssistant = null;
try {
  // Optional: only used to flush Ask Data schema/entity caches after import.
  ollamaAssistant = require('./ollamaAssistant');
} catch (_) {
  ollamaAssistant = null;
}

const MAX_ARCHIVE_SIZE_BYTES = 25 * 1024 * 1024;
const VECTOR_MODEL_NAME = 'ALL_MINILM_L12_V2';
const INSERT_SQL_CACHE = new Map();
const MS_PER_DAY = 24 * 60 * 60 * 1000;
let cachedBundledDemoDataset = null;

class ImportError extends Error {
  constructor(message, statusCode = 400, details = null) {
    super(message);
    this.name = 'ImportError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

function isTrueish(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function normalizeZipBaseName(name) {
  return String(name || '')
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .toLowerCase();
}

function normalizeSourceId(value) {
  return String(value == null ? '' : value).trim();
}

function roundTo(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function firstOutBind(value) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function csvCell(value) {
  if (value == null) return '';
  const text = String(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function utcDateOnly(year, month, day) {
  return new Date(Date.UTC(year, month, day));
}

function startOfUtcDay(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  return utcDateOnly(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function parseDemoAnchorDate(rawValue, label = 'DEMO_ANCHOR_DATE') {
  if (rawValue == null || rawValue === '') return null;

  if (rawValue instanceof Date) {
    const anchor = startOfUtcDay(rawValue);
    if (anchor) return anchor;
  }

  const text = String(rawValue).trim();
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const parsed = utcDateOnly(year, month - 1, day);
    if (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    ) {
      return parsed;
    }
    throw new ImportError(`${label} must be a valid date or timestamp.`, 400);
  }

  const parsed = new Date(text);
  const anchor = startOfUtcDay(parsed);
  if (!anchor) {
    throw new ImportError(`${label} must be a valid date or timestamp.`, 400);
  }
  return anchor;
}

function dateToIsoDate(value) {
  const anchor = startOfUtcDay(value);
  return anchor ? anchor.toISOString().slice(0, 10) : null;
}

function cloneImportDataset(dataset) {
  const tables = {};
  for (const [tableName, tableData] of Object.entries(dataset.tables || {})) {
    tables[tableName] = {
      ...tableData,
      rows: (tableData.rows || []).map((row) => {
        const cloned = {};
        for (const [key, value] of Object.entries(row)) {
          cloned[key] = value instanceof Date ? new Date(value.getTime()) : value;
        }
        return cloned;
      }),
    };
  }

  return {
    ...dataset,
    tables,
  };
}

function getDateColumnEntries() {
  return TABLES.flatMap((table) => (
    table.columns
      .filter((column) => column.type === 'date' || column.type === 'timestamp')
      .map((column) => ({
        tableName: table.name,
        columnName: column.name,
        type: column.type,
      }))
  ));
}

function valuesForDateColumn(dataset, tableName, columnName) {
  return (dataset.tables?.[tableName]?.rows || [])
    .map((row) => row[columnName])
    .filter((value) => value instanceof Date && !Number.isNaN(value.getTime()));
}

function minDate(values) {
  if (!values.length) return null;
  return values.reduce((min, value) => (value < min ? value : min), values[0]);
}

function findDemoSeedAnchor(dataset) {
  const forecastStart = minDate(valuesForDateColumn(dataset, 'demand_forecasts', 'forecast_date'));
  if (forecastStart) {
    return {
      seedAnchor: startOfUtcDay(forecastStart),
      anchorStrategy: 'forecast_start_to_anchor_date',
    };
  }

  for (const { tableName, columnName } of getDateColumnEntries()) {
    const candidate = minDate(valuesForDateColumn(dataset, tableName, columnName));
    if (candidate) {
      return {
        seedAnchor: startOfUtcDay(candidate),
        anchorStrategy: `${tableName}.${columnName}_to_anchor_date`,
      };
    }
  }

  return {
    seedAnchor: null,
    anchorStrategy: 'no_seed_dates_found',
  };
}

function shiftDatasetDates(dataset, offsetMs) {
  const shiftedColumns = {};
  let shiftedTableCount = 0;
  let shiftedColumnCount = 0;
  let shiftedValueCount = 0;

  for (const { tableName, columnName } of getDateColumnEntries()) {
    const tableData = dataset.tables?.[tableName];
    if (!tableData?.provided) continue;

    let columnShiftCount = 0;
    for (const row of tableData.rows || []) {
      const value = row[columnName];
      if (!(value instanceof Date) || Number.isNaN(value.getTime())) continue;
      row[columnName] = new Date(value.getTime() + offsetMs);
      columnShiftCount += 1;
    }

    if (columnShiftCount > 0) {
      if (!shiftedColumns[tableName]) {
        shiftedColumns[tableName] = {};
        shiftedTableCount += 1;
      }
      shiftedColumns[tableName][columnName] = columnShiftCount;
      shiftedColumnCount += 1;
      shiftedValueCount += columnShiftCount;
    }
  }

  return {
    shiftedColumns,
    shiftedTableCount,
    shiftedColumnCount,
    shiftedValueCount,
  };
}

function reanchorDemoDates(dataset, { targetAnchor, anchorSource = 'database' } = {}) {
  const restoreAnchor = startOfUtcDay(targetAnchor);
  if (!restoreAnchor) {
    throw new ImportError('Demo date refresh requires a valid restore anchor date.', 400);
  }

  const clonedDataset = cloneImportDataset(dataset);
  const { seedAnchor, anchorStrategy } = findDemoSeedAnchor(clonedDataset);
  if (!seedAnchor) {
    return {
      dataset: clonedDataset,
      metadata: {
        enabled: true,
        anchorSource,
        anchorStrategy,
        originalSeedAnchor: null,
        restoreAnchor,
        offsetDays: 0,
        offsetSeconds: 0,
        shiftedTableCount: 0,
        shiftedColumnCount: 0,
        shiftedValueCount: 0,
        shiftedColumns: {},
      },
    };
  }

  const offsetMs = restoreAnchor.getTime() - seedAnchor.getTime();
  const shiftSummary = shiftDatasetDates(clonedDataset, offsetMs);

  return {
    dataset: clonedDataset,
    metadata: {
      enabled: true,
      anchorSource,
      anchorStrategy,
      originalSeedAnchor: seedAnchor,
      restoreAnchor,
      offsetDays: offsetMs / MS_PER_DAY,
      offsetSeconds: offsetMs / 1000,
      ...shiftSummary,
    },
  };
}

function formatDemoDateRefresh(metadata) {
  if (!metadata) return null;
  return {
    enabled: Boolean(metadata.enabled),
    anchorSource: metadata.anchorSource,
    anchorStrategy: metadata.anchorStrategy,
    originalSeedAnchor: metadata.originalSeedAnchor instanceof Date
      ? metadata.originalSeedAnchor.toISOString()
      : null,
    restoreAnchor: metadata.restoreAnchor instanceof Date
      ? metadata.restoreAnchor.toISOString()
      : null,
    originalSeedAnchorDate: dateToIsoDate(metadata.originalSeedAnchor),
    restoreAnchorDate: dateToIsoDate(metadata.restoreAnchor),
    offsetDays: metadata.offsetDays,
    offsetSeconds: metadata.offsetSeconds,
    shiftedTableCount: metadata.shiftedTableCount,
    shiftedColumnCount: metadata.shiftedColumnCount,
    shiftedValueCount: metadata.shiftedValueCount,
    shiftedColumns: metadata.shiftedColumns || {},
  };
}

function buildDemoFreshnessGuard(dateRefresh, dateValidation) {
  const shiftedValueCount = Number(dateRefresh?.shiftedValueCount || 0);
  const validationPassed = dateValidation?.passed === true && Number(dateValidation?.failedCount || 0) === 0;
  const fresh = Boolean(
    dateRefresh?.enabled &&
    dateRefresh?.restoreAnchorDate &&
    shiftedValueCount > 0 &&
    validationPassed
  );

  return {
    fresh,
    staleDataRejected: true,
    checkedAt: new Date().toISOString(),
    restoreAnchorDate: dateRefresh?.restoreAnchorDate || null,
    originalSeedAnchorDate: dateRefresh?.originalSeedAnchorDate || null,
    anchorStrategy: dateRefresh?.anchorStrategy || null,
    anchorSource: dateRefresh?.anchorSource || null,
    offsetDays: dateRefresh?.offsetDays ?? null,
    shiftedValueCount,
    validation: {
      passed: Boolean(dateValidation?.passed),
      checkCount: Number(dateValidation?.checkCount || 0),
      passedCount: Number(dateValidation?.passedCount || 0),
      failedCount: Number(dateValidation?.failedCount || 0),
      skippedCount: Number(dateValidation?.skippedCount || 0),
    },
  };
}

function getConfiguredDemoAnchorRaw({ body = {}, query = {}, headers = {} } = {}) {
  return process.env.DEMO_ANCHOR_DATE ||
    body.demoAnchorDate ||
    body.demo_anchor_date ||
    query.demoAnchorDate ||
    query.demo_anchor_date ||
    headers['x-demo-anchor-date'] ||
    headers['X-Demo-Anchor-Date'] ||
    null;
}

function buildDemoDateRefreshOptions({ body = {}, query = {}, headers = {} } = {}) {
  const rawAnchor = getConfiguredDemoAnchorRaw({ body, query, headers });
  return {
    enabled: true,
    configuredAnchorRaw: rawAnchor ? String(rawAnchor).trim() : null,
    configuredAnchorDate: rawAnchor
      ? parseDemoAnchorDate(rawAnchor, 'DEMO_ANCHOR_DATE')
      : startOfUtcDay(new Date()),
  };
}

function buildTemplateReadme() {
  return [
    '# Seer Tech Product Intelligence Import Template',
    '',
    `Version: ${IMPORT_VERSION}`,
    '',
    'Usage',
    '1. Fill the per-table CSV files in this ZIP.',
    '2. Keep manifest.json in the archive.',
    '3. Validate the completed ZIP before running the destructive import.',
    '',
    'Notes',
    '- CSV ID columns are source reference keys. Oracle identity values are regenerated during import.',
    '- High-tech domain mapping: brands are technology portfolios, products are high-tech products, fulfillment_centers are product availability centers, customers are enterprise buyers, influencers are developer advocates, social_posts are enterprise buyer and developer signals, orders are solution orders, inventory is product capacity, and shipments are fulfillment or allocation routes.',
    '- app_users are preserved and should not be included in the ZIP.',
    '- Derived columns such as customers.location, fulfillment_centers.location, order_items.line_total, fulfillment_zones, product embeddings, presenter-facing signal embeddings, and semantic matches are rebuilt by the importer and therefore are not included as editable CSV inputs.',
    '- inventory.csv is required.',
    '- shipments.csv, demand_regions.csv, demand_forecasts.csv, influencer_connections.csv, and brand_influencer_links.csv are optional compatibility inputs.',
    '- When optional files are omitted, the importer regenerates fallback data.',
    '- Dedicated Seer Tech graph tables and high-tech semantic views are restored by bootstrap/demo hydration rather than by user-supplied CSVs.',
    '- demand_regions.boundary expects WKT polygon text, for example: POLYGON((-122.6 37.2, -121.7 37.2, -121.7 38.0, -122.6 38.0, -122.6 37.2))',
    '- Timestamps should use ISO 8601 values. Dates should use YYYY-MM-DD.',
    '',
  ].join('\n');
}

function buildDatasetState(source, version = IMPORT_VERSION) {
  const normalized = String(source || 'custom').toLowerCase() === 'demo' ? 'demo' : 'custom';
  return {
    source: normalized,
    label: normalized === 'demo' ? 'Demo Data' : 'Custom Dataset',
    version,
  };
}

async function acquireOperationLock(kind, message, metadata = {}) {
  const acquired = await beginOperation({
    kind,
    message,
    progress: 0,
    status: 'running',
    ...metadata,
  });

  if (acquired) {
    return acquired;
  }

  const activeOperation = await getActiveOperation();
  throw new ImportError(
    `Another dataset operation is already in progress${activeOperation?.kind ? ` (${activeOperation.kind}).` : '.'}`,
    409,
    { activeOperation }
  );
}

function getArchiveBufferFromRequest({ req, body }) {
  if (req?.file?.buffer) {
    if (req.file.size > MAX_ARCHIVE_SIZE_BYTES) {
      throw new ImportError(`ZIP file exceeds ${Math.round(MAX_ARCHIVE_SIZE_BYTES / (1024 * 1024))} MB limit.`);
    }
    return {
      buffer: req.file.buffer,
      fileName: req.file.originalname || 'dataset.zip',
    };
  }

  if (body?.archiveBase64) {
    const buffer = Buffer.from(String(body.archiveBase64), 'base64');
    return {
      buffer,
      fileName: body.fileName || 'dataset.zip',
    };
  }

  throw new ImportError('Upload a ZIP file using multipart/form-data with field name "file".');
}

function loadArchive(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ImportError('Uploaded file is empty or missing.');
  }

  try {
    return new AdmZip(buffer);
  } catch (err) {
    throw new ImportError('Uploaded file is not a valid ZIP archive.', 400, err.message);
  }
}

function listArchiveFiles(zip) {
  const files = new Map();
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const baseName = normalizeZipBaseName(entry.entryName);
    if (!baseName) continue;
    if (files.has(baseName)) {
      throw new ImportError(`ZIP contains duplicate file names for "${baseName}". Keep only one copy of each CSV.`);
    }
    files.set(baseName, entry);
  }
  return files;
}

function parseManifest(files, version) {
  const manifestEntry = files.get('manifest.json');
  if (!manifestEntry) {
    throw new ImportError('ZIP is missing manifest.json.');
  }

  let manifest;
  try {
    manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
  } catch (err) {
    throw new ImportError('manifest.json is not valid JSON.', 400, err.message);
  }

  const manifestVersion = String(manifest.version || '').trim();
  if (manifestVersion && manifestVersion !== version) {
    throw new ImportError(`manifest.json declares version "${manifestVersion}" but "${version}" was requested.`);
  }

  return manifest;
}

function isRowEmpty(record) {
  return record.every((value) => String(value ?? '').trim() === '');
}

function normalizeIsoDate(rawValue, type, tableName, columnName, lineNumber, errors) {
  const text = String(rawValue || '').trim();
  if (!text) return null;

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    errors.push(`${tableName}.csv line ${lineNumber}: "${columnName}" must be a valid ${type}.`);
    return null;
  }

  return parsed;
}

function normalizeGeometryText(rawValue, tableName, lineNumber, columnName, errors) {
  const text = String(rawValue || '').trim();
  if (!text) return null;

  if (/^(polygon|multipolygon)\s*\(/i.test(text)) {
    return text;
  }

  if (/^sdo_geometry\s*\(/i.test(text)) {
    const ordMatch = text.match(/SDO_ORDINATE_ARRAY\s*\(([^)]+)\)/i);
    if (!ordMatch) {
      errors.push(`${tableName}.csv line ${lineNumber}: "${columnName}" SDO_GEOMETRY value does not contain SDO_ORDINATE_ARRAY(...).`);
      return null;
    }

    const ordinates = ordMatch[1]
      .split(',')
      .map((part) => Number(String(part).trim()))
      .filter((value) => Number.isFinite(value));

    if (ordinates.length < 6 || ordinates.length % 2 !== 0) {
      errors.push(`${tableName}.csv line ${lineNumber}: "${columnName}" must contain an even number of ordinates.`);
      return null;
    }

    const pairs = [];
    for (let index = 0; index < ordinates.length; index += 2) {
      pairs.push(`${ordinates[index]} ${ordinates[index + 1]}`);
    }
    return `POLYGON((${pairs.join(', ')}))`;
  }

  errors.push(`${tableName}.csv line ${lineNumber}: "${columnName}" must be WKT polygon text or an SDO_GEOMETRY polygon literal.`);
  return null;
}

function parseSourceIdList(rawValue) {
  const text = String(rawValue || '').trim();
  if (!text) return null;
  return text
    .split(',')
    .map((part) => normalizeSourceId(part))
    .filter(Boolean);
}

function normalizeEnumValue(rawValue, values) {
  const text = String(rawValue || '').trim();
  if (!text) return null;
  const normalized = text.toLowerCase();
  const match = values.find((value) => String(value).toLowerCase() === normalized);
  return match || null;
}

function normalizeFlagValue(rawValue) {
  const text = String(rawValue || '').trim().toLowerCase();
  if (!text) return null;
  if (['1', 'true', 'yes', 'y'].includes(text)) return 1;
  if (['0', 'false', 'no', 'n'].includes(text)) return 0;
  return Number.isInteger(Number(text)) ? Number(text) : null;
}

function parseColumnValue(table, column, rawValue, lineNumber, errors) {
  const text = String(rawValue ?? '');
  const trimmed = text.trim();

  if (!trimmed) {
    if (column.required) {
      errors.push(`${table.name}.csv line ${lineNumber}: "${column.name}" is required.`);
    }
    return null;
  }

  switch (column.type) {
    case 'id':
      return trimmed;
    case 'string':
      return trimmed;
    case 'number': {
      const value = Number(trimmed);
      if (!Number.isFinite(value)) {
        errors.push(`${table.name}.csv line ${lineNumber}: "${column.name}" must be numeric.`);
        return null;
      }
      return value;
    }
    case 'integer': {
      const value = Number(trimmed);
      if (!Number.isInteger(value)) {
        errors.push(`${table.name}.csv line ${lineNumber}: "${column.name}" must be an integer.`);
        return null;
      }
      return value;
    }
    case 'flag': {
      const value = normalizeFlagValue(trimmed);
      if (value == null || ![0, 1].includes(value)) {
        errors.push(`${table.name}.csv line ${lineNumber}: "${column.name}" must be 0/1, true/false, or yes/no.`);
        return null;
      }
      return value;
    }
    case 'enum': {
      const value = normalizeEnumValue(trimmed, column.values || []);
      if (!value) {
        errors.push(`${table.name}.csv line ${lineNumber}: "${column.name}" must be one of ${column.values.join(', ')}.`);
        return null;
      }
      return value;
    }
    case 'date':
      return normalizeIsoDate(trimmed, 'date', table.name, column.name, lineNumber, errors);
    case 'timestamp':
      return normalizeIsoDate(trimmed, 'timestamp', table.name, column.name, lineNumber, errors);
    case 'geometry_wkt':
      return normalizeGeometryText(trimmed, table.name, lineNumber, column.name, errors);
    case 'source_id_list':
      return parseSourceIdList(trimmed);
    default:
      return trimmed;
  }
}

function parseCsvTable(table, csvText, errors) {
  let records;
  try {
    records = parseCsvSync(csvText, {
      bom: true,
      relax_quotes: true,
      skip_empty_lines: true,
    });
  } catch (err) {
    errors.push(`${table.name}.csv could not be parsed as CSV: ${err.message}`);
    return { header: [], rows: [], sourceIds: new Set() };
  }

  if (!records.length) {
    errors.push(`${table.name}.csv is empty.`);
    return { header: [], rows: [], sourceIds: new Set() };
  }

  const expectedHeader = table.columns.map((column) => column.name);
  const actualHeader = records[0].map((value) => String(value ?? '').trim());

  if (actualHeader.length !== expectedHeader.length || actualHeader.some((value, index) => value !== expectedHeader[index])) {
    errors.push(
      `${table.name}.csv header mismatch. Expected "${expectedHeader.join(',')}" but received "${actualHeader.join(',')}".`
    );
    return { header: actualHeader, rows: [], sourceIds: new Set() };
  }

  const rows = [];
  const sourceIds = new Set();

  for (let rowIndex = 1; rowIndex < records.length; rowIndex += 1) {
    const record = records[rowIndex];
    const lineNumber = rowIndex + 1;

    if (isRowEmpty(record)) continue;
    if (record.length !== expectedHeader.length) {
      errors.push(`${table.name}.csv line ${lineNumber}: expected ${expectedHeader.length} columns but received ${record.length}.`);
      continue;
    }

    const row = { __lineNumber: lineNumber };
    for (let columnIndex = 0; columnIndex < table.columns.length; columnIndex += 1) {
      const column = table.columns[columnIndex];
      row[column.name] = parseColumnValue(table, column, record[columnIndex], lineNumber, errors);
    }

    row.__sourceId = normalizeSourceId(row[table.pk]);

    if (sourceIds.has(row.__sourceId)) {
      errors.push(`${table.name}.csv line ${lineNumber}: duplicate source ID "${row.__sourceId}".`);
    } else {
      sourceIds.add(row.__sourceId);
    }

    rows.push(row);
  }

  return { header: actualHeader, rows, sourceIds };
}

function validateUniqueKeys(table, tableData, errors) {
  for (const keyColumns of table.uniqueKeys || []) {
    const seen = new Map();

    for (const row of tableData.rows) {
      const values = keyColumns.map((columnName) => row[columnName]);
      if (values.some((value) => value == null || value === '')) continue;

      const key = values.map((value) => Array.isArray(value) ? value.join('|') : String(value)).join('::');
      const previous = seen.get(key);
      if (previous) {
        errors.push(
          `${table.name}.csv lines ${previous} and ${row.__lineNumber}: duplicate unique key on (${keyColumns.join(', ')}).`
        );
      } else {
        seen.set(key, row.__lineNumber);
      }
    }
  }
}

function validateCrossTableReferences(dataset, errors, warnings) {
  const sourceIdsByTable = Object.fromEntries(
    Object.entries(dataset.tables).map(([tableName, tableData]) => [tableName, tableData.sourceIds])
  );

  for (const table of TABLES) {
    const tableData = dataset.tables[table.name];
    if (!tableData?.provided) continue;

    validateUniqueKeys(table, tableData, errors);

    for (const fk of table.foreignKeys || []) {
      const refSourceIds = sourceIdsByTable[fk.refTable] || new Set();
      for (const row of tableData.rows) {
        const value = row[fk.column];
        if (value == null || value === '') {
          if (!fk.allowNull) {
            errors.push(`${table.name}.csv line ${row.__lineNumber}: "${fk.column}" is required.`);
          }
          continue;
        }

        if (!refSourceIds.has(normalizeSourceId(value))) {
          errors.push(
            `${table.name}.csv line ${row.__lineNumber}: "${fk.column}" references missing ${fk.refTable}.${TABLE_BY_NAME[fk.refTable].pk} value "${value}".`
          );
        }
      }
    }

    for (const column of table.columns) {
      if (column.type !== 'source_id_list' || !column.refTable) continue;
      const refSourceIds = sourceIdsByTable[column.refTable] || new Set();
      for (const row of tableData.rows) {
        const values = row[column.name];
        if (!Array.isArray(values)) continue;
        for (const value of values) {
          if (!refSourceIds.has(normalizeSourceId(value))) {
            errors.push(
              `${table.name}.csv line ${row.__lineNumber}: "${column.name}" references missing ${column.refTable}.${TABLE_BY_NAME[column.refTable].pk} value "${value}".`
            );
          }
        }
      }
    }
  }

  const demandRegions = dataset.tables.demand_regions;
  const demandForecasts = dataset.tables.demand_forecasts;
  if (demandForecasts?.provided) {
    if (demandRegions?.provided) {
      const regionNames = new Set(
        demandRegions.rows.map((row) => String(row.region_name || '').trim().toLowerCase()).filter(Boolean)
      );
      for (const row of demandForecasts.rows) {
        const regionName = String(row.region || '').trim();
        if (regionName && !regionNames.has(regionName.toLowerCase())) {
          errors.push(
            `demand_forecasts.csv line ${row.__lineNumber}: region "${regionName}" does not exist in demand_regions.csv.`
          );
        }
      }
    } else {
      warnings.push('demand_forecasts.csv was provided without demand_regions.csv. Region names were not cross-checked.');
    }
  }
}

function parseArchiveDataset(buffer, version) {
  const zip = loadArchive(buffer);
  const files = listArchiveFiles(zip);
  const manifest = parseManifest(files, version);
  const errors = [];
  const warnings = [];
  const tables = {};
  const counts = {};

  for (const requiredTable of REQUIRED_TABLE_NAMES) {
    if (!files.has(`${requiredTable}.csv`)) {
      errors.push(`ZIP is missing required file "${requiredTable}.csv".`);
    }
  }

  for (const optionalTable of OPTIONAL_TABLE_NAMES) {
    if (!files.has(`${optionalTable}.csv`)) {
      warnings.push(`Optional file "${optionalTable}.csv" is missing. The importer will regenerate fallback data.`);
    }
  }

  for (const table of TABLES) {
    const entry = files.get(`${table.name}.csv`);
    if (!entry) {
      tables[table.name] = {
        table,
        provided: false,
        rows: [],
        sourceIds: new Set(),
      };
      counts[table.name] = 0;
      continue;
    }

    const csvText = entry.getData().toString('utf8');
    const parsed = parseCsvTable(table, csvText, errors);
    tables[table.name] = {
      table,
      provided: true,
      rows: parsed.rows,
      sourceIds: parsed.sourceIds,
      header: parsed.header,
      entryName: entry.entryName,
    };
    counts[table.name] = parsed.rows.length;
  }

  const dataset = {
    version: String(manifest.version || version || IMPORT_VERSION),
    manifest,
    tables,
    counts,
  };

  validateCrossTableReferences(dataset, errors, warnings);

  return {
    valid: errors.length === 0,
    message: errors.length
      ? `Validation failed with ${errors.length} issue(s).`
      : `Archive parsed successfully with ${Object.values(tables).filter((tableData) => tableData.provided).length} CSV file(s).`,
    errors,
    warnings,
    counts,
    dataset: errors.length === 0 ? dataset : null,
  };
}

function getBundledDemoDataset(version = IMPORT_VERSION) {
  if (version !== IMPORT_VERSION) {
    throw new ImportError(`Unsupported import template version "${version}".`, 400);
  }

  if (!cachedBundledDemoDataset) {
    const archive = getBundledDemoArchive();
    const parsed = parseArchiveDataset(archive.buffer, version);
    if (!parsed.valid) {
      throw new ImportError('Bundled demo dataset is invalid.', 500, {
        errors: parsed.errors,
        warnings: parsed.warnings,
        counts: parsed.counts,
      });
    }
    cachedBundledDemoDataset = { archive, parsed };
  }

  return cachedBundledDemoDataset;
}

async function execSql(connection, sql, binds = {}, options = {}) {
  return connection.execute(sql, binds, {
    autoCommit: false,
    ...options,
  });
}

function getInsertStatement(table) {
  if (INSERT_SQL_CACHE.has(table.name)) {
    return INSERT_SQL_CACHE.get(table.name);
  }

  const dataColumns = table.columns.filter((column) => !column.sourceId);
  const columnList = dataColumns.map((column) => column.name).join(', ');
  const valueList = dataColumns.map((column) => {
    if (table.name === 'demand_regions' && column.name === 'boundary') {
      return 'SDO_UTIL.FROM_WKTGEOMETRY(:boundary)';
    }
    return `:${column.name}`;
  }).join(', ');

  const sql = [
    `INSERT INTO ${table.name} (${columnList})`,
    `VALUES (${valueList})`,
    `RETURNING ${table.pk} INTO :generatedId`,
  ].join(' ');

  INSERT_SQL_CACHE.set(table.name, sql);
  return sql;
}

function resolveMappedValue(value, refTable, idMaps, tableName, columnName, lineNumber) {
  if (value == null || value === '') return null;
  const refMap = idMaps[refTable];
  const actualId = refMap?.get(normalizeSourceId(value));
  if (actualId == null) {
    throw new ImportError(
      `${tableName}.csv line ${lineNumber}: "${columnName}" could not be mapped to imported ${refTable} row "${value}".`
    );
  }
  return actualId;
}

function resolveInsertValue(table, column, row, idMaps) {
  const value = row[column.name];
  if (value == null) return null;

  const fk = (table.foreignKeys || []).find((item) => item.column === column.name);
  if (fk) {
    return resolveMappedValue(value, fk.refTable, idMaps, table.name, column.name, row.__lineNumber);
  }

  if (column.type === 'source_id_list') {
    const refMap = idMaps[column.refTable];
    return value
      .map((item) => {
        const actualId = refMap?.get(normalizeSourceId(item));
        if (actualId == null) {
          throw new ImportError(
            `${table.name}.csv line ${row.__lineNumber}: "${column.name}" could not map source ID "${item}" to ${column.refTable}.`
          );
        }
        return actualId;
      })
      .join(',');
  }

  return value;
}

async function insertImportedRow(connection, table, row, idMaps) {
  const binds = {};
  for (const column of table.columns) {
    if (column.sourceId) continue;
    binds[column.name] = resolveInsertValue(table, column, row, idMaps);
  }
  binds.generatedId = { dir: db.oracledb.BIND_OUT, type: db.oracledb.NUMBER };

  const result = await execSql(connection, getInsertStatement(table), binds);
  return firstOutBind(result.outBinds.generatedId);
}

function buildSourceRowMap(rows, keyName) {
  return new Map(rows.map((row) => [normalizeSourceId(row[keyName]), row]));
}

function pickOrderTimestamp(row) {
  return row.created_at || row.updated_at || new Date();
}

function hashString(input) {
  let hash = 0;
  const text = String(input || '');
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const inputs = [lat1, lon1, lat2, lon2].map(Number);
  if (inputs.some((value) => !Number.isFinite(value))) return null;
  const [aLat, aLon, bLat, bLon] = inputs;
  const toRad = (degrees) => degrees * Math.PI / 180;
  const earthKm = 6371;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const base =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * earthKm * Math.atan2(Math.sqrt(base), Math.sqrt(1 - base));
}

async function deleteExistingImportData(connection) {
  for (const tableName of DELETE_ORDER) {
    await execSql(connection, `DELETE FROM ${tableName}`);
  }
}

async function insertProvidedTables(connection, dataset, progress) {
  const idMaps = {};
  const insertedCounts = {};
  const activeTables = INSERT_ORDER.filter((tableName) => dataset.tables[tableName]?.provided);

  for (let tableIndex = 0; tableIndex < activeTables.length; tableIndex += 1) {
    const tableName = activeTables[tableIndex];
    const table = TABLE_BY_NAME[tableName];
    const tableData = dataset.tables[tableName];
    const idMap = new Map();
    idMaps[tableName] = idMap;

    if (progress) {
      await progress({
        status: 'running',
        progress: 20 + Math.round((tableIndex / Math.max(activeTables.length, 1)) * 35),
        message: `Importing ${tableName}.csv...`,
      });
    }

    for (const row of tableData.rows) {
      const generatedId = await insertImportedRow(connection, table, row, idMaps);
      idMap.set(row.__sourceId, generatedId);
    }

    insertedCounts[tableName] = tableData.rows.length;
  }

  return { idMaps, insertedCounts };
}

async function rebuildSpatialLocations(connection) {
  await execSql(connection, `
    UPDATE fulfillment_centers
    SET location = SDO_GEOMETRY(2001, 4326, SDO_POINT_TYPE(longitude, latitude, NULL), NULL, NULL)
    WHERE latitude IS NOT NULL
      AND longitude IS NOT NULL
  `);

  await execSql(connection, `
    UPDATE customers
    SET location = SDO_GEOMETRY(2001, 4326, SDO_POINT_TYPE(longitude, latitude, NULL), NULL, NULL)
    WHERE latitude IS NOT NULL
      AND longitude IS NOT NULL
  `);
}

async function rebuildFulfillmentZones(connection) {
  await execSql(connection, 'DELETE FROM fulfillment_zones');

  const tiers = [
    { zoneType: 'express', maxHrs: 8, meters: 80000 },
    { zoneType: 'overnight', maxHrs: 16, meters: 160000 },
    { zoneType: 'standard', maxHrs: 24, meters: 250000 },
    { zoneType: 'economy', maxHrs: 72, meters: 500000 },
  ];

  let inserted = 0;
  for (const tier of tiers) {
    const result = await execSql(connection, `
      INSERT INTO fulfillment_zones (center_id, zone_type, max_delivery_hrs, zone_boundary)
      SELECT center_id, :zoneType, :maxHrs,
             SDO_GEOM.SDO_BUFFER(location, :meters, 1, 'unit=METER')
      FROM fulfillment_centers
      WHERE is_active = 1
        AND location IS NOT NULL
    `, tier);
    inserted += result.rowsAffected || 0;
  }

  return inserted;
}

async function rehydrateNativeJsonDocuments(connection, { correlationId = null } = {}) {
  const productAttributes = await execSql(connection, `
    INSERT INTO product_attributes (product_id, attributes)
    SELECT p.product_id,
           JSON_OBJECT(
             'sku' VALUE p.sku,
             'productName' VALUE p.product_name,
             'category' VALUE p.category,
             'subcategory' VALUE p.subcategory,
             'commercial' VALUE JSON_OBJECT(
               'unitPrice' VALUE p.unit_price,
               'unitCost' VALUE p.unit_cost
               RETURNING JSON
             ),
             'lifecycle' VALUE JSON_OBJECT(
               'active' VALUE p.is_active,
               'launchDate' VALUE TO_CHAR(p.launch_date, 'YYYY-MM-DD')
               RETURNING JSON
             ),
             'tags' VALUE p.tags
             RETURNING JSON
           )
    FROM products p
  `);

  const eventStream = await execSql(connection, `
    INSERT INTO event_stream (
      event_type, event_source, event_data, correlation_id, processed
    )
    SELECT 'product_catalog_restored',
           'dataset_restore',
           JSON_OBJECT(
             'productId' VALUE p.product_id,
             'sku' VALUE p.sku,
             'category' VALUE p.category,
             'active' VALUE p.is_active,
             'restoredAt' VALUE TO_CHAR(
               SYSTIMESTAMP AT TIME ZONE 'UTC',
               'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'
             )
             RETURNING JSON
           ),
           :correlationId,
           0
    FROM products p
  `, { correlationId });

  return {
    product_attributes: Number(productAttributes.rowsAffected || 0),
    event_stream: Number(eventStream.rowsAffected || 0),
  };
}

async function validateNativeJsonReadiness(connection) {
  const metadata = await execSql(connection, `
    SELECT COUNT(*) AS native_column_count
    FROM user_tab_columns
    WHERE data_type = 'JSON'
      AND (
        (table_name = 'PRODUCT_ATTRIBUTES' AND column_name = 'ATTRIBUTES')
        OR (table_name = 'EVENT_STREAM' AND column_name = 'EVENT_DATA')
      )
  `);
  const operators = await execSql(connection, `
    SELECT
      (SELECT COUNT(*) FROM product_attributes) AS attribute_count,
      (SELECT COUNT(*) FROM event_stream) AS event_count,
      (SELECT COUNT(*)
       FROM product_attributes pa
       WHERE JSON_VALUE(pa.attributes, '$.sku' RETURNING VARCHAR2(50)) IS NOT NULL
         AND JSON_QUERY(pa.attributes, '$.commercial' RETURNING VARCHAR2(4000)) IS NOT NULL
         AND JSON_SERIALIZE(pa.attributes RETURNING VARCHAR2(4000)) IS NOT NULL
      ) AS operator_count,
      (SELECT COUNT(*) FROM products) AS product_count
    FROM dual
  `);
  const row = operators.rows?.[0] || {};
  const readiness = {
    metadataSource: 'USER_TAB_COLUMNS',
    dataType: 'JSON',
    nativeColumnCount: Number(metadata.rows?.[0]?.NATIVE_COLUMN_COUNT || 0),
    productAttributes: Number(row.ATTRIBUTE_COUNT || 0),
    eventStream: Number(row.EVENT_COUNT || 0),
    operatorValidated: Number(row.OPERATOR_COUNT || 0),
    products: Number(row.PRODUCT_COUNT || 0),
    operators: ['JSON_VALUE', 'JSON_QUERY', 'JSON_SERIALIZE'],
  };
  readiness.ready = readiness.nativeColumnCount === 2
    && readiness.products > 0
    && readiness.productAttributes === readiness.products
    && readiness.eventStream > 0
    && readiness.operatorValidated === readiness.productAttributes;
  return readiness;
}

async function assertRequiredFeatureReadiness(connection, summary = {}) {
  const nativeJson = await validateNativeJsonReadiness(connection);

  const vectorResult = await execSql(connection, `
    SELECT
      (SELECT COUNT(*)
       FROM user_mining_models
       WHERE model_name = 'ALL_MINILM_L12_V2'
         AND mining_function = 'EMBEDDING'
         AND algorithm = 'ONNX') AS model_count,
      (SELECT COUNT(*)
       FROM user_tab_columns
       WHERE data_type = 'VECTOR'
         AND REGEXP_REPLACE(UPPER(vector_info), '[[:space:]]', '') = 'VECTOR(384,FLOAT32,DENSE)'
         AND (
           (table_name = 'PRODUCT_EMBEDDINGS' AND column_name = 'EMBEDDING')
           OR (table_name = 'POST_EMBEDDINGS' AND column_name = 'EMBEDDING')
         )) AS vector_column_count,
      (SELECT COUNT(*)
       FROM user_indexes
       WHERE index_name IN ('IDX_PRODUCT_VEC', 'IDX_POST_VEC')
         AND index_type = 'VECTOR'
         AND status = 'VALID') AS vector_index_count,
      (SELECT COUNT(*) FROM products) AS product_count,
      (SELECT COUNT(*) FROM product_embeddings) AS product_embedding_count,
      (SELECT COUNT(*)
       FROM product_embeddings
       WHERE VECTOR_DIMENSION_COUNT(embedding) = 384
         AND UPPER(VECTOR_DIMENSION_FORMAT(embedding)) = 'FLOAT32') AS valid_product_embedding_count,
      (SELECT COUNT(*) FROM social_posts) AS signal_count,
      (SELECT COUNT(*) FROM post_embeddings) AS signal_embedding_count,
      (SELECT COUNT(*)
       FROM post_embeddings
       WHERE VECTOR_DIMENSION_COUNT(embedding) = 384
         AND UPPER(VECTOR_DIMENSION_FORMAT(embedding)) = 'FLOAT32') AS valid_signal_embedding_count,
      (SELECT COUNT(*) FROM semantic_matches) AS semantic_match_count
    FROM dual
  `);
  const vectorRow = vectorResult.rows?.[0] || {};
  const vector = {
    model: Number(vectorRow.MODEL_COUNT || 0),
    columns: Number(vectorRow.VECTOR_COLUMN_COUNT || 0),
    indexes: Number(vectorRow.VECTOR_INDEX_COUNT || 0),
    products: Number(vectorRow.PRODUCT_COUNT || 0),
    productEmbeddings: Number(vectorRow.PRODUCT_EMBEDDING_COUNT || 0),
    validProductEmbeddings: Number(vectorRow.VALID_PRODUCT_EMBEDDING_COUNT || 0),
    signals: Number(vectorRow.SIGNAL_COUNT || 0),
    signalEmbeddings: Number(vectorRow.SIGNAL_EMBEDDING_COUNT || 0),
    validSignalEmbeddings: Number(vectorRow.VALID_SIGNAL_EMBEDDING_COUNT || 0),
    semanticMatches: Number(vectorRow.SEMANTIC_MATCH_COUNT || 0),
  };
  vector.ready = vector.model === 1
    && vector.columns === 2
    && vector.indexes === 2
    && vector.products > 0
    && vector.productEmbeddings === vector.products
    && vector.validProductEmbeddings === vector.productEmbeddings
    && vector.signals > 0
    && vector.signalEmbeddings === vector.signals
    && vector.validSignalEmbeddings === vector.signalEmbeddings
    && vector.semanticMatches > 0;

  const omlResult = await execSql(connection, `
    SELECT
      (SELECT COUNT(*)
       FROM user_mining_models
       WHERE model_name IN (
         'HT_DEMAND_VOLATILITY_MODEL',
         'HT_CUSTOMER_COMMITMENT_SEGMENT_MODEL',
         'HT_COMMITMENT_VALUE_MODEL',
         'HT_PRODUCT_SIGNAL_CLUSTER_MODEL'
       )) AS model_count,
      (SELECT COUNT(*) FROM oml_model_runs WHERE status = 'completed') AS completed_runs,
      (SELECT COUNT(*) FROM oml_demand_scores) AS demand_scores,
      (SELECT COUNT(*) FROM oml_customer_segments) AS customer_segments,
      (SELECT COUNT(*) FROM oml_commitment_forecasts) AS commitment_forecasts,
      (SELECT COUNT(*) FROM oml_product_clusters) AS product_clusters,
      (SELECT COUNT(*) FROM oml_capacity_alerts) AS capacity_alerts
    FROM dual
  `);
  const omlRow = omlResult.rows?.[0] || {};
  const oml = {
    models: Number(omlRow.MODEL_COUNT || 0),
    completedRuns: Number(omlRow.COMPLETED_RUNS || 0),
    demandScores: Number(omlRow.DEMAND_SCORES || 0),
    customerSegments: Number(omlRow.CUSTOMER_SEGMENTS || 0),
    commitmentForecasts: Number(omlRow.COMMITMENT_FORECASTS || 0),
    productClusters: Number(omlRow.PRODUCT_CLUSTERS || 0),
    capacityAlerts: Number(omlRow.CAPACITY_ALERTS || 0),
    lifecycleReady: summary.omlModelLifecycle?.ready === true,
  };
  oml.ready = oml.models === 4
    && oml.completedRuns > 0
    && oml.demandScores > 0
    && oml.customerSegments > 0
    && oml.commitmentForecasts > 0
    && oml.productClusters > 0
    && oml.capacityAlerts > 0
    && oml.lifecycleReady;

  const spatialResult = await execSql(connection, `
    SELECT
      (SELECT COUNT(*)
       FROM user_indexes
       WHERE index_name = 'IDX_FC_SPATIAL'
         AND status = 'VALID'
         AND domidx_status = 'VALID'
         AND domidx_opstatus = 'VALID') AS index_count,
      (SELECT COUNT(*) FROM fulfillment_centers WHERE location IS NOT NULL) AS center_geometry_count,
      (SELECT COUNT(*)
       FROM fulfillment_centers
       WHERE location IS NOT NULL
         AND SDO_GEOM.VALIDATE_GEOMETRY_WITH_CONTEXT(location, 0.005) = 'TRUE') AS valid_center_geometry_count,
      (SELECT COUNT(*) FROM fulfillment_zones WHERE zone_boundary IS NOT NULL) AS zone_geometry_count
    FROM dual
  `);
  const spatialRow = spatialResult.rows?.[0] || {};
  const spatial = {
    index: Number(spatialRow.INDEX_COUNT || 0),
    centerGeometries: Number(spatialRow.CENTER_GEOMETRY_COUNT || 0),
    validCenterGeometries: Number(spatialRow.VALID_CENTER_GEOMETRY_COUNT || 0),
    zoneGeometries: Number(spatialRow.ZONE_GEOMETRY_COUNT || 0),
  };
  spatial.ready = spatial.index === 1
    && spatial.centerGeometries > 0
    && spatial.validCenterGeometries === spatial.centerGeometries
    && spatial.zoneGeometries > 0;

  const graphMetadata = await execSql(connection, `
    SELECT
      (SELECT COUNT(*)
       FROM user_property_graphs
       WHERE graph_name = 'TECH_PRODUCT_SIGNAL_NETWORK') AS graph_count,
      (SELECT COUNT(*) FROM tech_graph_entities) AS entity_count,
      (SELECT COUNT(*) FROM tech_graph_relationships) AS relationship_count
    FROM dual
  `);
  const graphProbe = await execSql(connection, `
    SELECT source_key
    FROM GRAPH_TABLE (
      tech_product_signal_network
      MATCH (source IS entity)-[relationship IS related_to]->(destination IS entity)
      COLUMNS (source.entity_key AS source_key)
    )
    FETCH FIRST 1 ROW ONLY
  `);
  const graphRow = graphMetadata.rows?.[0] || {};
  const graph = {
    metadata: Number(graphRow.GRAPH_COUNT || 0),
    entities: Number(graphRow.ENTITY_COUNT || 0),
    relationships: Number(graphRow.RELATIONSHIP_COUNT || 0),
    probeRows: Number(graphProbe.rows?.length || 0),
  };
  graph.ready = graph.metadata === 1
    && graph.entities > 0
    && graph.relationships > 0
    && graph.probeRows > 0;

  const dualityResult = await execSql(connection, `
    SELECT
      (SELECT COUNT(*)
       FROM user_json_duality_views
       WHERE view_name IN ('ORDERS_DV', 'PRODUCTS_INVENTORY_DV')) AS metadata_count,
      (SELECT COUNT(*) FROM orders_dv) AS order_documents,
      (SELECT COUNT(*) FROM products_inventory_dv) AS product_documents
    FROM dual
  `);
  const dualityRow = dualityResult.rows?.[0] || {};
  const duality = {
    metadata: Number(dualityRow.METADATA_COUNT || 0),
    orderDocuments: Number(dualityRow.ORDER_DOCUMENTS || 0),
    productDocuments: Number(dualityRow.PRODUCT_DOCUMENTS || 0),
  };
  duality.ready = duality.metadata === 2
    && duality.orderDocuments > 0
    && duality.productDocuments > 0;

  const readiness = {
    nativeJson,
    vector,
    oml,
    spatial,
    graph,
    duality,
    excludedFromAcceptance: ['ORDS', 'SELECT_AI', 'NATIVE_AGENTS'],
  };
  const failures = Object.entries(readiness)
    .filter(([name, detail]) => name !== 'excludedFromAcceptance' && detail?.ready !== true)
    .map(([name]) => name);
  readiness.ready = failures.length === 0;
  readiness.failures = failures;

  if (!readiness.ready) {
    throw new ImportError(
      `Required Oracle feature readiness failed: ${failures.join(', ')}.`,
      500,
      readiness
    );
  }
  return readiness;
}

function buildFallbackBrandLinks(dataset) {
  const posts = dataset.tables.social_posts.rows;
  const mentions = dataset.tables.post_product_mentions.rows;
  const productsById = buildSourceRowMap(dataset.tables.products.rows, 'product_id');
  const postsById = buildSourceRowMap(posts, 'post_id');
  const orderItems = dataset.tables.order_items.rows;
  const orders = dataset.tables.orders.rows;

  const mentionsByPost = new Map();
  for (const mention of mentions) {
    const postKey = normalizeSourceId(mention.post_id);
    const existing = mentionsByPost.get(postKey) || [];
    existing.push(mention);
    mentionsByPost.set(postKey, existing);
  }

  const orderItemsByOrderAndBrand = new Map();
  for (const item of orderItems) {
    const product = productsById.get(normalizeSourceId(item.product_id));
    if (!product) continue;
    const key = `${normalizeSourceId(item.order_id)}::${normalizeSourceId(product.brand_id)}`;
    const lineValue = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    orderItemsByOrderAndBrand.set(key, (orderItemsByOrderAndBrand.get(key) || 0) + lineValue);
  }

  const ordersBySocialSource = new Map();
  for (const order of orders) {
    if (!order.social_source_id) continue;
    const key = normalizeSourceId(order.social_source_id);
    const existing = ordersBySocialSource.get(key) || [];
    existing.push(order);
    ordersBySocialSource.set(key, existing);
  }

  const groups = new Map();
  for (const post of posts) {
    const influencerId = normalizeSourceId(post.influencer_id);
    if (!influencerId) continue;

    const postMentions = mentionsByPost.get(normalizeSourceId(post.post_id)) || [];
    const brandIds = new Set();
    for (const mention of postMentions) {
      const product = productsById.get(normalizeSourceId(mention.product_id));
      if (product?.brand_id) {
        brandIds.add(normalizeSourceId(product.brand_id));
      }
    }

    const engagement = (() => {
      const likes = Number(post.likes_count) || 0;
      const shares = Number(post.shares_count) || 0;
      const comments = Number(post.comments_count) || 0;
      const views = Number(post.views_count) || 0;
      return views > 0 ? roundTo((likes + (shares * 2) + (comments * 2)) / views, 4) : 0;
    })();

    for (const brandId of brandIds) {
      const key = `${brandId}::${influencerId}`;
      const group = groups.get(key) || {
        brandId,
        influencerId,
        postIds: new Set(),
        engagementTotal: 0,
        revenueAttributed: 0,
        firstMention: null,
        lastMention: null,
      };

      group.postIds.add(normalizeSourceId(post.post_id));
      group.engagementTotal += engagement;
      group.firstMention = !group.firstMention || post.posted_at < group.firstMention ? post.posted_at : group.firstMention;
      group.lastMention = !group.lastMention || post.posted_at > group.lastMention ? post.posted_at : group.lastMention;

      const attributedOrders = ordersBySocialSource.get(normalizeSourceId(post.post_id)) || [];
      for (const order of attributedOrders) {
        const revenueKey = `${normalizeSourceId(order.order_id)}::${brandId}`;
        group.revenueAttributed += orderItemsByOrderAndBrand.get(revenueKey) || 0;
      }

      groups.set(key, group);
    }
  }

  return [...groups.values()]
    .map((group) => ({
      brandId: group.brandId,
      influencerId: group.influencerId,
      relationshipType: 'organic',
      postCount: group.postIds.size,
      avgEngagement: group.postIds.size ? roundTo(group.engagementTotal / group.postIds.size, 4) : 0,
      revenueAttributed: roundTo(group.revenueAttributed, 2) || 0,
      firstMention: group.firstMention,
      lastMention: group.lastMention,
    }))
    .filter((row) => row.postCount > 0);
}

function buildFallbackInfluencerConnections(dataset) {
  const influencerRows = dataset.tables.influencers.rows;
  const posts = dataset.tables.social_posts.rows;
  const mentions = dataset.tables.post_product_mentions.rows;
  const productsById = buildSourceRowMap(dataset.tables.products.rows, 'product_id');
  const influencersById = buildSourceRowMap(influencerRows, 'influencer_id');
  const postsById = buildSourceRowMap(posts, 'post_id');

  const brandsByInfluencer = new Map();
  const activityByInfluencer = new Map();

  for (const mention of mentions) {
    const post = postsById.get(normalizeSourceId(mention.post_id));
    const product = productsById.get(normalizeSourceId(mention.product_id));
    if (!post?.influencer_id || !product?.brand_id) continue;

    const influencerId = normalizeSourceId(post.influencer_id);
    const brandId = normalizeSourceId(product.brand_id);

    const brands = brandsByInfluencer.get(influencerId) || new Set();
    brands.add(brandId);
    brandsByInfluencer.set(influencerId, brands);

    const activity = activityByInfluencer.get(influencerId) || { firstSeen: null, lastSeen: null, posts: 0 };
    activity.posts += 1;
    activity.firstSeen = !activity.firstSeen || post.posted_at < activity.firstSeen ? post.posted_at : activity.firstSeen;
    activity.lastSeen = !activity.lastSeen || post.posted_at > activity.lastSeen ? post.posted_at : activity.lastSeen;
    activityByInfluencer.set(influencerId, activity);
  }

  const influencerIds = influencerRows.map((row) => normalizeSourceId(row.influencer_id));
  const edges = [];

  for (let left = 0; left < influencerIds.length; left += 1) {
    for (let right = left + 1; right < influencerIds.length; right += 1) {
      const fromId = influencerIds[left];
      const toId = influencerIds[right];
      const leftBrands = brandsByInfluencer.get(fromId) || new Set();
      const rightBrands = brandsByInfluencer.get(toId) || new Set();
      const sharedBrands = [...leftBrands].filter((brandId) => rightBrands.has(brandId));
      if (!sharedBrands.length) continue;

      const leftActivity = activityByInfluencer.get(fromId) || { posts: 0, firstSeen: null, lastSeen: null };
      const rightActivity = activityByInfluencer.get(toId) || { posts: 0, firstSeen: null, lastSeen: null };

      edges.push({
        fromInfluencer: fromId,
        toInfluencer: toId,
        connectionType: sharedBrands.length > 1 ? 'collaborates' : 'mentioned',
        strength: roundTo(Math.min(0.95, 0.35 + (sharedBrands.length * 0.2)), 3),
        interactionCount: sharedBrands.length + Math.min(leftActivity.posts, rightActivity.posts),
        firstSeen: leftActivity.firstSeen && rightActivity.firstSeen
          ? (leftActivity.firstSeen < rightActivity.firstSeen ? leftActivity.firstSeen : rightActivity.firstSeen)
          : (leftActivity.firstSeen || rightActivity.firstSeen || null),
        lastInteraction: leftActivity.lastSeen && rightActivity.lastSeen
          ? (leftActivity.lastSeen > rightActivity.lastSeen ? leftActivity.lastSeen : rightActivity.lastSeen)
          : (leftActivity.lastSeen || rightActivity.lastSeen || null),
      });
    }
  }

  if (!edges.length && influencerIds.length > 1) {
    const sortedInfluencers = [...influencerRows].sort((a, b) => {
      const scoreDelta = (Number(b.influence_score) || 0) - (Number(a.influence_score) || 0);
      if (scoreDelta !== 0) return scoreDelta;
      return normalizeSourceId(a.influencer_id).localeCompare(normalizeSourceId(b.influencer_id));
    });

    for (let index = 0; index < sortedInfluencers.length - 1; index += 1) {
      const current = sortedInfluencers[index];
      const next = sortedInfluencers[index + 1];
      edges.push({
        fromInfluencer: normalizeSourceId(current.influencer_id),
        toInfluencer: normalizeSourceId(next.influencer_id),
        connectionType: 'follows',
        strength: 0.4,
        interactionCount: 1,
        firstSeen: current.created_at || next.created_at || null,
        lastInteraction: current.created_at || next.created_at || null,
      });
    }
  }

  return edges.slice(0, 500);
}

function buildFallbackDemandRegions(dataset) {
  const customers = dataset.tables.customers.rows;
  const orders = dataset.tables.orders.rows;
  const customersById = buildSourceRowMap(customers, 'customer_id');
  const groups = new Map();

  for (const customer of customers) {
    if (!Number.isFinite(Number(customer.latitude)) || !Number.isFinite(Number(customer.longitude))) continue;

    const city = String(customer.city || '').trim();
    const state = String(customer.state_province || '').trim();
    const country = String(customer.country || 'US').trim();
    const key = city && state ? `${city}|${state}|${country}` : `${state || country}|${country}`;
    const label = city && state ? `${city}, ${state}` : `${state || country} Region`;

    const group = groups.get(key) || {
      regionName: label,
      regionType: 'metro',
      minLat: Number(customer.latitude),
      maxLat: Number(customer.latitude),
      minLon: Number(customer.longitude),
      maxLon: Number(customer.longitude),
      customerCount: 0,
      lifetimeValueTotal: 0,
      orderCount: 0,
      socialOrderCount: 0,
      revenue: 0,
    };

    group.customerCount += 1;
    group.lifetimeValueTotal += Number(customer.lifetime_value) || 0;
    group.minLat = Math.min(group.minLat, Number(customer.latitude));
    group.maxLat = Math.max(group.maxLat, Number(customer.latitude));
    group.minLon = Math.min(group.minLon, Number(customer.longitude));
    group.maxLon = Math.max(group.maxLon, Number(customer.longitude));
    groups.set(key, group);
  }

  for (const order of orders) {
    const customer = customersById.get(normalizeSourceId(order.customer_id));
    if (!customer) continue;
    const city = String(customer.city || '').trim();
    const state = String(customer.state_province || '').trim();
    const country = String(customer.country || 'US').trim();
    const key = city && state ? `${city}|${state}|${country}` : `${state || country}|${country}`;
    const group = groups.get(key);
    if (!group) continue;

    group.orderCount += 1;
    if (order.social_source_id) group.socialOrderCount += 1;
    group.revenue += Number(order.order_total) || 0;
  }

  return [...groups.values()]
    .map((group) => {
      const latPadding = Math.max(0.15, (group.maxLat - group.minLat) * 0.2);
      const lonPadding = Math.max(0.15, (group.maxLon - group.minLon) * 0.2);
      const minLat = Math.max(-89.9, group.minLat - latPadding);
      const maxLat = Math.min(89.9, group.maxLat + latPadding);
      const minLon = Math.max(-179.9, group.minLon - lonPadding);
      const maxLon = Math.min(179.9, group.maxLon + lonPadding);
      const avgLifetimeValue = group.customerCount ? group.lifetimeValueTotal / group.customerCount : 0;

      return {
        regionName: group.regionName,
        regionType: group.regionType,
        boundaryWkt: `POLYGON((${minLon} ${minLat}, ${maxLon} ${minLat}, ${maxLon} ${maxLat}, ${minLon} ${maxLat}, ${minLon} ${minLat}))`,
        population: Math.max(group.customerCount * 10000, group.customerCount),
        avgIncome: roundTo(Math.max(45000, avgLifetimeValue * 8 || 55000), 2),
        socialDensity: roundTo((group.socialOrderCount / Math.max(group.customerCount, 1)) * 100, 2) || 0,
        demandIndex: roundTo(Math.min(99, 45 + (group.orderCount * 4) + (group.socialOrderCount * 6) + (group.revenue / 1000)), 2),
      };
    })
    .sort((left, right) => {
      const indexDelta = (right.demandIndex || 0) - (left.demandIndex || 0);
      if (indexDelta !== 0) return indexDelta;
      return left.regionName.localeCompare(right.regionName);
    })
    .slice(0, 12);
}

function buildFallbackDemandForecasts(dataset, demandRegionRows) {
  if (!demandRegionRows.length) return [];

  const products = dataset.tables.products.rows;
  const orderItems = dataset.tables.order_items.rows;
  const posts = dataset.tables.social_posts.rows;
  const mentions = dataset.tables.post_product_mentions.rows;
  const postsById = buildSourceRowMap(posts, 'post_id');

  const metricsByProduct = new Map();
  for (const product of products) {
    metricsByProduct.set(normalizeSourceId(product.product_id), {
      productId: normalizeSourceId(product.product_id),
      orderedQuantity: 0,
      mentionCount: 0,
      totalVirality: 0,
      socialPostCount: 0,
    });
  }

  for (const item of orderItems) {
    const productId = normalizeSourceId(item.product_id);
    const metrics = metricsByProduct.get(productId);
    if (!metrics) continue;
    metrics.orderedQuantity += Number(item.quantity) || 0;
  }

  for (const mention of mentions) {
    const productId = normalizeSourceId(mention.product_id);
    const metrics = metricsByProduct.get(productId);
    const post = postsById.get(normalizeSourceId(mention.post_id));
    if (!metrics || !post) continue;
    metrics.mentionCount += 1;
    metrics.totalVirality += Number(post.virality_score) || 0;
    metrics.socialPostCount += 1;
  }

  const regions = demandRegionRows.slice(0, Math.min(5, demandRegionRows.length));
  const forecastDate = new Date();
  forecastDate.setHours(0, 0, 0, 0);
  const rows = [];

  for (const metrics of metricsByProduct.values()) {
    const avgVirality = metrics.socialPostCount ? metrics.totalVirality / metrics.socialPostCount : 0;
    const baseDemand = Math.max(5, Math.round((metrics.orderedQuantity * 1.2) + (metrics.mentionCount * 2) + (avgVirality / 8)));
    const socialFactor = roundTo(Math.min(3, 1 + (metrics.mentionCount / 10) + (avgVirality / 100)), 2) || 1;

    for (const region of regions) {
      const regionMultiplier = (Number(region.demandIndex) || 50) / 50;
      const predictedDemand = Math.max(5, Math.round(baseDemand * regionMultiplier));
      rows.push({
        productId: metrics.productId,
        region: region.regionName,
        forecastDate,
        predictedDemand,
        confidenceLow: Math.max(0, Math.round(predictedDemand * 0.8)),
        confidenceHigh: Math.round(predictedDemand * 1.2),
        socialFactor,
        modelVersion: 'import_fallback_v1',
        explanation: JSON.stringify({
          source: 'import_fallback_v1',
          orderedQuantity: metrics.orderedQuantity,
          mentionCount: metrics.mentionCount,
          avgVirality: roundTo(avgVirality, 2),
          regionDemandIndex: region.demandIndex,
        }),
      });
    }
  }

  return rows;
}

async function insertFallbackBrandLinks(connection, rows, idMaps) {
  let inserted = 0;
  for (const row of rows) {
    await execSql(connection, `
      INSERT INTO brand_influencer_links (
        brand_id, influencer_id, relationship_type, post_count,
        avg_engagement, revenue_attributed, first_mention, last_mention
      ) VALUES (
        :brandId, :influencerId, :relationshipType, :postCount,
        :avgEngagement, :revenueAttributed, :firstMention, :lastMention
      )
    `, {
      brandId: resolveMappedValue(row.brandId, 'brands', idMaps, 'brand_influencer_links', 'brand_id', 'fallback'),
      influencerId: resolveMappedValue(row.influencerId, 'influencers', idMaps, 'brand_influencer_links', 'influencer_id', 'fallback'),
      relationshipType: row.relationshipType,
      postCount: row.postCount,
      avgEngagement: row.avgEngagement,
      revenueAttributed: row.revenueAttributed,
      firstMention: row.firstMention,
      lastMention: row.lastMention,
    });
    inserted += 1;
  }
  return inserted;
}

async function insertFallbackInfluencerConnections(connection, rows, idMaps) {
  let inserted = 0;
  for (const row of rows) {
    await execSql(connection, `
      INSERT INTO influencer_connections (
        from_influencer, to_influencer, connection_type, strength,
        interaction_count, first_seen, last_interaction
      ) VALUES (
        :fromInfluencer, :toInfluencer, :connectionType, :strength,
        :interactionCount, :firstSeen, :lastInteraction
      )
    `, {
      fromInfluencer: resolveMappedValue(row.fromInfluencer, 'influencers', idMaps, 'influencer_connections', 'from_influencer', 'fallback'),
      toInfluencer: resolveMappedValue(row.toInfluencer, 'influencers', idMaps, 'influencer_connections', 'to_influencer', 'fallback'),
      connectionType: row.connectionType,
      strength: row.strength,
      interactionCount: row.interactionCount,
      firstSeen: row.firstSeen,
      lastInteraction: row.lastInteraction,
    });
    inserted += 1;
  }
  return inserted;
}

async function insertFallbackDemandRegions(connection, rows) {
  let inserted = 0;
  for (const row of rows) {
    await execSql(connection, `
      INSERT INTO demand_regions (
        region_name, region_type, boundary, population,
        avg_income, social_density, demand_index, updated_at
      ) VALUES (
        :regionName, :regionType, SDO_UTIL.FROM_WKTGEOMETRY(:boundaryWkt), :population,
        :avgIncome, :socialDensity, :demandIndex, SYSTIMESTAMP
      )
    `, row);
    inserted += 1;
  }
  return inserted;
}

async function insertFallbackDemandForecasts(connection, rows, idMaps) {
  let inserted = 0;
  for (const row of rows) {
    await execSql(connection, `
      INSERT INTO demand_forecasts (
        product_id, region, forecast_date, predicted_demand,
        confidence_low, confidence_high, social_factor, model_version,
        explanation, created_at
      ) VALUES (
        :productId, :region, :forecastDate, :predictedDemand,
        :confidenceLow, :confidenceHigh, :socialFactor, :modelVersion,
        :explanation, SYSTIMESTAMP
      )
    `, {
      productId: resolveMappedValue(row.productId, 'products', idMaps, 'demand_forecasts', 'product_id', 'fallback'),
      region: row.region,
      forecastDate: row.forecastDate,
      predictedDemand: row.predictedDemand,
      confidenceLow: row.confidenceLow,
      confidenceHigh: row.confidenceHigh,
      socialFactor: row.socialFactor,
      modelVersion: row.modelVersion,
      explanation: row.explanation,
    });
    inserted += 1;
  }
  return inserted;
}

async function insertFallbackShipments(connection, rows) {
  let inserted = 0;
  for (const row of rows) {
    await execSql(connection, `
      INSERT INTO shipments (
        order_id, center_id, carrier, tracking_number, ship_status,
        distance_km, estimated_hours, ship_cost, shipped_at, delivered_at, created_at
      ) VALUES (
        :orderId, :centerId, :carrier, :trackingNumber, :shipStatus,
        :distanceKm, :estimatedHours, :shipCost, :shippedAt, :deliveredAt, :createdAt
      )
    `, row);
    inserted += 1;
  }
  return inserted;
}

function buildFallbackShipments(dataset, idMaps) {
  const orders = dataset.tables.orders.rows;
  const customersById = buildSourceRowMap(dataset.tables.customers.rows, 'customer_id');
  const centersById = buildSourceRowMap(dataset.tables.fulfillment_centers.rows, 'center_id');
  const carriers = ['FedEx', 'UPS', 'USPS', 'DHL'];
  const shipStatusMap = {
    confirmed: 'preparing',
    processing: 'packed',
    shipped: 'in_transit',
    delivered: 'delivered',
    returned: 'exception',
  };

  const rows = [];
  for (const order of orders) {
    const orderStatus = String(order.order_status || 'pending').toLowerCase();
    const centerSourceId = normalizeSourceId(order.fulfillment_center_id);
    if (!centerSourceId || ['pending', 'cancelled'].includes(orderStatus)) continue;

    const customer = customersById.get(normalizeSourceId(order.customer_id));
    const center = centersById.get(centerSourceId);
    if (!center) continue;

    const shipLat = Number.isFinite(Number(order.shipping_lat)) ? Number(order.shipping_lat) : Number(customer?.latitude);
    const shipLon = Number.isFinite(Number(order.shipping_lon)) ? Number(order.shipping_lon) : Number(customer?.longitude);
    const distanceKm = haversineKm(center.latitude, center.longitude, shipLat, shipLon);
    const estimatedHours = distanceKm == null ? null : roundTo(Math.max(1, distanceKm / 80), 1);
    const createdAt = pickOrderTimestamp(order);
    const shippedAt = createdAt ? new Date(createdAt.getTime() + (6 * 60 * 60 * 1000)) : null;
    const deliveredAt = orderStatus === 'delivered' && shippedAt && estimatedHours != null
      ? new Date(shippedAt.getTime() + (estimatedHours * 60 * 60 * 1000))
      : null;
    const actualOrderId = idMaps.orders.get(normalizeSourceId(order.order_id));
    const actualCenterId = idMaps.fulfillment_centers.get(centerSourceId);
    if (actualOrderId == null || actualCenterId == null) continue;

    rows.push({
      orderId: actualOrderId,
      centerId: actualCenterId,
      carrier: carriers[hashString(order.order_id) % carriers.length],
      trackingNumber: `AUTO-${String(actualOrderId).padStart(8, '0')}`,
      shipStatus: shipStatusMap[orderStatus] || 'preparing',
      distanceKm: distanceKm == null ? null : roundTo(distanceKm, 2),
      estimatedHours,
      shipCost: distanceKm == null ? 9.99 : roundTo(Math.max(4.99, distanceKm * 0.12), 2),
      shippedAt,
      deliveredAt,
      createdAt: createdAt || new Date(),
    });
  }

  return rows;
}

async function applyOptionalFallbacks(connection, dataset, idMaps, warnings, progress) {
  const fallbackSummary = {};
  let generatedDemandRegions = [];

  if (!dataset.tables.brand_influencer_links.provided) {
    const rows = buildFallbackBrandLinks(dataset);
    fallbackSummary.brand_influencer_links = await insertFallbackBrandLinks(connection, rows, idMaps);
    if (!rows.length) warnings.push('No fallback brand_influencer_links could be derived from the uploaded posts and mentions.');
  }

  if (!dataset.tables.influencer_connections.provided) {
    const rows = buildFallbackInfluencerConnections(dataset);
    fallbackSummary.influencer_connections = await insertFallbackInfluencerConnections(connection, rows, idMaps);
    if (!rows.length) warnings.push('No fallback influencer_connections could be derived from the uploaded dataset.');
  }

  if (!dataset.tables.demand_regions.provided) {
    if (progress) {
      await progress({ status: 'running', progress: 65, message: 'Generating fallback demand regions...' });
    }
    generatedDemandRegions = buildFallbackDemandRegions(dataset);
    fallbackSummary.demand_regions = await insertFallbackDemandRegions(connection, generatedDemandRegions);
    if (!generatedDemandRegions.length) warnings.push('No fallback demand_regions could be generated because customer geospatial data was missing.');
  }

  if (!dataset.tables.demand_forecasts.provided) {
    if (progress) {
      await progress({ status: 'running', progress: 70, message: 'Generating fallback demand forecasts...' });
    }
    const regionRows = dataset.tables.demand_regions.provided
      ? dataset.tables.demand_regions.rows.map((row) => ({
          regionName: row.region_name,
          demandIndex: row.demand_index,
        }))
      : generatedDemandRegions.map((row) => ({
          regionName: row.regionName,
          demandIndex: row.demandIndex,
        }));
    const forecastRows = buildFallbackDemandForecasts(dataset, regionRows);
    fallbackSummary.demand_forecasts = await insertFallbackDemandForecasts(connection, forecastRows, idMaps);
    if (!forecastRows.length) warnings.push('No fallback demand_forecasts could be generated.');
  }

  if (!dataset.tables.shipments.provided) {
    if (progress) {
      await progress({ status: 'running', progress: 75, message: 'Generating fallback shipments...' });
    }
    const shipmentRows = buildFallbackShipments(dataset, idMaps);
    fallbackSummary.shipments = await insertFallbackShipments(connection, shipmentRows);
    if (!shipmentRows.length) warnings.push('No fallback shipments were generated because the uploaded orders did not require shipments.');
  }

  return fallbackSummary;
}

async function isVectorModelAvailable(connection) {
  try {
    const result = await execSql(connection, `
      SELECT COUNT(*) AS model_count
      FROM user_mining_models
      WHERE model_name = :modelName
    `, { modelName: VECTOR_MODEL_NAME });
    return Number(result.rows[0]?.MODEL_COUNT || 0) > 0;
  } catch (_) {
    return false;
  }
}

async function regenerateVectorArtifacts(connection) {
  const summary = {};

  const productEmbeddings = await execSql(connection, `
    INSERT INTO product_embeddings (product_id, embedding_text, embedding)
    SELECT p.product_id,
           p.product_name || ' ' || NVL(p.category, '') || ' ' || NVL(p.description, '') || ' ' || b.brand_name,
           VECTOR_EMBEDDING(${VECTOR_MODEL_NAME} USING
             p.product_name || ' ' || NVL(p.category, '') || ' ' || NVL(p.description, '') || ' ' || b.brand_name AS DATA)
    FROM products p
    JOIN brands b ON b.brand_id = p.brand_id
  `);
  summary.product_embeddings = productEmbeddings.rowsAffected || 0;

  const postEmbeddings = await execSql(connection, `
    INSERT INTO post_embeddings (post_id, embedding_text, embedding)
    SELECT sp.post_id,
           SUBSTR(sp.post_text, 1, 500),
           VECTOR_EMBEDDING(${VECTOR_MODEL_NAME} USING SUBSTR(sp.post_text, 1, 500) AS DATA)
    FROM social_posts sp
  `);
  summary.post_embeddings = postEmbeddings.rowsAffected || 0;

  const semanticMatches = await execSql(connection, `
    INSERT INTO semantic_matches (post_id, product_id, similarity_score, match_rank, match_method)
    SELECT post_id, product_id, similarity_score, match_rank, 'vector'
    FROM (
      SELECT pe.post_id,
             pre.product_id,
             ROUND(1 - VECTOR_DISTANCE(pe.embedding, pre.embedding, COSINE), 5) AS similarity_score,
             ROW_NUMBER() OVER (
               PARTITION BY pe.post_id
               ORDER BY VECTOR_DISTANCE(pe.embedding, pre.embedding, COSINE)
             ) AS match_rank
      FROM post_embeddings pe
      JOIN social_posts sp ON sp.post_id = pe.post_id
      CROSS JOIN product_embeddings pre
      WHERE sp.momentum_flag IN ('viral', 'mega_viral')
    )
    WHERE match_rank <= 3
  `);
  summary.semantic_matches = semanticMatches.rowsAffected || 0;

  return summary;
}

function summarizeCounts(insertedCounts, fallbackCounts, zonesCreated) {
  return {
    inserted: insertedCounts,
    generated: {
      ...fallbackCounts,
      fulfillment_zones: zonesCreated,
    },
  };
}

async function executeImportPlan({
  dataset,
  dryRun = false,
  progress = null,
  demoDateRefresh = null,
  demoUser = null,
  jobId = null,
}) {
  let connection;
  const warnings = [];

  try {
    connection = await db.getConnection();
    await db.setSecurityContext(connection, demoUser, { autoCommit: false });
    let importDataset = dataset;
    let demoDateRefreshMetadata = null;

    if (demoDateRefresh?.enabled) {
      const targetAnchor = demoDateRefresh.configuredAnchorDate || startOfUtcDay(new Date());
      const anchorSource = demoDateRefresh.configuredAnchorRaw ? 'configured' : 'database';
      const refreshed = reanchorDemoDates(dataset, { targetAnchor, anchorSource });
      importDataset = refreshed.dataset;
      demoDateRefreshMetadata = refreshed.metadata;
      if (progress) await progress({ status: 'running', progress: 8, message: 'Refreshing bundled demo dates to the restore window...' });
    }

    if (progress) await progress({ status: 'running', progress: 9, message: 'Preparing persisted machine learning tables...' });
    await ensureMlPersistenceSchema(connection);

    if (progress) await progress({ status: 'running', progress: 10, message: 'Clearing existing importable data...' });
    await deleteExistingImportData(connection);

    if (progress) await progress({ status: 'running', progress: 20, message: 'Loading required and provided optional tables...' });
    const { idMaps, insertedCounts } = await insertProvidedTables(connection, importDataset, progress);

    if (progress) await progress({ status: 'running', progress: 55, message: 'Rebuilding spatial point geometry...' });
    await rebuildSpatialLocations(connection);

    const fallbackCounts = await applyOptionalFallbacks(connection, importDataset, idMaps, warnings, progress);

    if (progress) await progress({ status: 'running', progress: 80, message: 'Rebuilding fulfillment zones...' });
    const zonesCreated = await rebuildFulfillmentZones(connection);

    if (progress) await progress({ status: 'running', progress: 82, message: 'Rehydrating native Oracle JSON documents...' });
    const nativeJsonCounts = await rehydrateNativeJsonDocuments(connection, {
      correlationId: jobId,
    });

    const vectorAvailable = await isVectorModelAvailable(connection);
    if (!vectorAvailable) {
      throw new ImportError(
        `Required Oracle embedding model ${VECTOR_MODEL_NAME} is not available.`,
        500
      );
    }

    const summary = summarizeCounts(insertedCounts, fallbackCounts, zonesCreated);
    summary.generated = {
      ...summary.generated,
      ...nativeJsonCounts,
    };
    if (demoDateRefreshMetadata) {
      summary.demoDateRefresh = formatDemoDateRefresh(demoDateRefreshMetadata);
      if (progress) await progress({ status: 'running', progress: 84, message: 'Validating refreshed demo date windows...' });
      const demoDateValidation = await runDemoDateValidation(connection);
      summary.demoDateValidation = summarizeDemoDateValidation(demoDateValidation);
      summary.demoFreshnessGuard = buildDemoFreshnessGuard(summary.demoDateRefresh, summary.demoDateValidation);
      if (!demoDateValidation.passed) {
        throw new ImportError('Demo date validation failed after date refresh.', 500, summary.demoFreshnessGuard);
      }
      if (!summary.demoFreshnessGuard.fresh) {
        throw new ImportError('Demo freshness validation failed after date refresh.', 500, summary.demoFreshnessGuard);
      }
    }

    if (dryRun) {
      await connection.rollback();
      return {
        warnings,
        summary,
      };
    }

    if (progress) await progress({ status: 'running', progress: 88, message: 'Committing imported dataset...' });
    await connection.commit();

    if (vectorAvailable) {
      try {
        if (progress) await progress({ status: 'running', progress: 92, message: 'Rebuilding vector artifacts...' });
        await execSql(connection, 'SAVEPOINT import_vectors');
        summary.generated = {
          ...summary.generated,
          ...(await regenerateVectorArtifacts(connection)),
        };
        await connection.commit();
      } catch (err) {
        try {
          await execSql(connection, 'ROLLBACK TO import_vectors');
        } catch (_) {
          try { await connection.rollback(); } catch (_) {}
        }
        throw new ImportError(`Required Vector artifact rebuild failed: ${err.message}`, 500);
      }
    }

    if (progress) await progress({ status: 'running', progress: 94, message: 'Refreshing Oracle DBMS_DATA_MINING models...' });
    summary.omlModelLifecycle = await refreshHighTechOmlModels({ connection });
    await connection.commit();

    if (progress) await progress({ status: 'running', progress: 96, message: 'Persisting machine learning outputs...' });
    const mlPersistence = await refreshPersistentMlData({
      connection,
      source: demoDateRefresh?.enabled ? 'restore-demo' : 'dataset-import',
      refreshModels: false,
      modelLifecycle: summary.omlModelLifecycle,
    });
    summary.generated = {
      ...summary.generated,
      ...mlPersistence.rowCounts,
    };
    summary.mlPersistence = mlPersistence;
    await connection.commit();

    if (progress) await progress({ status: 'running', progress: 98, message: 'Verifying every required Oracle feature...' });
    summary.requiredFeatureReadiness = await assertRequiredFeatureReadiness(connection, summary);

    if (typeof ollamaAssistant?.invalidateMetadataCaches === 'function') {
      try {
        ollamaAssistant.invalidateMetadataCaches();
      } catch (_) {
        // Ignore cache invalidation failures; data import already succeeded.
      }
    }

    return {
      warnings,
      summary,
    };
  } catch (err) {
    if (connection) {
      try { await connection.rollback(); } catch (_) {}
    }
    if (err instanceof ImportError) throw err;
    throw new ImportError(err.message || 'Import failed.', 500);
  } finally {
    await db.releaseConnection(connection, { label: 'dataset import' });
  }
}

function formatValidationResult(result) {
  return {
    valid: result.valid,
    isValid: result.valid,
    success: result.valid,
    message: result.message,
    errors: result.errors,
    warnings: result.warnings,
    counts: result.counts,
  };
}

async function inferCurrentDatasetState() {
  const demoDataset = getBundledDemoDataset();
  let connection;

  try {
    connection = await db.getConnection();
    await db.setSecurityContext(connection);
    const tableNames = Object.keys(demoDataset.parsed.counts);
    const liveCounts = {};

    for (const tableName of tableNames) {
      const result = await execSql(connection, `SELECT COUNT(*) AS cnt FROM ${tableName}`);
      liveCounts[tableName] = Number(result.rows[0]?.CNT || 0);
    }

    const matchesBundledDemo = tableNames.every(
      (tableName) => Number(demoDataset.parsed.counts[tableName] || 0) === Number(liveCounts[tableName] || 0)
    );

    return buildDatasetState(matchesBundledDemo ? 'demo' : 'custom');
  } finally {
    await db.releaseConnection(connection, { label: 'dataset inference' });
  }
}

async function getActiveDataset() {
  let stored = await getStoredDatasetState();
  if (!stored) {
    stored = await saveDatasetState(await inferCurrentDatasetState());
  }

  return {
    activeDataset: stored,
    activeOperation: await getActiveOperation(),
    readiness: await getDatasetReadiness(),
  };
}

async function persistDatasetState(source, jobId, readiness, jobPatch) {
  const activeDataset = buildDatasetState(source);
  await saveActiveDatasetReadiness({
    ...activeDataset,
    jobId,
    readiness,
    jobPatch,
  });
  return activeDataset;
}

async function runDatasetValidation({
  parsed,
  fileOnly = false,
  lockKind,
  lockMessage,
  demoDateRefresh = null,
  demoUser = null,
}) {
  if (!parsed.valid) {
    return formatValidationResult(parsed);
  }

  if (fileOnly) {
    return {
      ...formatValidationResult(parsed),
      message: 'Archive structure validation passed.',
    };
  }

  const lock = await acquireOperationLock(lockKind, lockMessage);
  try {
    const dryRun = await executeImportPlan({
      dataset: parsed.dataset,
      dryRun: true,
      demoDateRefresh,
      demoUser,
    });

    return {
      ...formatValidationResult(parsed),
      valid: true,
      isValid: true,
      success: true,
      message: 'Validation passed. Dry run completed successfully.',
      warnings: [...parsed.warnings, ...dryRun.warnings],
      summary: dryRun.summary,
    };
  } catch (err) {
    if (err instanceof ImportError) {
      return {
        valid: false,
        isValid: false,
        success: false,
        message: err.message,
        errors: [err.message],
        warnings: parsed.warnings,
        counts: parsed.counts,
      };
    }
    throw err;
  } finally {
    try {
      await endOperation({ leaseToken: lock.leaseToken });
    } catch (lockError) {
      console.warn(`Unable to release dataset validation lease: ${lockError.message}`);
    }
  }
}

function createJobProgressHandler(jobId, leaseToken) {
  return async (patch) => {
    await Promise.all([
      updateJob(jobId, patch),
      updateOperation({
        leaseToken,
        jobId,
        progress: patch.progress,
        message: patch.message,
        status: patch.status,
      }),
    ]);
  };
}

function telemetryOperationForJobKind(kind) {
  if (kind === 'restore_demo') return 'restore';
  if (kind === 'upload') return 'upload';
  return 'refresh';
}

async function recordRefreshTelemetry(eventContext) {
  try {
    const hardTimeoutMs = Math.max(
      1000,
      Math.min(Number(process.env.DATASET_TELEMETRY_SETTLE_TIMEOUT_MS || 5000), 10000)
    );
    const result = await Promise.race([
      recordDatasetEvent(eventContext),
      new Promise((resolve) => {
        const timer = setTimeout(
          () => resolve({ recorded: false, skipped: true, timedOut: true }),
          hardTimeoutMs
        );
        timer.unref?.();
      }),
    ]);
    return {
      recorded: result?.recorded === true,
      objectKey: result?.objectKey || null,
      status: eventContext.status,
    };
  } catch (err) {
    const message = String(err?.message || err || 'unexpected telemetry error')
      .replace(/https?:\/\/\S+/gi, '[redacted-url]');
    console.warn(`Usage telemetry skipped: ${message}.`);
    return {
      recorded: false,
      objectKey: null,
      status: eventContext.status,
    };
  }
}

async function startDatasetJob({ parsed, kind, lockMessage, queuedMessage, startMessage, completeMessage, datasetSource, demoDateRefresh = null, demoUser = null }) {
  const lock = await acquireOperationLock(kind, lockMessage);
  const jobStartedAt = Date.now();
  let job;
  try {
    job = await createJob({
      operation: kind,
      message: queuedMessage,
      warnings: [...parsed.warnings],
      counts: parsed.counts,
    });

    await updateOperation({
      leaseToken: lock.leaseToken,
      jobId: job.jobId,
      progress: 0,
      message: queuedMessage,
      status: 'queued',
    });
  } catch (error) {
    await endOperation({ leaseToken: lock.leaseToken });
    throw error;
  }

  let requestedTelemetry = null;
  if (kind === 'restore_demo') {
    requestedTelemetry = await recordRefreshTelemetry({
      correlationId: job.jobId,
      operation: telemetryOperationForJobKind(kind),
      status: 'requested',
      datasetVersion: IMPORT_VERSION,
    });
    await updateJob(job.jobId, {
      telemetry: { requested: requestedTelemetry, terminal: null },
    });
  }

  setImmediate(async () => {
    try {
      await updateJob(job.jobId, {
        status: 'running',
        progress: 5,
        message: startMessage,
      });
      await updateOperation({
        leaseToken: lock.leaseToken,
        jobId: job.jobId,
        progress: 5,
        message: startMessage,
        status: 'running',
      });

      const result = await executeImportPlan({
        dataset: parsed.dataset,
        dryRun: false,
        progress: createJobProgressHandler(job.jobId, lock.leaseToken),
        demoDateRefresh,
        demoUser,
        jobId: job.jobId,
      });

      const warnings = [...result.warnings];
      const terminalTelemetry = await recordRefreshTelemetry({
        correlationId: job.jobId,
        operation: telemetryOperationForJobKind(kind),
        status: 'completed',
        datasetVersion: IMPORT_VERSION,
        durationMs: Date.now() - jobStartedAt,
      });
      const activeDataset = buildDatasetState(datasetSource);
      await persistDatasetState(
        datasetSource,
        job.jobId,
        result.summary.requiredFeatureReadiness,
        {
        status: 'completed',
        progress: 100,
        message: completeMessage,
          warnings: [...(job.warnings || []), ...warnings],
        summary: result.summary,
        activeDataset,
        telemetry: {
          requested: requestedTelemetry,
          terminal: terminalTelemetry,
        },
        }
      );
    } catch (err) {
      const failureReadiness = err?.details?.failures ? err.details : null;
      try {
        await markDatasetReadinessFailed({
          jobId: job.jobId,
          attemptedVersion: IMPORT_VERSION,
          readiness: failureReadiness,
          message: err.message,
        });
      } catch (readinessError) {
        console.warn(`Unable to persist failed dataset readiness: ${readinessError.message}`);
      }
      let terminalTelemetry = null;
      if (kind === 'restore_demo') {
        terminalTelemetry = await recordRefreshTelemetry({
          correlationId: job.jobId,
          operation: telemetryOperationForJobKind(kind),
          status: 'failed',
          datasetVersion: IMPORT_VERSION,
          durationMs: Date.now() - jobStartedAt,
          errorCategory: err instanceof ImportError ? 'validation' : 'database',
        });
      }
      await updateJob(job.jobId, {
        status: 'failed',
        progress: 100,
        message: err.message || 'Import failed.',
        errors: [err.message || 'Import failed.'],
        telemetry: {
          requested: requestedTelemetry,
          terminal: terminalTelemetry,
        },
        requiredFeatureReadiness: failureReadiness,
      });
    } finally {
      try {
        await endOperation({
          leaseToken: lock.leaseToken,
          jobId: job.jobId,
        });
      } catch (lockError) {
        console.warn(`Unable to release dataset operation lease: ${lockError.message}`);
      }
    }
  });

  return {
    jobId: job.jobId,
    message: queuedMessage,
  };
}

async function generateTemplateArchive({ version = IMPORT_VERSION }) {
  if (version !== IMPORT_VERSION) {
    throw new ImportError(`Unsupported import template version "${version}".`, 400);
  }

  const zip = new AdmZip();
  zip.addFile('manifest.json', Buffer.from(`${JSON.stringify(buildManifest(), null, 2)}\n`, 'utf8'));
  zip.addFile('README.md', Buffer.from(buildTemplateReadme(), 'utf8'));

  for (const table of TABLES) {
    const folder = table.required ? 'required' : 'optional';
    const header = `${table.columns.map((column) => csvCell(column.name)).join(',')}\n`;
    zip.addFile(`${folder}/${table.name}.csv`, Buffer.from(header, 'utf8'));
  }

  return {
    buffer: zip.toBuffer(),
    fileName: `high-tech-product-intelligence-import-template-${version}.zip`,
    contentType: 'application/zip',
  };
}

async function validateDataset({ req, body = {}, version = IMPORT_VERSION, demoUser = null }) {
  const fileOnly = isTrueish(req?.query?.fileOnly || body?.fileOnly);
  const archive = getArchiveBufferFromRequest({ req, body });
  const parsed = parseArchiveDataset(archive.buffer, version);

  return runDatasetValidation({
    parsed,
    fileOnly,
    lockKind: 'validate_upload',
    lockMessage: 'Validating uploaded dataset...',
    demoUser,
  });
}

async function startImport({ req, body = {}, version = IMPORT_VERSION, demoUser = null }) {
  const archive = getArchiveBufferFromRequest({ req, body });
  const parsed = parseArchiveDataset(archive.buffer, version);

  if (!parsed.valid) {
    throw new ImportError('Upload validation failed.', 400, {
      errors: parsed.errors,
      warnings: parsed.warnings,
      counts: parsed.counts,
    });
  }

  return startDatasetJob({
    parsed,
    kind: 'upload',
    lockMessage: 'Replacing dataset with uploaded ZIP...',
    queuedMessage: 'Import started.',
    startMessage: 'Starting dataset replacement...',
    completeMessage: 'Import completed successfully.',
    datasetSource: 'custom',
    demoUser,
  });
}

async function validateDemoRestore({
  body = {},
  query = {},
  headers = {},
  version = IMPORT_VERSION,
  demoUser = null,
}) {
  const demoDataset = getBundledDemoDataset(version);
  return runDatasetValidation({
    parsed: demoDataset.parsed,
    fileOnly: false,
    lockKind: 'validate_restore_demo',
    lockMessage: 'Validating demo dataset restore...',
    demoDateRefresh: buildDemoDateRefreshOptions({ body, query, headers }),
    demoUser,
  });
}

async function startDemoRestore({ body = {}, query = {}, headers = {}, version = IMPORT_VERSION, demoUser = null }) {
  const demoDataset = getBundledDemoDataset(version);
  return startDatasetJob({
    parsed: demoDataset.parsed,
    kind: 'restore_demo',
    lockMessage: 'Restoring the bundled demo dataset...',
    queuedMessage: 'Demo restore started.',
    startMessage: 'Restoring bundled demo dataset...',
    completeMessage: 'Demo dataset restored successfully.',
    datasetSource: 'demo',
    demoDateRefresh: buildDemoDateRefreshOptions({ body, query, headers }),
    demoUser,
  });
}

async function getImportStatus({ jobId }) {
  return getJob(jobId);
}

module.exports = {
  generateTemplateArchive,
  getActiveDataset,
  validateDataset,
  startImport,
  validateDemoRestore,
  startDemoRestore,
  getImportStatus,

  // Exposed for local verification scripts.
  _private: {
    ImportError,
    buildFallbackBrandLinks,
    buildFallbackDemandForecasts,
    buildFallbackDemandRegions,
    buildFallbackInfluencerConnections,
    buildFallbackShipments,
    buildDemoDateRefreshOptions,
    buildDemoFreshnessGuard,
    getBundledDemoDataset,
    parseArchiveDataset,
    parseDemoAnchorDate,
    reanchorDemoDates,
    rehydrateNativeJsonDocuments,
    validateNativeJsonReadiness,
    assertRequiredFeatureReadiness,
  },
};
