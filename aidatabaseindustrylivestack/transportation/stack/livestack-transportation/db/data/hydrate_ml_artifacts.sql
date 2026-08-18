/*
 * hydrate_ml_artifacts.sql
 * Rebuilds derived ML data for the transportation demo.
 *
 * Run after core data is loaded and after ALL_MINILM_L12_V2 is available.
 */

SET SERVEROUTPUT ON
SET DEFINE OFF

PROMPT Hydrating virality scores and inventory consistency...

UPDATE social_posts
SET virality_score = ROUND(LEAST(100,
    LEAST(NVL(likes_count, 0) / 1000, 35) +
    LEAST(NVL(shares_count, 0) / 250, 25) +
    LEAST(NVL(comments_count, 0) / 200, 15) +
    LEAST(NVL(views_count, 0) / 100000, 25)
), 2)
WHERE virality_score IS NULL;

UPDATE inventory
SET quantity_reserved = quantity_on_hand
WHERE quantity_reserved > quantity_on_hand;

COMMIT;

PROMPT Creating OML training views...

CREATE OR REPLACE VIEW OML_DEMAND_TRAINING_V AS
WITH product_features AS (
    SELECT
        p.product_id,
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
        SELECT
            ppm.product_id,
            COUNT(*) AS total_posts,
            AVG(sp.sentiment_score) AS avg_sentiment,
            SUM(sp.likes_count) AS total_likes,
            SUM(sp.shares_count) AS total_shares,
            SUM(sp.views_count) AS total_views,
            AVG(sp.virality_score) AS avg_virality,
            SUM(CASE WHEN sp.momentum_flag IN ('viral', 'mega_viral') THEN 1 ELSE 0 END) AS viral_posts,
            SUM(CASE WHEN sp.momentum_flag = 'rising' THEN 1 ELSE 0 END) AS rising_posts
        FROM post_product_mentions ppm
        JOIN social_posts sp ON sp.post_id = ppm.post_id
        GROUP BY ppm.product_id
    ) eng ON eng.product_id = p.product_id
    LEFT JOIN (
        SELECT
            oi.product_id,
            SUM(oi.quantity) AS units_sold,
            SUM(oi.line_total) AS revenue
        FROM order_items oi
        GROUP BY oi.product_id
    ) sales ON sales.product_id = p.product_id
    WHERE p.is_active = 1
),
scored AS (
    SELECT
        pf.*,
        NTILE(3) OVER (
            ORDER BY
                (pf.avg_virality * 2) +
                LEAST(pf.total_posts, 100) +
                (pf.viral_posts * 15) +
                (pf.rising_posts * 5) +
                LEAST(pf.total_views / 100000, 100) +
                LEAST(pf.units_sold, 200) DESC
        ) AS demand_band
    FROM product_features pf
)
SELECT
    product_id,
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
    CASE demand_band
        WHEN 1 THEN 'SURGE'
        WHEN 2 THEN 'WATCH'
        ELSE 'STABLE'
    END AS surge_label
FROM scored;

CREATE OR REPLACE VIEW OML_CUSTOMER_RFM_V AS
SELECT
    c.customer_id,
    NVL(c.lifetime_value, 0) AS lifetime_value,
    NVL(rfm.recency_days, 999) AS recency_days,
    NVL(rfm.frequency, 0) AS frequency,
    NVL(rfm.monetary, 0) AS monetary,
    NVL(rfm.avg_order_value, 0) AS avg_order_value,
    NVL(rfm.total_items, 0) AS total_items
FROM customers c
LEFT JOIN (
    SELECT
        o.customer_id,
        ROUND((SELECT NVL(MAX(CAST(created_at AS DATE)), SYSDATE) FROM orders) - CAST(MAX(o.created_at) AS DATE)) AS recency_days,
        COUNT(DISTINCT o.order_id) AS frequency,
        SUM(o.order_total) AS monetary,
        AVG(o.order_total) AS avg_order_value,
        NVL(SUM(oi_cnt.item_count), 0) AS total_items
    FROM orders o
    LEFT JOIN (
        SELECT order_id, SUM(quantity) AS item_count
        FROM order_items
        GROUP BY order_id
    ) oi_cnt ON oi_cnt.order_id = o.order_id
    GROUP BY o.customer_id
) rfm ON rfm.customer_id = c.customer_id;

