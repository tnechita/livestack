/**
 * Oracle Machine Learning (OML) Analytics API.
 *
 * Every successful response is backed by the four expected DBMS_DATA_MINING
 * models and the latest completed persisted-scoring run. There is deliberately
 * no heuristic or SQL-only substitute for an unavailable OML capability.
 */

const express = require('express');
const router = express.Router();
const requireDatasetCommand = require('../middleware/requireDatasetCommand');
const requireDemoIdentity = require('../middleware/requireDemoIdentity');
const { requireDemoAdmin } = require('../middleware/requireDemoIdentity');
const {
  beginOperation,
  endOperation,
  getActiveOperation,
} = require('../lib/datasetOperationLock');
const {
  refreshPersistentMlData,
  getMlPersistenceStatus,
  getHighTechOmlModelLifecycle,
  getPersistedDemandForecast,
  getPersistedCustomerSegments,
  getPersistedCommitmentForecast,
  getPersistedProductClusters,
  getPersistedCapacityIntelligence,
  getPersistedMlSummary,
} = require('../lib/mlPersistenceService');

const OML_UNAVAILABLE_CODE = 'OML_CAPABILITY_UNAVAILABLE';

function integerQuery(value, { name, defaultValue, min, max }) {
  if (value === undefined) return defaultValue;
  if (!/^-?\d+$/.test(String(value))) {
    const err = new Error(`${name} must be an integer between ${min} and ${max}.`);
    err.status = 400;
    throw err;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    const err = new Error(`${name} must be an integer between ${min} and ${max}.`);
    err.status = 400;
    throw err;
  }
  return parsed;
}

function handleRouteError(res, label, err) {
  if (err?.code === OML_UNAVAILABLE_CODE || err?.status === 503) {
    return res.status(503).json({
      error: 'Oracle Machine Learning capability unavailable',
      code: OML_UNAVAILABLE_CODE,
      message: err.message,
      modelLifecycle: err.lifecycle || null,
    });
  }
  if (err?.status === 400) {
    return res.status(400).json({ error: err.message, code: 'INVALID_INPUT' });
  }
  console.error(`${label} error:`, err);
  return res.status(500).json({
    error: 'Oracle Machine Learning request failed.',
    code: 'OML_REQUEST_FAILED',
  });
}

router.get('/persistence/status', async (req, res) => {
  try {
    res.json(await getMlPersistenceStatus());
  } catch (err) {
    handleRouteError(res, 'ML persistence status', err);
  }
});

router.get('/models/status', async (req, res) => {
  try {
    const lifecycle = await getHighTechOmlModelLifecycle();
    if (!lifecycle?.ready) {
      return res.status(503).json({
        error: 'Oracle Machine Learning capability unavailable',
        code: OML_UNAVAILABLE_CODE,
        modelLifecycle: lifecycle,
      });
    }
    res.json(lifecycle);
  } catch (err) {
    handleRouteError(res, 'ML model lifecycle status', err);
  }
});

router.post(
  '/persistence/refresh',
  requireDatasetCommand,
  requireDemoIdentity,
  requireDemoAdmin,
  async (req, res) => {
    const operation = await beginOperation({
      kind: 'ml_persistence_refresh',
      jobId: `ml_refresh_${Date.now().toString(36)}`,
      status: 'running',
      progress: 5,
      message: 'Refreshing persisted Oracle Machine Learning outputs...',
    });
    if (!operation) {
      return res.status(409).json({
        error: 'Another dataset operation is already in progress',
        code: 'DATASET_OPERATION_IN_PROGRESS',
        activeOperation: await getActiveOperation(),
      });
    }
  try {
    const result = await refreshPersistentMlData({ source: 'api-refresh' });
      return res.json({ ok: true, ...result });
  } catch (err) {
      return handleRouteError(res, 'ML persistence refresh', err);
    } finally {
      try {
        await endOperation({ leaseToken: operation.leaseToken });
      } catch (lockError) {
        console.warn(`Unable to release ML persistence lease: ${lockError.message}`);
      }
    }
  }
);

router.get('/demand-forecast', async (req, res) => {
  try {
    const limit = integerQuery(req.query.limit, {
      name: 'limit', defaultValue: 20, min: 1, max: 50,
    });
    const lookbackHours = integerQuery(req.query.hours, {
      name: 'hours', defaultValue: 720, min: 1, max: 2160,
    });
    res.json(await getPersistedDemandForecast({ limit, lookbackHours }));
  } catch (err) {
    handleRouteError(res, 'ML demand forecast', err);
  }
});

router.get('/customer-segments', async (req, res) => {
  try {
    const limit = integerQuery(req.query.limit, {
      name: 'limit', defaultValue: 200, min: 1, max: 500,
    });
    res.json(await getPersistedCustomerSegments({ limit }));
  } catch (err) {
    handleRouteError(res, 'ML customer segments', err);
  }
});

router.get('/revenue-forecast', async (req, res) => {
  try {
    const lookbackDays = integerQuery(req.query.days, {
      name: 'days', defaultValue: 30, min: 7, max: 365,
    });
    const forecastDays = integerQuery(req.query.forecast, {
      name: 'forecast', defaultValue: 7, min: 1, max: 90,
    });
    res.json(await getPersistedCommitmentForecast({ lookbackDays, forecastDays }));
  } catch (err) {
    handleRouteError(res, 'ML commitment forecast', err);
  }
});

router.get('/vector-clusters', async (req, res) => {
  try {
    const k = integerQuery(req.query.k, {
      name: 'k', defaultValue: 5, min: 5, max: 5,
    });
    res.json(await getPersistedProductClusters({ k }));
  } catch (err) {
    handleRouteError(res, 'ML product clusters', err);
  }
});

router.get('/inventory-intelligence', async (req, res) => {
  try {
    res.json(await getPersistedCapacityIntelligence());
  } catch (err) {
    handleRouteError(res, 'ML capacity intelligence', err);
  }
});

router.get('/summary', async (req, res) => {
  try {
    res.json(await getPersistedMlSummary());
  } catch (err) {
    handleRouteError(res, 'ML summary', err);
  }
});

module.exports = router;
