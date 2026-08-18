/*
 * load_all_data.sql
 * Master data loader - runs all data scripts in order
 * Generates ~5000 customer and developer signal posts, ~31 products, 12 technology portfolios,
 * 12 product availability centers, ~483 developer advocates, 2000 enterprise buyers, 3000 solution orders
 *
 * NOTE: Uses individual INSERTs (not INSERT ALL) for tables with identity
 * columns to avoid ORA-00001 duplicate identity values on Oracle AI Database 26ai.
 */

SET SERVEROUTPUT ON
SET DEFINE OFF

PROMPT =====================================================
PROMPT Loading Seer Tech Product Intelligence Demo Data
PROMPT =====================================================

-- ============================================================
-- TECHNOLOGY PORTFOLIOS / PRODUCT LINES (12) - individual INSERTs to avoid identity dup issue
-- ============================================================
PROMPT Loading technology portfolios...

INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('QuantumCore Systems','quantumcore','Integrated Systems','New York',40.7128,-74.006,2012,925000000,'premium');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('EdgePulse Platforms','edgepulse','Edge Computing','Chicago',41.8781,-87.6298,2008,710000000,'premium');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('PulsePoint Silicon','pulsepoint','Semiconductor Platforms','Dallas',32.7767,-96.797,2015,1185000000,'premium');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('ClearMind Cloud','clearmind','Developer Experience','Seattle',47.6062,-122.3321,2019,376000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('OptiMotion Robotics','optimotion-robotics','Robotics','Denver',39.7392,-104.9903,2016,498000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('FieldLink Services','fieldlink-services','Field Services','Atlanta',33.749,-84.388,2018,324000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('ModuleSupply Direct','modulesupply-direct','Hardware Kits','Phoenix',33.4484,-112.074,2014,860000000,'premium');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('NanoNest Labs','nanonest-labs','IoT','Boston',42.3601,-71.0589,2020,254000000,'emerging');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('SilverLine Infrastructure','silverline','Enterprise Support','Miami',25.7617,-80.1918,2011,548000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('OptiGuide AI','optiguide-ai','AI Software','San Francisco',37.7749,-122.4194,2017,632000000,'premium');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('SignalFlow Networks','signalflow-networks','Networking','Houston',29.7604,-95.3698,2013,775000000,'premium');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('VertexFirst Security','vertexfirst-security','Security','Nashville',36.1627,-86.7816,2018,384000000,'standard');
COMMIT;
PROMPT Technology portfolios loaded: 12

-- ============================================================
-- PRODUCT AVAILABILITY CENTERS (12) - individual INSERTs
-- ============================================================
PROMPT Loading product availability centers...

INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('NYC Systems Command Center','distribution','Edison','New Jersey','08817','US',40.5187,-74.4121,240000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Los Angeles Device Fulfillment Hub','warehouse','Ontario','California','91761','US',34.0633,-117.6509,320000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Chicago Midwest Edge Hub','distribution','Joliet','Illinois','60435','US',41.525,-88.0817,210000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Dallas Silicon Allocation Center','warehouse','Lancaster','Texas','75134','US',32.5921,-96.7561,185000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Atlanta Field Services Dispatch','distribution','Union City','Georgia','30291','US',33.5871,-84.5421,220000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Seattle Developer Sandbox Center','micro','Kent','Washington','98032','US',47.3809,-122.2348,95000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Miami Enterprise Support Hub','distribution','Hialeah','Florida','33012','US',25.8576,-80.2781,120000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Denver Robotics Capacity Center','warehouse','Aurora','Colorado','80011','US',39.7294,-104.8319,110000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Phoenix Enterprise Infrastructure Hub','warehouse','Goodyear','Arizona','85338','US',33.4353,-112.3577,135000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Boston IoT Access Center','micro','Fall River','Massachusetts','02720','US',41.7015,-71.155,88000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Houston Network Appliance Hub','distribution','Missouri City','Texas','77459','US',29.6186,-95.5377,150000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Bay Area AI Enablement Center','micro','Fremont','California','94538','US',37.5485,-121.9886,90000);
COMMIT;
PROMPT Product availability centers loaded: 12

@@load_products.sql
@@load_influencers.sql
@@load_customers.sql
@@load_social_posts.sql
@@load_orders.sql
@@load_graph_data.sql
@@load_app_users.sql
@@load_demand_regions.sql
@@load_demand_forecasts.sql

BEGIN
    EXECUTE IMMEDIATE q'[
        MERGE INTO app_dataset_state target
        USING (
            SELECT
                1 AS state_id,
                'demo' AS active_source,
                'High Tech Demo Data' AS active_label,
                'v1' AS active_version
            FROM dual
        ) incoming
        ON (target.state_id = incoming.state_id)
        WHEN MATCHED THEN UPDATE SET
            target.active_source = incoming.active_source,
            target.active_label = incoming.active_label,
            target.active_version = incoming.active_version,
            target.updated_at = SYSTIMESTAMP
        WHEN NOT MATCHED THEN INSERT (
            state_id,
            active_source,
            active_label,
            active_version,
            updated_at
        ) VALUES (
            incoming.state_id,
            incoming.active_source,
            incoming.active_label,
            incoming.active_version,
            SYSTIMESTAMP
        )
    ]';
    DBMS_OUTPUT.PUT_LINE('Dataset metadata set to demo.');
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -942 THEN
            RAISE;
        END IF;
        DBMS_OUTPUT.PUT_LINE('app_dataset_state not present; skipping dataset metadata seed.');
END;
/

PROMPT =====================================================
PROMPT All data loaded successfully!
PROMPT =====================================================
