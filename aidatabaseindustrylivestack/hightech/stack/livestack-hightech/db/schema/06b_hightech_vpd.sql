/*
 * 06b_hightech_vpd.sql
 * Canonical fail-closed High Tech application context and VPD policies.
 *
 * Bootstrap extracts the trusted-package and policy sections so ADMIN can
 * bind the private context between them. Both phases are idempotent.
 */

-- SECTION 2A: TRUSTED PACKAGE BEGIN
CREATE OR REPLACE PACKAGE hightech_security_pkg AUTHID DEFINER AS
    PROCEDURE set_user_context(p_username IN VARCHAR2);
    PROCEDURE clear_user_context;
END hightech_security_pkg;
/

CREATE OR REPLACE PACKAGE BODY hightech_security_pkg AS
    PROCEDURE clear_user_context IS
    BEGIN
        DBMS_SESSION.CLEAR_CONTEXT('HIGHTECH_APP_CTX', NULL);
    END clear_user_context;

    PROCEDURE set_user_context(p_username IN VARCHAR2) IS
        v_username     app_users.username%TYPE;
        v_role         app_users.role%TYPE;
        v_region       app_users.region%TYPE;
        v_access_scope VARCHAR2(20);
    BEGIN
        clear_user_context;

        IF p_username IS NULL
           OR NOT REGEXP_LIKE(TRIM(p_username), '^[A-Za-z0-9_.-]{1,128}$') THEN
            RAISE_APPLICATION_ERROR(-20080, 'Unknown or inactive High Tech application user');
        END IF;

        BEGIN
            SELECT username, LOWER(TRIM(role)), NULLIF(TRIM(region), '')
            INTO v_username, v_role, v_region
            FROM app_users
            WHERE LOWER(username) = LOWER(TRIM(p_username))
              AND is_active = 1;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                RAISE_APPLICATION_ERROR(-20080, 'Unknown or inactive High Tech application user');
            WHEN TOO_MANY_ROWS THEN
                RAISE_APPLICATION_ERROR(-20081, 'Invalid High Tech application user configuration');
        END;

        IF v_role IN ('admin', 'analyst') AND v_region IS NULL THEN
            v_access_scope := 'GLOBAL';
        ELSIF v_role = 'fulfillment_mgr'
              AND v_region IN ('California', 'New Jersey', 'Georgia') THEN
            v_access_scope := 'REGIONAL';
        ELSIF v_role IN ('viewer', 'merchandiser') AND v_region IS NULL THEN
            v_access_scope := 'RESTRICTED';
        ELSE
            RAISE_APPLICATION_ERROR(-20081, 'Invalid High Tech application user configuration');
        END IF;

        DBMS_SESSION.SET_CONTEXT('HIGHTECH_APP_CTX', 'USERNAME', v_username);
        DBMS_SESSION.SET_CONTEXT('HIGHTECH_APP_CTX', 'ROLE', v_role);
        DBMS_SESSION.SET_CONTEXT('HIGHTECH_APP_CTX', 'REGION', v_region);
        DBMS_SESSION.SET_CONTEXT('HIGHTECH_APP_CTX', 'ACCESS_SCOPE', v_access_scope);
        DBMS_SESSION.SET_CONTEXT('HIGHTECH_APP_CTX', 'AUTHENTICATED', 'Y');
    EXCEPTION
        WHEN OTHERS THEN
            clear_user_context;
            RAISE;
    END set_user_context;
END hightech_security_pkg;
/

MERGE INTO app_users target
USING (
    SELECT 'inactive_audit' AS username,
           '$2b$10$inactiveaudit0000000000000000000000000000000000000' AS password_hash,
           'Inactive Audit User' AS full_name,
           'inactive.audit@high-tech.demo' AS email,
           'viewer' AS role
    FROM dual
) source
ON (target.username = source.username)
WHEN MATCHED THEN UPDATE SET target.is_active = 0
WHEN NOT MATCHED THEN INSERT (
    username, password_hash, full_name, email, role, region, is_active
) VALUES (
    source.username, source.password_hash, source.full_name, source.email,
    source.role, NULL, 0
);

