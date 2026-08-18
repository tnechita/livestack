#!/bin/bash

set -euo pipefail

APP_DIR=/workspace/app
BOOTSTRAP_MARKER=/opt/oracle/oradata/.app_schema_bootstrap_done
APP_SCHEMA_USER="${ORACLE_USER:-LIVESTACK}"
APP_SCHEMA_PASSWORD="${APP_SCHEMA_PASSWORD:-livestackrulez!}"

if [[ ! "$APP_SCHEMA_USER" =~ ^[A-Za-z][A-Za-z0-9_]{0,127}$ ]]; then
  echo ">>> ERROR: ORACLE_USER must be an unquoted Oracle identifier using letters, numbers, or underscores."
  exit 1
fi

APP_SCHEMA_USER_UPPER="$(printf '%s' "$APP_SCHEMA_USER" | tr '[:lower:]' '[:upper:]')"
APP_SCHEMA_USER_LOWER="$(printf '%s' "$APP_SCHEMA_USER" | tr '[:upper:]' '[:lower:]')"
APP_SCHEMA_PASSWORD_SQL="${APP_SCHEMA_PASSWORD//\"/\"\"}"

ADMIN_CONNECT="sys/${ORACLE_PWD:-oracle}@//localhost:1521/FREEPDB1 as sysdba"
ROOT_CONNECT="/ as sysdba"
APP_CONNECT="${APP_SCHEMA_USER_UPPER}/${APP_SCHEMA_PASSWORD}@//localhost:1521/FREEPDB1"
ONNX_MODEL_URL="${ONNX_MODEL_URL:-https://adwc4pm.objectstorage.us-ashburn-1.oci.customer-oci.com/p/eLddQappgBJ7jNi6Guz9m9LOtYe2u8LWY19GfgU8flFK4N9YgP4kTlrE9Px3pE12/n/adwc4pm/b/OML-Resources/o/all_MiniLM_L12_v2.onnx}"

extract_between_markers() {
  local start_marker="$1"
  local end_marker="$2"
  local source_file="$3"
  local target_file="$4"

  awk -v start="$start_marker" -v end="$end_marker" '
    index($0, start) { in_section = 1; next }
    index($0, end)   { in_section = 0; exit }
    in_section       { print }
  ' "$source_file" > "$target_file"
}

extract_from_marker() {
  local start_marker="$1"
  local source_file="$2"
  local target_file="$3"

  awk -v start="$start_marker" '
    index($0, start) { in_section = 1; next }
    in_section       { print }
  ' "$source_file" > "$target_file"
}

apply_schema_user() {
  local sql_file="$1"

  sed -i.bak \
    -e "s/LIVESTACK/${APP_SCHEMA_USER_UPPER}/g" \
    -e "s/livestack\\./${APP_SCHEMA_USER_LOWER}./g" \
    "$sql_file"
  rm -f "${sql_file}.bak"
}

configure_inmemory_base_level() {
  local current_config

  current_config="$(
    sqlplus -L -s "$ROOT_CONNECT" <<'SQL'
SET HEADING OFF
SET FEEDBACK OFF
SET VERIFY OFF
SET PAGES 0
SET ECHO OFF
SELECT MAX(CASE WHEN name = 'inmemory_size' THEN value END) || '|' ||
       MAX(CASE WHEN name = 'inmemory_force' THEN UPPER(value) END)
FROM v$parameter
WHERE name IN ('inmemory_size', 'inmemory_force');
EXIT SUCCESS
SQL
  )"
  current_config="$(printf '%s' "$current_config" | tr -d '\r' | sed '/^[[:space:]]*$/d' | tail -n 1)"

  if [ "$current_config" != "268435456|BASE_LEVEL" ]; then
    echo ">>> Configuring Oracle Database In-Memory Base Level (256M); one database restart is required..."
    sqlplus -L -s "$ROOT_CONNECT" <<'SQL'
