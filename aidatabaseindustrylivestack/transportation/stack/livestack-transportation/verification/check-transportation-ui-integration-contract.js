#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const failures = [];
const checks = [];

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

const welcome = read('frontend/src/pages/Welcome.jsx');
const story = read('frontend/src/components/TransportationStory.jsx');
const panel = read('frontend/src/components/RightOraclePanel.jsx');
const userContext = read('frontend/src/context/UserContext.jsx');
const api = read('frontend/src/utils/api.js');
const admin = read('frontend/src/pages/AdminEntry.jsx');

check('Welcome presents all nine Transportation use cases', () => {
  assert.match(welcome, /Key Transportation Use Cases Featured/);
  const labels = [...welcome.matchAll(/label:\s*'([^']+)'/g)];
  assert.equal(labels.length, 9);
  assert.match(welcome, /Transportation Data Foundation/);
});

check('All nine native story scenes exist', () => {
  for (const scene of [
    'datamodel', 'dashboard', 'social', 'graph', 'fulfillment',
    'orders', 'oml', 'askdata', 'agents',
  ]) assert.match(story, new RegExp(`${scene}:\\s*\\{`));
});

check('Every use-case page renders the Transportation story component', () => {
  const pages = {
    DataModel: 'datamodel',
    Dashboard: 'dashboard',
    SocialFeed: 'social',
    InfluencerGraph: 'graph',
    FulfillmentMap: 'fulfillment',
    Orders: 'orders',
    OMLAnalytics: 'oml',
    AskData: 'askdata',
    AgentConsole: 'agents',
  };
  for (const [page, scene] of Object.entries(pages)) {
    const source = read(`frontend/src/pages/${page}.jsx`);
    assert.match(source, /TransportationStoryPanel/);
    assert.match(source, new RegExp(`<TransportationStoryPanel\\s+scene=["']${scene}["']\\s*\\/>`));
  }
});

check('Oracle Internals is collapsed initially and resets collapsed per scene', () => {
  assert.match(panel, /useState\(true\)/);
  assert.match(panel, /setCollapsed\(true\);[\s\S]*\[title\]/);
  assert.match(panel, /Show Oracle Internals/);
});

check('UI establishes signed same-origin sessions and clears stale scope data', () => {
  assert.match(api, /X-Transportation-Demo-Control/);
  assert.match(api, /credentials:\s*'same-origin'/);
  assert.match(userContext, /api\.session\.establish/);
  assert.match(userContext, /scopeVersion/);
  assert.match(read('frontend/src/hooks/useData.js'), /requestVersionRef/);
});

check('Destructive dataset actions require an explicit UI confirmation', () => {
  assert.match(admin, /Confirm Replace Active Dataset/);
  assert.match(api, /X-Transportation-Dataset-Confirmation/);
  assert.match(api, /RESTORE_DEMO/);
  assert.match(api, /REPLACE_DATASET/);
});

process.stdout.write(`\nTransportation UI integration: ${checks.length - failures.length}/${checks.length} PASS, ${failures.length} RED\n`);
if (failures.length) process.exitCode = 1;