COMMIT;
-- SECTION 2A: TRUSTED PACKAGE END

-- SECTION 2B: VPD POLICIES BEGIN
CREATE OR REPLACE FUNCTION vpd_hightech_operational (
    p_schema IN VARCHAR2,
    p_table  IN VARCHAR2
) RETURN VARCHAR2
AUTHID DEFINER
AS
    v_authenticated VARCHAR2(1) := SYS_CONTEXT('HIGHTECH_APP_CTX', 'AUTHENTICATED');
    v_role          VARCHAR2(30) := LOWER(SYS_CONTEXT('HIGHTECH_APP_CTX', 'ROLE'));
    v_scope         VARCHAR2(20) := LOWER(SYS_CONTEXT('HIGHTECH_APP_CTX', 'ACCESS_SCOPE'));
    v_region        VARCHAR2(100) := SYS_CONTEXT('HIGHTECH_APP_CTX', 'REGION');
    v_region_q      VARCHAR2(220);
BEGIN
    IF NVL(v_authenticated, 'N') <> 'Y' THEN RETURN '1 = 0'; END IF;
    IF v_scope = 'global' AND v_role IN ('admin', 'analyst') THEN RETURN NULL; END IF;
    IF NVL(v_scope, '?') <> 'regional'
       OR NVL(v_role, '?') <> 'fulfillment_mgr'
       OR NVL(v_region, '?') NOT IN ('California', 'New Jersey', 'Georgia') THEN
        RETURN '1 = 0';
    END IF;

    v_region_q := DBMS_ASSERT.ENQUOTE_LITERAL(UPPER(v_region));

    CASE UPPER(p_table)
        WHEN 'FULFILLMENT_CENTERS' THEN
            RETURN 'UPPER(state_province) = ' || v_region_q;
        WHEN 'INVENTORY' THEN
            RETURN 'center_id IN (SELECT center_id FROM fulfillment_centers WHERE UPPER(state_province) = ' || v_region_q || ')';
        WHEN 'CUSTOMERS' THEN
            RETURN 'UPPER(state_province) = ' || v_region_q;
        WHEN 'ORDERS' THEN
            RETURN 'fulfillment_center_id IN (SELECT center_id FROM fulfillment_centers WHERE UPPER(state_province) = ' || v_region_q ||
                   ') AND customer_id IN (SELECT customer_id FROM customers WHERE UPPER(state_province) = ' || v_region_q || ')';
        WHEN 'ORDER_ITEMS' THEN
            RETURN 'order_id IN (SELECT order_id FROM orders)';
        WHEN 'SHIPMENTS' THEN
            RETURN 'center_id IN (SELECT center_id FROM fulfillment_centers WHERE UPPER(state_province) = ' || v_region_q ||
                   ') AND order_id IN (SELECT order_id FROM orders)';
        WHEN 'FULFILLMENT_ZONES' THEN
            RETURN 'center_id IN (SELECT center_id FROM fulfillment_centers WHERE UPPER(state_province) = ' || v_region_q || ')';
        WHEN 'DEMAND_REGIONS' THEN
            RETURN CASE v_region
                WHEN 'California' THEN 'region_name IN (''Pacific Connected Product Coast'',''Silicon Valley AI Systems Corridor'',''Southern California Electronics Port'')'
                WHEN 'New Jersey' THEN 'region_name IN (''Mid-Atlantic Customer Commitment Belt'',''New York Support Operations Metro'',''Northeast PLM Handoff Corridor'')'
                WHEN 'Georgia' THEN 'region_name IN (''Southeast Quality Response Region'',''Carolinas Field Quality Zone'',''Tennessee Valley Assembly Region'')'
                ELSE '1 = 0'
            END;
        WHEN 'DEMAND_FORECASTS' THEN
            RETURN CASE v_region
                WHEN 'California' THEN 'region IN (''Pacific Connected Product Coast'',''Silicon Valley AI Systems Corridor'',''Southern California Electronics Port'')'
                WHEN 'New Jersey' THEN 'region IN (''Mid-Atlantic Customer Commitment Belt'',''New York Support Operations Metro'',''Northeast PLM Handoff Corridor'')'
                WHEN 'Georgia' THEN 'region IN (''Southeast Quality Response Region'',''Carolinas Field Quality Zone'',''Tennessee Valley Assembly Region'')'
                ELSE '1 = 0'
            END;
        WHEN 'AGENT_ACTIONS' THEN
            RETURN '(' ||
                   '(LOWER(entity_type) IN (''order'',''request'',''customer_commitment'') AND entity_id IN (SELECT order_id FROM orders)) OR ' ||
                   '(LOWER(entity_type) IN (''inventory'',''capacity'') AND entity_id IN (SELECT inventory_id FROM inventory)) OR ' ||
                   '(LOWER(entity_type) IN (''shipment'',''route'') AND entity_id IN (SELECT shipment_id FROM shipments)) OR ' ||
                   '(LOWER(entity_type) IN (''fulfillment_center'',''center'',''plant'') AND entity_id IN (SELECT center_id FROM fulfillment_centers)) OR ' ||
                   '(LOWER(entity_type) IN (''graph_entity'',''signal_case'') AND entity_id IN (SELECT entity_id FROM tech_graph_entities))' ||
                   ')';
        WHEN 'OML_CUSTOMER_SEGMENTS' THEN
            RETURN 'customer_id IN (SELECT customer_id FROM customers)';
        WHEN 'OML_CAPACITY_ALERTS' THEN
            RETURN 'center_id IN (SELECT center_id FROM fulfillment_centers WHERE UPPER(state_province) = ' || v_region_q || ')';
        ELSE
            RETURN '1 = 0';
    END CASE;
