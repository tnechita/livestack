/*
 * 10_Lifesciences_views.sql
 * Life-sciences-facing semantic layer for the Seer Lifesciences LiveStack.
 *
 * These views preserve inherited physical table names used by the application
 * while giving Ask Data, demos, and SQL snippets regulated-operations names.
 * Run as: LIVESTACK
 */

CREATE OR REPLACE VIEW ls_manufacturers_v AS
SELECT
  brand_id AS manufacturer_id,
  brand_name AS manufacturer_name,
  brand_category AS manufacturer_type,
  headquarters_city,
  annual_revenue
FROM brands;

CREATE OR REPLACE VIEW ls_regulated_products_v AS
SELECT
  product_id AS regulated_product_id,
  product_name AS regulated_product_name,
  category AS product_category,
  subcategory,
  unit_price AS unit_supply_value,
  tags,
  brand_id AS manufacturer_id
FROM products;

CREATE OR REPLACE VIEW ls_quality_signals_v AS
SELECT
  post_id AS signal_id,
  post_text AS signal_text,
  platform AS source_channel,
  virality_score AS criticality_score,
  momentum_flag AS severity_band,
  views_count AS exposure_count,
  likes_count AS acknowledgement_count,
  shares_count AS escalation_count,
  comments_count AS cases_opened_count,
  posted_at AS signal_time,
  influencer_id AS source_id
FROM social_posts;

CREATE OR REPLACE VIEW ls_signal_sources_v AS
SELECT
  influencer_id AS source_id,
  handle AS source_code,
  display_name AS source_name,
  CASE platform
    WHEN 'instagram' THEN 'FDA bulletin'
    WHEN 'tiktok' THEN 'Quality event'
    WHEN 'twitter' THEN 'EMA/FDA notice'
    WHEN 'youtube' THEN 'Cold-chain advisory'
    WHEN 'threads' THEN 'Manufacturer update'
    ELSE platform
  END AS source_channel,
  follower_count AS source_reach,
  influence_score AS source_authority_score,
  region
FROM influencers;

CREATE OR REPLACE VIEW ls_clinical_supply_orders_v AS
SELECT
  o.order_id AS clinical_supply_order_id,
  o.customer_id AS trial_site_id,
  c.first_name || ' ' || c.last_name AS trial_site_name,
  o.order_status AS clinical_supply_status,
  o.order_total AS supply_value_exposure,
  o.shipping_cost AS route_cost,
  o.fulfillment_center_id AS cold_chain_site_id,
  fc.center_name AS cold_chain_fulfillment_site,
  o.social_source_id AS quality_signal_id,
  o.demand_score AS urgency_score,
  o.created_at,
  o.updated_at
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
LEFT JOIN fulfillment_centers fc ON fc.center_id = o.fulfillment_center_id;

CREATE OR REPLACE VIEW ls_trial_sites_v AS
SELECT
  customer_id AS trial_site_id,
  email AS site_contact_email,
  first_name || ' ' || last_name AS trial_site_name,
  city,
  state_province,
  postal_code,
  country,
  latitude,
  longitude,
  location,
  customer_tier AS trial_site_tier,
  lifetime_value AS historical_supply_value
FROM customers;

CREATE OR REPLACE VIEW ls_cold_chain_sites_v AS
SELECT
  center_id AS cold_chain_site_id,
  center_name AS cold_chain_site_name,
  CASE center_type
    WHEN 'distribution' THEN 'Regional Cold-Chain Hub'
    WHEN 'warehouse' THEN 'GMP Warehouse'
    WHEN 'micro' THEN 'Clinical Trial Depot'
    WHEN 'store' THEN 'Clinical Trial Depot'
    WHEN 'drop_ship' THEN 'Partner Logistics Point'
    ELSE center_type
  END AS cold_chain_site_type,
  city,
  state_province,
  latitude,
  longitude,
  capacity_units AS controlled_storage_capacity,
  current_load_pct AS utilization_pct,
  is_active
FROM fulfillment_centers;

CREATE OR REPLACE VIEW ls_supply_capacity_v AS
SELECT
  inventory_id AS capacity_id,
  product_id AS regulated_product_id,
  center_id AS cold_chain_site_id,
  quantity_on_hand AS available_units,
  quantity_reserved AS reserved_units,
  quantity_incoming AS incoming_units,
  reorder_point AS minimum_supply_threshold,
  reorder_qty AS target_replenishment_increment,
  updated_at
FROM inventory;

CREATE OR REPLACE VIEW ls_cold_chain_routes_v AS
SELECT
  shipment_id AS route_id,
  order_id AS clinical_supply_order_id,
  center_id AS cold_chain_site_id,
  carrier AS route_provider,
  tracking_number AS route_reference,
  ship_status AS cold_chain_route_status,
  distance_km,
  estimated_hours,
  ship_cost AS route_cost,
  shipped_at,
  delivered_at,
  created_at
FROM shipments;

CREATE OR REPLACE VIEW ls_operations_dashboard_v AS
SELECT
  o.order_id AS clinical_supply_order_id,
  o.order_status AS clinical_supply_status,
  o.order_total AS supply_value_exposure,
  o.social_source_id AS quality_signal_id,
  o.demand_score AS urgency_score,
  o.created_at,
  p.product_name,
  p.category AS product_category,
  b.brand_name AS manufacturer_name
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
JOIN products p ON p.product_id = oi.product_id
JOIN brands b ON b.brand_id = p.brand_id;

COMMIT;

SELECT '10_Lifesciences_views.sql complete - life sciences semantic views created.' AS status FROM dual;

COMMENT ON TABLE ls_manufacturers_v IS
  'Semantic view for life sciences manufacturers, CDMOs, CROs, logistics partners, and regulated suppliers.';
COMMENT ON TABLE ls_regulated_products_v IS
  'Semantic view for regulated products, clinical supply kits, lots, materials, and controlled inventory value.';
COMMENT ON TABLE ls_quality_signals_v IS
  'Semantic view for quality, regulatory, cold-chain, manufacturing, and clinical-supply risk signals.';
COMMENT ON TABLE ls_signal_sources_v IS
  'Semantic view for regulated signal sources such as agencies, quality desks, manufacturers, and logistics advisories.';
COMMENT ON TABLE ls_clinical_supply_orders_v IS
  'Semantic view for clinical supply orders tied to trial sites, cold-chain sites, quality signals, and supply exposure.';
COMMENT ON TABLE ls_trial_sites_v IS
  'Semantic view for clinical trial sites, site criticality tiers, locations, and historical supply exposure.';
COMMENT ON TABLE ls_cold_chain_sites_v IS
  'Semantic view for cold-chain depots, GMP warehouses, clinical trial depots, and controlled storage capacity.';
COMMENT ON TABLE ls_supply_capacity_v IS
  'Semantic view for regulated supply capacity, available units, reserved units, incoming supply, and replenishment thresholds.';
COMMENT ON TABLE ls_cold_chain_routes_v IS
  'Semantic view for cold-chain routes, providers, route status, transit timing, and delivery evidence.';
COMMENT ON TABLE ls_operations_dashboard_v IS
  'Semantic dashboard view connecting clinical supply orders, product categories, manufacturers, quality signals, and exposure.';

COMMIT;
