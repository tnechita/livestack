/*
 * 11_transportation_views.sql
 * Transportation-facing semantic layer for the Seer Transport LiveStack.
 *
 * These views preserve inherited physical table names while giving Ask Data,
 * demos, and SQL snippets transportation-ready terms.
 */

CREATE OR REPLACE VIEW service_lines_v AS
SELECT
  brand_id AS service_line_id,
  brand_name AS service_line_name,
  brand_slug AS service_line_code,
  brand_category AS service_line_category,
  headquarters_city AS operating_region,
  annual_revenue AS annual_service_value,
  social_tier AS signal_tier
FROM brands;

CREATE OR REPLACE VIEW transport_services_v AS
SELECT
  p.product_id AS transport_service_id,
  p.product_name AS transport_service_name,
  p.category AS service_category,
  p.subcategory AS service_subcategory,
  p.unit_price AS service_value,
  p.tags AS service_tags,
  p.is_active,
  p.brand_id AS service_line_id
FROM products p;

CREATE OR REPLACE VIEW shippers_v AS
SELECT
  customer_id AS shipper_id,
  first_name || ' ' || last_name AS shipper_name,
  email AS shipper_contact,
  city,
  state_province,
  latitude,
  longitude,
  location,
  customer_tier AS shipper_tier,
  lifetime_value AS lifetime_service_value
FROM customers;

CREATE OR REPLACE VIEW logistics_terminals_v AS
SELECT
  center_id AS terminal_id,
  center_name AS terminal_name,
  CASE center_type
    WHEN 'distribution' THEN 'Distribution Hub'
    WHEN 'warehouse' THEN 'Logistics Terminal'
    WHEN 'micro' THEN 'Micro Hub'
    WHEN 'drop_ship' THEN 'Partner Access Point'
    WHEN 'store' THEN 'Local Access Point'
    ELSE center_type
  END AS terminal_type,
  city,
  state_province,
  latitude,
  longitude,
  location,
  capacity_units AS processing_capacity,
  current_load_pct AS utilization_pct,
  is_active
FROM fulfillment_centers;

CREATE OR REPLACE VIEW terminal_capacity_v AS
SELECT
  i.inventory_id AS capacity_id,
  i.product_id AS transport_service_id,
  i.center_id AS terminal_id,
  i.quantity_on_hand AS available_capacity,
  i.quantity_reserved AS reserved_capacity,
  i.quantity_incoming AS incoming_capacity,
  i.reorder_point AS minimum_capacity_threshold,
  i.reorder_qty AS target_capacity_increment,
  i.updated_at
FROM inventory i;

CREATE OR REPLACE VIEW transport_orders_v AS
SELECT
  o.order_id AS transport_order_id,
  o.customer_id AS shipper_id,
  o.order_status AS transport_order_status,
  o.cancellation_reason,
  o.order_total AS service_value,
  o.shipping_cost AS route_cost,
  o.fulfillment_center_id AS terminal_id,
  o.social_source_id AS shipper_signal_id,
  o.demand_score AS urgency_score,
  o.created_at,
  o.updated_at
FROM orders o;

CREATE OR REPLACE VIEW transport_routes_v AS
SELECT
  shipment_id AS route_id,
  order_id AS transport_order_id,
  center_id AS terminal_id,
  carrier AS route_provider,
  tracking_number AS route_reference,
  ship_status AS route_status,
  distance_km,
  estimated_hours,
  ship_cost AS route_cost,
  shipped_at AS dispatched_at,
  delivered_at AS completed_at,
  created_at
FROM shipments;

CREATE OR REPLACE VIEW shipper_signal_posts_v AS
SELECT
  sp.post_id AS signal_id,
  sp.influencer_id AS signal_source_id,
  sp.platform AS signal_channel,
  sp.post_text AS signal_text,
  sp.virality_score AS urgency_score,
  sp.momentum_flag AS severity_band,
  sp.sentiment_score,
  sp.views_count AS reach_count,
  sp.likes_count AS acknowledgement_count,
  sp.shares_count AS escalation_count,
  sp.comments_count AS operations_comment_count,
  sp.detected_products AS detected_transport_services,
  sp.posted_at AS signal_time
FROM social_posts sp;

CREATE OR REPLACE VIEW signal_sources_v AS
SELECT
  influencer_id AS signal_source_id,
  handle AS source_handle,
  display_name AS source_name,
  platform AS source_channel,
  niche AS logistics_role,
  city,
  region,
  influence_score AS signal_reach_score,
  follower_count AS reach_count,
  engagement_rate
FROM influencers;

CREATE OR REPLACE VIEW transport_network_entities_v AS
SELECT
  entity_id AS network_entity_id,
  entity_key AS network_entity_key,
  display_name AS network_entity_name,
  entity_type,
  risk_score,
  risk_level,
  region,
  city,
  channel AS signal_channel,
  service_value,
  event_count,
  is_active_risk
FROM transport_entities;

CREATE OR REPLACE VIEW transport_network_relationships_v AS
SELECT
  relationship_id AS network_relationship_id,
  from_entity,
  to_entity,
  relationship_type,
  strength AS evidence_strength,
  event_count,
  service_value,
  first_seen,
  last_seen
FROM transport_relationships;

CREATE OR REPLACE VIEW transport_exception_cases_v AS
SELECT
  case_id AS exception_case_id,
  case_ref AS exception_case_ref,
  case_type,
  status AS case_status,
  risk_score,
  service_value_at_risk,
  event_count,
  opened_at,
  updated_at
FROM transport_exception_cases;

CREATE OR REPLACE VIEW signal_embeddings AS
SELECT * FROM post_embeddings;

COMMIT;

SELECT '11_transportation_views.sql complete - transportation semantic views created.' AS status FROM dual;
