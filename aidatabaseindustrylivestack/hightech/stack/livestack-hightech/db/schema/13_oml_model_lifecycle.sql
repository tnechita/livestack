/*
 * 13_oml_model_lifecycle.sql
 * High Tech Oracle Machine Learning model lifecycle.
 *
 * Creates High Tech training views and idempotent DBMS_DATA_MINING refresh
 * procedures. Persisted scene outputs remain in 12_ml_persistence.sql; this
 * script owns the in-database model objects and refresh evidence.
 */
SET SERVEROUTPUT ON

DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*)
    INTO   v_count
    FROM   user_tables
    WHERE  table_name = 'OML_MODEL_REFRESH_LOG';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE q'[
            CREATE TABLE oml_model_refresh_log (
                refresh_id    NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                model_name    VARCHAR2(128) NOT NULL,
                algorithm     VARCHAR2(80),
                status        VARCHAR2(30) CHECK (status IN ('started','completed','failed')),
                message       CLOB,
                refreshed_at  TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
            )
        ]';
        DBMS_OUTPUT.PUT_LINE('Created oml_model_refresh_log.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('oml_model_refresh_log already exists.');
    END IF;
END;
/

CREATE OR REPLACE VIEW oml_demand_training_v AS
WITH product_features AS (
    SELECT p.product_id,
           p.category,
           p.unit_price,
           NVL(eng.total_posts, 0) AS total_posts,
           NVL(eng.avg_sentiment, 0.5) AS avg_sentiment,
           NVL(eng.total_likes, 0) AS total_likes,
           NVL(eng.total_shares, 0) AS total_shares,
           NVL(eng.total_views, 0) AS total_views,
           NVL(eng.avg_virality, 0) AS avg_virality,
           NVL(eng.viral_posts, 0) AS viral_posts,
           NVL(eng.rising_posts, 0) AS rising_posts,
           NVL(sales.units_sold, 0) AS units_sold,
           NVL(sales.revenue, 0) AS revenue
    FROM products p
    LEFT JOIN (
        SELECT ppm.product_id,
               COUNT(*) AS total_posts,
               AVG(sp.sentiment_score) AS avg_sentiment,
               SUM(sp.likes_count) AS total_likes,
               SUM(sp.shares_count) AS total_shares,
               SUM(sp.views_count) AS total_views,
               AVG(sp.virality_score) AS avg_virality,
               SUM(CASE WHEN sp.momentum_flag = 'viral' THEN 1 ELSE 0 END) AS viral_posts,
               SUM(CASE WHEN sp.momentum_flag = 'rising' THEN 1 ELSE 0 END) AS rising_posts
        FROM post_product_mentions ppm
        JOIN social_posts sp ON sp.post_id = ppm.post_id
        GROUP BY ppm.product_id
    ) eng ON eng.product_id = p.product_id
    LEFT JOIN (
        SELECT oi.product_id,
               SUM(oi.quantity) AS units_sold,
               SUM(oi.line_total) AS revenue
        FROM order_items oi
        GROUP BY oi.product_id
    ) sales ON sales.product_id = p.product_id
    WHERE p.is_active = 1
)
SELECT product_id,
       category,
       unit_price,
       total_posts,
       avg_sentiment,
       total_likes,
       total_shares,
       total_views,
       avg_virality,
       viral_posts,
       rising_posts,
       units_sold,
       revenue,
       CASE
           WHEN avg_virality >= 70
             OR viral_posts >= 5
             OR total_views >= 500000
             OR units_sold >= 250 THEN 'SURGE'
           ELSE 'STABLE'
       END AS surge_flag
FROM product_features;

CREATE OR REPLACE VIEW oml_customer_rfm_v AS
SELECT c.customer_id,
       c.lifetime_value,
       NVL(rfm.recency_days, 999) AS recency_days,
       NVL(rfm.frequency, 0) AS frequency,
       NVL(rfm.monetary, 0) AS monetary,
       NVL(rfm.avg_order_value, 0) AS avg_order_value,
       NVL(rfm.total_items, 0) AS total_items
FROM customers c
LEFT JOIN (
    SELECT o.customer_id,
           ROUND(SYSDATE - CAST(MAX(o.created_at) AS DATE)) AS recency_days,
           COUNT(DISTINCT o.order_id) AS frequency,
           SUM(o.order_total) AS monetary,
           AVG(o.order_total) AS avg_order_value,
           NVL(SUM(oi.item_count), 0) AS total_items
    FROM orders o
    LEFT JOIN (
        SELECT order_id, SUM(quantity) AS item_count
        FROM order_items
        GROUP BY order_id
    ) oi ON oi.order_id = o.order_id
    GROUP BY o.customer_id
) rfm ON rfm.customer_id = c.customer_id
WHERE NVL(rfm.frequency, 0) > 0;

CREATE OR REPLACE VIEW oml_commitment_value_training_v AS
SELECT o.order_id,
       c.customer_tier,
       c.lifetime_value,
       NVL(o.demand_score, 0) AS demand_score,
       NVL(item_stats.product_count, 0) AS product_count,
       NVL(item_stats.total_quantity, 0) AS total_quantity,
       NVL(item_stats.avg_item_price, 0) AS avg_item_price,
       NVL(item_stats.high_value_line_count, 0) AS high_value_line_count,
       o.order_total AS target_commitment_value
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
LEFT JOIN (
    SELECT oi.order_id,
           COUNT(DISTINCT oi.product_id) AS product_count,
           SUM(oi.quantity) AS total_quantity,
           AVG(oi.unit_price) AS avg_item_price,
           SUM(CASE WHEN oi.unit_price >= 3000 THEN 1 ELSE 0 END) AS high_value_line_count
    FROM order_items oi
    GROUP BY oi.order_id
) item_stats ON item_stats.order_id = o.order_id
WHERE o.order_total IS NOT NULL;

CREATE OR REPLACE VIEW oml_product_cluster_v AS
SELECT p.product_id,
       p.unit_price,
       NVL(p.weight_kg, 0) AS weight_kg,
       NVL(sales.units_sold, 0) AS units_sold,
       NVL(sales.revenue, 0) AS revenue,
       NVL(sales.order_count, 0) AS order_count,
       NVL(eng.total_engagement, 0) AS total_engagement,
       NVL(eng.avg_sentiment, 0.5) AS avg_sentiment,
       NVL(eng.avg_virality, 0) AS avg_virality
FROM products p
LEFT JOIN (
    SELECT oi.product_id,
           SUM(oi.quantity) AS units_sold,
           SUM(oi.line_total) AS revenue,
           COUNT(DISTINCT oi.order_id) AS order_count
    FROM order_items oi
    GROUP BY oi.product_id
) sales ON sales.product_id = p.product_id
LEFT JOIN (
    SELECT ppm.product_id,
           SUM(sp.likes_count + sp.shares_count + sp.views_count) AS total_engagement,
           AVG(sp.sentiment_score) AS avg_sentiment,
           AVG(sp.virality_score) AS avg_virality
    FROM post_product_mentions ppm
    JOIN social_posts sp ON sp.post_id = ppm.post_id
    GROUP BY ppm.product_id
) eng ON eng.product_id = p.product_id
WHERE p.is_active = 1;

CREATE OR REPLACE PROCEDURE refresh_hightech_oml_models AUTHID CURRENT_USER AS
    v_failure_count NUMBER := 0;
    v_active_count  NUMBER := 0;
    PROCEDURE log_refresh(
        p_model_name VARCHAR2,
        p_algorithm  VARCHAR2,
        p_status     VARCHAR2,
        p_message    CLOB
    ) IS
        PRAGMA AUTONOMOUS_TRANSACTION;
    BEGIN
        INSERT INTO oml_model_refresh_log (model_name, algorithm, status, message)
        VALUES (p_model_name, p_algorithm, p_status, SUBSTR(p_message, 1, 3000));
        COMMIT;
    END;

    PROCEDURE drop_model_if_exists(p_model_name VARCHAR2) IS
    BEGIN
        DBMS_DATA_MINING.DROP_MODEL(p_model_name);
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE NOT IN (-40284, -4043) THEN
                RAISE;
            END IF;
    END;

    PROCEDURE reset_settings_table(p_table_name VARCHAR2, p_algorithm VARCHAR2, p_cluster_count NUMBER DEFAULT NULL) IS
    BEGIN
        BEGIN
            EXECUTE IMMEDIATE 'DROP TABLE ' || p_table_name || ' PURGE';
        EXCEPTION
            WHEN OTHERS THEN
                IF SQLCODE != -942 THEN
                    RAISE;
                END IF;
        END;

        EXECUTE IMMEDIATE 'CREATE TABLE ' || p_table_name || ' (setting_name VARCHAR2(30), setting_value VARCHAR2(4000))';
        EXECUTE IMMEDIATE 'INSERT INTO ' || p_table_name || ' VALUES (:1, :2)' USING 'ALGO_NAME', p_algorithm;
        EXECUTE IMMEDIATE 'INSERT INTO ' || p_table_name || ' VALUES (:1, :2)' USING 'PREP_AUTO', 'ON';
        IF p_cluster_count IS NOT NULL THEN
            EXECUTE IMMEDIATE 'INSERT INTO ' || p_table_name || ' VALUES (:1, :2)' USING 'CLUS_NUM_CLUSTERS', TO_CHAR(p_cluster_count);
        END IF;
        COMMIT;
    END;
BEGIN
    log_refresh('HT_DEMAND_VOLATILITY_MODEL', 'ALGO_RANDOM_FOREST', 'started', 'Starting demand volatility model refresh.');
    BEGIN
        reset_settings_table('HT_DEMAND_VOL_SETTINGS', 'ALGO_RANDOM_FOREST');
        drop_model_if_exists('HT_DEMAND_VOLATILITY_MODEL');
        DBMS_DATA_MINING.CREATE_MODEL(
            model_name          => 'HT_DEMAND_VOLATILITY_MODEL',
            mining_function     => DBMS_DATA_MINING.CLASSIFICATION,
            data_table_name     => 'OML_DEMAND_TRAINING_V',
            case_id_column_name => 'PRODUCT_ID',
            target_column_name  => 'SURGE_FLAG',
            settings_table_name => 'HT_DEMAND_VOL_SETTINGS'
        );
        log_refresh('HT_DEMAND_VOLATILITY_MODEL', 'ALGO_RANDOM_FOREST', 'completed', 'Demand volatility model refreshed.');
    EXCEPTION
        WHEN OTHERS THEN
            log_refresh('HT_DEMAND_VOLATILITY_MODEL', 'ALGO_RANDOM_FOREST', 'failed', SQLERRM);
            v_failure_count := v_failure_count + 1;
    END;

    log_refresh('HT_CUSTOMER_COMMITMENT_SEGMENT_MODEL', 'ALGO_KMEANS', 'started', 'Starting customer commitment segmentation model refresh.');
    BEGIN
        reset_settings_table('HT_CUST_COMMIT_SETTINGS', 'ALGO_KMEANS', 4);
        drop_model_if_exists('HT_CUSTOMER_COMMITMENT_SEGMENT_MODEL');
        DBMS_DATA_MINING.CREATE_MODEL(
            model_name          => 'HT_CUSTOMER_COMMITMENT_SEGMENT_MODEL',
            mining_function     => DBMS_DATA_MINING.CLUSTERING,
            data_table_name     => 'OML_CUSTOMER_RFM_V',
            case_id_column_name => 'CUSTOMER_ID',
            settings_table_name => 'HT_CUST_COMMIT_SETTINGS'
        );
        log_refresh('HT_CUSTOMER_COMMITMENT_SEGMENT_MODEL', 'ALGO_KMEANS', 'completed', 'Customer commitment segmentation model refreshed.');
    EXCEPTION
        WHEN OTHERS THEN
            log_refresh('HT_CUSTOMER_COMMITMENT_SEGMENT_MODEL', 'ALGO_KMEANS', 'failed', SQLERRM);
            v_failure_count := v_failure_count + 1;
    END;

    log_refresh('HT_COMMITMENT_VALUE_MODEL', 'ALGO_GENERALIZED_LINEAR_MODEL', 'started', 'Starting commitment value model refresh.');
    BEGIN
        reset_settings_table('HT_COMMIT_VALUE_SETTINGS', 'ALGO_GENERALIZED_LINEAR_MODEL');
        drop_model_if_exists('HT_COMMITMENT_VALUE_MODEL');
        DBMS_DATA_MINING.CREATE_MODEL(
            model_name          => 'HT_COMMITMENT_VALUE_MODEL',
            mining_function     => DBMS_DATA_MINING.REGRESSION,
            data_table_name     => 'OML_COMMITMENT_VALUE_TRAINING_V',
            case_id_column_name => 'ORDER_ID',
            target_column_name  => 'TARGET_COMMITMENT_VALUE',
            settings_table_name => 'HT_COMMIT_VALUE_SETTINGS'
        );
        log_refresh('HT_COMMITMENT_VALUE_MODEL', 'ALGO_GENERALIZED_LINEAR_MODEL', 'completed', 'Commitment value model refreshed.');
    EXCEPTION
        WHEN OTHERS THEN
            log_refresh('HT_COMMITMENT_VALUE_MODEL', 'ALGO_GENERALIZED_LINEAR_MODEL', 'failed', SQLERRM);
            v_failure_count := v_failure_count + 1;
    END;

    log_refresh('HT_PRODUCT_SIGNAL_CLUSTER_MODEL', 'ALGO_KMEANS', 'started', 'Starting product signal cluster model refresh.');
    BEGIN
        reset_settings_table('HT_PRODUCT_CLUSTER_SETTINGS', 'ALGO_KMEANS', 5);
        drop_model_if_exists('HT_PRODUCT_SIGNAL_CLUSTER_MODEL');
        DBMS_DATA_MINING.CREATE_MODEL(
            model_name          => 'HT_PRODUCT_SIGNAL_CLUSTER_MODEL',
            mining_function     => DBMS_DATA_MINING.CLUSTERING,
            data_table_name     => 'OML_PRODUCT_CLUSTER_V',
            case_id_column_name => 'PRODUCT_ID',
            settings_table_name => 'HT_PRODUCT_CLUSTER_SETTINGS'
        );
        log_refresh('HT_PRODUCT_SIGNAL_CLUSTER_MODEL', 'ALGO_KMEANS', 'completed', 'Product signal cluster model refreshed.');
    EXCEPTION
        WHEN OTHERS THEN
            log_refresh('HT_PRODUCT_SIGNAL_CLUSTER_MODEL', 'ALGO_KMEANS', 'failed', SQLERRM);
            v_failure_count := v_failure_count + 1;
    END;

    SELECT COUNT(*)
    INTO   v_active_count
    FROM   user_mining_models
    WHERE  model_name IN (
        'HT_DEMAND_VOLATILITY_MODEL',
        'HT_CUSTOMER_COMMITMENT_SEGMENT_MODEL',
        'HT_COMMITMENT_VALUE_MODEL',
        'HT_PRODUCT_SIGNAL_CLUSTER_MODEL'
    );

    IF v_failure_count > 0 OR v_active_count != 4 THEN
        raise_application_error(
            -20091,
            'High Tech OML refresh incomplete: failures=' || v_failure_count
            || ', active_models=' || v_active_count || ', expected_models=4'
        );
    END IF;
END;
/

CREATE OR REPLACE PROCEDURE rebuild_hightech_oml_models AUTHID CURRENT_USER AS
BEGIN
    refresh_hightech_oml_models;
END;
/

CREATE OR REPLACE PROCEDURE refresh_demo_oml_models AUTHID CURRENT_USER AS
BEGIN
    refresh_hightech_oml_models;
END;
/

CREATE OR REPLACE PROCEDURE rebuild_demo_oml_models AUTHID CURRENT_USER AS
BEGIN
    refresh_hightech_oml_models;
END;
/

COMMIT;

PROMPT High Tech OML model lifecycle objects are ready.
