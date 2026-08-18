const fs = require('node:fs');
const path = require('node:path');

const GRAPH_SEED_SQL = path.join(__dirname, '../../db/data/load_transport_network_graph.sql');

function graphSeedStatements() {
  if (!fs.existsSync(GRAPH_SEED_SQL)) {
    throw new Error(`Transportation graph seed file is missing: ${GRAPH_SEED_SQL}`);
  }
  return fs.readFileSync(GRAPH_SEED_SQL, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^(DELETE FROM transport_|INSERT INTO transport_)/i.test(line))
    .map((line) => line.replace(/;\s*$/, ''));
}

async function reseedTransportationGraph(connection) {
  for (const statement of graphSeedStatements()) {
    await connection.execute(statement, {}, { autoCommit: false });
  }
  await connection.commit();
  const result = await connection.execute(`
    SELECT
      (SELECT COUNT(*) FROM transport_entities) AS transport_entities,
      (SELECT COUNT(*) FROM transport_relationships) AS transport_relationships,
      (SELECT COUNT(*) FROM transport_exception_cases) AS transport_exception_cases,
      (SELECT COUNT(*) FROM transport_case_entities) AS transport_case_entities
    FROM dual
  `, {}, { autoCommit: false });
  const row = result.rows[0] || {};
  return {
    transport_entities: Number(row.TRANSPORT_ENTITIES || 0),
    transport_relationships: Number(row.TRANSPORT_RELATIONSHIPS || 0),
    transport_exception_cases: Number(row.TRANSPORT_EXCEPTION_CASES || 0),
    transport_case_entities: Number(row.TRANSPORT_CASE_ENTITIES || 0),
  };
}

module.exports = { reseedTransportationGraph };