END;
/

CREATE OR REPLACE FUNCTION vpd_hightech_signals (
    p_schema IN VARCHAR2,
    p_table  IN VARCHAR2
) RETURN VARCHAR2
AUTHID DEFINER
AS
    v_authenticated VARCHAR2(1) := SYS_CONTEXT('HIGHTECH_APP_CTX', 'AUTHENTICATED');
    v_role          VARCHAR2(30) := LOWER(SYS_CONTEXT('HIGHTECH_APP_CTX', 'ROLE'));
    v_scope         VARCHAR2(20) := LOWER(SYS_CONTEXT('HIGHTECH_APP_CTX', 'ACCESS_SCOPE'));
    v_region        VARCHAR2(100) := SYS_CONTEXT('HIGHTECH_APP_CTX', 'REGION');
    v_region_q      VARCHAR2(220);
BEGIN
    IF NVL(v_authenticated, 'N') <> 'Y' THEN RETURN '1 = 0'; END IF;
    IF v_scope = 'global' AND v_role IN ('admin', 'analyst') THEN RETURN NULL; END IF;
    IF NVL(v_scope, '?') <> 'regional'
       OR NVL(v_role, '?') <> 'fulfillment_mgr'
       OR NVL(v_region, '?') NOT IN ('California', 'New Jersey', 'Georgia') THEN
        RETURN '1 = 0';
    END IF;

    v_region_q := DBMS_ASSERT.ENQUOTE_LITERAL(UPPER(v_region));
    CASE UPPER(p_table)
        WHEN 'INFLUENCERS' THEN
            RETURN 'UPPER(region) = ' || v_region_q;
        WHEN 'SOCIAL_POSTS' THEN
            RETURN 'influencer_id IN (SELECT influencer_id FROM influencers WHERE UPPER(region) = ' || v_region_q || ')';
        WHEN 'INFLUENCER_CONNECTIONS' THEN
            RETURN 'from_influencer IN (SELECT influencer_id FROM influencers WHERE UPPER(region) = ' || v_region_q ||
                   ') AND to_influencer IN (SELECT influencer_id FROM influencers WHERE UPPER(region) = ' || v_region_q || ')';
        WHEN 'BRAND_INFLUENCER_LINKS' THEN
            RETURN 'influencer_id IN (SELECT influencer_id FROM influencers WHERE UPPER(region) = ' || v_region_q || ')';
        WHEN 'POST_PRODUCT_MENTIONS' THEN
            RETURN 'post_id IN (SELECT post_id FROM social_posts)';
        WHEN 'POST_EMBEDDINGS' THEN
            RETURN 'post_id IN (SELECT post_id FROM social_posts)';
        WHEN 'SEMANTIC_MATCHES' THEN
            RETURN 'post_id IN (SELECT post_id FROM social_posts)';
        ELSE
            RETURN '1 = 0';
    END CASE;
