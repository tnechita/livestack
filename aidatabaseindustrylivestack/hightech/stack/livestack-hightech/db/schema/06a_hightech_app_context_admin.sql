/*
 * 06a_hightech_app_context_admin.sql
 * Bind the private High Tech application context to its trusted package.
 *
 * Run as ADMIN after HIGHTECH_SECURITY_PKG has compiled:
 *   @06a_hightech_app_context_admin.sql LIVESTACK
 */

WHENEVER OSERROR EXIT FAILURE ROLLBACK
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
SET SERVEROUTPUT ON

DEFINE APP_SCHEMA_OWNER = '&1'

DECLARE
    v_owner         VARCHAR2(128);
    v_context_count PLS_INTEGER;
BEGIN
    v_owner := DBMS_ASSERT.SIMPLE_SQL_NAME(UPPER(TRIM('&&APP_SCHEMA_OWNER')));

    EXECUTE IMMEDIATE
        'CREATE OR REPLACE CONTEXT HIGHTECH_APP_CTX USING ' ||
        v_owner || '.HIGHTECH_SECURITY_PKG';

    SELECT COUNT(*)
    INTO v_context_count
    FROM dba_context
    WHERE namespace = 'HIGHTECH_APP_CTX'
      AND schema = v_owner
      AND package = 'HIGHTECH_SECURITY_PKG';

    IF v_context_count <> 1 THEN
        RAISE_APPLICATION_ERROR(-20221, 'HIGHTECH_APP_CTX is not bound to the trusted package');
    END IF;
END;
/

UNDEFINE APP_SCHEMA_OWNER

PROMPT High Tech private application context created.

EXIT SUCCESS