WHENEVER OSERROR EXIT FAILURE
WHENEVER SQLERROR EXIT SQL.SQLCODE
ALTER SYSTEM SET INMEMORY_SIZE = 256M SCOPE = SPFILE;
ALTER SYSTEM SET INMEMORY_FORCE = 'BASE_LEVEL' SCOPE = SPFILE;
SHUTDOWN IMMEDIATE;
STARTUP;
ALTER PLUGGABLE DATABASE ALL OPEN;
EXIT SUCCESS
SQL

    until echo 'SELECT 1 FROM dual;' | sqlplus -L -s system/"${ORACLE_PWD:-oracle}"@localhost:1521/FREEPDB1 >/dev/null 2>&1; do
      sleep 5
    done
  fi

  sqlplus -L -s "$ROOT_CONNECT" <<'SQL'
WHENEVER OSERROR EXIT FAILURE
WHENEVER SQLERROR EXIT SQL.SQLCODE
DECLARE
  v_option VARCHAR2(10);
  v_size   NUMBER;
  v_force  VARCHAR2(30);
  v_query  VARCHAR2(30);
  v_area   NUMBER;
BEGIN
  SELECT UPPER(value)
  INTO v_option
  FROM v$option
  WHERE parameter = 'In-Memory Column Store';

  SELECT MAX(CASE WHEN name = 'inmemory_size' THEN TO_NUMBER(value) END),
         MAX(CASE WHEN name = 'inmemory_force' THEN UPPER(value) END),
         MAX(CASE WHEN name = 'inmemory_query' THEN UPPER(value) END)
  INTO v_size, v_force, v_query
  FROM v$parameter
  WHERE name IN ('inmemory_size', 'inmemory_force', 'inmemory_query');

  SELECT COALESCE(SUM(alloc_bytes), 0)
  INTO v_area
  FROM v$inmemory_area;

  IF v_option <> 'TRUE'
     OR v_size < 268435456
     OR v_force <> 'BASE_LEVEL'
     OR v_query <> 'ENABLE'
     OR v_area < 268435456 THEN
    RAISE_APPLICATION_ERROR(
      -20400,
      'Oracle Database In-Memory Base Level configuration did not initialize'
    );
  END IF;
END;
/
EXIT SUCCESS
SQL
}

echo ">>> High Tech Product Intelligence bootstrap starting inside db container..."
rm -f "$BOOTSTRAP_MARKER"

echo ">>> Preparing split SQL files..."
extract_between_markers \
  "-- SECTION 1: RUN AS ADMIN" \
  "-- SECTION 2: RUN AS LIVESTACK" \
  "${APP_DIR}/db/schema/06_security.sql" \
  /tmp/06_security_admin.sql

extract_between_markers \
  "-- SECTION 2A: TRUSTED PACKAGE BEGIN" \
  "-- SECTION 2A: TRUSTED PACKAGE END" \
  "${APP_DIR}/db/schema/06b_hightech_vpd.sql" \
  /tmp/06b_hightech_package.sql

extract_between_markers \
  "-- SECTION 2B: VPD POLICIES BEGIN" \
  "-- SECTION 2B: VPD POLICIES END" \
  "${APP_DIR}/db/schema/06b_hightech_vpd.sql" \
  /tmp/06b_hightech_policies.sql

extract_between_markers \
  "-- STEP 2: CREATE PL/SQL FUNCTIONS THAT BECOME AGENT TOOLS" \
  "-- STEP 3: CREATE SELECT AI AGENT TOOLS" \
  "${APP_DIR}/db/schema/08_agents.sql" \
  /tmp/08_agents_functions.sql

extract_from_marker \
  "-- PRODUCT EMBEDDINGS" \
  "${APP_DIR}/db/schema/04_vector.sql" \
  /tmp/04_vector_schema.sql

for sql_file in /tmp/06_security_admin.sql /tmp/06b_hightech_package.sql /tmp/06b_hightech_policies.sql /tmp/08_agents_functions.sql /tmp/04_vector_schema.sql; do
  if [ ! -s "$sql_file" ]; then
    echo ">>> ERROR: Failed to extract expected SQL section into $sql_file"
    exit 1
  fi
done

apply_schema_user /tmp/06_security_admin.sql

