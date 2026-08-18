/*
 * Durable dataset lifecycle state for High Tech Restore/Import.
 * Oracle is the authority for jobs, the singleton operation lease, and the
 * last dataset version that passed every required feature readiness gate.
 */

DECLARE
    v_count PLS_INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM user_tables
    WHERE table_name = 'APP_DATASET_JOBS';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE q'[
            CREATE TABLE app_dataset_jobs (
                job_id        VARCHAR2(100) PRIMARY KEY,
                operation     VARCHAR2(40) NOT NULL,
                status        VARCHAR2(20) NOT NULL
                              CHECK (status IN ('queued','running','completed','failed')),
                progress      NUMBER(3) DEFAULT 0 NOT NULL
                              CHECK (progress BETWEEN 0 AND 100),
                message       VARCHAR2(1000),
                payload       JSON NOT NULL,
                created_at    TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
                updated_at    TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
                started_at    TIMESTAMP,
                completed_at  TIMESTAMP
            )
        ]';
    END IF;
END;
/

DECLARE
    v_count PLS_INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM user_indexes
    WHERE index_name = 'IDX_APP_DATASET_JOBS_STATUS';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE
            'CREATE INDEX idx_app_dataset_jobs_status ON app_dataset_jobs(status, updated_at)';
    END IF;
END;
/

DECLARE
    v_count PLS_INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM user_tables
    WHERE table_name = 'APP_DATASET_OPERATION_LOCK';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE q'[
            CREATE TABLE app_dataset_operation_lock (
                lock_id          NUMBER(1) PRIMARY KEY CHECK (lock_id = 1),
                lease_token      VARCHAR2(100),
                owner_job_id     VARCHAR2(100),
                operation_kind   VARCHAR2(40),
                status           VARCHAR2(20),
                message          VARCHAR2(1000),
                progress         NUMBER(3),
                lease_payload    JSON,
                acquired_at      TIMESTAMP,
                heartbeat_at     TIMESTAMP,
                lease_expires_at TIMESTAMP,
                updated_at       TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
            )
        ]';
    END IF;
END;
/

MERGE INTO app_dataset_operation_lock target
USING (SELECT 1 AS lock_id FROM dual) source
ON (target.lock_id = source.lock_id)
WHEN NOT MATCHED THEN INSERT (lock_id, updated_at)
VALUES (source.lock_id, SYSTIMESTAMP);

DECLARE
    v_count PLS_INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM user_tables
    WHERE table_name = 'APP_DATASET_STATE';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE q'[
            CREATE TABLE app_dataset_state (
                state_id NUMBER(1) PRIMARY KEY CHECK (state_id = 1),
                active_source VARCHAR2(20) NOT NULL
                              CHECK (active_source IN ('demo', 'custom')),
                active_label VARCHAR2(100) NOT NULL,
                active_version VARCHAR2(20),
                updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
            )
        ]';
    END IF;
END;
/

DECLARE
    v_count PLS_INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM user_tables
    WHERE table_name = 'APP_DATASET_READINESS';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE q'[
            CREATE TABLE app_dataset_readiness (
                readiness_id    NUMBER(1) PRIMARY KEY CHECK (readiness_id = 1),
                dataset_source  VARCHAR2(20),
                dataset_version VARCHAR2(40),
                job_id          VARCHAR2(100),
                status          VARCHAR2(20) NOT NULL
                                CHECK (status IN ('UNKNOWN','ACTIVE','FAILED')),
                readiness       JSON,
                failure_message VARCHAR2(2000),
                activated_at    TIMESTAMP,
                updated_at      TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
            )
        ]';
    END IF;
END;
/

MERGE INTO app_dataset_readiness target
USING (SELECT 1 AS readiness_id FROM dual) source
ON (target.readiness_id = source.readiness_id)
WHEN NOT MATCHED THEN INSERT (readiness_id, status, updated_at)
VALUES (source.readiness_id, 'UNKNOWN', SYSTIMESTAMP);

COMMIT;

SELECT 'Durable High Tech dataset lifecycle schema ready' AS status FROM dual;
