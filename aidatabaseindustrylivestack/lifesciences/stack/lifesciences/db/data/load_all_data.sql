/*
 * load_all_data.sql
 * Master data loader - runs all data scripts in order
 * Generates ~5000 regulatory, quality, and trial supply signals, ~90 products, 50 manufacturers,
 * 30 fulfillment sites, ~483 signal sources, 2000 trial sites, 3000 orders
 *
 * NOTE: Uses individual INSERTs (not INSERT ALL) for tables with identity
 * columns to avoid ORA-00001 duplicate identity values on Oracle 23ai.
 */

SET SERVEROUTPUT ON
SET DEFINE OFF

PROMPT =====================================================
PROMPT Loading Life Sciences Demo Data
PROMPT =====================================================

-- ============================================================
-- MANUFACTURERS AND LIFE SCIENCES PARTNERS (50) - individual INSERTs
-- ============================================================
PROMPT Loading manufacturers...

INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('VitaCore Therapeutics','vitacore','Biologics Manufacturing','Boston',42.3601,-71.0589,1998,245000000,'premium');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('TrialPath CRO','solvanta','Clinical Operations','Research Triangle Park',35.9049,-78.8640,2004,186000000,'premium');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('BioPure Diagnostics','biopure','Diagnostics','Chicago',41.8781,-87.6298,1987,132000000,'premium');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('GeneNova Therapeutics','genenova','Cell and Gene Therapy','Cambridge',42.3736,-71.1097,1992,221000000,'luxury');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('ImmunoWorks Biologics','immunoworks','Biologics','South San Francisco',37.6547,-122.4077,2001,98000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('PreClinix Research','preclinix','Preclinical Research','San Diego',32.7157,-117.1611,1979,154000000,'premium');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('CryoGrade Logistics','cryograde','Cold Chain Logistics','Memphis',35.1495,-90.0490,2016,91000000,'premium');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('SafeGx Quality Labs','safegxp','Quality and Regulatory Services','Rockville',39.0840,-77.1528,2011,43000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('SterileProcess Systems','sterileprocess','Bioprocess Consumables','Cleveland',41.4993,-81.6944,1968,275000000,'luxury');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('GreenLab Reagents','greenlab','Sustainable Lab Supplies','Portland',45.5152,-122.6784,2018,39000000,'emerging');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('MedPack Components','medpack','Device Packaging','Charlotte',35.2271,-80.8431,2007,76000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('BioCatalyst Analytics','catalysthub','Manufacturing Analytics','Tulsa',36.1540,-95.9928,1996,117000000,'premium');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('Northern BioReagents','northernreagents','Lab Reagents','Minneapolis',44.9778,-93.2650,2005,52000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('Gulf Vaccine Fill Finish','gulfvaccine','Vaccine Manufacturing','Baton Rouge',30.4515,-91.1871,1974,203000000,'premium');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('Midwest Trial Supply','midwesttrial','Clinical Trial Supply','Indianapolis',39.7684,-86.1581,1989,88000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('Pacific BioServices','pacificbio','CDMO Services','Los Angeles',34.0522,-118.2437,1994,143000000,'premium');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('PurityLabs IVD','puritylabs','Diagnostics','San Jose',37.3382,-121.8863,2012,69000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('CryoRoute Logistics','cryoroute','Cold Chain Logistics','Memphis',35.1495,-90.0490,2009,58000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('WaterWorks BioUtilities','waterworkslab','GMP Utilities','Milwaukee',43.0389,-87.9065,2003,74000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('BioBuffer','biobuffer','Bioprocess Materials','San Diego',32.7157,-117.1611,2015,46000000,'emerging');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('ElectrolyteWorks Clinical','electrolyteworks','Diagnostic Reagents','Phoenix',33.4484,-112.0740,2019,34000000,'emerging');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('RecyBio Labs','recybio','Circular Lab Supplies','Seattle',47.6062,-122.3321,2021,21000000,'emerging');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('GxPDesk','gxpdesk','Regulatory Content','Denver',39.7392,-104.9903,2014,18000000,'emerging');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('PharmaPrep','pharmaprep','Pharma Excipients','Philadelphia',39.9526,-75.1652,1999,112000000,'premium');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('CleanSuite Life Sciences','cleansuite','Cleanroom Services','Cincinnati',39.1031,-84.5120,2008,65000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('FormulationBridge','formulationbridge','Drug Product Formulation','Atlanta',33.7490,-84.3880,1991,126000000,'premium');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('SpecimenShield','specimenshield','Specimen Logistics','Dallas',32.7767,-96.7970,2013,47000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('FineBio Direct','finebiodirect','Specialty Biologics','Raleigh',35.7796,-78.6382,2006,82000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('PortBio Supply','portbio','Global API Import','Savannah',32.0809,-81.0912,1985,157000000,'premium');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('Peptide Partners','peptidepartners','API Intermediates','Kansas City',39.0997,-94.5786,1997,93000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('PurePAC Clinical','purepac','Clinical Packaging','St. Louis',38.6270,-90.1994,1982,138000000,'premium');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('SiliconeWorks Medical','siliconeworks','Device Components','Akron',41.0814,-81.5190,2002,71000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('EndoClear BioProcess','endoclear','Bioprocess Filtration','Pittsburgh',40.4406,-79.9959,1978,99000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('SterilityGuard','sterilityguard','Sterility Assurance','Tampa',27.9506,-82.4572,1995,61000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('StabilityCo','stabilityco','Stability Excipients','Baltimore',39.2904,-76.6122,2000,55000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('AseptiCoast','asepticoast','Aseptic Processing','Wilmington',34.2257,-77.9447,1993,104000000,'premium');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('CitrateSource Pharma','citricsource','Pharma Excipients','Nashville',36.1627,-86.7816,2006,57000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('WFI Direct','wfidirect','Sterile Excipients','San Antonio',29.4241,-98.4936,1990,118000000,'premium');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('AdhesiveOne Medical','adhesiveone','Device Components','Louisville',38.2527,-85.7585,2004,67000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('MedPropel Devices','medpropel','Medical Device Materials','Omaha',41.2565,-95.9345,1988,149000000,'premium');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('CleanSteamCare','cleansteamcare','GMP Utilities','New Orleans',29.9511,-90.0715,2001,59000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('VaccineWatch','vaccinewatch','Vaccine Safety Intelligence','Austin',30.2672,-97.7431,2020,26000000,'emerging');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('FDA Watch','fdawatch','Regulatory Intelligence','Washington',38.9072,-77.0369,2017,31000000,'emerging');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('EMA Updates Desk','emaupdates','Regulatory Intelligence','Washington',38.9072,-77.0369,2010,44000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('PortSupply BioSignals','portsupply','Import and Port Signals','Long Beach',33.7701,-118.1937,2018,29000000,'emerging');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('ColdChainOps','coldchainops','Cold Chain Operations','Las Vegas',36.1699,-115.1398,2012,51000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('ProtocolDesk','protocoldesk','Clinical Protocol Signals','Cleveland',41.4993,-81.6944,2016,37000000,'emerging');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('LabGrade Connect','labgradeconnect','Lab Reagents','Salt Lake City',40.7608,-111.8910,2009,48000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('SpecBio Exchange','specbioexchange','Specialty Biologics Distribution','Miami',25.7617,-80.1918,2015,63000000,'standard');
INSERT INTO brands (brand_name,brand_slug,brand_category,headquarters_city,headquarters_lat,headquarters_lon,founded_year,annual_revenue,social_tier) VALUES ('NorthStar GlycoBiologics','northstarglyco','Glycobiology Materials','Fargo',46.8772,-96.7898,2008,54000000,'standard');
COMMIT;
PROMPT Manufacturers loaded: 50

-- ============================================================
-- FULFILLMENT CENTERS (30) - individual INSERTs
-- ============================================================
PROMPT Loading fulfillment centers...

INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Edison Northeast Cold Chain Depot','distribution','Edison','New Jersey','08817','US',40.5187,-74.4121,500000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Ontario Clinical Supply Warehouse','warehouse','Ontario','California','91761','US',34.0633,-117.6509,750000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Joliet Midwest Regulatory Hub','distribution','Joliet','Illinois','60435','US',41.5250,-88.0817,400000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Lancaster Trial Kit Storage Site','warehouse','Lancaster','Texas','75134','US',32.5921,-96.7561,350000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Union City Southeast Cold Chain Hub','distribution','Union City','Georgia','30291','US',33.5871,-84.5421,450000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Kent Pacific Biologics Warehouse','warehouse','Kent','Washington','98032','US',47.3809,-122.2348,300000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Hialeah Import Compliance Site','distribution','Hialeah','Florida','33012','US',25.8576,-80.2781,250000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Aurora Mountain West Repack Hub','warehouse','Aurora','Colorado','80011','US',39.7294,-104.8319,200000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Goodyear Desert Cold Chain Site','warehouse','Goodyear','Arizona','85338','US',33.4353,-112.3577,280000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Fall River Northeast Safety Hub','distribution','Fall River','Massachusetts','02720','US',41.7015,-71.1550,220000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Shakopee Trial Supply Warehouse','warehouse','Shakopee','Minnesota','55379','US',44.7974,-93.5272,180000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Troutdale Pacific Micro Site','micro','Troutdale','Oregon','97060','US',45.5390,-122.3872,80000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Lebanon Central Biologics Warehouse','warehouse','Lebanon','Tennessee','37087','US',36.2081,-86.2911,250000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Fremont Bay Area Compliance Site','micro','Fremont','California','94538','US',37.5485,-121.9886,120000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Romulus Great Lakes Bioprocess Hub','warehouse','Romulus','Michigan','48174','US',42.2223,-83.3963,200000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Middletown Mid-Atlantic Cold Chain Hub','distribution','Middletown','Delaware','19709','US',39.4496,-75.7163,350000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Missouri City Gulf Coast Warehouse','warehouse','Missouri City','Texas','77459','US',29.6186,-95.5377,300000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('West Jordan Mountain Clinical Site','warehouse','West Jordan','Utah','84084','US',40.6097,-111.9391,180000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Concord Southeast Micro Site','micro','Concord','North Carolina','28027','US',35.4088,-80.5795,100000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Plainfield Heartland Clinical Hub','warehouse','Plainfield','Indiana','46168','US',39.7043,-86.3994,250000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('North Las Vegas West Storage Site','warehouse','North Las Vegas','Nevada','89030','US',36.1989,-115.1175,200000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Edwardsville Central Distribution Site','distribution','Edwardsville','Kansas','66111','US',39.0614,-94.8193,320000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Etna Midwest Specialty Warehouse','warehouse','Etna','Ohio','43018','US',39.9576,-82.6818,220000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Sparks West Coast Cold Chain Hub','warehouse','Sparks','Nevada','89431','US',39.5349,-119.7527,280000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Brandon Florida Micro Site','micro','Brandon','Florida','33510','US',27.9378,-82.2859,90000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Aberdeen East Coast Biologics Warehouse','warehouse','Aberdeen','Maryland','21001','US',39.5096,-76.1641,240000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('New Braunfels South Texas Micro Site','micro','New Braunfels','Texas','78130','US',29.7030,-98.1245,100000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Olive Branch Memphis Logistics Site','distribution','Olive Branch','Mississippi','38654','US',34.9618,-89.8295,400000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Kapolei Pacific Island Storage Site','micro','Kapolei','Hawaii','96707','US',21.3350,-158.0581,50000);
INSERT INTO fulfillment_centers (center_name,center_type,city,state_province,postal_code,country,latitude,longitude,capacity_units) VALUES ('Anchorage Alaska Cold Chain Site','micro','Anchorage','Alaska','99501','US',61.2181,-149.9003,40000);

UPDATE fulfillment_centers
   SET location = SDO_GEOMETRY(
       2001,
       4326,
       SDO_POINT_TYPE(longitude, latitude, NULL),
       NULL, NULL
   )
 WHERE latitude IS NOT NULL
   AND longitude IS NOT NULL
   AND location IS NULL;

COMMIT;
PROMPT Fulfillment centers loaded: 30

@@load_products.sql
@@load_influencers.sql
@@load_customers.sql
@@load_social_posts.sql
@@load_orders.sql
@@load_graph_data.sql
@@load_app_users.sql

PROMPT Loading AI Agent action audit examples...

INSERT INTO agent_actions (
    agent_name,
    action_type,
    entity_type,
    entity_id,
    decision_payload,
    confidence,
    execution_status,
    executed_at
) VALUES (
    'trend_detection_agent',
    'quality_review',
    'product',
    1,
    '{"reason":"Critical sterility bulletin matched a biologics lot with elevated supply value exposure.","recommended_action":"Open quality review and notify clinical supply planner."}',
    0.91,
    'completed',
    SYSTIMESTAMP - INTERVAL '3' HOUR
);

INSERT INTO agent_actions (
    agent_name,
    action_type,
    entity_type,
    entity_id,
    decision_payload,
    confidence,
    execution_status,
    executed_at
) VALUES (
    'fulfillment_agent',
    'cold_chain_rebalance',
    'inventory',
    1,
    '{"reason":"Controlled inventory is concentrated outside the nearest compliant cold-chain region.","recommended_action":"Rebalance available units to the closest GMP warehouse."}',
    0.87,
    'proposed',
    NULL
);

INSERT INTO agent_actions (
    agent_name,
    action_type,
    entity_type,
    entity_id,
    decision_payload,
    confidence,
    execution_status,
    executed_at
) VALUES (
    'commerce_agent',
    'allocation_review',
    'order',
    1,
    '{"reason":"Signal-linked clinical order has high urgency score and constrained route capacity.","recommended_action":"Escalate allocation review before release."}',
    0.84,
    'completed',
    SYSTIMESTAMP - INTERVAL '1' HOUR
);

COMMIT;
PROMPT AI Agent action audit examples loaded.

@@load_demand_regions.sql
@@load_demand_forecasts.sql

BEGIN
    EXECUTE IMMEDIATE q'[
        MERGE INTO app_dataset_state target
        USING (
            SELECT
                1 AS state_id,
                'demo' AS active_source,
                'Demo Data' AS active_label,
                'v1' AS active_version,
                'lifesciences_bootstrap_v1' AS active_generation
            FROM dual
        ) incoming
        ON (target.state_id = incoming.state_id)
        WHEN MATCHED THEN UPDATE SET
            target.active_source = incoming.active_source,
            target.active_label = incoming.active_label,
            target.active_version = incoming.active_version,
            target.active_generation = incoming.active_generation,
            target.updated_at = SYSTIMESTAMP
        WHEN NOT MATCHED THEN INSERT (
            state_id,
            active_source,
            active_label,
            active_version,
            active_generation,
            updated_at
        ) VALUES (
            incoming.state_id,
            incoming.active_source,
            incoming.active_label,
            incoming.active_version,
            incoming.active_generation,
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

-- The lifecycle migration runs before this seed.  Register the canonical
-- bootstrap dataset as an active generation so evidence remains generation-bound
-- even before an operator performs the first guarded Restore.
BEGIN
    MERGE INTO app_dataset_jobs target
    USING (SELECT 'lifesciences_bootstrap_job_v1' AS job_id, 'lifesciences_bootstrap_v1' AS generation_id FROM dual) incoming
    ON (target.job_id = incoming.job_id)
    WHEN NOT MATCHED THEN INSERT (job_id, generation_id, initiating_actor, operation, status, message)
    VALUES (incoming.job_id, incoming.generation_id, 'admin_jess', 'bootstrap', 'completed', 'Canonical Life Sciences bootstrap generation.');

    MERGE INTO app_dataset_generations target
    USING (SELECT 'lifesciences_bootstrap_v1' AS generation_id, 'lifesciences_bootstrap_job_v1' AS job_id FROM dual) incoming
    ON (target.generation_id = incoming.generation_id)
    WHEN NOT MATCHED THEN INSERT (generation_id, job_id, initiating_actor, prior_generation_id, status, required_features_json)
    VALUES (incoming.generation_id, incoming.job_id, 'admin_jess', NULL, 'active', '{"source":"bootstrap","restoreRequiredForDerivedEvidence":true}');
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

PROMPT Applying life sciences semantic views...
WHENEVER OSERROR EXIT FAILURE
@/workspace/app/db/schema/10_lifesciences_views.sql

PROMPT =====================================================
PROMPT All data loaded successfully!
PROMPT =====================================================