echo ">>> Waiting for Oracle AI Database Free service..."
until echo 'SELECT 1 FROM dual;' | sqlplus -L -s system/"${ORACLE_PWD:-oracle}"@localhost:1521/FREEPDB1 > /dev/null 2>&1; do
  sleep 5
done

configure_inmemory_base_level

cat > /tmp/bootstrap_admin.sql <<SQL
WHENEVER SQLERROR EXIT SQL.SQLCODE
SET SERVEROUTPUT ON
DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM dba_users
  WHERE username = '${APP_SCHEMA_USER_UPPER}';

  IF v_count = 0 THEN
    EXECUTE IMMEDIATE 'CREATE USER ${APP_SCHEMA_USER_UPPER} IDENTIFIED BY "${APP_SCHEMA_PASSWORD_SQL}" DEFAULT TABLESPACE USERS TEMPORARY TABLESPACE TEMP QUOTA UNLIMITED ON USERS';
    DBMS_OUTPUT.PUT_LINE('User ${APP_SCHEMA_USER_UPPER} created.');
  ELSE
    EXECUTE IMMEDIATE 'ALTER USER ${APP_SCHEMA_USER_UPPER} IDENTIFIED BY "${APP_SCHEMA_PASSWORD_SQL}"';
    EXECUTE IMMEDIATE 'ALTER USER ${APP_SCHEMA_USER_UPPER} DEFAULT TABLESPACE USERS TEMPORARY TABLESPACE TEMP';
    EXECUTE IMMEDIATE 'ALTER USER ${APP_SCHEMA_USER_UPPER} QUOTA UNLIMITED ON USERS';
    DBMS_OUTPUT.PUT_LINE('User ${APP_SCHEMA_USER_UPPER} already exists. Password refreshed.');
  END IF;
END;
/
BEGIN
  FOR stmt IN (
    SELECT 'GRANT CREATE SESSION TO ${APP_SCHEMA_USER_UPPER}' AS sql_stmt FROM dual UNION ALL
    SELECT 'GRANT CREATE TABLE TO ${APP_SCHEMA_USER_UPPER}' FROM dual UNION ALL
    SELECT 'GRANT CREATE VIEW TO ${APP_SCHEMA_USER_UPPER}' FROM dual UNION ALL
    SELECT 'GRANT CREATE SEQUENCE TO ${APP_SCHEMA_USER_UPPER}' FROM dual UNION ALL
    SELECT 'GRANT CREATE PROCEDURE TO ${APP_SCHEMA_USER_UPPER}' FROM dual UNION ALL
    SELECT 'GRANT CREATE TRIGGER TO ${APP_SCHEMA_USER_UPPER}' FROM dual UNION ALL
    SELECT 'GRANT CREATE TYPE TO ${APP_SCHEMA_USER_UPPER}' FROM dual UNION ALL
    SELECT 'GRANT CREATE ROLE TO ${APP_SCHEMA_USER_UPPER}' FROM dual UNION ALL
    SELECT 'GRANT CREATE JOB TO ${APP_SCHEMA_USER_UPPER}' FROM dual UNION ALL
    SELECT 'GRANT CREATE MINING MODEL TO ${APP_SCHEMA_USER_UPPER}' FROM dual UNION ALL
    SELECT 'GRANT UNLIMITED TABLESPACE TO ${APP_SCHEMA_USER_UPPER}' FROM dual UNION ALL
    SELECT 'GRANT SODA_APP TO ${APP_SCHEMA_USER_UPPER}' FROM dual UNION ALL
    SELECT 'GRANT GRAPH_DEVELOPER TO ${APP_SCHEMA_USER_UPPER}' FROM dual UNION ALL
    SELECT 'GRANT EXECUTE ON MDSYS.SDO_GEOM TO ${APP_SCHEMA_USER_UPPER}' FROM dual UNION ALL
    SELECT 'GRANT EXECUTE ON MDSYS.SDO_UTIL TO ${APP_SCHEMA_USER_UPPER}' FROM dual UNION ALL
    SELECT 'GRANT EXECUTE ON MDSYS.SDO_CS TO ${APP_SCHEMA_USER_UPPER}' FROM dual UNION ALL
    SELECT 'GRANT EXECUTE ON SYS.DBMS_RLS TO ${APP_SCHEMA_USER_UPPER}' FROM dual UNION ALL
    SELECT 'GRANT EXECUTE ON DBMS_VECTOR TO ${APP_SCHEMA_USER_UPPER}' FROM dual UNION ALL
    SELECT 'GRANT READ, WRITE ON DIRECTORY DATA_PUMP_DIR TO ${APP_SCHEMA_USER_UPPER}' FROM dual
  ) LOOP
    BEGIN
      EXECUTE IMMEDIATE stmt.sql_stmt;
    EXCEPTION
      WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('Skipping grant: ' || stmt.sql_stmt || ' -> ' || SQLERRM);
    END;
  END LOOP;