CREATE OR REPLACE VIEW OML_REVENUE_TRAINING_V AS
SELECT
    o.order_id,
    o.order_total AS target_revenue,
    NVL(o.shipping_cost, 0) AS shipping_cost,
    NVL(o.demand_score, 0) AS demand_score,
    CASE WHEN o.social_source_id IS NULL THEN 0 ELSE 1 END AS social_signal_flag,
    NVL(c.lifetime_value, 0) AS customer_lifetime_value,
    NVL(c.customer_tier, 'standard') AS customer_tier,
    NVL(fc.current_load_pct, 0) AS center_load_pct,
    NVL(oi.item_count, 0) AS item_count,
    NVL(oi.total_quantity, 0) AS total_quantity,
    NVL(oi.avg_unit_price, 0) AS avg_unit_price,
    NVL(oi.distinct_products, 0) AS distinct_products,
    ROUND((SELECT NVL(MAX(CAST(created_at AS DATE)), SYSDATE) FROM orders) - CAST(o.created_at AS DATE), 2) AS order_age_days
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
LEFT JOIN fulfillment_centers fc ON fc.center_id = o.fulfillment_center_id
LEFT JOIN (
    SELECT
        order_id,
        COUNT(*) AS item_count,
        SUM(quantity) AS total_quantity,
        AVG(unit_price) AS avg_unit_price,
        COUNT(DISTINCT product_id) AS distinct_products
    FROM order_items
    GROUP BY order_id
) oi ON oi.order_id = o.order_id
WHERE o.order_total IS NOT NULL;

CREATE OR REPLACE VIEW OML_PRODUCT_CLUSTER_V AS
SELECT
    p.product_id,
    p.unit_price,
    NVL(sales.units_sold, 0) AS units_sold,
    NVL(sales.revenue, 0) AS revenue,
    NVL(eng.total_engagement, 0) AS total_engagement,
    NVL(eng.avg_sentiment, 0.5) AS avg_sentiment,
    NVL(eng.avg_virality, 0) AS avg_virality
FROM products p
LEFT JOIN (
    SELECT
        product_id,
        SUM(quantity) AS units_sold,
        SUM(line_total) AS revenue
    FROM order_items
    GROUP BY product_id
) sales ON sales.product_id = p.product_id
LEFT JOIN (
    SELECT
        ppm.product_id,
        SUM(sp.likes_count + sp.shares_count + sp.views_count) AS total_engagement,
        AVG(sp.sentiment_score) AS avg_sentiment,
        AVG(sp.virality_score) AS avg_virality
    FROM post_product_mentions ppm
    JOIN social_posts sp ON sp.post_id = ppm.post_id
    GROUP BY ppm.product_id
) eng ON eng.product_id = p.product_id
WHERE p.is_active = 1;

PROMPT Rebuilding OML models...

DECLARE
    PROCEDURE drop_model_if_exists(p_model_name IN VARCHAR2) IS
    BEGIN
        DBMS_DATA_MINING.DROP_MODEL(p_model_name);
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE NOT IN (-40284, -40281) THEN
                RAISE;
            END IF;
    END;

    PROCEDURE drop_table_if_exists(p_table_name IN VARCHAR2) IS
    BEGIN
        EXECUTE IMMEDIATE 'DROP TABLE ' || p_table_name || ' PURGE';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE != -942 THEN
                RAISE;
            END IF;
    END;
BEGIN
    drop_model_if_exists('DEMAND_SURGE_MODEL');
    drop_table_if_exists('DEMAND_SURGE_SETTINGS');
    EXECUTE IMMEDIATE q'[
        CREATE TABLE demand_surge_settings AS
        SELECT CAST('ALGO_NAME' AS VARCHAR2(30)) AS setting_name,
               CAST('ALGO_RANDOM_FOREST' AS VARCHAR2(4000)) AS setting_value FROM dual
        UNION ALL SELECT 'PREP_AUTO', 'ON' FROM dual
    ]';
    DBMS_DATA_MINING.CREATE_MODEL(
        model_name          => 'DEMAND_SURGE_MODEL',
        mining_function     => DBMS_DATA_MINING.CLASSIFICATION,
        data_table_name     => 'OML_DEMAND_TRAINING_V',
        case_id_column_name => 'PRODUCT_ID',
        target_column_name  => 'SURGE_LABEL',
        settings_table_name => 'DEMAND_SURGE_SETTINGS'
    );

    drop_model_if_exists('CUSTOMER_SEGMENT_MODEL');
    drop_table_if_exists('CUSTOMER_SEGMENT_SETTINGS');
    EXECUTE IMMEDIATE q'[
        CREATE TABLE customer_segment_settings AS
        SELECT CAST('ALGO_NAME' AS VARCHAR2(30)) AS setting_name,
               CAST('ALGO_KMEANS' AS VARCHAR2(4000)) AS setting_value FROM dual
        UNION ALL SELECT 'PREP_AUTO', 'ON' FROM dual
        UNION ALL SELECT 'CLUS_NUM_CLUSTERS', '4' FROM dual
    ]';
    DBMS_DATA_MINING.CREATE_MODEL(
        model_name          => 'CUSTOMER_SEGMENT_MODEL',
        mining_function     => DBMS_DATA_MINING.CLUSTERING,
        data_table_name     => 'OML_CUSTOMER_RFM_V',
        case_id_column_name => 'CUSTOMER_ID',
        settings_table_name => 'CUSTOMER_SEGMENT_SETTINGS'
    );

    drop_model_if_exists('REVENUE_PREDICT_MODEL');
    drop_table_if_exists('REVENUE_PREDICT_SETTINGS');
    EXECUTE IMMEDIATE q'[
        CREATE TABLE revenue_predict_settings AS
        SELECT CAST('ALGO_NAME' AS VARCHAR2(30)) AS setting_name,
               CAST('ALGO_GENERALIZED_LINEAR_MODEL' AS VARCHAR2(4000)) AS setting_value FROM dual
        UNION ALL SELECT 'PREP_AUTO', 'ON' FROM dual
    ]';
    DBMS_DATA_MINING.CREATE_MODEL(
        model_name          => 'REVENUE_PREDICT_MODEL',
        mining_function     => DBMS_DATA_MINING.REGRESSION,
        data_table_name     => 'OML_REVENUE_TRAINING_V',
        case_id_column_name => 'ORDER_ID',
        target_column_name  => 'TARGET_REVENUE',
        settings_table_name => 'REVENUE_PREDICT_SETTINGS'
    );

    drop_model_if_exists('PRODUCT_CLUSTER_MODEL');
    drop_table_if_exists('PRODUCT_CLUSTER_SETTINGS');
    EXECUTE IMMEDIATE q'[
        CREATE TABLE product_cluster_settings AS
        SELECT CAST('ALGO_NAME' AS VARCHAR2(30)) AS setting_name,
               CAST('ALGO_KMEANS' AS VARCHAR2(4000)) AS setting_value FROM dual
        UNION ALL SELECT 'PREP_AUTO', 'ON' FROM dual
        UNION ALL SELECT 'CLUS_NUM_CLUSTERS', '5' FROM dual
    ]';
    DBMS_DATA_MINING.CREATE_MODEL(
        model_name          => 'PRODUCT_CLUSTER_MODEL',
        mining_function     => DBMS_DATA_MINING.CLUSTERING,
        data_table_name     => 'OML_PRODUCT_CLUSTER_V',
        case_id_column_name => 'PRODUCT_ID',
        settings_table_name => 'PRODUCT_CLUSTER_SETTINGS'
    );

    DBMS_OUTPUT.PUT_LINE('OML models rebuilt.');
