const { TABLES } = require('./importCatalog');

const OPTIONAL_OBJECT_TYPES = ['TABLE', 'VIEW'];
const FUTURE_DATE_EXCLUSIONS = new Set([
  'DEMAND_FORECASTS.FORECAST_DATE',
  'ORDERS.ESTIMATED_DELIVERY',
]);

function normalizeSql(sql) {
  return String(sql || '').replace(/\s+/g, ' ').trim();
}

function rowValue(row, key) {
  if (!row) return null;
  return row[key] ?? row[key.toUpperCase()] ?? row[key.toLowerCase()] ?? null;
}

function numericValue(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function checkDateColumns() {
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

function buildNoFutureDateChecks() {
  return checkDateColumns()
    .filter(({ tableName, columnName }) => (
      !FUTURE_DATE_EXCLUSIONS.has(`${tableName}.${columnName}`.toUpperCase())
    ))
    .map(({ tableName, columnName }) => ({
      id: `no-future-${tableName}-${columnName}`,
      screen: 'Cross-screen date integrity',
      table: tableName,
      column: columnName,
      objects: [tableName],
      max: 0,
      expected: 'No non-forecast demo dates should be more than one hour in the future.',
      sql: `
        SELECT COUNT(*) AS actual
        FROM ${tableName}
        WHERE ${columnName} IS NOT NULL
          AND CAST(${columnName} AS DATE) > SYSDATE + (1 / 24)
      `,
      message: `${tableName}.${columnName} should not contain future-dated restored values.`,
    }));
}

function buildDemoDateValidationChecks() {
  const checks = [
    {
      id: 'operations-orders-last-7-days',
      screen: 'High Tech Operations Command Center',
      table: 'orders',
      column: 'created_at',
      objects: ['orders'],
      min: 1,
      expected: 'At least one customer commitment or solution order in the last 7 days.',
      sql: `
        SELECT COUNT(*) AS actual
        FROM orders
        WHERE CAST(created_at AS DATE) >= SYSDATE - 7
      `,
      message: 'High Tech Operations Command Center requires recent commitment records for 7-day KPIs.',
    },
    {
      id: 'operations-signals-last-7-days',
      screen: 'High Tech Operations Command Center',
      table: 'social_posts',
      column: 'posted_at',
      objects: ['social_posts'],
      min: 1,
      expected: 'At least one product, supply, or quality signal in the last 7 days.',
      sql: `
        SELECT COUNT(*) AS actual
        FROM social_posts
        WHERE CAST(posted_at AS DATE) >= SYSDATE - 7
      `,
      message: 'High Tech signal KPIs require recent product, supply, or quality signal timestamps.',
    },
    {
      id: 'product-signals-view-last-7-days',
      screen: 'Product, Supply & Quality Signals',
      table: 'product_signals_v',
      column: 'signal_time',
      objects: ['product_signals_v'],
      min: 1,
      expected: 'At least one product signal in the last 7 days through the semantic view.',
      sql: `
        SELECT COUNT(*) AS actual
        FROM product_signals_v
        WHERE CAST(signal_time AS DATE) >= SYSDATE - 7
      `,
      message: 'Product, Supply & Quality Signals should expose recent records through product_signals_v.',
    },
    {
      id: 'product-signals-latest-within-2-days',
      screen: 'Product, Supply & Quality Signals',
      table: 'product_signals_v',
      column: 'signal_time',
      objects: ['product_signals_v'],
      min: 1,
      expected: 'At least one product signal timestamp should be within the last 2 days.',
      sql: `
        SELECT COUNT(*) AS actual
        FROM product_signals_v
        WHERE CAST(signal_time AS DATE) >= SYSDATE - 2
      `,
      message: 'Signal filters need the latest product signal to land near the restore window.',
    },
    {
      id: 'resilience-forecast-window-today-through-7-days',
      screen: 'Supply Chain Resilience Map',
      table: 'demand_forecasts',
      column: 'forecast_date',
      objects: ['demand_forecasts'],
      min: 1,
      expected: 'Forecast records should cover today through the next 7 days.',
      sql: `
        SELECT COUNT(*) AS actual
        FROM demand_forecasts
        WHERE forecast_date BETWEEN TRUNC(SYSDATE) AND TRUNC(SYSDATE) + 7
      `,
      message: 'Supply Chain Resilience Map requires forecast records anchored to the current restore window.',
    },
    {
      id: 'forecast-start-after-latest-history',
      screen: 'Yield, Capacity & Warranty Analytics',
      table: 'demand_forecasts',
      column: 'forecast_date',
      objects: ['demand_forecasts', 'orders', 'social_posts', 'shipments'],
      min: 1,
      expected: 'The forecast window should start on or after the latest historical activity day.',
      sql: `
        WITH forecast_bounds AS (
          SELECT MIN(forecast_date) AS forecast_start
          FROM demand_forecasts
        ),
        historical_bounds AS (
          SELECT MAX(history_date) AS latest_history_date
          FROM (
            SELECT MAX(CAST(created_at AS DATE)) AS history_date FROM orders
            UNION ALL
            SELECT MAX(CAST(posted_at AS DATE)) AS history_date FROM social_posts
            UNION ALL
            SELECT MAX(CAST(NVL(delivered_at, NVL(shipped_at, created_at)) AS DATE)) AS history_date FROM shipments
          )
        )
        SELECT CASE
          WHEN f.forecast_start IS NOT NULL
           AND h.latest_history_date IS NOT NULL
           AND f.forecast_start >= TRUNC(h.latest_history_date)
          THEN 1 ELSE 0 END AS actual
        FROM forecast_bounds f
        CROSS JOIN historical_bounds h
      `,
      message: 'Forecast windows should be anchored after restored historical commitments, signals, and allocation routes.',
    },
    {
      id: 'resilience-demand-regions-last-30-days',
      screen: 'Supply Chain Resilience Map',
      table: 'demand_regions',
      column: 'updated_at',
      objects: ['demand_regions'],
      min: 1,
      expected: 'At least one demand region update in the last 30 days.',
      sql: `
        SELECT COUNT(*) AS actual
        FROM demand_regions
        WHERE CAST(updated_at AS DATE) >= SYSDATE - 30
      `,
      message: 'Supply Chain Resilience Map demand-region layers should not be stale after restore.',
    },
    {
      id: 'resilience-inventory-last-30-days',
      screen: 'Supply Chain Resilience Map',
      table: 'inventory',
      column: 'updated_at',
      objects: ['inventory'],
      min: 1,
      expected: 'At least one product capacity update in the last 30 days.',
      sql: `
        SELECT COUNT(*) AS actual
        FROM inventory
        WHERE CAST(updated_at AS DATE) >= SYSDATE - 30
      `,
      message: 'Supply Chain Resilience Map site KPIs require recent inventory update timestamps.',
    },
    {
      id: 'customer-commitments-last-30-days',
      screen: 'Customer Commitments',
      table: 'solution_orders_v',
      column: 'created_at',
      objects: ['solution_orders_v'],
      min: 1,
      expected: 'At least one customer commitment in the last 30 days.',
      sql: `
        SELECT COUNT(*) AS actual
        FROM solution_orders_v
        WHERE CAST(created_at AS DATE) >= SYSDATE - 30
      `,
      message: 'Customer Commitments should display recently created commitment records after restore.',
    },
    {
      id: 'allocation-routes-last-30-days',
      screen: 'Customer Commitments',
      table: 'fulfillment_routes_v',
      column: 'routed_at',
      objects: ['fulfillment_routes_v'],
      min: 1,
      expected: 'At least one allocation or fulfillment route in the last 30 days.',
      sql: `
        SELECT COUNT(*) AS actual
        FROM fulfillment_routes_v
        WHERE CAST(NVL(completed_at, routed_at) AS DATE) >= SYSDATE - 30
      `,
      message: 'Commitment and route timelines should be recent after restore.',
    },
    {
      id: 'agent-actions-last-30-days',
      screen: 'High Tech AI Agent Console',
      table: 'seertech_agent_actions_v',
      column: 'created_at',
      objects: ['seertech_agent_actions_v'],
      min: 0,
      optional: true,
      expected: 'Agent actions, when present, should be recent.',
      sql: `
        SELECT COUNT(*) AS actual
        FROM seertech_agent_actions_v
        WHERE CAST(created_at AS DATE) >= SYSDATE - 30
      `,
      message: 'Agent audit history should not look stale when action rows are present.',
    },
    {
      id: 'product-lifecycle-graph-last-30-days',
      screen: 'Product Lifecycle Event Graph',
      table: 'tech_graph_entities',
      column: 'created_at',
      objects: ['tech_graph_entities'],
      min: 1,
      optional: true,
      expected: 'Dedicated High Tech graph entities should be current when present.',
      sql: `
        SELECT COUNT(*) AS actual
        FROM tech_graph_entities
        WHERE CAST(created_at AS DATE) >= SYSDATE - 30
      `,
      message: 'Product lifecycle graph seed rows should not be stale when graph tables are present.',
    },
    {
      id: 'product-signal-cases-last-30-days',
      screen: 'Product Lifecycle Event Graph',
      table: 'product_signal_cases',
      column: 'created_at',
      objects: ['product_signal_cases'],
      min: 1,
      optional: true,
      expected: 'Product signal cases should be current when present.',
      sql: `
        SELECT COUNT(*) AS actual
        FROM product_signal_cases
        WHERE CAST(created_at AS DATE) >= SYSDATE - 30
      `,
      message: 'Product signal cases should stay anchored near the live demo window.',
    },
  ];

  return [...checks, ...buildNoFutureDateChecks()];
}

async function objectExists(connection, objectName) {
  const result = await connection.execute(`
    SELECT COUNT(*) AS cnt
    FROM user_objects
    WHERE object_name = :objectName
      AND object_type IN (${OPTIONAL_OBJECT_TYPES.map((_, index) => `:type${index}`).join(', ')})
  `, {
    objectName: String(objectName || '').toUpperCase(),
    ...Object.fromEntries(OPTIONAL_OBJECT_TYPES.map((type, index) => [`type${index}`, type])),
  }, { autoCommit: false });
  return numericValue(rowValue(result.rows?.[0], 'cnt')) > 0;
}

async function shouldSkipCheck(connection, check) {
  for (const objectName of check.objects || [check.table]) {
    if (!(await objectExists(connection, objectName))) {
      return {
        skipped: true,
        reason: `Object ${objectName} does not exist in this schema.`,
      };
    }
  }
  return { skipped: false };
}

async function runDemoDateValidation(connection) {
  const checks = buildDemoDateValidationChecks();
  const results = [];

  for (const check of checks) {
    const skip = await shouldSkipCheck(connection, check);
    if (skip.skipped) {
      if (check.optional) {
        results.push({
          ...check,
          status: 'skipped',
          reason: skip.reason,
          query: normalizeSql(check.sql),
        });
        continue;
      }
      results.push({
        ...check,
        status: 'failed',
        actual: null,
        reason: skip.reason,
        query: normalizeSql(check.sql),
      });
      continue;
    }

    try {
      const result = await connection.execute(check.sql, {}, { autoCommit: false });
      const actual = numericValue(rowValue(result.rows?.[0], 'actual'));
      const passedMin = check.min == null || actual >= check.min;
      const passedMax = check.max == null || actual <= check.max;
      results.push({
        ...check,
        actual,
        status: passedMin && passedMax ? 'passed' : 'failed',
        query: normalizeSql(check.sql),
      });
    } catch (err) {
      results.push({
        ...check,
        actual: null,
        status: check.optional ? 'skipped' : 'failed',
        reason: err.message,
        query: normalizeSql(check.sql),
      });
    }
  }

  const failed = results.filter((result) => result.status === 'failed');
  return {
    passed: failed.length === 0,
    checks: results,
  };
}

function summarizeDemoDateValidation(validation) {
  const checks = validation?.checks || [];
  const failures = checks.filter((check) => check.status === 'failed');
  const skipped = checks.filter((check) => check.status === 'skipped');
  const passed = checks.filter((check) => check.status === 'passed');
  return {
    passed: failures.length === 0,
    checkCount: checks.length,
    passedCount: passed.length,
    failedCount: failures.length,
    skippedCount: skipped.length,
    failures,
    skipped,
  };
}

module.exports = {
  buildDemoDateValidationChecks,
  runDemoDateValidation,
  summarizeDemoDateValidation,
};