END;
/
GRANT EXECUTE ON SYS.DBMS_INMEMORY TO ${APP_SCHEMA_USER_UPPER};
GRANT EXECUTE ON SYS.DBMS_XPLAN TO ${APP_SCHEMA_USER_UPPER};
GRANT SELECT ON SYS.V_\$PARAMETER TO ${APP_SCHEMA_USER_UPPER};
GRANT SELECT ON SYS.V_\$OPTION TO ${APP_SCHEMA_USER_UPPER};
GRANT SELECT ON SYS.V_\$INMEMORY_AREA TO ${APP_SCHEMA_USER_UPPER};
GRANT SELECT ON SYS.V_\$IM_SEGMENTS TO ${APP_SCHEMA_USER_UPPER};
GRANT SELECT ON SYS.V_\$SQL TO ${APP_SCHEMA_USER_UPPER};
GRANT SELECT ON SYS.V_\$SQL_PLAN TO ${APP_SCHEMA_USER_UPPER};
GRANT SELECT ON SYS.V_\$SQL_PLAN_STATISTICS_ALL TO ${APP_SCHEMA_USER_UPPER};
GRANT SELECT ON SYS.V_\$SESSION TO ${APP_SCHEMA_USER_UPPER};
DECLARE
  v_count PLS_INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM dba_role_privs
  WHERE grantee = '${APP_SCHEMA_USER_UPPER}'
    AND granted_role = 'AUDIT_ADMIN';

  IF v_count > 0 THEN
    EXECUTE IMMEDIATE 'REVOKE AUDIT_ADMIN FROM ${APP_SCHEMA_USER_UPPER}';
  END IF;
END;
/
BEGIN
  DBMS_NETWORK_ACL_ADMIN.APPEND_HOST_ACE(
    host => '*',
    ace  => xs\$ace_type(
      privilege_list => xs\$name_list('connect', 'resolve'),
      principal_name => '${APP_SCHEMA_USER_UPPER}',
      principal_type => xs_acl.ptype_db
    )
  );
  DBMS_OUTPUT.PUT_LINE('Network ACL granted to ${APP_SCHEMA_USER_UPPER}.');
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE = -44416 THEN
      DBMS_OUTPUT.PUT_LINE('Network ACL already exists.');
    ELSE
      DBMS_OUTPUT.PUT_LINE('Skipping network ACL: ' || SQLERRM);
    END IF;
END;
/
EXIT
SQL

cat > /tmp/check_base.sql <<SQL
SET HEADING OFF FEEDBACK OFF VERIFY OFF PAGES 0 ECHO OFF
SELECT CASE
         WHEN EXISTS (SELECT 1 FROM dba_users WHERE username = '${APP_SCHEMA_USER_UPPER}')
          AND EXISTS (SELECT 1 FROM dba_tables WHERE owner = '${APP_SCHEMA_USER_UPPER}' AND table_name = 'PRODUCTS')
          AND EXISTS (SELECT 1 FROM dba_tables WHERE owner = '${APP_SCHEMA_USER_UPPER}' AND table_name = 'APP_USERS')
         THEN 'yes'
         ELSE 'no'
       END
FROM dual;
EXIT
SQL

BASE_READY="$(sqlplus -L -s "$ADMIN_CONNECT" @/tmp/check_base.sql | tr -d '[:space:]')"
sqlplus -L -s "$ADMIN_CONNECT" @/tmp/bootstrap_admin.sql