END;
/

PROMPT Rebuilding vector artifacts...

DECLARE
    v_model_count NUMBER;
    v_rows NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_model_count
    FROM user_mining_models
    WHERE model_name = 'ALL_MINILM_L12_V2';

    IF v_model_count = 0 THEN
        RAISE_APPLICATION_ERROR(
            -20001,
            'Required embedding model ALL_MINILM_L12_V2 is missing; vector hydration cannot continue.'
        );
    END IF;

    INSERT INTO product_embeddings (product_id, embedding_text, embedding)
    SELECT p.product_id,
           p.product_name || ' ' || NVL(p.category, '') || ' ' || NVL(p.description, '') || ' ' || b.brand_name,
           VECTOR_EMBEDDING(ALL_MINILM_L12_V2 USING
             p.product_name || ' ' || NVL(p.category, '') || ' ' || NVL(p.description, '') || ' ' || b.brand_name AS DATA)
    FROM products p
    JOIN brands b ON b.brand_id = p.brand_id
    WHERE NOT EXISTS (
        SELECT 1
        FROM product_embeddings pe
        WHERE pe.product_id = p.product_id
    );
    v_rows := SQL%ROWCOUNT;
    DBMS_OUTPUT.PUT_LINE('Product embeddings inserted: ' || v_rows);

    INSERT INTO post_embeddings (post_id, embedding_text, embedding)
    SELECT sp.post_id,
           SUBSTR(sp.post_text, 1, 500),
           VECTOR_EMBEDDING(ALL_MINILM_L12_V2 USING SUBSTR(sp.post_text, 1, 500) AS DATA)
    FROM social_posts sp
    WHERE NOT EXISTS (
        SELECT 1
        FROM post_embeddings pe
        WHERE pe.post_id = sp.post_id
    );
    v_rows := SQL%ROWCOUNT;
    DBMS_OUTPUT.PUT_LINE('Post embeddings inserted: ' || v_rows);

    DELETE FROM semantic_matches;

    INSERT INTO semantic_matches (post_id, product_id, similarity_score, match_rank, match_method)
    SELECT post_id, product_id, similarity_score, match_rank, 'vector'
    FROM (
        SELECT pe.post_id,
               pre.product_id,
               ROUND(1 - VECTOR_DISTANCE(pe.embedding, pre.embedding, COSINE), 5) AS similarity_score,
               ROW_NUMBER() OVER (
                   PARTITION BY pe.post_id
                   ORDER BY VECTOR_DISTANCE(pe.embedding, pre.embedding, COSINE)
               ) AS match_rank
        FROM post_embeddings pe
        JOIN social_posts sp ON sp.post_id = pe.post_id
        CROSS JOIN product_embeddings pre
        WHERE sp.momentum_flag IN ('viral', 'mega_viral')
    )
    WHERE match_rank <= 3;
    v_rows := SQL%ROWCOUNT;
    DBMS_OUTPUT.PUT_LINE('Semantic matches inserted: ' || v_rows);
END;
/

COMMIT;

SELECT 'hydrate_ml_artifacts.sql complete' AS status FROM dual;
