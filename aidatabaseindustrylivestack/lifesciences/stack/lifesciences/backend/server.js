/**
 * Life Sciences Demo — Express Server
 * Serves API routes and the React frontend in production
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const db = require('./config/database');
const { createDemoSessionService, normalizeActor, sameOriginDemoControl } = require('./lib/demoSession');
const { createDatasetServingFence } = require('./lib/datasetServingFence');
const { reconcileOnStartup } = require('./lib/datasetGenerationStore');

const app = express();
const PORT = process.env.PORT || 3001;
const demoSessions = createDemoSessionService();

// ── Middleware ──────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// ── Governed demo identity ─────────────────────────────────
// The browser may display an actor but cannot select one through a header.
app.post('/api/demo-session', async (req, res) => {
  if (!sameOriginDemoControl(req)) return res.status(403).json({ code: 'DEMO_CONTROL_FORBIDDEN' });
  const requested = normalizeActor(req.body?.actor);
  try {
    const actor = requested && await db.resolveActiveActor(requested);
    if (!actor) return res.status(403).json({ code: 'DEMO_ACTOR_FORBIDDEN' });
    const issued = demoSessions.issue(actor);
    res.setHeader('Set-Cookie', demoSessions.serializeCookie(issued.token));
    return res.status(201).json({ ok: true, actor: issued.actor, expiresAt: new Date(issued.expiresAt).toISOString() });
  } catch (error) {
    return res.status(503).json({ code: 'DEMO_IDENTITY_UNAVAILABLE' });
  }
});

app.delete('/api/demo-session', (req, res) => {
  if (!sameOriginDemoControl(req)) return res.status(403).json({ code: 'DEMO_CONTROL_FORBIDDEN' });
  res.setHeader('Set-Cookie', demoSessions.clearCookie());
  return res.json({ ok: true });
});

app.use('/api', async (req, res, next) => {
  if (['/health', '/users'].includes(req.path)) return next();
  const session = demoSessions.readRequest(req);
  if (!session.ok) return res.status(401).json({ code: 'DEMO_SESSION_REQUIRED', error: 'Authentication is required for governed API routes.' });
  const displayed = req.headers['x-demo-user'];
  if (displayed != null && normalizeActor(displayed) !== session.actor) return res.status(403).json({ code: 'DEMO_ACTOR_MISMATCH' });
  try {
    const actor = await db.resolveActiveActor(session.actor);
    if (!actor) return res.status(403).json({ code: 'DEMO_ACTOR_FORBIDDEN' });
    req.authenticatedActor = actor;
    req.demoUser = actor;
    return next();
  } catch (_) { return res.status(503).json({ code: 'DEMO_IDENTITY_UNAVAILABLE' }); }
});
app.use('/api', createDatasetServingFence());

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
const featureRoutes = require('./routes/features');

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/fulfillment', fulfillmentRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/selectai', selectaiRoutes);
app.use('/api/import', importRoutes);
app.use('/api/features', featureRoutes);

// ── Health Check ───────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const result = await db.execute("SELECT 'connected' AS status, SYSDATE AS db_time FROM dual");
    res.json({
      status: 'healthy',
      database: result.rows[0],
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

// ── Serve Frontend (Production) ────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
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
    await reconcileOnStartup();
    console.log('Database connection pool ready');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n  Life Sciences Demo API`);
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