MODEL_READY="$(
  sqlplus -L -s "$APP_CONNECT" <<'SQL'
SET HEADING OFF FEEDBACK OFF VERIFY OFF PAGES 0 ECHO OFF
SELECT CASE
         WHEN EXISTS (
           SELECT 1
           FROM user_mining_models
           WHERE model_name = 'ALL_MINILM_L12_V2'
         )
         THEN 'yes'
         ELSE 'no'
       END
FROM dual;
EXIT
SQL
)"
MODEL_READY="$(printf '%s' "$MODEL_READY" | tr -d '\r' | sed '/^[[:space:]]*$/d' | tail -n 1)"

if [ "$MODEL_READY" != "yes" ]; then
  MODEL_DIR="$(
    sqlplus -L -s "$ADMIN_CONNECT" <<'SQL'
SET HEADING OFF FEEDBACK OFF VERIFY OFF PAGES 0 ECHO OFF
SELECT RTRIM(directory_path, '/')
FROM dba_directories
WHERE directory_name = 'DATA_PUMP_DIR';
EXIT
SQL
)"
  MODEL_DIR="$(printf '%s' "$MODEL_DIR" | tr -d '\r' | sed '/^[[:space:]]*$/d' | tail -n 1)"

  if [ -z "$MODEL_DIR" ]; then
    echo ">>> ERROR: Unable to resolve DATA_PUMP_DIR path."
    exit 1
  fi

  MODEL_PATH="${MODEL_DIR}/${ONNX_MODEL_FILENAME:-all_MiniLM_L12_v2.onnx}"
  MODEL_TEMP="${MODEL_PATH}.part"

  echo ">>> Ensuring ONNX model is available in DATA_PUMP_DIR..."
  mkdir -p "$MODEL_DIR"
  if [ ! -s "$MODEL_PATH" ]; then
    rm -f "$MODEL_TEMP"
    curl -fL \
      --retry 5 \
      --retry-delay 2 \
      "$ONNX_MODEL_URL" \
      -o "$MODEL_TEMP"
    mv "$MODEL_TEMP" "$MODEL_PATH"
  fi
  chmod 644 "$MODEL_PATH"
  ls -lh "$MODEL_PATH"
else
  echo ">>> ONNX model ALL_MINILM_L12_V2 already loaded; skipping DATA_PUMP_DIR file check."
fi

if [ "$BASE_READY" != "yes" ]; then
  echo ">>> Bootstrapping ${APP_SCHEMA_USER_UPPER} schema and core objects..."

  cat > /tmp/bootstrap_schema_core.sql <<SQL
WHENEVER SQLERROR EXIT SQL.SQLCODE
SET SERVEROUTPUT ON
@${APP_DIR}/db/schema/01_tables.sql
@${APP_DIR}/db/schema/02_json_collections.sql
@${APP_DIR}/db/schema/03_graph.sql
@/tmp/04_vector_schema.sql
@${APP_DIR}/db/schema/05_spatial.sql
@${APP_DIR}/db/schema/10_developer_ecosystem_graph.sql
@${APP_DIR}/db/schema/12_ml_persistence.sql
@${APP_DIR}/db/schema/13_oml_model_lifecycle.sql
@${APP_DIR}/db/schema/14_hightech_inmemory.sql
@${APP_DIR}/db/schema/17_hightech_dataset_lifecycle.sql
EXIT
SQL

  cat > /tmp/bootstrap_security_admin.sql <<'SQL'
WHENEVER SQLERROR EXIT SQL.SQLCODE
SET SERVEROUTPUT ON
@/tmp/06_security_admin.sql
EXIT
SQL

  cat > /tmp/bootstrap_schema_data.sql <<SQL
