const crypto = require('node:crypto');
const { sameOriginDemoControl } = require('./demoSession');

const CONFIRMATIONS = Object.freeze({ '/upload': 'REPLACE_DATASET', '/restore-demo': 'RESTORE_DEMO' });

function createRequireDatasetAdmin({ resolveDatasetAdminActor } = {}) {
  return async (req, res, next) => {
    const expected = CONFIRMATIONS[req.path];
    const confirmation = String(req.get('X-Lifesciences-Dataset-Confirmation') || req.body?.confirmation || '').trim();
    if (!expected || confirmation !== expected) {
      return res.status(400).json({ ok: false, code: 'DATASET_CONFIRMATION_REQUIRED', error: 'Explicit destructive confirmation is required.' });
    }
    const configured = String(process.env.DATASET_ADMIN_TOKEN || '');
    const supplied = String(req.get('X-Dataset-Admin-Token') || '');
    if (supplied) {
      const left = Buffer.from(supplied); const right = Buffer.from(configured);
      if (!configured || left.length !== right.length || !crypto.timingSafeEqual(left, right)) return res.status(403).json({ ok: false, code: 'DATASET_ADMIN_FORBIDDEN' });
      req.datasetAdminAuthorization = Object.freeze({ method: 'token' });
      return next();
    }
    if (!sameOriginDemoControl(req) || !req.authenticatedActor) return res.status(403).json({ ok: false, code: 'DATASET_ADMIN_FORBIDDEN' });
    try {
      const actor = await resolveDatasetAdminActor(req.authenticatedActor);
      if (!actor) return res.status(403).json({ ok: false, code: 'DATASET_ADMIN_FORBIDDEN' });
      req.datasetAdminAuthorization = Object.freeze({ actor, method: 'signed_admin_session' });
      return next();
    } catch (_) { return res.status(503).json({ ok: false, code: 'DATASET_ADMIN_IDENTITY_UNAVAILABLE' }); }
  };
}

module.exports = { createRequireDatasetAdmin };
