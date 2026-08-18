#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const checks = [];
function check(id, test) { try { test(); checks.push([id, 'PASS']); } catch (error) { checks.push([id, `RED: ${error.message}`]); } }
check('LS-VECTOR-01', () => { const schema = read('db/schema/04_vector.sql'); assert.equal((schema.match(/VECTOR\(384,FLOAT32,DENSE\)/g) || []).length, 4); assert.doesNotMatch(schema, /VECTOR\(384\)(?!,)/); });
check('LS-VECTOR-02', () => { const probe = read('db/schema/04a_vector_model_load_and_probe.sql'); assert.match(probe, /DBMS_VECTOR\.LOAD_ONNX_MODEL/); assert.match(probe, /VECTOR_EMBEDDING\(ALL_MINILM_L12_V2/); assert.match(probe, /VECTOR\(384,FLOAT32,DENSE\)/); });
check('LS-VECTOR-03', () => { const bootstrap = read('scripts/bootstrap_db.sh'); const probeAt = bootstrap.indexOf('04a_vector_model_load_and_probe.sql'); const vectorAt = bootstrap.indexOf('@\/tmp\/04_vector_schema.sql'); assert.ok(probeAt >= 0 && vectorAt > probeAt, 'ONNX load/probe must precede VECTOR_EMBEDDING-dependent schema compilation'); });
check('LS-VECTOR-04', () => { const migration = read('db/schema/14_lifesciences_vector_contract.sql'); assert.match(migration, /vector_info/); assert.match(migration, /VECTOR\(384,FLOAT32,DENSE\)/); assert.match(migration, /v_fixed_count = 2/); assert.match(migration, /DROP INDEX/); assert.match(migration, /ALTER TABLE/); });
for (const [id, status] of checks) process.stdout.write(`${status === 'PASS' ? 'PASS' : 'RED '} ${id}${status === 'PASS' ? '' : ` — ${status.slice(5)}`}\n`);
const failed = checks.filter(([, status]) => status !== 'PASS').length;
process.stdout.write(`\nLife Sciences vector bootstrap contract: ${checks.length - failed}/${checks.length} PASS\n`);
if (failed) process.exitCode = 1;
