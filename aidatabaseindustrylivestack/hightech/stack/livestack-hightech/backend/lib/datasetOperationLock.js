const crypto = require('crypto');
const db = require('../config/database');

const LOCK_TABLE = 'APP_DATASET_OPERATION_LOCK';
const SYSTEM_IDENTITY = process.env.SYSTEM_SECURITY_CONTEXT_USER || 'admin_jess';
const DEFAULT_LEASE_SECONDS = Math.max(
  60,
  Number.parseInt(process.env.DATASET_OPERATION_LEASE_SECONDS || '1800', 10)
);

function clone(value) {
  return value == null ? null : JSON.parse(JSON.stringify(value));
}

function jsonBind(value) {
  return {
    val: clone(value),
    type: db.oracledb.DB_TYPE_JSON,
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
    await db.releaseConnection(connection, { rollback: true, label: 'dataset operation lock' });
  }
}

function operationFromRow(row) {
  if (!row || !row.LEASE_TOKEN) return null;
  const payload = row.LEASE_PAYLOAD;
  const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : clone(payload);
  return {
    ...(parsedPayload || {}),
    leaseToken: row.LEASE_TOKEN,
    jobId: row.OWNER_JOB_ID || parsedPayload?.jobId || null,
    kind: row.OPERATION_KIND || parsedPayload?.kind || null,
    status: row.STATUS || parsedPayload?.status || null,
    message: row.MESSAGE || parsedPayload?.message || null,
    progress: Number(row.PROGRESS || 0),
    acquiredAt: row.ACQUIRED_AT instanceof Date ? row.ACQUIRED_AT.toISOString() : row.ACQUIRED_AT,
    heartbeatAt: row.HEARTBEAT_AT instanceof Date ? row.HEARTBEAT_AT.toISOString() : row.HEARTBEAT_AT,
    leaseExpiresAt: row.LEASE_EXPIRES_AT instanceof Date
      ? row.LEASE_EXPIRES_AT.toISOString()
      : row.LEASE_EXPIRES_AT,
    stale: Number(row.IS_STALE || 0) === 1,
  };
}

async function getActiveOperation() {
  return withConnection(async (connection) => {
    const result = await connection.execute(
      `
        SELECT lease_token, owner_job_id, operation_kind, status, message,
               progress, lease_payload, acquired_at, heartbeat_at,
               lease_expires_at,
               CASE
                 WHEN lease_token IS NOT NULL
                  AND lease_expires_at <= SYSTIMESTAMP THEN 1
                 ELSE 0
               END AS is_stale
        FROM ${LOCK_TABLE}
        WHERE lock_id = 1
      `,
      {},
      { outFormat: db.oracledb.OUT_FORMAT_OBJECT, autoCommit: false }
    );
    const operation = operationFromRow(result.rows?.[0]);
    return operation?.stale ? null : operation;
  });
}

async function beginOperation(metadata = {}) {
  const leaseToken = crypto.randomUUID();
  const leaseSeconds = Math.max(
    60,
    Number.parseInt(metadata.leaseSeconds || DEFAULT_LEASE_SECONDS, 10)
  );

  return withConnection(async (connection) => {
    let lockResult;
    try {
      lockResult = await connection.execute(
        `
          SELECT lease_token, owner_job_id, operation_kind, status, message,
                 progress, lease_payload, acquired_at, heartbeat_at,
                 lease_expires_at,
                 CASE
                   WHEN lease_token IS NOT NULL
                    AND lease_expires_at <= SYSTIMESTAMP THEN 1
                   ELSE 0
                 END AS is_stale
          FROM ${LOCK_TABLE}
          WHERE lock_id = 1
          FOR UPDATE NOWAIT
        `,
        {},
        { outFormat: db.oracledb.OUT_FORMAT_OBJECT, autoCommit: false }
      );
    } catch (error) {
      if (/ORA-00054/.test(String(error?.message || ''))) {
        await connection.rollback();
        return null;
      }
      throw error;
    }

    const current = operationFromRow(lockResult.rows?.[0]);
    if (current && !current.stale) {
      await connection.rollback();
      return null;
    }

    const operation = {
      kind: metadata.kind || 'dataset_operation',
      message: metadata.message || 'Dataset operation in progress.',
      status: metadata.status || 'running',
      progress: Number(metadata.progress || 0),
      jobId: metadata.jobId || null,
      leaseToken,
      leaseSeconds,
      ...metadata,
    };
    await connection.execute(
      `
        UPDATE ${LOCK_TABLE}
        SET lease_token = :leaseToken,
            owner_job_id = :jobId,
            operation_kind = :kind,
            status = :status,
            message = :message,
            progress = :progress,
            lease_payload = :payload,
            acquired_at = SYSTIMESTAMP,
            heartbeat_at = SYSTIMESTAMP,
            lease_expires_at = SYSTIMESTAMP + NUMTODSINTERVAL(:leaseSeconds, 'SECOND'),
            updated_at = SYSTIMESTAMP
        WHERE lock_id = 1
      `,
      {
        leaseToken,
        jobId: operation.jobId,
        kind: operation.kind,
        status: operation.status,
        message: operation.message,
        progress: operation.progress,
        payload: jsonBind(operation),
        leaseSeconds,
      },
      { autoCommit: false }
    );
    await connection.commit();
    return clone(operation);
  });
}

