const assert = require('node:assert/strict');
const {
  createDemoSessionService,
  normalizeActor,
  sameOriginDemoControl,
} = require('../backend/lib/demoSession');

const sessions = createDemoSessionService({ now: () => 1_000, ttlMs: 60_000 });
const issued = sessions.issue('viewer_sam');
assert.equal(sessions.verify(issued.token).ok, true);
assert.equal(sessions.verify(`${issued.token}x`).ok, false);
assert.equal(normalizeActor('admin jess'), null);
assert.equal(sameOriginDemoControl({
  headers: {
    'x-lifesciences-demo-control': 'lifesciences-demo-session',
    origin: 'http://example.test', host: 'example.test',
  },
}), true);
assert.equal(sameOriginDemoControl({
  headers: {
    'x-lifesciences-demo-control': 'lifesciences-demo-session',
    origin: 'https://attacker.test', host: 'example.test',
  },
}), false);
console.log('Life Sciences signed demo-session contract: PASS');
