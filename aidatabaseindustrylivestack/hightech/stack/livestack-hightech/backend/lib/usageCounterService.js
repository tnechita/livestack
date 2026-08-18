const crypto = require('crypto');

const DEFAULT_DEMO_ID = 'hightech';
const DEFAULT_TIMEOUT_MS = 3000;
const DISABLED_VALUES = new Set(['0', 'false', 'no', 'off']);
const VALID_STATUSES = new Set(['requested', 'completed', 'failed']);
const OCI_OBJECT_STORAGE_HOST = /^objectstorage\.[a-z0-9-]+\.(?:oraclecloud\.com|oraclecloud8\.com|oraclecloud\.eu|oraclecloud\.uk)$/i;

function normalizeText(value) {
  return String(value == null ? '' : value).trim();
}

function normalizeDemoId(value) {
  const normalized = normalizeText(value || DEFAULT_DEMO_ID)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || DEFAULT_DEMO_ID;
}

function normalizePrefix(value, demoId) {
  return normalizeText(value || `${demoId}-demo-usage/events`)
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/');
}

function parseTimeoutMs(value) {
  const parsed = Number.parseInt(normalizeText(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(parsed, 30000);
}

function isTelemetryDisabled(value) {
  return DISABLED_VALUES.has(normalizeText(value).toLowerCase());
}

function getTelemetryConfig(env = process.env) {
  const demoId = normalizeDemoId(env.DEMO_USAGE_COUNTER_DEMO_ID);
  const prefix = normalizePrefix(env.DEMO_USAGE_COUNTER_PREFIX, demoId);
  const parUrl = normalizeText(env.DEMO_USAGE_COUNTER_PAR_URL);
  const enabled = !isTelemetryDisabled(env.DEMO_USAGE_COUNTER_ENABLED) && Boolean(parUrl);

  return {
    enabled,
    parUrl,
    prefix,
    demoId,
    timeoutMs: parseTimeoutMs(env.DEMO_USAGE_COUNTER_TIMEOUT_MS),
  };
}

function encodePathSegments(objectKey) {
  return objectKey
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function getTestCaptureHosts(env) {
  if (normalizeText(env?.NODE_ENV).toLowerCase() !== 'test') {
    return new Set();
  }
  return new Set(
    normalizeText(env?.DEMO_USAGE_COUNTER_TEST_CAPTURE_HOSTS)
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean)
  );
}

function hasObjectStorageParShape(pathname) {
  const segments = String(pathname || '').split('/').filter(Boolean);
  return segments.length >= 7
    && segments[0] === 'p'
    && Boolean(segments[1])
    && segments[2] === 'n'
    && Boolean(segments[3])
    && segments[4] === 'b'
    && Boolean(segments[5])
    && segments[6] === 'o';
}

function validateParUrl(parUrl, env = process.env) {
  let parsed;
  try {
    parsed = new URL(parUrl);
  } catch (_) {
    throw new TypeError('Object Storage PAR URL is invalid');
  }
  const testCaptureHost = getTestCaptureHosts(env).has(parsed.host.toLowerCase());
  const validProtocol = parsed.protocol === 'https:'
    || (testCaptureHost && parsed.protocol === 'http:');
  const validHost = OCI_OBJECT_STORAGE_HOST.test(parsed.hostname) || testCaptureHost;

  if (!validProtocol
      || !validHost
      || (!testCaptureHost && Boolean(parsed.port))
      || parsed.username
      || parsed.password
      || parsed.hash
      || parsed.search
      || !hasObjectStorageParShape(parsed.pathname)) {
    throw new TypeError('Object Storage PAR URL must use an approved OCI HTTPS endpoint and PAR path');
  }
  return parsed;
}

function buildPutUrl(parUrl, objectKey, env = process.env) {
  const parsed = validateParUrl(parUrl, env);
  const basePath = parsed.pathname.endsWith('/') ? parsed.pathname : `${parsed.pathname}/`;
  return `${parsed.origin}${basePath}${encodePathSegments(objectKey)}`;
}

function safeFileToken(value) {
  return normalizeText(value)
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function buildObjectKey({ prefix, demoId, timestamp, correlationId, status }) {
  const datePartition = timestamp.slice(0, 10);
  const timestampToken = timestamp.replace(/[:.]/g, '-');
  const correlationToken = safeFileToken(correlationId) || 'uncorrelated';
  const statusToken = VALID_STATUSES.has(status) ? status : 'event';
  const uniquenessToken = crypto.randomBytes(4).toString('hex');
  return `${prefix}/${datePartition}/${demoId}-${timestampToken}-${correlationToken}-${statusToken}-${uniquenessToken}.json`;
}

function sanitizeErrorMessage(err) {
  const raw = normalizeText(err?.message || err || 'unknown error');
  return raw.replace(/https?:\/\/\S+/gi, '[redacted-url]');
}

function normalizeStatus(value) {
  const status = normalizeText(value).toLowerCase();
  return VALID_STATUSES.has(status) ? status : '';
}

function normalizeDurationMs(value) {
  const durationMs = Number(value);
  if (!Number.isFinite(durationMs) || durationMs < 0) return null;
  return Math.round(durationMs);
}

function sanitizeErrorCategory(value) {
  const category = safeFileToken(value).toLowerCase();
  return category || null;
}

function buildPayload(config, eventContext = {}, eventTime = new Date().toISOString()) {
  const operation = normalizeText(eventContext.operation || 'refresh').toLowerCase();
  const status = normalizeStatus(eventContext.status);
  const correlationId = safeFileToken(eventContext.correlationId || eventContext.jobId) || null;
  const payload = {
    schemaVersion: '1.0',
    eventType: operation === 'restore' ? 'dataset_restore' : 'dataset_refresh',
    demoId: config.demoId,
    eventTime,
    operation,
    status,
    correlationId,
    datasetVersion: safeFileToken(eventContext.datasetVersion) || null,
  };

  const durationMs = normalizeDurationMs(eventContext.durationMs);
  if (durationMs !== null) payload.durationMs = durationMs;
  if (status === 'failed') {
    payload.errorCategory = sanitizeErrorCategory(eventContext.errorCategory) || 'unexpected';
  }
  return payload;
}

async function recordDatasetEvent(eventContext = {}) {
  const config = getTelemetryConfig();
  if (!config.enabled) {
    return { recorded: false, skipped: true };
  }

  const status = normalizeStatus(eventContext.status);
  if (!status) {
    console.warn('Usage telemetry skipped: invalid lifecycle status.');
    return { recorded: false, skipped: true };
  }

  if (typeof fetch !== 'function') {
    console.warn('Usage telemetry skipped: fetch is unavailable in this Node runtime.');
    return { recorded: false, skipped: true };
  }

  const eventTime = new Date().toISOString();
  const correlationId = eventContext.correlationId || eventContext.jobId;
  const objectKey = buildObjectKey({
    prefix: config.prefix,
    demoId: config.demoId,
    timestamp: eventTime,
    correlationId,
    status,
  });

  let putUrl;
  try {
    putUrl = buildPutUrl(config.parUrl, objectKey);
  } catch (err) {
    console.warn(`Usage telemetry skipped: invalid Object Storage PAR URL (${sanitizeErrorMessage(err)}).`);
    return { recorded: false, skipped: true };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const payload = buildPayload(config, eventContext, eventTime);
    const response = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: `${JSON.stringify(payload)}\n`,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Object Storage PUT returned HTTP ${response.status}`);
    }

    return { recorded: true, objectKey };
  } catch (err) {
    console.warn(`Usage telemetry skipped: ${sanitizeErrorMessage(err)}.`);
    return { recorded: false, skipped: true };
  } finally {
    clearTimeout(timeout);
  }
}

async function recordDatasetRefresh(eventContext = {}) {
  return recordDatasetEvent({
    ...eventContext,
    status: eventContext.status || 'completed',
  });
}

module.exports = {
  recordDatasetEvent,
  recordDatasetRefresh,
  _private: {
    buildObjectKey,
    buildPayload,
    buildPutUrl,
    getTelemetryConfig,
    normalizeStatus,
    sanitizeErrorCategory,
    sanitizeErrorMessage,
    validateParUrl,
  },
};