async function updateOperation(patch = {}) {
  return withConnection(async (connection) => {
    const currentResult = await connection.execute(
      `
        SELECT lease_token, owner_job_id, operation_kind, status, message,
               progress, lease_payload, acquired_at, heartbeat_at,
               lease_expires_at, 0 AS is_stale
        FROM ${LOCK_TABLE}
        WHERE lock_id = 1
        FOR UPDATE
      `,
      {},
      { outFormat: db.oracledb.OUT_FORMAT_OBJECT, autoCommit: false }
    );
    const current = operationFromRow(currentResult.rows?.[0]);
    if (!current
        || (patch.leaseToken && patch.leaseToken !== current.leaseToken)
        || (patch.jobId && current.jobId && patch.jobId !== current.jobId)) {
      await connection.rollback();
      return null;
    }

    const next = { ...current, ...patch, leaseToken: current.leaseToken };
    const leaseSeconds = Math.max(
      60,
      Number.parseInt(next.leaseSeconds || DEFAULT_LEASE_SECONDS, 10)
    );
    await connection.execute(
      `
        UPDATE ${LOCK_TABLE}
        SET owner_job_id = :jobId,
            operation_kind = :kind,
            status = :status,
            message = :message,
            progress = :progress,
            lease_payload = :payload,
            heartbeat_at = SYSTIMESTAMP,
            lease_expires_at = SYSTIMESTAMP + NUMTODSINTERVAL(:leaseSeconds, 'SECOND'),
            updated_at = SYSTIMESTAMP
        WHERE lock_id = 1
          AND lease_token = :leaseToken
      `,
      {
        jobId: next.jobId || null,
        kind: next.kind,
        status: next.status,
        message: next.message,
        progress: Number(next.progress || 0),
        payload: jsonBind(next),
        leaseSeconds,
        leaseToken: current.leaseToken,
      },
      { autoCommit: false }
    );
    await connection.commit();
    return clone(next);
  });
}

async function endOperation(criteria = {}) {
  return withConnection(async (connection) => {
    const result = await connection.execute(
      `
        SELECT lease_token, owner_job_id, operation_kind, status, message,
               progress, lease_payload, acquired_at, heartbeat_at,
               lease_expires_at, 0 AS is_stale
        FROM ${LOCK_TABLE}
        WHERE lock_id = 1
        FOR UPDATE
      `,
      {},
      { outFormat: db.oracledb.OUT_FORMAT_OBJECT, autoCommit: false }
    );
    const current = operationFromRow(result.rows?.[0]);
    if (!current
        || (criteria.leaseToken && criteria.leaseToken !== current.leaseToken)
        || (criteria.jobId && current.jobId && criteria.jobId !== current.jobId)) {
      await connection.rollback();
      return null;
    }
    await connection.execute(
      `
        UPDATE ${LOCK_TABLE}
        SET lease_token = NULL,
            owner_job_id = NULL,
            operation_kind = NULL,
            status = NULL,
            message = NULL,
            progress = NULL,
            lease_payload = NULL,
            acquired_at = NULL,
            heartbeat_at = NULL,
            lease_expires_at = NULL,
            updated_at = SYSTIMESTAMP
        WHERE lock_id = 1
      `,
      {},
      { autoCommit: false }
    );
    await connection.commit();
    return current;
  });
}

async function releaseStaleDatasetOperationLock({ forceJobIds = [], force = false } = {}) {
  const forceSet = new Set(forceJobIds);
  const current = await getActiveOperation();
  if (!current) {
    return endOperation();
  }
  if (force || forceSet.has(current.jobId)) {
    return endOperation({ leaseToken: current.leaseToken });
  }
  return null;
}

module.exports = {
  beginOperation,
  updateOperation,
  endOperation,
  getActiveOperation,
  releaseStaleDatasetOperationLock,
};
