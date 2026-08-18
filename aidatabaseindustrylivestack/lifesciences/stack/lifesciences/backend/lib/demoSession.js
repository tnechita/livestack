const crypto = require('node:crypto');

const COOKIE_NAME = 'lifesciences_demo_session';
const DEMO_CONTROL_HEADER = 'x-lifesciences-demo-control';
const DEMO_CONTROL_VALUE = 'lifesciences-demo-session';
const ACTOR_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;
const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000;
let processSecret;

function normalizeActor(value) {
  const actor = typeof value === 'string' ? value.trim() : '';
  return ACTOR_PATTERN.test(actor) ? actor : null;
}

function header(req, name) {
  return typeof req?.get === 'function'
    ? String(req.get(name) || '')
    : String(req?.headers?.[String(name).toLowerCase()] || '');
}

function sameOriginDemoControl(req) {
  const origin = header(req, 'Origin');
  const host = header(req, 'Host');
  if (header(req, DEMO_CONTROL_HEADER) !== DEMO_CONTROL_VALUE || !origin || !host) return false;
  try {
    const parsed = new URL(origin);
    return ['http:', 'https:'].includes(parsed.protocol)
      && parsed.host.toLowerCase() === host.toLowerCase()
      && parsed.origin === origin.replace(/\/$/, '');
  } catch (_) { return false; }
}

function createDemoSessionService({ now = Date.now, ttlMs = DEFAULT_TTL_MS } = {}) {
  const configured = String(process.env.DEMO_SESSION_SECRET || '');
  if (configured && Buffer.byteLength(configured, 'utf8') < 32) {
    throw new Error('DEMO_SESSION_SECRET must contain at least 32 bytes.');
  }
  processSecret ||= configured || crypto.randomBytes(48).toString('base64url');
  const secret = Buffer.from(processSecret, 'utf8');
  const sign = (value) => crypto.createHmac('sha256', secret).update(value).digest('base64url');
  const cookie = (token, age) => [
    `${COOKIE_NAME}=${token}`, 'Path=/api', `Max-Age=${age}`, 'HttpOnly', 'SameSite=Strict',
  ].join('; ');

  function issue(actor) {
    const normalized = normalizeActor(actor);
    if (!normalized) throw new Error('A recognized demo actor is required.');
    const iat = Number(now());
    const payload = Buffer.from(JSON.stringify({ v: 1, actor: normalized, iat, exp: iat + ttlMs }), 'utf8').toString('base64url');
    const unsigned = `v1.${payload}`;
    return { actor: normalized, expiresAt: iat + ttlMs, token: `${unsigned}.${sign(unsigned)}` };
  }

  function verify(token) {
    const parts = String(token || '').split('.');
    if (parts.length !== 3 || parts[0] !== 'v1') return { ok: false, reason: token ? 'invalid' : 'missing' };
    const unsigned = `${parts[0]}.${parts[1]}`;
    const expected = Buffer.from(sign(unsigned));
    const received = Buffer.from(parts[2]);
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return { ok: false, reason: 'invalid' };
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      const actor = normalizeActor(payload?.actor);
      const current = Number(now());
      if (payload?.v !== 1 || !actor || !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp) || payload.exp <= payload.iat) return { ok: false, reason: 'invalid' };
      if (payload.exp <= current) return { ok: false, reason: 'expired' };
      return { ok: true, actor, expiresAt: payload.exp };
    } catch (_) { return { ok: false, reason: 'invalid' }; }
  }

  return {
    issue,
    verify,
    readRequest(req) {
      const match = header(req, 'Cookie').match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
      return verify(match?.[1]);
    },
    serializeCookie(token) { return cookie(token, Math.floor(ttlMs / 1000)); },
    clearCookie() { return cookie('', 0); },
  };
}

module.exports = { createDemoSessionService, normalizeActor, sameOriginDemoControl };
