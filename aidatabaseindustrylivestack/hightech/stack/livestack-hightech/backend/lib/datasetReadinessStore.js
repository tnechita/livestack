const db = require('../config/database');

const TABLE_NAME = 'APP_DATASET_READINESS';
const SYSTEM_IDENTITY = process.env.SYSTEM_SECURITY_CONTEXT_USER || 'admin_jess';

function clone(value) {
  return value == null ? null : JSON.parse(JSON.stringify(value));
}

function jsonBind(value) {
  return value == null
    ? null
    : { val: clone(value), type: db.oracledb.DB_TYPE_JSON };
}

function dateValue(value) {
  return value instanceof Date ? value.toISOString() : (value || null);
}

function parseReadiness(value) {
  if (typeof value === 'string') return JSON.parse(value);
  return clone(value);
}

function normalizeRow(row) {
  if (!row) return null;
  return {
    source: row.DATASET_SOURCE || null,
    version: row.DATASET_VERSION || null,
    jobId: row.JOB_ID || null,
    status: row.STATUS || 'UNKNOWN',
    readiness: parseReadiness(row.READINESS),
    failureMessage: row.FAILURE_MESSAGE || null,
    activatedAt: dateValue(row.ACTIVATED_AT),
    updatedAt: dateValue(row.UPDATED_AT),
  };
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
    await db.releaseConnection(connection, { rollback: true, label: 'dataset readiness state' });
  }
}

async function readDatasetReadiness(connection) {
  const result = await connection.execute(
    `
      SELECT dataset_source, dataset_version, job_id, status, readiness,
             failure_message, activated_at, updated_at
      FROM ${TABLE_NAME}
      WHERE readiness_id = 1
    `,
    {},
    { outFormat: db.oracledb.OUT_FORMAT_OBJECT, autoCommit: false }
  );
  return normalizeRow(result.rows?.[0]);
}

async function getDatasetReadiness() {
  return withConnection(readDatasetReadiness);
}

async function saveActiveDatasetReadiness({
  source,
  label,
  version,
  jobId,
  readiness,
  jobPatch = null,
}) {
  return withConnection(async (connection) => {
    let completedJob = null;
    if (jobId && jobPatch) {
      const jobResult = await connection.execute(
        'SELECT payload FROM app_dataset_jobs WHERE job_id = :jobId FOR UPDATE',
        { jobId },
        { outFormat: db.oracledb.OUT_FORMAT_OBJECT, autoCommit: false }
      );
      const payload = jobResult.rows?.[0]?.PAYLOAD;
      const existingJob = typeof payload === 'string' ? JSON.parse(payload) : clone(payload);
      if (!existingJob) {
        throw new Error(`Durable dataset job ${jobId} does not exist.`);
      }
      completedJob = {
        ...existingJob,
        ...jobPatch,
        updatedAt: new Date().toISOString(),
      };
    }

    await connection.execute(
      `
        MERGE INTO app_dataset_state target
        USING (
          SELECT 1 AS state_id,
                 :source AS active_source,
                 :label AS active_label,
                 :version AS active_version
          FROM dual
        ) incoming
        ON (target.state_id = incoming.state_id)
        WHEN MATCHED THEN UPDATE SET
          target.active_source = incoming.active_source,
          target.active_label = incoming.active_label,
          target.active_version = incoming.active_version,
          target.updated_at = SYSTIMESTAMP
        WHEN NOT MATCHED THEN INSERT (
          state_id, active_source, active_label, active_version, updated_at
        ) VALUES (
          incoming.state_id, incoming.active_source, incoming.active_label,
          incoming.active_version, SYSTIMESTAMP
        )
      `,
      {
        source,
        label: label || (source === 'demo' ? 'Demo Data' : 'Custom Dataset'),
        version,
      },
      { autoCommit: false }
    );
    await connection.execute(
      `
        UPDATE ${TABLE_NAME}
        SET dataset_source = :source,
            dataset_version = :version,
            job_id = :jobId,
            status = 'ACTIVE',
            readiness = :readiness,
            failure_message = NULL,
            activated_at = SYSTIMESTAMP,
            updated_at = SYSTIMESTAMP
        WHERE readiness_id = 1
      `,
      {
        source,
        version,
        jobId,
        readiness: jsonBind(readiness),
      },
      { autoCommit: false }
    );
    if (completedJob) {
      await connection.execute(
        `
          UPDATE app_dataset_jobs
          SET status = 'completed',
              progress = 100,
              message = :message,
              payload = :payload,
              updated_at = SYSTIMESTAMP,
              completed_at = SYSTIMESTAMP
          WHERE job_id = :jobId
        `,
        {
          message: String(completedJob.message || 'Dataset operation completed.').slice(0, 1000),
          payload: jsonBind(completedJob),
          jobId,
        },
        { autoCommit: false }
      );
    }
    await connection.commit();
    return {
      readiness: await readDatasetReadiness(connection),
      job: completedJob,
    };
  });
}

async function markDatasetReadinessFailed({
  jobId,
  attemptedVersion,
  readiness,
  message,
}) {
  return withConnection(async (connection) => {
    const failureReadiness = {
      attemptedVersion,
      ...(readiness || {}),
    };
    await connection.execute(
      `
        UPDATE ${TABLE_NAME}
        SET job_id = :jobId,
            status = 'FAILED',
            readiness = :readiness,
            failure_message = :message,
            updated_at = SYSTIMESTAMP
        WHERE readiness_id = 1
      `,
      {
        jobId,
        readiness: jsonBind(failureReadiness),
        message: String(message || 'Required feature readiness failed.').slice(0, 2000),
      },
      { autoCommit: false }
    );
    await connection.commit();
    return readDatasetReadiness(connection);
  });
}

module.exports = {
  getDatasetReadiness,
  saveActiveDatasetReadiness,
  markDatasetReadinessFailed,
};
