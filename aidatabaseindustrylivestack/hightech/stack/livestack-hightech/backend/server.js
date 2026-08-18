/**
 * High Tech Product Intelligence Demo — Express Server
 * Serves API routes and the React frontend in production
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const db = require('./config/database');
const { shouldDeferGlobalJsonParser } = require('./lib/requestPathPolicy');
const {
  RESTRICTED_DEMO_USER,
  runWithRequestIdentity,
} = require('./lib/requestIdentityContext');
const { recoverOrphanedDatasetJobs } = require('./lib/importJobs');
const { releaseStaleDatasetOperationLock } = require('./lib/datasetOperationLock');
const { shouldServeFrontend } = require('./lib/frontendServingPolicy');

const app = express();
const PORT = process.env.PORT || 3001;

app.set('etag', false);

function setNoStoreHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
}

// ── Middleware ──────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(morgan('dev'));
const globalJsonParser = express.json({ limit: '10mb' });
app.use((req, res, next) => {
  if (shouldDeferGlobalJsonParser(req.method, req.path)) {
    return next();
  }
  return globalJsonParser(req, res, next);
});

// ── Demo User Context (VPD) ───────────────────────────────
// Oracle is authoritative for role, region, activity, and access scope.
// A missing header is an intentional restricted-viewer request; an explicit
// empty, unknown, inactive, or malformed identity is forbidden.
app.use('/api', async (req, res, next) => {
  const hasExplicitUser = Object.prototype.hasOwnProperty.call(req.headers, 'x-demo-user');
  const requestedUser = hasExplicitUser
    ? String(req.headers['x-demo-user'] || '').trim()
    : RESTRICTED_DEMO_USER;

  if (!requestedUser || !/^[A-Za-z0-9_.-]{1,128}$/.test(requestedUser)) {
    return res.status(403).json({
      error: 'The demo user identity is not recognized',
      code: 'DEMO_IDENTITY_FORBIDDEN',
    });
  }

  try {
    const identity = await db.resolveDemoIdentity(requestedUser);
    req.demoUser = identity.username;
    req.demoIdentity = identity;
    return runWithRequestIdentity(identity, next);
  } catch (error) {
    const oracleCode = String(error?.code || '');
    const oracleMessage = String(error?.message || '');
    if (oracleCode === 'DEMO_IDENTITY_FORBIDDEN'
        || /ORA-20080|ORA-20081|unknown or inactive|invalid high tech application user/i.test(oracleMessage)) {
      return res.status(403).json({
        error: 'The demo user identity is not recognized',
        code: 'DEMO_IDENTITY_FORBIDDEN',
      });
    }
    console.error('High Tech identity validation error:', error);
    return res.status(503).json({
      error: 'High Tech identity validation is unavailable',
      code: 'DEMO_IDENTITY_UNAVAILABLE',
    });
  }
});

// Avoid stale API responses and conditional 304 paths for live dashboard/count data.
app.use('/api', (req, res, next) => {
  delete req.headers['if-none-match'];
  delete req.headers['if-modified-since'];
  setNoStoreHeaders(res);
  next();
});

// ── API Routes ─────────────────────────────────────────────
const dashboardRoutes = require('./routes/dashboard');
const socialRoutes = require('./routes/social');
const productsRoutes = require('./routes/products');
const fulfillmentRoutes = require('./routes/fulfillment');
const graphRoutes = require('./routes/graph');
const agentRoutes = require('./routes/agents');
const ordersRoutes = require('./routes/orders');
const mlRoutes = require('./routes/ml');
const demoRoutes = require('./routes/demo');
const usersRoutes = require('./routes/users');
const selectaiRoutes = require('./routes/selectai');
const importRoutes = require('./routes/import');

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/fulfillment', fulfillmentRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/service-requests', ordersRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/selectai', selectaiRoutes);
app.use('/api/import', importRoutes);

// ── Health Check ───────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const result = await db.executeSystem(`
      SELECT 'connected' AS status,
             SYSDATE AS db_time,
             SYS_CONTEXT('HIGHTECH_APP_CTX', 'USERNAME') AS context_username,
             SYS_CONTEXT('HIGHTECH_APP_CTX', 'ROLE') AS context_role,
             SYS_CONTEXT('HIGHTECH_APP_CTX', 'ACCESS_SCOPE') AS context_scope,
             SYS_CONTEXT('HIGHTECH_APP_CTX', 'AUTHENTICATED') AS context_authenticated,
             (SELECT COUNT(*) FROM fulfillment_centers) AS protected_row_count
      FROM dual
    `);
    const databaseStatus = result.rows?.[0] || {};
    if (String(databaseStatus.CONTEXT_USERNAME || '').toLowerCase() !== 'admin_jess'
        || String(databaseStatus.CONTEXT_ROLE || '').toLowerCase() !== 'admin'
        || String(databaseStatus.CONTEXT_SCOPE || '').toUpperCase() !== 'GLOBAL'
        || String(databaseStatus.CONTEXT_AUTHENTICATED || '').toUpperCase() !== 'Y'
        || Number(databaseStatus.PROTECTED_ROW_COUNT || 0) <= 0) {
      throw new Error('Oracle application context readiness check failed');
    }
    res.json({
      status: 'healthy',
      database: databaseStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      error: err.message
    });
  }
});

// Return a clear JSON response for unknown API routes before the frontend catch-all.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// ── Serve Frontend (Production or explicit isolated test UI) ──────────────
if (shouldServeFrontend()) {
  app.use(express.static(path.join(__dirname, '../frontend/dist'), {
    etag: false,
    lastModified: false,
    setHeaders: setNoStoreHeaders,
  }));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      setNoStoreHeaders(res);
      res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    }
  });
}

// ── Error Handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ── Start Server ───────────────────────────────────────────
async function start() {
  try {
    await db.initialize();
    console.log('Database connection pool ready');
    const recovery = await recoverOrphanedDatasetJobs();
    await releaseStaleDatasetOperationLock({
      forceJobIds: recovery.jobIds,
      force: true,
    });
    if (recovery.recovered > 0) {
      console.warn(`Recovered ${recovery.recovered} interrupted dataset job(s) after application restart.`);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n  High Tech Product Intelligence Demo API`);
      console.log(`  ─────────────────────────`);
      console.log(`  Local:   http://localhost:${PORT}`);
      console.log(`  Health:  http://localhost:${PORT}/api/health`);
      console.log(`  Env:     ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await db.closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, shutting down...');
  await db.closePool();
  process.exit(0);
});

start();

module.exports = app;
