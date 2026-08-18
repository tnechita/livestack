const db = require('../config/database');

const JOB_TABLE = 'APP_DATASET_JOBS';
const SYSTEM_IDENTITY = process.env.SYSTEM_SECURITY_CONTEXT_USER || 'admin_jess';

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return value == null ? null : JSON.parse(JSON.stringify(value));
}

function jsonBind(value) {
  return {
    val: clone(value),
    type: db.oracledb.DB_TYPE_JSON,
  };
}

function payloadFromRow(row) {
  if (!row) return null;
  const payload = row.PAYLOAD ?? row.payload;
  if (typeof payload === 'string') return JSON.parse(payload);
  return clone(payload);
}

async function withConnection(callback) {
  let connection;
  try {
    connection = await db.getConnection();
    await db.setSecurityContext(connection, SYSTEM_IDENTITY, { autoCommit: false });
    return await callback(connection);
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (_) {}
    }
    throw error;
  } finally {
    await db.releaseConnection(connection, { rollback: true, label: 'durable import job' });
  }
}

async function createJob(metadata = {}) {
  const jobId = `imp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = nowIso();
  const job = {
    jobId,
    status: 'queued',
    progress: 0,
    message: 'Import queued',
    warnings: [],
    errors: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    ...metadata,
  };

  await withConnection(async (connection) => {
    await connection.execute(
      `
        INSERT INTO ${JOB_TABLE} (
          job_id, operation, status, progress, message, payload,
          created_at, updated_at
        ) VALUES (
          :jobId, :operation, :status, :progress, :message, :payload,
          SYSTIMESTAMP, SYSTIMESTAMP
        )
      `,
      {
        jobId,
        operation: String(job.operation || 'dataset_operation'),
        status: job.status,
        progress: Number(job.progress || 0),
        message: job.message,
        payload: jsonBind(job),
      },
      { autoCommit: false }
    );
    await connection.commit();
  });

  return clone(job);
}

async function updateJob(jobId, patch = {}) {
  return withConnection(async (connection) => {
    const currentResult = await connection.execute(
      `SELECT payload FROM ${JOB_TABLE} WHERE job_id = :jobId FOR UPDATE`,
      { jobId },
      { outFormat: db.oracledb.OUT_FORMAT_OBJECT, autoCommit: false }
    );
    const existing = payloadFromRow(currentResult.rows?.[0]);
    if (!existing) {
      await connection.rollback();
      return null;
    }

    const next = {
      ...existing,
      ...patch,
      warnings: Array.isArray(patch.warnings) ? patch.warnings : (existing.warnings || []),
      errors: Array.isArray(patch.errors) ? patch.errors : (existing.errors || []),
      updatedAt: nowIso(),
    };
    await connection.execute(
      `
        UPDATE ${JOB_TABLE}
        SET status = :status,
            progress = :progress,
            message = :message,
            payload = :payload,
            updated_at = SYSTIMESTAMP,
            started_at = CASE
              WHEN :status = 'running' AND started_at IS NULL THEN SYSTIMESTAMP
              ELSE started_at
            END,
            completed_at = CASE
              WHEN :status IN ('completed', 'failed') THEN SYSTIMESTAMP
              ELSE completed_at
            END
        WHERE job_id = :jobId
      `,
      {
        status: String(next.status || 'queued').toLowerCase(),
        progress: Math.max(0, Math.min(100, Number(next.progress || 0))),
        message: String(next.message || '').slice(0, 1000),
        payload: jsonBind(next),
        jobId,
      },
      { autoCommit: false }
    );
    await connection.commit();
    return clone(next);
  });
}

async function appendJobWarnings(jobId, warnings = []) {
  if (!warnings.length) return getJob(jobId);
  const existing = await getJob(jobId);
  if (!existing) return null;
  return updateJob(jobId, {
    warnings: [...(existing.warnings || []), ...warnings],
  });
}

async function appendJobErrors(jobId, errors = []) {
  if (!errors.length) return getJob(jobId);
  const existing = await getJob(jobId);
  if (!existing) return null;
  return updateJob(jobId, {
    errors: [...(existing.errors || []), ...errors],
  });
}

async function getJob(jobId) {
  return withConnection(async (connection) => {
    const result = await connection.execute(
      `SELECT payload FROM ${JOB_TABLE} WHERE job_id = :jobId`,
      { jobId },
      { outFormat: db.oracledb.OUT_FORMAT_OBJECT, autoCommit: false }
    );
    return payloadFromRow(result.rows?.[0]);
  });
}

async function getInterruptedJobs() {
  return withConnection(async (connection) => {
    const result = await connection.execute(
      `
        SELECT payload
        FROM ${JOB_TABLE}
        WHERE status IN ('queued', 'running')
        ORDER BY created_at
      `,
      {},
      { outFormat: db.oracledb.OUT_FORMAT_OBJECT, autoCommit: false }
    );
    return (result.rows || []).map(payloadFromRow);
  });
}

async function recoverOrphanedDatasetJobs() {
  const interrupted = await getInterruptedJobs();
  for (const job of interrupted) {
    const recoveryMessage = 'Application restart interrupted this dataset operation before terminal readiness.';
    await updateJob(job.jobId, {
      status: 'failed',
      progress: 100,
      message: recoveryMessage,
      errors: [...(job.errors || []), recoveryMessage],
      recovery: {
        recoverable: true,
        reason: 'APPLICATION_RESTART',
        recoveredAt: nowIso(),
      },
    });
  }
  return {
    recovered: interrupted.length,
    jobIds: interrupted.map((job) => job.jobId),
  };
}

module.exports = {
  createJob,
  updateJob,
  appendJobWarnings,
  appendJobErrors,
  getJob,
  getInterruptedJobs,
  recoverOrphanedDatasetJobs,
};