WHENEVER SQLERROR EXIT SQL.SQLCODE
SET SERVEROUTPUT ON
@${APP_DIR}/db/data/load_all_data.sql
@${APP_DIR}/db/data/load_developer_ecosystem_graph.sql
@${APP_DIR}/db/schema/11_hightech_views.sql
EXIT
SQL

  sqlplus -L -s "$APP_CONNECT" @/tmp/bootstrap_schema_core.sql
  sqlplus -L -s "$ADMIN_CONNECT" @/tmp/bootstrap_security_admin.sql
  sqlplus -L -s "$APP_CONNECT" @/tmp/bootstrap_schema_data.sql
else
  echo ">>> Core schema already present. Skipping base bootstrap."
fi

echo ">>> Installing private High Tech context and fail-closed VPD policies..."
cat > /tmp/bootstrap_security_package.sql <<'SQL'
WHENEVER OSERROR EXIT FAILURE ROLLBACK
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
SET SERVEROUTPUT ON
@/tmp/06b_hightech_package.sql
EXIT SUCCESS
SQL

cat > /tmp/bootstrap_security_policies.sql <<'SQL'
WHENEVER OSERROR EXIT FAILURE ROLLBACK
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
SET SERVEROUTPUT ON
@/tmp/06b_hightech_policies.sql
EXIT SUCCESS
SQL

sqlplus -L -s "$APP_CONNECT" @/tmp/bootstrap_security_package.sql
sqlplus -L -s "$ADMIN_CONNECT" @${APP_DIR}/db/schema/06a_hightech_app_context_admin.sql "$APP_SCHEMA_USER_UPPER"
sqlplus -L -s "$APP_CONNECT" @/tmp/bootstrap_security_policies.sql
sqlplus -L -s "$ADMIN_CONNECT" @${APP_DIR}/db/schema/16_hightech_unified_audit_admin.sql "$APP_SCHEMA_USER_UPPER"

echo ">>> Running idempotent hydration steps..."
cat > /tmp/hydrate.sql <<SQL
WHENEVER OSERROR EXIT FAILURE ROLLBACK
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
SET SERVEROUTPUT ON
BEGIN
  hightech_security_pkg.set_user_context('admin_jess');
END;
/
DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM user_mining_models
  WHERE model_name = 'ALL_MINILM_L12_V2';

  IF v_count = 0 THEN
    DBMS_VECTOR.LOAD_ONNX_MODEL(
      directory  => 'DATA_PUMP_DIR',
      file_name  => '${ONNX_MODEL_FILENAME:-all_MiniLM_L12_v2.onnx}',
      model_name => 'ALL_MINILM_L12_V2',
      metadata   => JSON('{"function":"embedding","embeddingOutput":"embedding","input":{"input":["DATA"]}}')
    );
    DBMS_OUTPUT.PUT_LINE('Loaded ALL_MINILM_L12_V2.');
  ELSE
    DBMS_OUTPUT.PUT_LINE('ALL_MINILM_L12_V2 already present.');
  END IF;
END;
/
ALTER FUNCTION search_products_by_text COMPILE;
@${APP_DIR}/db/data/finalize_vector_search.sql
@${APP_DIR}/db/schema/10_developer_ecosystem_graph.sql
@${APP_DIR}/db/data/load_developer_ecosystem_graph.sql
@${APP_DIR}/db/schema/11_hightech_views.sql
@${APP_DIR}/db/schema/18_hightech_duality_runtime.sql
@${APP_DIR}/db/schema/12_ml_persistence.sql
@${APP_DIR}/db/schema/13_oml_model_lifecycle.sql
@${APP_DIR}/db/schema/14_hightech_inmemory.sql
@${APP_DIR}/db/schema/17_hightech_dataset_lifecycle.sql
@${APP_DIR}/db/schema/19_hightech_fresh_bootstrap_finalize.sql
@${APP_DIR}/db/data/seed_fulfillment_zones.sql
@/tmp/08_agents_functions.sql
BEGIN
  refresh_hightech_oml_models;
END;
/
@${APP_DIR}/db/schema/15_hightech_inmemory_finalize.sql
COMMIT;
BEGIN
  hightech_security_pkg.clear_user_context;
END;
/
EXIT
SQL

sqlplus -L -s "$APP_CONNECT" @/tmp/hydrate.sql
touch "$BOOTSTRAP_MARKER"
echo ">>> Database bootstrap complete."
