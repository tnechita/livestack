#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const fence = require('../backend/lib/datasetServingFence');
const checks = [];
function check(id, test) { try { test(); checks.push([id, 'PASS']); } catch (error) { checks.push([id, `RED: ${error.message}`]); } }
check('LS-GEN-01', () => { const sql = read('db/schema/13_dataset_generation_lifecycle.sql'); assert.match(sql, /APP_DATASET_GENERATIONS/i); assert.match(sql, /APP_DATASET_OPERATION_LEASE/i); assert.match(sql, /ACTIVE_GENERATION/i); assert.match(sql, /UQ_LIFESCIENCES_DATASET_WORK/i); });
check('LS-GEN-02', () => { const source = read('backend/lib/datasetGenerationStore.js'); assert.match(source, /FOR UPDATE/); assert.match(source, /admitGeneration/); assert.match(source, /completeGeneration/); assert.match(source, /reconcileOnStartup/); assert.match(source, /DATASET_GENERATION_RECOVERY_REQUIRED/); });
check('LS-GEN-03', () => { const source = read('backend/lib/importWorkflowService.js'); assert.match(source, /generationStore\.admitGeneration/); assert.match(source, /generationStore\.completeGeneration/); assert.match(source, /generationStore\.failGeneration/); assert.match(source, /generationId: admission\.generationId/); });
check('LS-GEN-04', () => { const server = read('backend/server.js'); assert.match(server, /createDatasetServingFence/); assert.match(server, /await reconcileOnStartup\(\)/); assert.match(read('scripts/bootstrap_db.sh'), /13_dataset_generation_lifecycle\.sql/); });
check('LS-GEN-05', () => { const blocked = fence.planDatasetServingRequest({ method: 'GET', path: '/dashboard/summary', generation: { status: 'applying', generationId: 'gen_clinical_supply' } }); assert.equal(blocked.allow, false); assert.equal(blocked.statusCode, 503); assert.equal(fence.planDatasetServingRequest({ method: 'GET', path: '/health', generation: { status: 'applying' } }).allow, true); });
check('LS-GEN-06', () => { const seed = read('db/data/load_all_data.sql'); assert.match(seed, /'lifesciences_bootstrap_v1' AS active_generation/); assert.match(seed, /target\.active_generation = incoming\.active_generation/); assert.match(seed, /active_generation,\s*updated_at/); });
for (const [id, status] of checks) process.stdout.write(`${status === 'PASS' ? 'PASS' : 'RED '} ${id}${status === 'PASS' ? '' : ` — ${status.slice(5)}`}\n`);
const failed = checks.filter(([, status]) => status !== 'PASS').length;
process.stdout.write(`\nLife Sciences generation lifecycle contract: ${checks.length - failed}/${checks.length} PASS\n`);
if (failed) process.exitCode = 1;
