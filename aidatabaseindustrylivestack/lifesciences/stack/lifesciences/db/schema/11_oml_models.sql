/*
 * 11_oml_models.sql
 * Oracle Machine Learning training views and persisted DBMS_DATA_MINING models
 * for the Life Sciences predictive analytics page.
 *
 * Run as: LIVESTACK
 */

SET SERVEROUTPUT ON

CREATE OR REPLACE VIEW oml_demand_training_v AS
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
      product_id,
      SUM(quantity) AS units_sold,
      SUM(line_total) AS revenue
    FROM order_items
    GROUP BY product_id
  ) sales ON sales.product_id = p.product_id
  WHERE p.is_active = 1
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
  CASE
    WHEN avg_virality >= 70 OR viral_posts >= 4 OR total_views >= 10000000 THEN 'SURGE'
    WHEN avg_virality >= 45 OR rising_posts >= 5 OR total_views >= 2500000 THEN 'WATCH'
    ELSE 'STABLE'
  END AS surge_flag
FROM product_features;

CREATE OR REPLACE VIEW oml_customer_rfm_v AS
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
    ROUND((SELECT MAX(CAST(created_at AS DATE)) FROM orders) - CAST(MAX(o.created_at) AS DATE)) AS recency_days,
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
) rfm ON rfm.customer_id = c.customer_id
WHERE NVL(rfm.frequency, 0) > 0;

CREATE OR REPLACE VIEW oml_revenue_training_v AS
SELECT
  o.order_id,
  o.order_total AS target_revenue,
  c.customer_tier,
  NVL(c.lifetime_value, 0) AS lifetime_value,
  NVL(o.demand_score, 0) AS demand_score,
  NVL(o.shipping_cost, 0) AS shipping_cost,
  CASE WHEN o.social_source_id IS NULL THEN 0 ELSE 1 END AS social_signal_flag,
  NVL(items.item_count, 0) AS item_count,
  NVL(items.distinct_products, 0) AS distinct_products,
  NVL(items.avg_unit_price, 0) AS avg_unit_price,
  NVL(items.max_unit_price, 0) AS max_unit_price
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
LEFT JOIN (
  SELECT
    order_id,
    SUM(quantity) AS item_count,
    COUNT(DISTINCT product_id) AS distinct_products,
    AVG(unit_price) AS avg_unit_price,
    MAX(unit_price) AS max_unit_price
  FROM order_items
  GROUP BY order_id
) items ON items.order_id = o.order_id
WHERE o.order_total IS NOT NULL;

CREATE OR REPLACE VIEW oml_product_cluster_v AS
SELECT
  p.product_id,
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
  SELECT
    product_id,
    SUM(quantity) AS units_sold,
    SUM(line_total) AS revenue,
    COUNT(DISTINCT order_id) AS order_count
  FROM order_items
  GROUP BY product_id
) sales ON sales.product_id = p.product_id
LEFT JOIN (
  SELECT
    ppm.product_id,
    SUM(sp.likes_count + sp.shares_count + sp.comments_count + sp.views_count) AS total_engagement,
    AVG(sp.sentiment_score) AS avg_sentiment,
    AVG(sp.virality_score) AS avg_virality
  FROM post_product_mentions ppm
  JOIN social_posts sp ON sp.post_id = ppm.post_id
  GROUP BY ppm.product_id
) eng ON eng.product_id = p.product_id
WHERE p.is_active = 1;

DECLARE
  PROCEDURE drop_model_if_exists(p_model_name VARCHAR2) IS
  BEGIN
    DBMS_DATA_MINING.DROP_MODEL(p_model_name);
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLCODE != -40284 THEN
        RAISE;
      END IF;
  END;

  PROCEDURE reset_settings_table(p_table_name VARCHAR2, p_algo VARCHAR2, p_clusters NUMBER DEFAULT NULL) IS
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
    EXECUTE IMMEDIATE 'INSERT INTO ' || p_table_name || ' VALUES (:1, :2)'
      USING DBMS_DATA_MINING.ALGO_NAME, p_algo;
    EXECUTE IMMEDIATE 'INSERT INTO ' || p_table_name || ' VALUES (:1, :2)'
      USING DBMS_DATA_MINING.PREP_AUTO, DBMS_DATA_MINING.PREP_AUTO_ON;

    IF p_clusters IS NOT NULL THEN
      EXECUTE IMMEDIATE 'INSERT INTO ' || p_table_name || ' VALUES (:1, :2)'
        USING DBMS_DATA_MINING.CLUS_NUM_CLUSTERS, TO_CHAR(p_clusters);
    END IF;
  END;
BEGIN
  reset_settings_table('demand_surge_settings', DBMS_DATA_MINING.ALGO_RANDOM_FOREST);
  reset_settings_table('customer_segment_settings', DBMS_DATA_MINING.ALGO_KMEANS, 4);
  reset_settings_table('revenue_predict_settings', DBMS_DATA_MINING.ALGO_GENERALIZED_LINEAR_MODEL);
  reset_settings_table('prod_cluster_settings', DBMS_DATA_MINING.ALGO_KMEANS, 5);

  drop_model_if_exists('DEMAND_SURGE_MODEL');
  DBMS_DATA_MINING.CREATE_MODEL(
    model_name          => 'DEMAND_SURGE_MODEL',
    mining_function     => DBMS_DATA_MINING.CLASSIFICATION,
    data_table_name     => 'OML_DEMAND_TRAINING_V',
    case_id_column_name => 'PRODUCT_ID',
    target_column_name  => 'SURGE_FLAG',
    settings_table_name => 'DEMAND_SURGE_SETTINGS'
  );

  drop_model_if_exists('CUSTOMER_SEGMENT_MODEL');
  DBMS_DATA_MINING.CREATE_MODEL(
    model_name          => 'CUSTOMER_SEGMENT_MODEL',
    mining_function     => DBMS_DATA_MINING.CLUSTERING,
    data_table_name     => 'OML_CUSTOMER_RFM_V',
    case_id_column_name => 'CUSTOMER_ID',
    settings_table_name => 'CUSTOMER_SEGMENT_SETTINGS'
  );

  drop_model_if_exists('REVENUE_PREDICT_MODEL');
  DBMS_DATA_MINING.CREATE_MODEL(
    model_name          => 'REVENUE_PREDICT_MODEL',
    mining_function     => DBMS_DATA_MINING.REGRESSION,
    data_table_name     => 'OML_REVENUE_TRAINING_V',
    case_id_column_name => 'ORDER_ID',
    target_column_name  => 'TARGET_REVENUE',
    settings_table_name => 'REVENUE_PREDICT_SETTINGS'
  );

  drop_model_if_exists('PRODUCT_CLUSTER_MODEL');
  DBMS_DATA_MINING.CREATE_MODEL(
    model_name          => 'PRODUCT_CLUSTER_MODEL',
    mining_function     => DBMS_DATA_MINING.CLUSTERING,
    data_table_name     => 'OML_PRODUCT_CLUSTER_V',
    case_id_column_name => 'PRODUCT_ID',
    settings_table_name => 'PROD_CLUSTER_SETTINGS'
  );

  COMMIT;
  DBMS_OUTPUT.PUT_LINE('OML training views and DBMS_DATA_MINING models are ready.');
END;
/

SELECT '11_oml_models.sql complete - OML training views and models created.' AS status FROM dual;
