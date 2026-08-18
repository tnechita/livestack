const db = require('../config/database');

const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://ollama:11434').replace(/\/+$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const DEFAULT_PROFILE = 'SC_LLAMA_PROFILE';
const SCHEMA_CACHE_TTL_MS = 10 * 60 * 1000;
const ENTITY_CACHE_TTL_MS = 10 * 60 * 1000;
const GOVERNED_SCHEMA_BLOCK_MESSAGE = 'This query was not executed because it falls outside the allowed governed transportation schema.';
const ORDER_CREATED_AT_ANCHOR_SQL = `(SELECT NVL(MAX(CAST(created_at AS DATE)), SYSDATE) FROM orders)`;
const DEMAND_FORECAST_DATE_ANCHOR_SQL = `(
  SELECT COALESCE(
    MIN(CASE WHEN forecast_date >= TRUNC(SYSDATE) THEN forecast_date END),
    MIN(forecast_date),
    TRUNC(SYSDATE)
  )
  FROM demand_forecasts
)`;
const ASK_DATA_ERROR_MESSAGES = {
  API_UNREACHABLE: 'The Ask Seer Transport Data API is unreachable. Check that the app backend is running.',
  OLLAMA_UNAVAILABLE: 'The local Ollama service is unavailable. Check that the Ollama container is running and that llama3.2 is installed.',
  OLLAMA_MODEL_MISSING: 'Model llama3.2 is not available in Ollama. Pull or configure the model before using Ask Seer Transport Data.',
  OLLAMA_TIMEOUT: 'The local Ollama service did not respond in time. Try again after the model finishes warming up.',
  SQL_GENERATION_FAILED: 'Unable to generate safe SQL for that question. Try a more specific transport metric, time window, or entity.',
  SQL_VALIDATION_BLOCKED: GOVERNED_SCHEMA_BLOCK_MESSAGE,
  ORACLE_QUERY_FAILED: 'Oracle could not execute the generated query. Try rephrasing with a more specific governed transportation view.',
  REQUEST_TIMEOUT: 'The request took too long. Try a narrower question.',
  MALFORMED_LLM_RESPONSE: 'The model returned an unexpected response. Try again with a more specific transportation data question.',
  UNEXPECTED_BACKEND_RESPONSE: 'Ask Seer Transport Data could not complete the request.',
};
const ALLOWED_TABLES = [
  'AGENT_ACTIONS',
  'APP_USERS',
  'BRANDS',
  'CUSTOMERS',
  'DEMAND_FORECASTS',
  'DEMAND_REGIONS',
  'EVENT_STREAM',
  'FULFILLMENT_CENTERS',
  'FULFILLMENT_ZONES',
  'INFLUENCERS',
  'INFLUENCER_CONNECTIONS',
  'INVENTORY',
  'ORDERS',
  'ORDER_ITEMS',
  'POST_PRODUCT_MENTIONS',
  'PRODUCTS',
  'SHIPMENTS',
  'SOCIAL_POSTS',
  'SERVICE_LINES_V',
  'TRANSPORT_SERVICES_V',
  'SHIPPERS_V',
  'LOGISTICS_TERMINALS_V',
  'TERMINAL_CAPACITY_V',
  'TRANSPORT_ORDERS_V',
  'TRANSPORT_ROUTES_V',
  'SHIPPER_SIGNAL_POSTS_V',
  'SIGNAL_SOURCES_V',
  'TRANSPORT_NETWORK_ENTITIES_V',
  'TRANSPORT_NETWORK_RELATIONSHIPS_V',
  'TRANSPORT_EXCEPTION_CASES_V',
];
const ALLOWED_TABLE_SET = new Set(ALLOWED_TABLES);
const PROFILE_CATALOG = Object.freeze({
  [DEFAULT_PROFILE]: Object.freeze({
    name: DEFAULT_PROFILE,
    status: 'ENABLED',
    model: OLLAMA_MODEL,
    provider: 'Ollama',
    type: 'Local SQL + reasoning',
    description: 'Primary local Ollama model for Ask Your Data.',
  }),
});
const PROFILE_ALIASES = new Map();
[
  [
    DEFAULT_PROFILE,
    [
      DEFAULT_PROFILE,
      'SC_COHERE_PROFILE',
      'SC_EMBED_PROFILE',
      'SC_GROK42_PROFILE',
      'SC_VISION_PROFILE',
      'OLLAMA_LLAMA32',
      'OLLAMA_LLAMA32_PROFILE',
      OLLAMA_MODEL,
    ],
  ],
].forEach(([profileName, aliases]) => {
  aliases.forEach((alias) => {
    const normalized = String(alias || '').trim().toUpperCase();
    if (normalized) PROFILE_ALIASES.set(normalized, profileName);
  });
});

function schemaObject(objectName, objectType, domain, displayName, description, exampleQuestions = []) {
  return Object.freeze({
    object_name: objectName,
    object_type: objectType,
    domain,
    display_name: displayName,
    description,
    example_questions: exampleQuestions,
    is_queryable_by_assistant: true,
  });
}

const TRANSPORT_SCHEMA_OBJECTS = Object.freeze([
  schemaObject(
    'transport_orders_v',
    'view',
    'Transport Orders',
    'Transport Orders',
    'Transportation-facing view of order requests, service value, route cost, terminal assignment, urgency score, and related shipper signal.'
  ),
  schemaObject(
    'transport_services_v',
    'view',
    'Transport Services',
    'Transport Services',
    'Transportation service catalog with service category, subcategory, service value, tags, and active status.'
  ),
  schemaObject(
    'service_lines_v',
    'view',
    'Transport Services',
    'Service Lines',
    'Transportation-facing service line view backed by brand data, with operating region, annual service value, and signal tier.'
  ),
  schemaObject(
    'shippers_v',
    'view',
    'Shippers',
    'Synthetic Shippers',
    'Shipper profile view with contact, location, shipper tier, and lifetime service value.'
  ),
  schemaObject(
    'shipper_signal_posts_v',
    'view',
    'Shipper Signals',
    'Shipper Signal Posts',
    'Transportation signal feed with urgency score, severity band, reach, acknowledgements, escalations, and detected services.'
  ),
  schemaObject(
    'signal_sources_v',
    'view',
    'Shipper Signals',
    'Signal Sources',
    'Signal source view with channel, logistics role, region, reach score, follower count, and engagement rate.'
  ),
  schemaObject(
    'logistics_terminals_v',
    'view',
    'Terminal Capacity',
    'Logistics Terminals',
    'Transportation-facing terminal and access point view with location, processing capacity, utilization, and active status.'
  ),
  schemaObject(
    'terminal_capacity_v',
    'view',
    'Terminal Capacity',
    'Terminal Capacity',
    'Terminal capacity view with available, reserved, incoming, minimum threshold, and target capacity increment.'
  ),
  schemaObject(
    'transport_routes_v',
    'view',
    'Routes',
    'Transport Routes',
    'Route and shipment view with provider, status, distance, estimated hours, route cost, dispatch, and completion timestamps.'
  ),
  schemaObject(
    'demand_forecasts',
    'table',
    'Demand Forecasting',
    'Demand Forecasts',
    'Forecast records for demand signals and projected transport service needs.'
  ),
  schemaObject(
    'demand_regions',
    'table',
    'Demand Forecasting',
    'Demand Regions',
    'Regional demand planning and spatial context used by route and terminal analysis.'
  ),
  schemaObject(
    'fulfillment_zones',
    'table',
    'Terminal Capacity',
    'Fulfillment Zones',
    'Spatial service zones used for coverage, capacity, and routing analysis.'
  ),
  schemaObject(
    'transport_network_entities_v',
    'view',
    'Transport Network',
    'Transport Network Entities',
    'Risk-scored transport network entities with region, city, channel, service value, event count, and active risk status.'
  ),
  schemaObject(
    'transport_network_relationships_v',
    'view',
    'Transport Network',
    'Transport Network Relationships',
    'Transportation network relationships with evidence strength, event count, service value, and first or last seen timestamps.'
  ),
  schemaObject(
    'transport_exception_cases_v',
    'view',
    'Transport Network',
    'Transport Exception Cases',
    'Exception case view with case status, risk score, service value at risk, event count, and lifecycle timestamps.'
  ),
  schemaObject(
    'event_stream',
    'table',
    'Operations Events',
    'Operations Event Stream',
    'Operational events used by the transport demo for signal, graph, agent, and import workflows.'
  ),
  schemaObject(
    'agent_actions',
    'table',
    'AI Agent Actions',
    'Transport Agent Actions',
    'Audit records for transport AI agent tasks, decisions, execution status, and timestamps.'
  ),
]);

