#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const checks = [];
const failures = [];

function check(label, fn) {
  checks.push(label);
  try {
    fn();
    process.stdout.write(`PASS ${label}\n`);
  } catch (error) {
    failures.push({ label, error });
    process.stderr.write(`RED  ${label}: ${error.message}\n`);
  }
}

const compose = read('compose.yml');
const server = read('backend/server.js');
const database = read('backend/config/database.js');
const workflow = read('backend/lib/importWorkflowService.js');
const telemetry = read('backend/lib/usageCounterService.js');
const generation = read('backend/lib/datasetGenerationStore.js');
const vector = read('db/schema/04_vector.sql');
const spatial = read('db/schema/05_spatial.sql');
const graph = read('db/schema/10_transport_network_graph.sql');
const json = read('db/schema/02_json_collections.sql');
const oml = read('db/schema/12_oml_models.sql');
const audit = read('db/schema/16_transportation_unified_audit_admin.sql');
const demo = read('backend/routes/demo.js');
const dashboard = read('backend/routes/dashboard.js');
const social = read('backend/routes/social.js');
const fulfillment = read('backend/routes/fulfillment.js');
const graphRoute = read('backend/routes/graph.js');
const orders = read('backend/routes/orders.js');
const products = read('backend/routes/products.js');
const ml = read('backend/routes/ml.js');

check('Compose keeps the canonical transportation project identity implicit', () => {
  assert.doesNotMatch(compose, /^\s*name\s*:/m);
  assert.doesNotMatch(server, /\/api\/service-requests/);
});

check('Signed actor authority replaces trusted X-Demo-User identity', () => {
  assert.match(server, /createDemoSessionService/);
  assert.match(server, /DEMO_ACTOR_MISMATCH/);
  assert.match(server, /req\.authenticatedActor\s*=\s*actor/);
  assert.match(database, /AsyncLocalStorage/);
  assert.match(database, /transportation_security_pkg\.set_actor_context/);
  assert.match(database, /transportation_security_pkg\.clear_actor_context/);
});

check('Restore is durable, atomic, fenced, and startup-reconciled', () => {
  assert.match(server, /reconcileDatasetLifecycleOnStartup/);
  assert.match(server, /createDatasetServingFence/);
  assert.match(workflow, /stageGenerationSnapshotOnConnection/);
  assert.match(workflow, /waitForDatasetReadersToDrain/);
  assert.match(workflow, /completeDatasetJobTransaction/);
  assert.match(generation, /planAllStartupReconciliations/);
  assert.match(telemetry, /async function recordRestoreTelemetry/);
  assert.match(telemetry, /recordRestoreTelemetry,/);
});

check('Dataset preview is non-mutating and enforces route chronology before Restore', () => {
  const validationStart = workflow.indexOf('async function runDatasetValidation');
  const validationEnd = workflow.indexOf('function createJobProgressHandler', validationStart);
  const validationBlock = workflow.slice(validationStart, validationEnd);
  assert.match(validationBlock, /NON_MUTATING_PREVIEW/);
  assert.doesNotMatch(validationBlock, /executeImportPlan|deleteExistingImportData|connection\.(?:commit|rollback)/);
  assert.match(workflow, /"delivered_at" must not precede "shipped_at"/);
  assert.match(workflow, /status "delivered" requires "delivered_at"/);
});

check('Vector declarations are fixed and contain no embedded OCI PAR URL', () => {
  assert.match(vector, /VECTOR\s*\(\s*384\s*,\s*FLOAT32\s*\)/i);
  assert.doesNotMatch(vector, /https?:\/\/[^\s'"]*\/p\//i);
  assert.match(social, /vector-readiness/);
  assert.match(social, /VECTOR\(384,FLOAT32,DENSE\)/);
});

check('Spatial point/index lifecycle and live plan evidence are explicit', () => {
  assert.match(spatial, /IDX_FC_SPATIAL/i);
  assert.match(spatial, /IDX_CUST_SPATIAL/i);
  assert.match(fulfillment, /spatial-readiness/);
  assert.match(fulfillment, /DOMAIN INDEX/);
  assert.match(fulfillment, /IDX_FC_SPATIAL/);
});

check('Exact Transportation Property Graph is installed and executed', () => {
  assert.match(graph, /CREATE PROPERTY GRAPH transport_signal_network/i);
  assert.match(graph, /LABEL entity/i);
  assert.match(graph, /LABEL related_to/i);
  assert.match(graphRoute, /graph_name\s*=\s*'TRANSPORT_SIGNAL_NETWORK'/i);
  assert.match(graphRoute, /GRAPH_TABLE\s*\(\s*transport_signal_network/i);
});

check('Both exact JSON Relational Duality Views are required by generation proof and routes', () => {
  assert.match(json, /CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW orders_dv/i);
  assert.match(json, /CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW products_inventory_dv/i);
  assert.match(generation, /'ORDERS_DV'/);
  assert.match(generation, /'PRODUCTS_INVENTORY_DV'/);
  assert.match(orders, /FROM orders_dv/i);
  assert.match(products, /FROM products_inventory_dv/i);
  assert.doesNotMatch(products, /equivalent/i);
});

check('Four persisted OML models are rebuilt and exposed without fallback evidence', () => {
  for (const model of [
    'DEMAND_SURGE_MODEL',
    'CUSTOMER_SEGMENT_MODEL',
    'REVENUE_PREDICT_MODEL',
    'PRODUCT_CLUSTER_MODEL',
  ]) assert.match(oml, new RegExp(model));
  assert.match(oml, /rebuild_transportation_oml_models/i);
  assert.match(ml, /\/models\/status/);
  assert.match(ml, /\/persistence\/status/);
  assert.match(ml, /fallbackAllowed:\s*false/);
});

check('Native JSON and Unified Audit readiness are catalog-backed', () => {
  assert.match(demo, /user_tab_columns[\s\S]*data_type\s*=\s*'JSON'/i);
  assert.match(demo, /audit_unified_enabled_policies/i);
  assert.match(audit, /AUDIT POLICY sc_order_audit/i);
  assert.match(audit, /audit_unified_enabled_policies/i);
});

check('In-Memory is honestly declaration-only', () => {
  assert.match(dashboard, /evidenceMode:\s*'DECLARATION_ONLY'/);
  assert.match(dashboard, /runtimePopulationClaimed:\s*false/);
  assert.match(dashboard, /populationStatus:\s*'NOT_PROVEN'/);
  assert.doesNotMatch(dashboard, /Math\.round\(diskBytes\s*\*\s*0\.25\)/);
});

check('Direct demo seeding is fail-closed', () => {
  assert.match(demo, /router\.get\('\/start'[\s\S]*status\(410\)/);
  assert.match(demo, /DEMO_START_DISABLED/);
  assert.doesNotMatch(demo, /INSERT INTO/);
});

process.stdout.write(`\nTransportation feature parity: ${checks.length - failures.length}/${checks.length} PASS, ${failures.length} RED\n`);
if (failures.length) process.exitCode = 1;
