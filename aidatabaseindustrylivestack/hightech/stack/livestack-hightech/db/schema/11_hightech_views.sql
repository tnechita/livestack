/*
 * 11_hightech_views.sql
 * Semantic SQL layer for Ask Data and presenter-facing high-tech names.
 */
SET SERVEROUTPUT ON

CREATE OR REPLACE VIEW tech_portfolios_v AS
SELECT brand_id AS portfolio_id,
       brand_name AS portfolio_name,
       brand_slug AS portfolio_slug,
       brand_category AS portfolio_category,
       headquarters_city,
       annual_revenue AS portfolio_value_proxy
FROM brands;

CREATE OR REPLACE VIEW hightech_products_v AS
SELECT product_id,
       product_name AS hightech_product_name,
       category AS product_category,
       subcategory AS product_subcategory,
       unit_price AS product_value,
       unit_cost,
       tags,
       brand_id AS portfolio_id
FROM products;

CREATE OR REPLACE VIEW product_signals_v AS
SELECT sp.post_id AS signal_id,
       sp.post_text AS signal_text,
       sp.platform AS signal_channel,
       sp.virality_score AS urgency_score,
       sp.momentum_flag AS momentum_band,
       sp.views_count AS signal_reach,
       sp.posted_at AS signal_time,
       i.influencer_id AS advocate_id,
       i.handle AS advocate_handle,
       i.display_name AS advocate_name
FROM social_posts sp
LEFT JOIN influencers i ON i.influencer_id = sp.influencer_id;

CREATE OR REPLACE VIEW developer_advocates_v AS
SELECT influencer_id AS advocate_id,
       handle AS advocate_handle,
       display_name AS advocate_name,
       platform AS source_channel,
       follower_count AS audience_reach,
       influence_score AS authority_score,
       niche AS developer_specialty,
       city,
       region
FROM influencers;

CREATE OR REPLACE VIEW product_signal_matches_v AS
SELECT sm.match_id,
       sm.post_id AS signal_id,
       sp.post_text AS signal_text,
       p.product_id,
       p.product_name AS hightech_product_name,
       b.brand_name AS technology_portfolio,
       sm.similarity_score,
       sp.virality_score AS urgency_score,
       sp.momentum_flag AS momentum_band
FROM semantic_matches sm
JOIN social_posts sp ON sp.post_id = sm.post_id
JOIN products p ON p.product_id = sm.product_id
JOIN brands b ON b.brand_id = p.brand_id;

CREATE OR REPLACE VIEW solution_orders_v AS
SELECT o.order_id AS solution_order_id,
       o.customer_id AS enterprise_buyer_id,
       c.first_name || ' ' || c.last_name AS enterprise_buyer_name,
       o.order_status AS solution_status,
       o.order_total AS product_value,
       o.shipping_cost AS route_cost,
       o.fulfillment_center_id AS availability_center_id,
       o.social_source_id AS signal_id,
       o.demand_score AS urgency_score,
       o.created_at,
       o.updated_at
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id;

CREATE OR REPLACE VIEW product_capacity_v AS
SELECT i.inventory_id AS capacity_id,
       i.product_id,
       p.product_name AS hightech_product_name,
       b.brand_name AS portfolio_name,
       i.center_id AS availability_center_id,
       fc.center_name AS availability_center_name,
       i.quantity_on_hand AS available_capacity,
       i.quantity_reserved AS reserved_capacity,
       i.reorder_point AS minimum_capacity_threshold
FROM inventory i
JOIN products p ON p.product_id = i.product_id
JOIN brands b ON b.brand_id = p.brand_id
JOIN fulfillment_centers fc ON fc.center_id = i.center_id;

CREATE OR REPLACE VIEW fulfillment_routes_v AS
SELECT shipment_id AS route_id,
       order_id AS solution_order_id,
       center_id AS availability_center_id,
       carrier AS route_provider,
       tracking_number AS route_reference,
       ship_status AS route_status,
       distance_km,
       estimated_hours,
       ship_cost AS route_cost,
       shipped_at AS routed_at,
       delivered_at AS completed_at
FROM shipments;

CREATE OR REPLACE VIEW seertech_agent_actions_v AS
SELECT action_id,
       agent_name AS agent_team,
       action_type,
       decision_payload AS payload_json,
       created_at,
       execution_status AS status
FROM agent_actions;

CREATE OR REPLACE VIEW signal_embeddings AS
SELECT * FROM post_embeddings;

COMMENT ON TABLE tech_portfolios_v IS 'Semantic view of Seer Tech technology portfolios and product-line owners.';
COMMENT ON TABLE hightech_products_v IS 'Semantic view of high-tech products, services, hardware kits, subscriptions, and enablement packages.';
COMMENT ON TABLE product_signals_v IS 'Semantic view of enterprise buyer and developer ecosystem signals for product demand and signal urgency questions.';
COMMENT ON TABLE product_signal_matches_v IS 'Semantic view joining vector signal matches to high-tech products and technology portfolios.';
COMMENT ON TABLE developer_advocates_v IS 'Semantic view of developer advocates, partner engineers, architects, and ecosystem signal sources.';
COMMENT ON TABLE solution_orders_v IS 'Semantic view of Seer Tech solution orders from enterprise buyers.';
COMMENT ON TABLE product_capacity_v IS 'Semantic view of product availability, capacity, reserved capacity, and availability centers.';
COMMENT ON TABLE fulfillment_routes_v IS 'Semantic view of inherited shipments as fulfillment or allocation routes for high-tech solution orders.';
COMMENT ON TABLE seertech_agent_actions_v IS 'Semantic view of AI Agent audit actions for Seer Tech product intelligence workflows.';
COMMENT ON TABLE signal_embeddings IS 'Compatibility view exposing post embeddings as signal embeddings for presenter-facing Seer Tech vector search terminology.';

PROMPT High-tech semantic views are ready.