END;
/

CREATE OR REPLACE FUNCTION vpd_hightech_graph (
    p_schema IN VARCHAR2,
    p_table  IN VARCHAR2
) RETURN VARCHAR2
AUTHID DEFINER
AS
    v_authenticated VARCHAR2(1) := SYS_CONTEXT('HIGHTECH_APP_CTX', 'AUTHENTICATED');
    v_role          VARCHAR2(30) := LOWER(SYS_CONTEXT('HIGHTECH_APP_CTX', 'ROLE'));
    v_scope         VARCHAR2(20) := LOWER(SYS_CONTEXT('HIGHTECH_APP_CTX', 'ACCESS_SCOPE'));
    v_region        VARCHAR2(100) := SYS_CONTEXT('HIGHTECH_APP_CTX', 'REGION');
    v_graph_region  VARCHAR2(20);
    v_graph_q       VARCHAR2(60);
BEGIN
    IF NVL(v_authenticated, 'N') <> 'Y' THEN RETURN '1 = 0'; END IF;
    IF v_scope = 'global' AND v_role IN ('admin', 'analyst') THEN RETURN NULL; END IF;
    IF NVL(v_scope, '?') <> 'regional'
       OR NVL(v_role, '?') <> 'fulfillment_mgr'
       OR NVL(v_region, '?') NOT IN ('California', 'New Jersey', 'Georgia') THEN
        RETURN '1 = 0';
    END IF;

    v_graph_region := CASE v_region
        WHEN 'California' THEN 'West'
        WHEN 'New Jersey' THEN 'East'
        WHEN 'Georgia' THEN 'South'
    END;
    v_graph_q := DBMS_ASSERT.ENQUOTE_LITERAL(UPPER(v_graph_region));

    CASE UPPER(p_table)
        WHEN 'TECH_GRAPH_ENTITIES' THEN
            RETURN 'UPPER(region) = ' || v_graph_q;
        WHEN 'TECH_GRAPH_RELATIONSHIPS' THEN
            RETURN 'from_entity IN (SELECT entity_id FROM tech_graph_entities WHERE UPPER(region) = ' || v_graph_q ||
                   ') AND to_entity IN (SELECT entity_id FROM tech_graph_entities WHERE UPPER(region) = ' || v_graph_q || ')';
        WHEN 'PRODUCT_SIGNAL_CASE_ENTITIES' THEN
            RETURN 'entity_id IN (SELECT entity_id FROM tech_graph_entities WHERE UPPER(region) = ' || v_graph_q || ')';
        WHEN 'PRODUCT_SIGNAL_CASES' THEN
            RETURN 'case_id IN (SELECT case_id FROM product_signal_case_entities WHERE entity_id IN (' ||
                   'SELECT entity_id FROM tech_graph_entities WHERE UPPER(region) = ' || v_graph_q || '))';
        ELSE
            RETURN '1 = 0';
    END CASE;
END;
/