const TRANSPORT_SCHEMA_DOMAIN_ORDER = [
  'Transport Orders',
  'Transport Services',
  'Shippers',
  'Shipper Signals',
  'Terminal Capacity',
  'Routes',
  'Demand Forecasting',
  'Transport Network',
  'Operations Events',
  'AI Agent Actions',
];
const RELATIONSHIP_HINTS = [
  'PRODUCTS.BRAND_ID joins to BRANDS.BRAND_ID.',
  'ORDER_ITEMS.ORDER_ID joins to ORDERS.ORDER_ID.',
  'ORDER_ITEMS.PRODUCT_ID joins to PRODUCTS.PRODUCT_ID.',
  'ORDERS does not contain PRODUCT_ID or BRAND_ID; product and brand analysis must join ORDERS -> ORDER_ITEMS -> PRODUCTS -> BRANDS.',
  'ORDERS.CUSTOMER_ID joins to CUSTOMERS.CUSTOMER_ID.',
  'ORDERS.FULFILLMENT_CENTER_ID joins to FULFILLMENT_CENTERS.CENTER_ID.',
  'ORDERS.SOCIAL_SOURCE_ID links to SOCIAL_POSTS.POST_ID for social-driven orders.',
  'INVENTORY.PRODUCT_ID joins to PRODUCTS.PRODUCT_ID.',
  'INVENTORY.CENTER_ID joins to FULFILLMENT_CENTERS.CENTER_ID.',
  'SOCIAL_POSTS.INFLUENCER_ID joins to INFLUENCERS.INFLUENCER_ID.',
  'POST_PRODUCT_MENTIONS.POST_ID joins to SOCIAL_POSTS.POST_ID.',
  'POST_PRODUCT_MENTIONS.PRODUCT_ID joins to PRODUCTS.PRODUCT_ID.',
  'SHIPMENTS.ORDER_ID joins to ORDERS.ORDER_ID.',
  'SHIPMENTS.CENTER_ID joins to FULFILLMENT_CENTERS.CENTER_ID.',
  'ORDER_ITEMS.LINE_TOTAL already stores quantity * unit_price.',
  'Prefer TRANSPORT_SERVICES_V for transport service questions, SHIPPERS_V for shipper questions, LOGISTICS_TERMINALS_V and TERMINAL_CAPACITY_V for terminal capacity questions, TRANSPORT_ORDERS_V and TRANSPORT_ROUTES_V for order and route questions, and SHIPPER_SIGNAL_POSTS_V plus SIGNAL_SOURCES_V for signal questions.',
  'BRANDS.BRAND_NAME only exists on BRANDS; do not reference BRAND_NAME unless BRANDS is joined in the same query block.',
  'When using aggregates, every non-aggregated expression in SELECT must also appear in GROUP BY.',
];
const ORACLE_ONLY_SYNTAX_RULES = [
  { regex: /\bJSON_AGG\s*\(/i, reason: 'Use JSON_ARRAYAGG instead of JSON_AGG.' },
  { regex: /\bSTRING_AGG\s*\(/i, reason: 'Use LISTAGG instead of STRING_AGG.' },
  { regex: /\bILIKE\b/i, reason: 'Use UPPER(...) LIKE UPPER(...) instead of ILIKE.' },
  { regex: /\bDATE_TRUNC\s*\(/i, reason: 'Use TRUNC(date_expr, ...) instead of DATE_TRUNC.' },
  { regex: /::/, reason: 'Use CAST(expr AS type) instead of PostgreSQL :: casts.' },
  { regex: /->>|->/i, reason: 'Use JSON_VALUE or JSON_QUERY instead of PostgreSQL JSON operators.' },
];

let schemaCache = {
  expiresAt: 0,
  grouped: {},
  tableComments: {},
};
let entityCache = {
  expiresAt: 0,
  catalogs: {},
};

function normalizeProfile(profile) {
  if (!profile || !String(profile).trim()) return DEFAULT_PROFILE;
  const normalized = String(profile).trim().toUpperCase();
  return PROFILE_ALIASES.get(normalized) || DEFAULT_PROFILE;
}

function getAvailableProfiles() {
  return [PROFILE_CATALOG[DEFAULT_PROFILE]];
}

function getAvailableSelectAiProfiles() {
  return Object.values(PROFILE_CATALOG);
}

function getProfileConfig(profile) {
  return PROFILE_CATALOG[normalizeProfile(profile)] || PROFILE_CATALOG[DEFAULT_PROFILE];
}

function getProfileModel(profile) {
  return getProfileConfig(profile).model;
}

function getOllamaRuntimeConfig(profile = DEFAULT_PROFILE) {
  const resolvedProfile = normalizeProfile(profile);
  return {
    profile: resolvedProfile,
    model: getProfileModel(resolvedProfile),
    host: OLLAMA_BASE_URL,
  };
}

function getTransportSchemaObjectMetadata({ queryableOnly = true } = {}) {
  const objects = [...TRANSPORT_SCHEMA_OBJECTS];
  return queryableOnly ? objects.filter((object) => object.is_queryable_by_assistant !== false) : objects;
}

function groupTransportSchemaObjectMetadata(objects = getTransportSchemaObjectMetadata()) {
  const domainRank = new Map(TRANSPORT_SCHEMA_DOMAIN_ORDER.map((domain, index) => [domain, index]));
  const groups = new Map();

  objects.forEach((object) => {
    const domain = object.domain || 'Reference Data';
    if (!groups.has(domain)) groups.set(domain, []);
    groups.get(domain).push(object);
  });

  return [...groups.entries()]
    .sort(([leftDomain], [rightDomain]) => {
      const leftRank = domainRank.get(leftDomain) ?? Number.MAX_SAFE_INTEGER;
      const rightRank = domainRank.get(rightDomain) ?? Number.MAX_SAFE_INTEGER;
      return leftRank - rightRank || leftDomain.localeCompare(rightDomain);
    })
    .map(([domain, groupObjects]) => ({
      domain,
      objects: groupObjects.sort((left, right) => left.display_name.localeCompare(right.display_name)),
      object_count: groupObjects.length,
    }));
}

function createAskDataError(category, cause = null, extra = {}) {
  const fallbackMessage = ASK_DATA_ERROR_MESSAGES[category] || ASK_DATA_ERROR_MESSAGES.UNEXPECTED_BACKEND_RESPONSE;
  const error = new Error(extra.message || fallbackMessage);
  error.category = category;
  error.cause = cause || undefined;
  error.statusCode = extra.statusCode || (
    category === 'REQUEST_TIMEOUT' ? 504
      : category === 'SQL_VALIDATION_BLOCKED' || category === 'SQL_GENERATION_FAILED' ? 400
        : 500
  );
  Object.assign(error, extra);
  return error;
}

function normalizeAskDataError(error) {
  const message = String(error?.message || '');
  let category = error?.category || 'UNEXPECTED_BACKEND_RESPONSE';

  if (!error?.category) {
    if (message === 'timeout' || /timed out|timeout/i.test(message)) {
      category = 'REQUEST_TIMEOUT';
    } else if (/Ollama request failed/i.test(message)) {
      category = /model.*not found|not found/i.test(message) ? 'OLLAMA_MODEL_MISSING' : 'OLLAMA_UNAVAILABLE';
    } else if (/Only SELECT or WITH|Comments and multiple statements|Write operations|System packages|unsupported tables|not allowed/i.test(message)) {
      category = 'SQL_VALIDATION_BLOCKED';
    } else if (/Unable to generate|No SQL generated|safe read-only SQL|valid Oracle SQL/i.test(message)) {
      category = 'SQL_GENERATION_FAILED';
    } else if (/\bORA-\d{5}\b/i.test(message) || error?.oracleError) {
      category = 'ORACLE_QUERY_FAILED';
    }
  }

  const isBlocked = category === 'SQL_VALIDATION_BLOCKED';
  const profile = normalizeProfile(error?.profile);
  return {
    category,
    statusCode: error?.statusCode || (isBlocked || category === 'SQL_GENERATION_FAILED' ? 400 : category === 'REQUEST_TIMEOUT' ? 504 : 500),
    userMessage: isBlocked
      ? GOVERNED_SCHEMA_BLOCK_MESSAGE
      : (ASK_DATA_ERROR_MESSAGES[category] || message || ASK_DATA_ERROR_MESSAGES.UNEXPECTED_BACKEND_RESPONSE),
    developerMessage: message || ASK_DATA_ERROR_MESSAGES[category] || ASK_DATA_ERROR_MESSAGES.UNEXPECTED_BACKEND_RESPONSE,
    sql: isBlocked ? null : (error?.sql || null),
    oracleError: error?.oracleError || null,
    profile,
    model: error?.model || getProfileModel(profile),
  };
}

function getShortErrorMessage(error) {
  return String(error?.message || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || 'Unknown Oracle error';
}

function getOracleErrorCode(error) {
  const match = getShortErrorMessage(error).match(/\bORA-\d{5}\b/);
  return match ? match[0] : null;
}

function isRetryableOracleSqlError(error) {
  return /\bORA-(009\d{2}|017\d{2}|018\d{2}|030\d{2}|30482)\b/i.test(
    getShortErrorMessage(error)
  );
}

function withSqlContext(error, { sql = null, profile = DEFAULT_PROFILE, oracleError = null } = {}) {
  const resolvedProfile = normalizeProfile(profile);
  if (sql) error.sql = sql;
  error.profile = resolvedProfile;
  error.model = getProfileModel(resolvedProfile);
  error.oracleError = getShortErrorMessage({ message: oracleError || error?.message });
  return error;
}

function buildUserFacingSqlError(error, { sql = null, profile = DEFAULT_PROFILE, oracleError = null } = {}) {
  const shortOracleError = getShortErrorMessage({ message: oracleError || error?.message });
  const code = getOracleErrorCode({ message: shortOracleError });
  const friendlyMessage = [
    'Unable to generate a valid Oracle SQL query for that question.',
    'Try rephrasing with a more specific metric, time window, or entity.',
    code ? `Oracle reported ${code}.` : null,
  ].filter(Boolean).join(' ');

  return withSqlContext(new Error(friendlyMessage), {
    sql,
    profile,
    oracleError: shortOracleError,
  });
}

function createUserQueryError(message, extra = {}) {
  const error = new Error(message);
  error.isUserQueryError = true;
  Object.assign(error, extra);
  return error;
}

function normalizeEntityText(text) {
  return String(text || '')
    .toUpperCase()
    .replace(/&/g, ' AND ')
    .replace(/[^A-Z0-9]+/g, '');
}

function cleanEntityCandidate(text) {
  return String(text || '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .replace(/^(?:the|a|an)\s+/i, '')
    .replace(/\s+(?:in|for|with|by|from|during|over|on|within|across)\b.*$/i, '')
    .trim();
}

function escapeRegExp(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceFirstOccurrence(text, searchValue, replacement) {
  if (!searchValue) return text;
  return String(text).replace(new RegExp(escapeRegExp(searchValue)), replacement);
}

function levenshteinDistance(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const dp = Array.from({ length: left.length + 1 }, () => new Array(right.length + 1).fill(0));
  for (let i = 0; i <= left.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= right.length; j += 1) dp[0][j] = j;

  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[left.length][right.length];
}

function similarityScore(left, right) {
  const a = normalizeEntityText(left);
  const b = normalizeEntityText(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) {
    return Math.min(a.length, b.length) / Math.max(a.length, b.length);
  }
  const distance = levenshteinDistance(a, b);
  return 1 - (distance / Math.max(a.length, b.length));
}

async function loadEntityCatalog() {
  if (Date.now() < entityCache.expiresAt && Object.keys(entityCache.catalogs).length > 0) {
    return entityCache;
  }

  const [brandsResult, productsResult, centersResult, customersResult, influencersResult] = await Promise.all([
    db.execute(`SELECT brand_name AS value FROM brands ORDER BY brand_name`),
    db.execute(`SELECT product_name AS value FROM products ORDER BY product_name`),
    db.execute(`SELECT center_name AS value FROM fulfillment_centers ORDER BY center_name`),
    db.execute(`
      SELECT TRIM(first_name || ' ' || last_name) AS value FROM customers
      UNION
      SELECT email AS value FROM customers
    `),
    db.execute(`
      SELECT handle AS value FROM influencers
      UNION
      SELECT display_name AS value FROM influencers
    `),
  ]);

  const buildCatalog = (rows, type) =>
    (rows || [])
      .map((row) => String(row.VALUE || '').trim())
      .filter(Boolean)
      .map((value) => ({ value, normalized: normalizeEntityText(value), type }));

  entityCache = {
    expiresAt: Date.now() + ENTITY_CACHE_TTL_MS,
    catalogs: {
      brand: buildCatalog(brandsResult.rows, 'brand'),
      product: buildCatalog(productsResult.rows, 'product'),
      center: buildCatalog(centersResult.rows, 'center'),
      customer: buildCatalog(customersResult.rows, 'customer'),
      influencer: buildCatalog(influencersResult.rows, 'influencer'),
    },
  };

  return entityCache;
}

function findExactEntityMatch(catalog = [], rawValue) {
  const normalized = normalizeEntityText(rawValue);
  if (!normalized) return null;
  return catalog.find((entry) => entry.normalized === normalized) || null;
}

function rankEntityMatches(catalog = [], rawValue, limit = 3) {
  const normalized = normalizeEntityText(rawValue);
  if (!normalized) return [];
  return catalog
    .map((entry) => ({
      ...entry,
      score: similarityScore(normalized, entry.normalized),
    }))
    .sort((left, right) => right.score - left.score || left.value.localeCompare(right.value))
    .slice(0, limit)
    .filter((entry) => entry.score >= 0.35);
}

function formatEntityList(entries = []) {
  return entries.map((entry) => entry.value).join(', ');
}

function buildUnsupportedRetailerError(candidate, brandSuggestions = []) {
  const suggestionText = brandSuggestions.length
    ? ` Try a known brand such as ${formatEntityList(brandSuggestions)}.`
    : '';
  return createUserQueryError(
    `I couldn't map "${candidate}" to this demo schema. This app does not model retailers or storefronts. Ask about service lines, transport services, shippers, logistics terminals, shipper signals, routes, terminal capacity, or signal sources instead.${suggestionText}`
  );
}

function buildUnknownEntityError(candidate, entityType, suggestions = []) {
  const suggestionText = suggestions.length
    ? ` Closest ${entityType} matches: ${formatEntityList(suggestions)}.`
    : '';
  return createUserQueryError(
    `I couldn't find a ${entityType} named "${candidate}" in this demo schema.${suggestionText}`
  );
}

async function resolveQuestionEntities(question) {
  const originalQuestion = String(question || '').trim();
  const { catalogs } = await loadEntityCatalog();
  let resolvedQuestion = originalQuestion;
  const resolutionHints = [];

  const retailerPatterns = [
    /\b(?:sold|available|stocked|carried)\s+at\s+(.+?)(?=$|[?.!,])/i,
    /\b(?:retailer|store|storefront)\s+(?:named|called\s+)?["']?(.+?)["']?(?=$|[?.!,])/i,
  ];

  for (const regex of retailerPatterns) {
    const match = originalQuestion.match(regex);
    if (!match) continue;
    const candidate = cleanEntityCandidate(match[1]);
    if (!candidate) continue;

    const supportedMatch = [
      findExactEntityMatch(catalogs.brand, candidate),
      findExactEntityMatch(catalogs.product, candidate),
      findExactEntityMatch(catalogs.center, candidate),
      findExactEntityMatch(catalogs.customer, candidate),
      findExactEntityMatch(catalogs.influencer, candidate),
    ].find(Boolean);

    if (!supportedMatch) {
      throw buildUnsupportedRetailerError(candidate, rankEntityMatches(catalogs.brand, candidate, 3));
    }
  }

  const explicitEntityPatterns = [
    { type: 'brand', regexes: [/\bbrand\s+(?:named|called)\s+["']?(.+?)["']?(?=$|[?.!,])/i] },
    { type: 'product', regexes: [/\bproduct\s+(?:named|called)\s+["']?(.+?)["']?(?=$|[?.!,])/i] },
    { type: 'center', regexes: [/\b(?:fulfillment\s+center|warehouse|center)\s+(?:named|called)\s+["']?(.+?)["']?(?=$|[?.!,])/i] },
    { type: 'customer', regexes: [/\bcustomer\s+(?:named|called)\s+["']?(.+?)["']?(?=$|[?.!,])/i] },
    { type: 'influencer', regexes: [/\binfluencer\s+(?:named|called)\s+@?["']?(.+?)["']?(?=$|[?.!,])/i] },
  ];

  for (const entry of explicitEntityPatterns) {
    for (const regex of entry.regexes) {
      const match = originalQuestion.match(regex);
      if (!match) continue;
      const candidate = cleanEntityCandidate(match[1]);
      if (!candidate) continue;

      const exact = findExactEntityMatch(catalogs[entry.type], candidate);
      if (exact) {
        if (exact.value !== candidate) {
          resolvedQuestion = replaceFirstOccurrence(resolvedQuestion, candidate, exact.value);
          resolutionHints.push(`Entity resolution: treat "${candidate}" as ${entry.type} "${exact.value}".`);
        }
        break;
      }

      throw buildUnknownEntityError(candidate, entry.type, rankEntityMatches(catalogs[entry.type], candidate, 3));
    }
  }

  const quotedPattern = /["']([^"']{2,})["']/g;
  let quotedMatch;
  while ((quotedMatch = quotedPattern.exec(originalQuestion)) !== null) {
    const candidate = cleanEntityCandidate(quotedMatch[1]);
    if (!candidate) continue;

    const exactMatch =
      findExactEntityMatch(catalogs.brand, candidate)
      || findExactEntityMatch(catalogs.product, candidate)
      || findExactEntityMatch(catalogs.center, candidate)
      || findExactEntityMatch(catalogs.customer, candidate)
      || findExactEntityMatch(catalogs.influencer, candidate);

    if (!exactMatch) continue;

    if (exactMatch.value !== candidate) {
      resolvedQuestion = replaceFirstOccurrence(resolvedQuestion, candidate, exactMatch.value);
      resolutionHints.push(`Entity resolution: treat "${candidate}" as ${exactMatch.type} "${exactMatch.value}".`);
    }
  }

  return {
    question: resolvedQuestion,
    resolutionHints,
  };
}

function stripCodeFences(text) {
  return String(text || '')
    .replace(/^```(?:json|sql)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function parseJsonResponse(text) {
  const cleaned = stripCodeFences(text);
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('Ollama returned invalid JSON');
  }
}

async function ollamaGenerate(prompt, { format = null, temperature = 0.1, numPredict = 192, profile = DEFAULT_PROFILE } = {}) {
  const { model } = getProfileConfig(profile);
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      format: format || undefined,
      prompt,
      options: {
        temperature,
        num_predict: numPredict,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`Ollama request failed (${response.status}): ${body}`);
  }

  const payload = await response.json();
  return stripCodeFences(payload?.response || '');
}

async function ollamaJson(systemPrompt, userPrompt, { profile = DEFAULT_PROFILE } = {}) {
  const text = await ollamaGenerate(
    `${systemPrompt}\n\n${userPrompt}`,
    { format: 'json', temperature: 0.05, numPredict: 160, profile }
  );
  return parseJsonResponse(text);
}

async function ollamaText(systemPrompt, userPrompt, { temperature = 0.2, profile = DEFAULT_PROFILE } = {}) {
  return ollamaGenerate(`${systemPrompt}\n\n${userPrompt}`, {
    temperature,
    numPredict: 220,
    profile,
  });
}

async function checkAskTransportDataHealth({ demoUser = 'admin_jess', profile = DEFAULT_PROFILE } = {}) {
  const resolvedProfile = normalizeProfile(profile);
  const runtime = getOllamaRuntimeConfig(resolvedProfile);
  const checks = [];

  async function check(name, fn) {
    const startedAt = Date.now();
    try {
      const details = await fn();
      checks.push({
        name,
        status: 'ok',
        duration_ms: Date.now() - startedAt,
        ...(details || {}),
      });
    } catch (error) {
      const normalized = normalizeAskDataError(error);
      checks.push({
        name,
        status: 'failed',
        duration_ms: Date.now() - startedAt,
        category: normalized.category,
        message: normalized.developerMessage,
      });
    }
  }

  await check('oracle_connection', async () => {
    const result = await db.execute('SELECT 1 AS ok FROM dual');
    return { rows: result.rows?.length || 0 };
  });

  await check('schema_metadata', async () => {
    const metadata = await loadSchemaMetadata();
    return { objects: Object.keys(metadata.grouped || {}).length };
  });

  await check('governed_query', async () => {
    const result = await executeReadOnlySql('SELECT COUNT(*) AS transport_orders FROM orders', { demoUser, maxRows: 1 });
    return { row_count: result.rowCount };
  });

  await check('ollama_tags', async () => {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { method: 'GET' });
    if (!response.ok) {
      throw createAskDataError('OLLAMA_UNAVAILABLE', null, {
        message: `Ollama tags request failed with HTTP ${response.status}`,
      });
    }
    const payload = await response.json().catch(() => ({}));
    const models = (payload.models || []).map((model) => model.name || model.model).filter(Boolean);
    return {
      ollama_host: runtime.host,
      selected_model: runtime.model,
      model_available: models.some((name) => String(name).startsWith(runtime.model)),
    };
  });

  const failed = checks.filter((entry) => entry.status !== 'ok');
  return {
    status: failed.length ? 'degraded' : 'healthy',
    profile: resolvedProfile,
    model: runtime.model,
    ollama_host: runtime.host,
    checks,
  };
}

async function loadSchemaMetadata() {
  if (Date.now() < schemaCache.expiresAt && Object.keys(schemaCache.grouped).length > 0) {
    return schemaCache;
  }

  const binds = {};
  const placeholders = ALLOWED_TABLES.map((tableName, index) => {
    const key = `t${index}`;
    binds[key] = tableName;
    return `:${key}`;
  }).join(', ');

  const [tablesResult, columnsResult] = await Promise.all([
    db.execute(
      `SELECT table_name, comments
       FROM user_tab_comments
       WHERE table_name IN (${placeholders})
       ORDER BY table_name`,
      binds
    ),
    db.execute(
      `SELECT utc.table_name,
              utc.column_id,
              utc.column_name,
              utc.data_type,
              NVL(ucc.comments, '') AS column_comment
       FROM user_tab_columns utc
       LEFT JOIN user_col_comments ucc
         ON ucc.table_name = utc.table_name
        AND ucc.column_name = utc.column_name
       WHERE utc.table_name IN (${placeholders})
       ORDER BY utc.table_name, utc.column_id`,
      binds
    ),
  ]);

  const tableComments = Object.fromEntries(
    (tablesResult.rows || []).map((row) => [row.TABLE_NAME, row.COMMENTS || ''])
  );

  const grouped = {};
  for (const row of columnsResult.rows || []) {
    if (!grouped[row.TABLE_NAME]) grouped[row.TABLE_NAME] = [];
    grouped[row.TABLE_NAME].push(
      row.COLUMN_COMMENT
        ? `${row.COLUMN_NAME} ${row.DATA_TYPE} (${row.COLUMN_COMMENT})`
        : `${row.COLUMN_NAME} ${row.DATA_TYPE}`
    );
  }

  const tableLines = ALLOWED_TABLES
    .filter((tableName) => grouped[tableName]?.length)
    .map((tableName) => {
      const comment = tableComments[tableName] ? ` -- ${tableComments[tableName]}` : '';
      return `${tableName}${comment}\n  ${grouped[tableName].join(', ')}`;
    });

  schemaCache = {
    grouped,
    tableComments,
    expiresAt: Date.now() + SCHEMA_CACHE_TTL_MS,
  };

  return schemaCache;
}

function selectRelevantTables(question) {
  const q = String(question || '').toLowerCase();
  const selected = new Set();

  if (/(viral|virality|trend|trending|momentum|social|post|influencer|engagement|views|likes|shares|sentiment)/.test(q)) {
    ['BRANDS', 'INFLUENCERS', 'POST_PRODUCT_MENTIONS', 'PRODUCTS', 'SOCIAL_POSTS', 'SHIPPER_SIGNAL_POSTS_V', 'SIGNAL_SOURCES_V', 'TRANSPORT_SERVICES_V'].forEach((tableName) => selected.add(tableName));
  }

  if (/(inventory|fulfillment|warehouse|restock|reorder|stock|ship|shipping|delivery|route|routing|center|nearest|customer in|demand)/.test(q)) {
    ['CUSTOMERS', 'DEMAND_FORECASTS', 'DEMAND_REGIONS', 'FULFILLMENT_CENTERS', 'FULFILLMENT_ZONES', 'INVENTORY', 'PRODUCTS', 'SHIPMENTS', 'SHIPPERS_V', 'LOGISTICS_TERMINALS_V', 'TERMINAL_CAPACITY_V', 'TRANSPORT_ROUTES_V'].forEach((tableName) => selected.add(tableName));
  }

  if (/(order|orders|revenue|sales|customer|brand|product|price|category|total|average|best-selling)/.test(q)) {
    ['BRANDS', 'CUSTOMERS', 'ORDERS', 'ORDER_ITEMS', 'PRODUCTS', 'SHIPMENTS', 'SERVICE_LINES_V', 'TRANSPORT_SERVICES_V', 'SHIPPERS_V', 'TRANSPORT_ORDERS_V', 'TRANSPORT_ROUTES_V'].forEach((tableName) => selected.add(tableName));
  }

  if (/(user|users|region|role|account)/.test(q)) {
    ['APP_USERS'].forEach((tableName) => selected.add(tableName));
  }

  if (selected.size === 0) {
    ['BRANDS', 'CUSTOMERS', 'ORDERS', 'ORDER_ITEMS', 'PRODUCTS', 'SOCIAL_POSTS'].forEach((tableName) => selected.add(tableName));
  }

  return [...selected];
}

async function getSchemaContext(question = '') {
  const metadata = await loadSchemaMetadata();
  const selectedTables = selectRelevantTables(question);

  const tableLines = selectedTables
    .filter((tableName) => metadata.grouped[tableName]?.length)
    .map((tableName) => {
      const comment = metadata.tableComments[tableName] ? ` -- ${metadata.tableComments[tableName]}` : '';
      return `${tableName}${comment}\n  ${metadata.grouped[tableName].join(', ')}`;
    });

  return [
    'Available Oracle schema for this app:',
    tableLines.join('\n'),
    'Key joins and semantics:',
    ...RELATIONSHIP_HINTS
      .filter((hint) => selectedTables.some((tableName) => hint.includes(tableName)))
      .map((hint) => `- ${hint}`),
    '- Prefer semantic transportation views when they are present: SERVICE_LINES_V, TRANSPORT_SERVICES_V, SHIPPERS_V, LOGISTICS_TERMINALS_V, TERMINAL_CAPACITY_V, TRANSPORT_ORDERS_V, TRANSPORT_ROUTES_V, SHIPPER_SIGNAL_POSTS_V, SIGNAL_SOURCES_V, TRANSPORT_NETWORK_ENTITIES_V, TRANSPORT_EXCEPTION_CASES_V.',
    '- SOCIAL_POSTS.MOMENTUM_FLAG values include normal, rising, viral, and mega_viral; present them as normal, rising, urgent, and critical signal momentum.',
    '- INVENTORY low-stock logic represents terminal capacity and typically compares QUANTITY_ON_HAND to REORDER_POINT.',
    '- Service value questions usually use ORDERS.ORDER_TOTAL or ORDER_ITEMS.LINE_TOTAL.',
  ].join('\n');
}

function sanitizeSql(sql) {
  return stripCodeFences(String(sql || ''))
    .replace(/;+\s*$/g, '')
    .trim();
}

function generatePatternSql(question) {
  const q = String(question || '').trim();
  const qLower = q.toLowerCase();

  const topMatch = qLower.match(/\btop\s+(\d+)\b/);
  const topN = topMatch ? Math.min(parseInt(topMatch[1], 10), 25) : 5;
  const dayMatch = qLower.match(/\b(?:last|past)\s+(\d+)\s+days?\b/);
  const dayWindow = dayMatch ? Math.min(parseInt(dayMatch[1], 10), 365) : null;

  if (/(how many transport orders.*\b(in total|total|overall)\b|summarize .*how many transport orders|summarize .*total transport orders|total transport order count|overall transport order count|count of transport orders)/.test(qLower)) {
    return `SELECT COUNT(*) AS total_transport_orders FROM orders`;
  }

  if (/total service value.*all transport orders|service value from all transport orders|overall service value/.test(qLower)) {
    return `SELECT ROUND(SUM(order_total), 2) AS total_service_value FROM orders`;
  }

  if (/service value.*service category|service value by category|service category.*service value|breakdown by category/.test(qLower)) {
    return `SELECT p.category,
                   COUNT(DISTINCT o.order_id) AS transport_orders,
                   ROUND(SUM(oi.quantity * oi.unit_price), 2) AS service_value
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            JOIN products p ON oi.product_id = p.product_id
            GROUP BY p.category
            ORDER BY service_value DESC`;
  }

  if (/service value by service line|service line service value|service line value breakdown/.test(qLower)) {
    const dateFilter = dayWindow ? `WHERE CAST(o.created_at AS DATE) >= ${ORDER_CREATED_AT_ANCHOR_SQL} - ${dayWindow}` : '';
    return `SELECT b.brand_name,
                   COUNT(DISTINCT o.order_id) AS transport_orders,
                   ROUND(SUM(oi.line_total), 2) AS service_value
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.order_id
            JOIN products p ON p.product_id = oi.product_id
            JOIN brands b ON b.brand_id = p.brand_id
            ${dateFilter}
            GROUP BY b.brand_name
            ORDER BY service_value DESC
            FETCH FIRST ${topN} ROWS ONLY`;
  }

  if (/(which is the best transportation service|what is the best transportation service|top .*transportation services.*service value|transportation services by service value)/.test(qLower)) {
    const dateFilter = dayWindow ? `WHERE CAST(o.created_at AS DATE) >= ${ORDER_CREATED_AT_ANCHOR_SQL} - ${dayWindow}` : '';
    const limit = (!topMatch && /best transportation service/.test(qLower)) ? 1 : topN;
    return `SELECT p.product_name,
                   b.brand_name,
                   ROUND(SUM(oi.line_total), 2) AS service_value,
                   SUM(oi.quantity) AS units_sold
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            JOIN products p ON oi.product_id = p.product_id
            JOIN brands b ON p.brand_id = b.brand_id
            ${dateFilter}
            GROUP BY p.product_name, b.brand_name
            ORDER BY service_value DESC, units_sold DESC
            FETCH FIRST ${limit} ROWS ONLY`;
  }

  if (/(predicted|forecast|projected).*(demand surge|demand risk|surge|highest demand)|demand surge.*(this week|week|forecast|predicted)/.test(qLower)) {
    if (/(operating region|by region|regional|region breakdown|break .*down)/.test(qLower)) {
      return `SELECT df.region AS operating_region,
                     p.product_name,
                     b.brand_name,
                     COUNT(DISTINCT df.forecast_date) AS forecast_days,
                     ROUND(SUM(df.predicted_demand), 0) AS predicted_weekly_demand,
                     ROUND(AVG(df.social_factor), 2) AS avg_signal_multiplier,
                     ROUND(MIN(df.confidence_low), 0) AS confidence_low,
                     ROUND(MAX(df.confidence_high), 0) AS confidence_high
              FROM demand_forecasts df
              JOIN products p ON p.product_id = df.product_id
              JOIN brands b ON b.brand_id = p.brand_id
              WHERE df.forecast_date BETWEEN ${DEMAND_FORECAST_DATE_ANCHOR_SQL}
                AND ${DEMAND_FORECAST_DATE_ANCHOR_SQL} + 7
              GROUP BY df.region, p.product_name, b.brand_name
              ORDER BY avg_signal_multiplier DESC, predicted_weekly_demand DESC
              FETCH FIRST ${Math.max(topN, 12)} ROWS ONLY`;
    }

    return `SELECT p.product_name,
                   b.brand_name,
                   COUNT(DISTINCT df.region) AS forecast_regions,
                   ROUND(SUM(df.predicted_demand), 0) AS predicted_weekly_demand,
                   ROUND(AVG(df.social_factor), 2) AS avg_signal_multiplier,
                   ROUND(MIN(df.confidence_low), 0) AS confidence_low,
                   ROUND(MAX(df.confidence_high), 0) AS confidence_high,
                   MIN(df.forecast_date) AS forecast_start,
                   MAX(df.forecast_date) AS forecast_end
            FROM demand_forecasts df
            JOIN products p ON p.product_id = df.product_id
            JOIN brands b ON b.brand_id = p.brand_id
            WHERE df.forecast_date BETWEEN ${DEMAND_FORECAST_DATE_ANCHOR_SQL}
              AND ${DEMAND_FORECAST_DATE_ANCHOR_SQL} + 7
            GROUP BY p.product_name, b.brand_name
            ORDER BY avg_signal_multiplier DESC, predicted_weekly_demand DESC
            FETCH FIRST ${topN} ROWS ONLY`;
  }

  const viralityMatch = qLower.match(/(?:urgency|virality) score above\s+(\d+)/);
  if (/(how many transportation signal posts|how many social posts)/.test(qLower) && viralityMatch) {
    return `SELECT COUNT(*) AS signal_post_count
            FROM social_posts
            WHERE virality_score > ${parseInt(viralityMatch[1], 10)}`;
  }

  if (/logistics terminals have the most available capacity|terminals.*capacity|centers have the most capacity|most capacity/.test(qLower)) {
    return `SELECT fc.center_name,
                   fc.city,
                   fc.state_province,
                   NVL(SUM(i.quantity_on_hand), 0) AS total_capacity
            FROM fulfillment_centers fc
            LEFT JOIN inventory i ON fc.center_id = i.center_id
            GROUP BY fc.center_name, fc.city, fc.state_province
            ORDER BY total_capacity DESC
            FETCH FIRST ${topN} ROWS ONLY`;
  }

  if (/highest average request value|average request value by service line/.test(qLower)) {
    return `SELECT brand_name,
                   ROUND(AVG(brand_order_value), 2) AS avg_request_value
            FROM (
              SELECT o.order_id,
                     b.brand_name,
                     SUM(oi.quantity * oi.unit_price) AS brand_order_value
              FROM orders o
              JOIN order_items oi ON o.order_id = oi.order_id
              JOIN products p ON oi.product_id = p.product_id
              JOIN brands b ON p.brand_id = b.brand_id
              GROUP BY o.order_id, b.brand_name
            )
            GROUP BY brand_name
            ORDER BY avg_request_value DESC
            FETCH FIRST ${topN} ROWS ONLY`;
  }

  if (/how many transport orders have a community signal source|transport orders.*signal source|signal-driven transport orders/.test(qLower)) {
    return `SELECT COUNT(*) AS signal_driven_transport_orders
            FROM orders
            WHERE social_source_id IS NOT NULL`;
  }

  if (/average shipper-signal urgency score by platform|urgency.*by platform/.test(qLower)) {
    return `SELECT platform,
                   ROUND(AVG(virality_score), 2) AS avg_urgency_score,
                   COUNT(*) AS post_count
            FROM social_posts
            GROUP BY platform
            ORDER BY avg_urgency_score DESC`;
  }

  if (/synthetic shippers .*most transport orders|shippers .*most requests|top synthetic shippers by requests/.test(qLower)) {
    return `SELECT c.first_name || ' ' || c.last_name AS shipper_name,
                   c.email,
                   COUNT(o.order_id) AS request_count,
                   ROUND(SUM(o.order_total), 2) AS total_service_value
            FROM customers c
            JOIN orders o ON c.customer_id = o.customer_id
            GROUP BY c.first_name, c.last_name, c.email
            ORDER BY request_count DESC, total_service_value DESC
            FETCH FIRST ${topN} ROWS ONLY`;
  }

  if (/how many transport orders were placed this week|transport orders placed this week/.test(qLower)) {
    return `SELECT COUNT(*) AS transport_orders_this_week
            FROM orders
            WHERE CAST(created_at AS DATE) >= TRUNC(${ORDER_CREATED_AT_ANCHOR_SQL}, 'IW')`;
  }

  if (/(break .*down|breakdown|show|group).*(operating region|by region|regional)|operating region/.test(qLower)) {
    return `SELECT df.region AS operating_region,
                   p.product_name,
                   b.brand_name,
                   COUNT(DISTINCT df.forecast_date) AS forecast_days,
                   ROUND(SUM(df.predicted_demand), 0) AS predicted_weekly_demand,
                   ROUND(AVG(df.social_factor), 2) AS avg_signal_multiplier
            FROM demand_forecasts df
            JOIN products p ON p.product_id = df.product_id
            JOIN brands b ON b.brand_id = p.brand_id
            WHERE df.forecast_date BETWEEN ${DEMAND_FORECAST_DATE_ANCHOR_SQL}
              AND ${DEMAND_FORECAST_DATE_ANCHOR_SQL} + 7
            GROUP BY df.region, p.product_name, b.brand_name
            ORDER BY avg_signal_multiplier DESC, predicted_weekly_demand DESC
            FETCH FIRST ${Math.max(topN, 12)} ROWS ONLY`;
  }

  if (/top transportation services by service value|transportation services by service value/.test(qLower)) {
    return `SELECT p.product_name,
                   ROUND(SUM(oi.line_total), 2) AS service_value
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            GROUP BY p.product_name
            ORDER BY service_value DESC
            FETCH FIRST ${topN} ROWS ONLY`;
  }

  return null;
}

function extractReferencedTables(sql) {
  const tables = new Set();
  const regex = /\b(?:from|join)\s+([A-Za-z0-9_."$#]+)/gi;
  let match;

  while ((match = regex.exec(sql)) !== null) {
    const rawIdentifier = match[1].split(/\s+/)[0];
    const baseName = rawIdentifier
      .split('.')
      .pop()
      .replace(/"/g, '')
      .toUpperCase();
    if (baseName) tables.add(baseName);
  }

  return [...tables];
}

function validateReadOnlySql(sql) {
  const normalized = sanitizeSql(sql);
  if (!normalized) {
    return { ok: false, reason: 'No SQL generated.' };
  }

  if (!/^(SELECT|WITH)\b/i.test(normalized)) {
    return { ok: false, reason: 'Only SELECT or WITH statements are allowed.' };
  }

  if (/[;]|\-\-|\/\*|\*\//.test(normalized)) {
    return { ok: false, reason: 'Comments and multiple statements are not allowed.' };
  }

  if (/\b(INSERT|UPDATE|DELETE|MERGE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|CREATE|DECLARE|BEGIN|COMMIT|ROLLBACK|CALL|EXECUTE)\b/i.test(normalized)) {
    return { ok: false, reason: 'Write operations and PL/SQL are not allowed.' };
  }

  if (/\b(DBMS_|UTL_|SYS\.|DBA_|ALL_|USER_|V\$)\b/i.test(normalized)) {
    return { ok: false, reason: 'System packages and metadata views are not allowed.' };
  }

  for (const rule of ORACLE_ONLY_SYNTAX_RULES) {
    if (rule.regex.test(normalized)) {
      return { ok: false, reason: rule.reason };
    }
  }

  const referencedTables = extractReferencedTables(normalized);
  const disallowedTables = referencedTables.filter(
    (tableName) => tableName !== 'DUAL' && !ALLOWED_TABLE_SET.has(tableName)
  );

  if (disallowedTables.length > 0) {
    return {
      ok: false,
      reason: `Query referenced unsupported tables: ${disallowedTables.join(', ')}`,
    };
  }

  return { ok: true, sql: normalized };
}

async function generateReadOnlySql(question, { mode = 'narrate', profile = DEFAULT_PROFILE, resolutionHints = [], conversationContext = [] } = {}) {
  const patternSql = generatePatternSql(question);
  if (patternSql) {
    const validation = validateReadOnlySql(patternSql);
    if (validation.ok) {
      return validation.sql;
    }
  }

  const schemaContext = await getSchemaContext(question);
  const response = await ollamaJson(
    [
      'You translate natural language into a single Oracle SQL query for a fixed application schema.',
      'Return JSON only with keys "sql" and "reason".',
      'Rules:',
      '- Use only Oracle SQL.',
      '- Generate exactly one read-only SELECT or WITH query.',
      '- Never use DBMS_CLOUD_AI, SELECT AI, PL/SQL, DDL, DML, comments, or semicolons.',
      '- Do not use PostgreSQL syntax such as JSON_AGG, STRING_AGG, ILIKE, :: casts, DATE_TRUNC, or -> / ->> JSON operators.',
      '- Use Oracle equivalents such as JSON_ARRAYAGG, LISTAGG, TRUNC(date_expr, ...), CAST(... AS ...), JSON_VALUE, and JSON_QUERY.',
      '- Use only the tables and columns provided in the schema.',
      '- Use explicit joins on the documented relationships.',
      '- Do not reference columns from an alias unless that alias is joined in the same SELECT block.',
      '- ORDERS does not contain PRODUCT_ID or BRAND_ID; product and brand analysis must join ORDERS -> ORDER_ITEMS -> PRODUCTS -> BRANDS.',
      '- When using aggregates, every selected expression must either be aggregated or included in GROUP BY.',
      '- For list-style results, prefer FETCH FIRST 25 ROWS ONLY.',
      '- If the request cannot be answered from the schema, return an empty sql string and explain why in reason.',
    ].join('\n'),
    [
      `Question: ${question}`,
      `Mode: ${mode}`,
      resolutionHints.length ? `Resolved entities:\n- ${resolutionHints.join('\n- ')}` : null,
      mode === 'chat' && conversationContext.length
        ? `Conversation context. Use this to resolve follow-ups such as "those", "them", "same", or "by region". Answer the latest question, not an earlier one. If the latest question refers to a previous result, preserve that result's domain and adapt its grouping/filtering; do not switch to an unrelated domain:\n${JSON.stringify(conversationContext.slice(-6))}`
        : null,
      schemaContext,
    ].filter(Boolean).join('\n\n'),
    { profile }
  );

  const sql = response?.sql || '';
  const validation = validateReadOnlySql(sql);
  if (!sql || !validation.ok) {
    throw new Error(response?.reason || validation.reason || 'Unable to generate a safe read-only SQL query.');
  }

  return validation.sql;
}

async function repairReadOnlySql(question, failedSql, failedError, { mode = 'narrate', profile = DEFAULT_PROFILE, resolutionHints = [], conversationContext = [] } = {}) {
  const schemaContext = await getSchemaContext(question);
  const response = await ollamaJson(
    [
      'You repair a failing Oracle SQL query for a fixed application schema.',
      'Return JSON only with keys "sql" and "reason".',
      'Rules:',
      '- Keep the original user intent, but fix the SQL so it compiles and runs in Oracle.',
      '- Generate exactly one read-only SELECT or WITH query.',
      '- Never use DBMS_CLOUD_AI, SELECT AI, PL/SQL, DDL, DML, comments, or semicolons.',
      '- Use only the tables, columns, and joins that exist in the provided schema context.',
      '- Do not reference columns from an alias unless that alias is joined in the same SELECT block.',
      '- ORDERS does not contain PRODUCT_ID or BRAND_ID; product and brand analysis must join ORDERS -> ORDER_ITEMS -> PRODUCTS -> BRANDS.',
      '- When using aggregates, every selected expression must either be aggregated or included in GROUP BY.',
      '- If Oracle reported an invalid identifier, remove or replace the bad column/table reference.',
      '- If Oracle reported a GROUP BY error, correct the aggregation instead of changing the question intent.',
      '- If you cannot repair the query from the schema, return an empty sql string and explain why in reason.',
    ].join('\n'),
    [
      `Question: ${question}`,
      `Mode: ${mode}`,
      resolutionHints.length ? `Resolved entities:\n- ${resolutionHints.join('\n- ')}` : null,
      mode === 'chat' && conversationContext.length
        ? `Conversation context:\n${JSON.stringify(conversationContext.slice(-6))}`
        : null,
      `Oracle error: ${getShortErrorMessage(failedError)}`,
      `Failing SQL:\n${failedSql}`,
      schemaContext,
    ].filter(Boolean).join('\n\n'),
    { profile }
  );

  const repairedSql = response?.sql || '';
  const validation = validateReadOnlySql(repairedSql);
  if (!repairedSql || !validation.ok) {
    throw new Error(response?.reason || validation.reason || 'Unable to repair the SQL query.');
  }

  return validation.sql;
}

async function executeReadOnlySql(sql, { demoUser = null, maxRows = 200 } = {}) {
  const validation = validateReadOnlySql(sql);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  return db.withActorConnection(demoUser || 'admin_jess', async (connection) => {
    const result = await connection.execute(validation.sql, {}, {
      outFormat: db.oracledb.OUT_FORMAT_OBJECT,
      maxRows,
    });

    const rows = [];
    for (const row of result.rows || []) {
      const processedRow = {};
      for (const [key, value] of Object.entries(row)) {
        if (value && typeof value.getData === 'function') {
          processedRow[key] = await value.getData();
        } else {
          processedRow[key] = value;
        }
      }
      rows.push(processedRow);
    }

    return {
      columns: (result.metaData || []).map((column) => column.name),
      rows,
      rowCount: rows.length,
      sql: validation.sql,
    };
  });
}

function contextualizeChatQuestion(question, conversationContext = []) {
  const current = String(question || '').trim();
  if (!current || !conversationContext.length) return current;

  const previousUser = [...conversationContext]
    .reverse()
    .find((message) => message?.role === 'user' && String(message.text || '').trim());
  if (!previousUser) return current;

  const isFollowUp = /\b(?:those|them|these|that|it|same|ones|results)\b/i.test(current)
    || /^(?:show|break|compare|filter|sort|what about|how about|and)\b/i.test(current);
  if (!isFollowUp) return current;

  return `Follow-up to the previous transportation question: "${String(previousUser.text).trim()}". The user now asks: "${current}"`;
}

async function runQuestionQuery(question, { mode = 'narrate', demoUser = null, profile = DEFAULT_PROFILE, maxRows = 200, conversationContext = [] } = {}) {
  const resolvedProfile = normalizeProfile(profile);
  const effectiveChatQuestion = mode === 'chat'
    ? contextualizeChatQuestion(question, conversationContext)
    : question;
  const resolution = await resolveQuestionEntities(effectiveChatQuestion);
  const effectiveQuestion = resolution.question;
  const initialSql = await generateReadOnlySql(effectiveQuestion, {
    mode,
    profile: resolvedProfile,
    resolutionHints: resolution.resolutionHints,
    conversationContext,
  });
  let currentSql = initialSql;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await executeReadOnlySql(currentSql, { demoUser, maxRows });
      return {
        ...result,
        profile: resolvedProfile,
        model: getProfileModel(resolvedProfile),
        repairedFromSql: currentSql === initialSql ? null : initialSql,
        resolvedQuestion: effectiveQuestion,
      };
    } catch (error) {
      if (!isRetryableOracleSqlError(error)) {
        throw withSqlContext(error, { sql: currentSql, profile: resolvedProfile });
      }

      if (attempt === 2) {
        throw buildUserFacingSqlError(error, {
          sql: currentSql,
          profile: resolvedProfile,
          oracleError: error.message,
        });
      }

      let repairedSql;
      try {
        repairedSql = await repairReadOnlySql(effectiveQuestion, currentSql, error, {
          mode,
          profile: resolvedProfile,
          resolutionHints: resolution.resolutionHints,
          conversationContext,
        });
      } catch (repairPromptError) {
        throw buildUserFacingSqlError(repairPromptError, {
          sql: currentSql,
          profile: resolvedProfile,
          oracleError: error.message,
        });
      }

      if (!repairedSql || repairedSql === currentSql) {
        throw buildUserFacingSqlError(error, {
          sql: currentSql,
          profile: resolvedProfile,
          oracleError: error.message,
        });
      }

      currentSql = repairedSql;
    }
  }

  throw buildUserFacingSqlError(new Error('Unable to produce a working SQL query.'), {
    sql: currentSql,
    profile: resolvedProfile,
  });
}

async function generateQuestionSql(question, { mode = 'showsql', profile = DEFAULT_PROFILE } = {}) {
  const resolvedProfile = normalizeProfile(profile);
  const resolution = await resolveQuestionEntities(question);
  const sql = await generateReadOnlySql(resolution.question, {
    mode,
    profile: resolvedProfile,
    resolutionHints: resolution.resolutionHints,
  });

  return {
    sql,
    profile: resolvedProfile,
    model: getProfileModel(resolvedProfile),
    warnings: resolution.resolutionHints || [],
    resolvedQuestion: resolution.question,
  };
}

function buildPromptRows(rows, maxRows = 12) {
  return JSON.stringify(rows.slice(0, maxRows), null, 2);
}

function formatValue(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? value.toLocaleString('en-US')
      : value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  return String(value);
}

const ANSWER_COLUMN_LABELS = {
  BRAND_NAME: 'service line',
  AVG_SIGNAL_MULTIPLIER: 'average signal multiplier',
  CONFIDENCE_HIGH: 'confidence high',
  CONFIDENCE_LOW: 'confidence low',
  CUSTOMER_ID: 'shipper id',
  CUSTOMER_NAME: 'shipper',
  FORECAST_DAYS: 'forecast days',
  FORECAST_REGIONS: 'forecast regions',
  LINE_TOTAL: 'service line value',
  ORDER_ID: 'transport order id',
  ORDER_STATUS: 'transport order status',
  ORDER_TOTAL: 'service value',
  OPERATING_REGION: 'operating region',
  PRODUCT_ID: 'transport service id',
  PRODUCT_NAME: 'transport service',
  PREDICTED_WEEKLY_DEMAND: 'predicted weekly demand',
  SHIPPING_COST: 'route cost',
  UNIT_PRICE: 'service value',
  UNITS_SOLD: 'service units',
};

function formatAnswerColumnLabel(column) {
  const key = String(column || '').toUpperCase();
  return ANSWER_COLUMN_LABELS[key] || key.toLowerCase().replace(/_/g, ' ');
}

function deterministicSummary({ mode = 'narrate', sql, columns, rows, rowCount }) {
  if (!rows || rows.length === 0) {
    return 'No matching rows were found for that question.';
  }

  if (rowCount === 1) {
    const entries = Object.entries(rows[0]).map(([key, value]) => `${formatAnswerColumnLabel(key)}: ${formatValue(value)}`);
    return mode === 'chat'
      ? `I found one result. ${entries.join(', ')}.`
      : entries.join(', ');
  }

  const preview = rows.slice(0, 5).map((row) =>
    columns
      .slice(0, 4)
      .map((column) => `${formatAnswerColumnLabel(column)}: ${formatValue(row[column])}`)
      .join(', ')
  );

  const intro = mode === 'chat'
    ? `I found ${rowCount} rows. Here are the main results`
    : `Found ${rowCount} rows`;

  const sqlNote = sql ? '' : '';
  return `${intro}: ${preview.join(' | ')}${sqlNote}`;
}

function getSchemaObjectLabel(objectName) {
  const key = String(objectName || '').toLowerCase();
  const inheritedLabels = {
    brands: 'service lines',
    customers: 'shippers',
    fulfillment_centers: 'logistics terminals',
    inventory: 'terminal capacity',
    order_items: 'transport order items',
    orders: 'transport orders',
    products: 'transport services',
    shipments: 'transport routes',
    social_posts: 'shipper signals',
    influencers: 'signal sources',
  };
  if (inheritedLabels[key]) return inheritedLabels[key];
  const object = TRANSPORT_SCHEMA_OBJECTS.find((entry) => entry.object_name === key);
  return object?.display_name || key.replace(/_v$/i, '').replace(/_/g, ' ');
}

function joinReadableList(items = []) {
  const values = items.filter(Boolean);
  if (values.length <= 1) return values[0] || '';
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}

function describeGeneratedSql(sql, question = '') {
  const referencedTables = extractReferencedTables(sql)
    .filter((tableName) => tableName !== 'DUAL')
    .map(getSchemaObjectLabel);
  const target = referencedTables.length
    ? joinReadableList([...new Set(referencedTables)].slice(0, 4))
    : 'authorized transportation views';
  const questionCopy = question ? ' for the current transportation data question' : '';
  return `This SQL was generated${questionCopy} and validated as a read-only Oracle query against ${target}. It has not been executed in Show SQL mode.`;
}

function summarizeRunSqlResult(result = {}) {
  const rowCount = Number(result.rowCount || 0);
  if (!rowCount) {
    return 'SQL was validated and executed against authorized transportation views, but no matching records were found in the current authorized data scope.';
  }
  const referencedTables = extractReferencedTables(result.sql || '')
    .filter((tableName) => tableName !== 'DUAL')
    .map(getSchemaObjectLabel);
  const target = referencedTables.length
    ? joinReadableList([...new Set(referencedTables)].slice(0, 3))
    : 'authorized transportation views';
  return `${rowCount.toLocaleString()} row${rowCount === 1 ? '' : 's'} returned from ${target}.`;
}

function buildReferencedData(sql, columns = [], rows = []) {
  const objectLabels = extractReferencedTables(sql || '')
    .filter((tableName) => tableName !== 'DUAL')
    .map(getSchemaObjectLabel);
  return {
    objects: [...new Set(objectLabels)],
    notable_fields: columns || [],
    preview_rows: (rows || []).slice(0, 3),
  };
}

function buildKeyFindings(columns = [], rows = [], limit = 3) {
  return (rows || []).slice(0, limit).map((row, index) => {
    const values = (columns.length ? columns : Object.keys(row))
      .slice(0, 3)
      .map((column) => `${formatAnswerColumnLabel(column)}: ${formatValue(row[column])}`);
    return `${index + 1}. ${values.join(' - ') || 'Matching transportation record'}`;
  });
}

function buildFollowUpQuestions(question = '', result = {}) {
  const q = String(question || '').toLowerCase();
  if (/predicted|forecast|demand surge|demand risk|surge/.test(q)) {
    return [
      'Show predicted demand surge by operating region.',
      'Which services have the highest predicted weekly demand by region?',
    ];
  }
  if (/capacity|terminal|logistics/.test(q)) {
    return [
      'Which logistics terminals are closest to capacity thresholds?',
      'Show terminal capacity by transport service category.',
    ];
  }
  if (/signal|urgency|engagement|platform/.test(q)) {
    return [
      'Which signal sources have the highest urgency and engagement?',
      'Which transport orders are linked to high-urgency shipper signals?',
    ];
  }
  if (/route|shipment|travel|delivery/.test(q)) {
    return [
      'Which routes have the highest route cost?',
      'Show route status by logistics terminal.',
    ];
  }
  if (result.rowCount > 1) {
    return [
      'Break this down by operating region.',
      'Show the same result for the highest service value records.',
    ];
  }
  return [];
}

async function summarizeQueryResult({ question, mode = 'narrate', sql, columns, rows, rowCount, profile = DEFAULT_PROFILE, conversationContext = [] }) {
  const fastSummary = deterministicSummary({ mode, sql, columns, rows, rowCount });

  if (mode !== 'chat') {
    return fastSummary;
  }

  try {
    return await ollamaText(
      [
        'You are the conversational analyst in a transportation fleet logistics application.',
        'Use only the supplied SQL result set.',
        'Do not invent numbers or columns.',
        'Chat mode must feel different from Explain mode: acknowledge the user directly, interpret what the result means operationally, and end with one useful next question or action.',
        'Do not merely repeat a label-value list and do not mention SQL unless the user asks about it.',
        'Keep the response to 2-4 sentences.',
      ].join('\n'),
      [
        `Question: ${question}`,
        `SQL: ${sql}`,
        `Columns: ${columns.join(', ')}`,
        `Row count: ${rowCount}`,
        `Rows: ${buildPromptRows(rows, 6)}`,
        conversationContext.length ? `Recent conversation:\n${JSON.stringify(conversationContext.slice(-6))}` : null,
      ].filter(Boolean).join('\n\n'),
      { temperature: 0.15, profile }
    );
  } catch (_) {
    if (!rows || rows.length === 0) {
      return `I couldn't find matching records for that request. Would you like to broaden the scope or try a different transportation question?`;
    }
    if (rowCount === 1) {
      const entries = Object.entries(rows[0]).map(([key, value]) => `${formatAnswerColumnLabel(key)} is ${formatValue(value)}`);
      return `Looking at the current transportation data, ${entries.join(', ')}. What would you like to compare or investigate next?`;
    }
    return `I found ${rowCount.toLocaleString()} matching records. The first results are ${deterministicSummary({ mode: 'narrate', sql, columns, rows, rowCount })}; would you like me to break them down by region, service, or risk?`;
  }
}

function invalidateMetadataCaches() {
  schemaCache = {
    expiresAt: 0,
    grouped: {},
    tableComments: {},
  };
  entityCache = {
    expiresAt: 0,
    catalogs: {},
  };
}

async function answerQuestion(question, { mode = 'narrate', demoUser = null, profile = DEFAULT_PROFILE, conversationContext = [] } = {}) {
  const resolvedProfile = normalizeProfile(profile);
  const result = await runQuestionQuery(question, {
    mode,
    demoUser,
    profile: resolvedProfile,
    conversationContext,
  });
  const answer = await summarizeQueryResult({
    question,
    mode,
    sql: result.sql,
    columns: result.columns,
    rows: result.rows,
    rowCount: result.rowCount,
    profile: resolvedProfile,
    conversationContext,
  });

  return {
    answer,
    keyFindings: buildKeyFindings(result.columns, result.rows),
    resultSummary: summarizeRunSqlResult(result),
    followUpQuestions: buildFollowUpQuestions(question, result),
    referencedData: buildReferencedData(result.sql, result.columns, result.rows),
    warnings: [],
    sql: result.sql,
    columns: result.columns,
    rows: result.rows,
    rowCount: result.rowCount,
    profile: resolvedProfile,
    model: getProfileModel(resolvedProfile),
    repairedFromSql: result.repairedFromSql || null,
  };
}

async function summarizeContext({ question, instructions, context }) {
  return ollamaText(
    [
      'You are an operations analyst for a transportation fleet logistics platform.',
      'Answer only from the supplied JSON context.',
      'Be concise, specific, and truthful.',
      'If the context is incomplete, say so plainly.',
      instructions || '',
    ].join('\n'),
    `Question: ${question}\n\nContext JSON:\n${JSON.stringify(context, null, 2)}`,
    { temperature: 0.2 }
  );
}

module.exports = {
  DEFAULT_PROFILE,
  OLLAMA_MODEL,
  answerQuestion,
  checkAskTransportDataHealth,
  createAskDataError,
  describeGeneratedSql,
  executeReadOnlySql,
  generateQuestionSql,
  generateReadOnlySql,
  getAvailableProfiles,
  getAvailableSelectAiProfiles,
  getOllamaRuntimeConfig,
  getProfileModel,
  getTransportSchemaObjectMetadata,
  groupTransportSchemaObjectMetadata,
  invalidateMetadataCaches,
  normalizeAskDataError,
  normalizeProfile,
  runQuestionQuery,
  summarizeRunSqlResult,
  summarizeContext,
  validateReadOnlySql,
};
