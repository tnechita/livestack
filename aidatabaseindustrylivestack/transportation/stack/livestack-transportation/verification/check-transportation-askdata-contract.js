#!/usr/bin/env node
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  getTransportSchemaObjectMetadata,
  groupTransportSchemaObjectMetadata,
  validateReadOnlySql,
} = require('../backend/lib/ollamaAssistant');

const root = path.resolve(__dirname, '..');
const routeSource = fs.readFileSync(path.join(root, 'backend/routes/selectai.js'), 'utf8');
const promptPath = path.join(root, 'frontend/src/data/askDataSuggestedPrompts.json');
const prompts = JSON.parse(fs.readFileSync(promptPath, 'utf8'));
const objects = getTransportSchemaObjectMetadata();
const groups = groupTransportSchemaObjectMetadata(objects);

const requiredDomains = [
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
const requiredObjects = [
  'transport_orders_v',
  'transport_services_v',
  'shippers_v',
  'shipper_signal_posts_v',
  'signal_sources_v',
  'logistics_terminals_v',
  'terminal_capacity_v',
  'transport_routes_v',
  'demand_forecasts',
  'demand_regions',
  'fulfillment_zones',
  'transport_network_entities_v',
  'transport_network_relationships_v',
  'transport_exception_cases_v',
  'event_stream',
  'agent_actions',
];

assert.strictEqual(objects.length, 17, 'Transportation Ask Data should expose the exact 17-object catalog');
assert.deepStrictEqual(
  groups.map((group) => group.domain),
  requiredDomains,
  'Transportation Ask Data domain order drifted'
);

const objectNames = new Set(objects.map((object) => object.object_name));
for (const objectName of requiredObjects) {
  assert(objectNames.has(objectName), `Missing transportation metadata object: ${objectName}`);
}
for (const object of objects) {
  assert.strictEqual(object.object_name, object.object_name.toLowerCase(), `${object.object_name}: expected lowercase object name`);
  assert(object.display_name && object.description, `${object.object_name}: incomplete presentation metadata`);
  assert.strictEqual(object.is_queryable_by_assistant, true, `${object.object_name}: should be assistant-queryable`);
  const validation = validateReadOnlySql(`SELECT * FROM ${object.object_name} FETCH FIRST 1 ROWS ONLY`);
  assert(validation.ok, `${object.object_name}: metadata object is outside the read-only allowlist`);
}

assert(Array.isArray(prompts) && prompts.length === 8, 'Expected eight transportation suggested prompts');
for (const prompt of prompts) {
  assert(prompt.category && prompt.text, 'Each transportation suggested prompt needs category and text');
  assert(
    /transport|shipment|shipper|freight|terminal|route|signal/i.test(prompt.text),
    `Prompt is not grounded in transportation: ${prompt.text}`
  );
}

assert(validateReadOnlySql('SELECT transport_order_id FROM transport_orders_v FETCH FIRST 5 ROWS ONLY').ok);
for (const sql of [
  'DELETE FROM orders',
  'BEGIN NULL; END;',
  'SELECT * FROM user_tables',
  'SELECT * FROM transport_orders_v; DROP TABLE orders',
]) {
  assert.strictEqual(validateReadOnlySql(sql).ok, false, `Unsafe SQL should be rejected: ${sql}`);
}

assert(/getTransportSchemaObjectMetadata/.test(routeSource), 'Select AI route must use transportation metadata');
assert(/groupTransportSchemaObjectMetadata/.test(routeSource), 'Select AI route must group transportation metadata');
assert(/checkAskTransportDataHealth/.test(routeSource), 'Select AI route must expose transportation health evidence');
assert(/router\.get\('\/schema-objects'/.test(routeSource), 'Select AI route must expose schema metadata');
assert(/router\.post\('\/(?:chat|chat-mode|showsql|runsql)'/.test(routeSource), 'Select AI route must expose a governed Ask Data pipeline');
assert(!/\b(?:INSERT|UPDATE|DELETE|MERGE|DROP|ALTER|CREATE|TRUNCATE)\b[\s\S]*router\.(?:get|post)/i.test(routeSource), 'Select AI route must not introduce a mutating SQL pipeline');

console.log(`Transportation Ask Data contract passed: ${objects.length} objects, ${groups.length} domains, ${prompts.length} prompts.`);