CREATE OR REPLACE FUNCTION vpd_hightech_global_only (
    p_schema IN VARCHAR2,
    p_table  IN VARCHAR2
) RETURN VARCHAR2
AUTHID DEFINER
AS
    v_authenticated VARCHAR2(1) := SYS_CONTEXT('HIGHTECH_APP_CTX', 'AUTHENTICATED');
    v_role          VARCHAR2(30) := LOWER(SYS_CONTEXT('HIGHTECH_APP_CTX', 'ROLE'));
    v_scope         VARCHAR2(20) := LOWER(SYS_CONTEXT('HIGHTECH_APP_CTX', 'ACCESS_SCOPE'));
BEGIN
    IF NVL(v_authenticated, 'N') = 'Y'
       AND v_scope = 'global'
       AND v_role IN ('admin', 'analyst') THEN
        RETURN NULL;
    END IF;
    RETURN '1 = 0';
END;
/

DECLARE
    l_objects SYS.ODCIVARCHAR2LIST := SYS.ODCIVARCHAR2LIST(
        'FULFILLMENT_CENTERS', 'INVENTORY', 'CUSTOMERS', 'ORDERS', 'ORDER_ITEMS',
        'SHIPMENTS', 'FULFILLMENT_ZONES', 'DEMAND_REGIONS', 'DEMAND_FORECASTS',
        'INFLUENCERS', 'SOCIAL_POSTS', 'INFLUENCER_CONNECTIONS',
        'BRAND_INFLUENCER_LINKS', 'POST_PRODUCT_MENTIONS', 'POST_EMBEDDINGS',
        'SEMANTIC_MATCHES', 'TECH_GRAPH_ENTITIES', 'TECH_GRAPH_RELATIONSHIPS',
        'PRODUCT_SIGNAL_CASES', 'PRODUCT_SIGNAL_CASE_ENTITIES', 'AGENT_ACTIONS',
        'EVENT_STREAM', 'OML_MODEL_RUNS', 'OML_DEMAND_SCORES',
        'OML_CUSTOMER_SEGMENTS', 'OML_COMMITMENT_FORECASTS',
        'OML_PRODUCT_CLUSTERS', 'OML_CAPACITY_ALERTS'
    );
    l_policy_names SYS.ODCIVARCHAR2LIST := SYS.ODCIVARCHAR2LIST(
        'VPD_HT_FC', 'VPD_HT_INVENTORY', 'VPD_HT_CUSTOMERS', 'VPD_HT_ORDERS',
        'VPD_HT_ORDER_ITEMS', 'VPD_HT_SHIPMENTS', 'VPD_HT_ZONES',
        'VPD_HT_DEMAND_REGIONS', 'VPD_HT_FORECASTS', 'VPD_HT_INFLUENCERS',
        'VPD_HT_SOCIAL_POSTS', 'VPD_HT_INFLUENCER_LINKS', 'VPD_HT_BRAND_LINKS',
        'VPD_HT_MENTIONS', 'VPD_HT_POST_EMBEDDINGS', 'VPD_HT_SEMANTIC_MATCHES',
        'VPD_HT_GRAPH_ENTITIES', 'VPD_HT_GRAPH_RELS', 'VPD_HT_SIGNAL_CASES',
        'VPD_HT_CASE_ENTITIES', 'VPD_HT_AGENT_ACTIONS', 'VPD_HT_EVENT_STREAM',
        'VPD_HT_OML_RUNS', 'VPD_HT_OML_DEMAND', 'VPD_HT_OML_CUSTOMERS',
        'VPD_HT_OML_FORECASTS', 'VPD_HT_OML_CLUSTERS', 'VPD_HT_OML_CAPACITY'
    );
    l_functions SYS.ODCIVARCHAR2LIST := SYS.ODCIVARCHAR2LIST(
        'VPD_HIGHTECH_OPERATIONAL', 'VPD_HIGHTECH_OPERATIONAL',
        'VPD_HIGHTECH_OPERATIONAL', 'VPD_HIGHTECH_OPERATIONAL',
        'VPD_HIGHTECH_OPERATIONAL', 'VPD_HIGHTECH_OPERATIONAL',
        'VPD_HIGHTECH_OPERATIONAL', 'VPD_HIGHTECH_OPERATIONAL',
        'VPD_HIGHTECH_OPERATIONAL', 'VPD_HIGHTECH_SIGNALS',
        'VPD_HIGHTECH_SIGNALS', 'VPD_HIGHTECH_SIGNALS',
        'VPD_HIGHTECH_SIGNALS', 'VPD_HIGHTECH_SIGNALS',
        'VPD_HIGHTECH_SIGNALS', 'VPD_HIGHTECH_SIGNALS',
        'VPD_HIGHTECH_GRAPH', 'VPD_HIGHTECH_GRAPH',
        'VPD_HIGHTECH_GRAPH', 'VPD_HIGHTECH_GRAPH',
        'VPD_HIGHTECH_OPERATIONAL', 'VPD_HIGHTECH_GLOBAL_ONLY',
        'VPD_HIGHTECH_GLOBAL_ONLY', 'VPD_HIGHTECH_GLOBAL_ONLY',
        'VPD_HIGHTECH_OPERATIONAL', 'VPD_HIGHTECH_GLOBAL_ONLY',
        'VPD_HIGHTECH_GLOBAL_ONLY', 'VPD_HIGHTECH_OPERATIONAL'
    );
