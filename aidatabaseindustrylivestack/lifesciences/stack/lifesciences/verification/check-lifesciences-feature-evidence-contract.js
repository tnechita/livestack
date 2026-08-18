const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const requireText = (source, text, label) => {
  if (!source.includes(text)) throw new Error(`Missing ${label}: ${text}`);
};

const lifecycle = read('db/schema/13_dataset_generation_lifecycle.sql');
const security = read('db/schema/06_security.sql');
const evidence = read('backend/lib/datasetFeatureEvidence.js');
const generations = read('backend/lib/datasetGenerationStore.js');
const importer = read('backend/lib/importWorkflowService.js');
const server = read('backend/server.js');

requireText(lifecycle, 'REQUIRED_FEATURES_JSON', 'generation-bound evidence column');
requireText(security, 'AUDIT POLICY sc_order_audit;', 'enabled Unified Audit policy');
requireText(evidence, 'audit_unified_enabled_policies', 'enabled Unified Audit runtime evidence');
requireText(read('db/data/load_all_data.sql'), 'lifesciences_bootstrap_v1', 'generation-bound bootstrap record');
requireText(generations, 'const generationBoundEvidence={...evidence,activeGeneration:generationId,generationId}', 'stored evidence bound to admitted generation');
for (const feature of ['vector', 'spatial', 'graph', 'nativeJson', 'duality', 'oml', 'unifiedAudit', 'inmemory']) {
  requireText(evidence, `const ${feature}=await safe`, `${feature} evidence collector`);
}
requireText(evidence, 'ALL_MINILM_L12_V2', 'Vector model evidence');
requireText(evidence, "INFLUENCER_NETWORK", 'Life Sciences quality-signal graph evidence');
requireText(evidence, 'JSON_EXISTS(attributes', 'native JSON evidence');
requireText(evidence, "ORDERS_DV','PRODUCTS_INVENTORY_DV", 'Duality evidence');
requireText(evidence, 'V$IM_SEGMENTS', 'honest In-Memory observation');
requireText(evidence, 'available:false', 'In-Memory unavailable result');
requireText(generations, 'recordFeatureEvidence', 'generation evidence persistence');
requireText(generations, 'getActiveFeatureEvidence', 'active generation evidence retrieval');
requireText(importer, 'assertRequiredFeatureEvidence(requiredFeatures)', 'evidence readiness gate');
requireText(importer, 'generationStore.recordFeatureEvidence', 'evidence persistence before activation');
if (importer.indexOf('generationStore.recordFeatureEvidence') > importer.indexOf('generationStore.completeGeneration')) {
  throw new Error('Feature evidence must be persisted before generation activation.');
}
requireText(server, "app.use('/api/features', featureRoutes);", 'read-only feature evidence API');

console.log('Life Sciences feature-evidence source contract passed.');