BEGIN
    FOR policy_row IN (
        SELECT object_name, policy_name
        FROM user_policies
        WHERE object_name IN (SELECT column_value FROM TABLE(l_objects))
    ) LOOP
        DBMS_RLS.DROP_POLICY(USER, policy_row.object_name, policy_row.policy_name);
    END LOOP;

    FOR i IN 1 .. l_objects.COUNT LOOP
        DBMS_RLS.ADD_POLICY(
            object_schema   => USER,
            object_name     => l_objects(i),
            policy_name     => l_policy_names(i),
            function_schema => USER,
            policy_function => l_functions(i),
            statement_types => 'SELECT,INSERT,UPDATE,DELETE',
            update_check    => TRUE,
            policy_type     => DBMS_RLS.CONTEXT_SENSITIVE,
            enable          => TRUE
        );
    END LOOP;
END;
/

-- Remove the package-global implementation only after every dependent policy
-- has migrated to the private context functions above.
BEGIN
    FOR object_row IN (
        SELECT object_type, object_name
        FROM user_objects
        WHERE object_name IN (
            'SC_SECURITY_CTX', 'VPD_FULFILLMENT_REGION', 'VPD_ORDERS_REGION',
            'VPD_GRAPH_INFLUENCERS', 'VPD_GRAPH_SOCIAL_POSTS',
            'VPD_GRAPH_CONNECTIONS', 'VPD_GRAPH_BRAND_LINKS', 'VPD_GRAPH_MENTIONS'
        )
          AND object_type IN ('PACKAGE', 'PACKAGE BODY', 'FUNCTION')
        ORDER BY CASE object_type WHEN 'FUNCTION' THEN 1 WHEN 'PACKAGE BODY' THEN 2 ELSE 3 END
    ) LOOP
        BEGIN
            IF object_row.object_type = 'FUNCTION' THEN
                EXECUTE IMMEDIATE 'DROP FUNCTION ' || DBMS_ASSERT.SIMPLE_SQL_NAME(object_row.object_name);
            ELSIF object_row.object_type = 'PACKAGE' THEN
                EXECUTE IMMEDIATE 'DROP PACKAGE ' || DBMS_ASSERT.SIMPLE_SQL_NAME(object_row.object_name);
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                IF SQLCODE <> -4043 THEN RAISE; END IF;
        END;
    END LOOP;
END;
/

COMMIT;
-- SECTION 2B: VPD POLICIES END
