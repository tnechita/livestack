/*
 * load_developer_ecosystem_graph.sql
 * Deterministic High Tech Product Signal Graph seed scenarios.
 */
SET SERVEROUTPUT ON

DELETE FROM product_signal_case_entities;
DELETE FROM product_signal_cases;
DELETE FROM tech_graph_relationships;
DELETE FROM tech_graph_entities;

INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES
('adv_gpu_maya', 'Maya Chen - GPU Infrastructure Advocate', 'advocate', 96.5, 91.0, 'high', 'West', 'San Jose', 'Product Forum', 8400000, 42, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES
('adv_edge_rafael', 'Rafael Ortiz - Edge Platform Architect', 'advocate', 91.2, 84.0, 'medium', 'South', 'Austin', 'Partner Slack', 5200000, 29, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES
('partner_nebula', 'NebulaWorks Partner Engineering', 'partner', 88.4, 77.0, 'medium', 'East', 'Boston', 'Partner Portal', 3100000, 18, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES
('portfolio_gpu', 'Cloud GPU Burst Portfolio', 'portfolio', 94.0, 93.5, 'critical', 'West', 'Seattle', 'Product Ops', 14600000, 54, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES
('portfolio_zerotrust', 'Zero Trust Access Gateway Portfolio', 'portfolio', 86.0, 81.5, 'high', 'East', 'Raleigh', 'Product Ops', 6900000, 31, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES
('buyer_apex', 'Apex Manufacturing AI Platform Team', 'buyer', 83.0, 89.5, 'high', 'Midwest', 'Detroit', 'Enterprise Buyer Signal', 7800000, 23, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES
('buyer_solara', 'Solara Energy Edge Operations', 'buyer', 79.0, 74.5, 'medium', 'West', 'Phoenix', 'Enterprise Buyer Signal', 4200000, 15, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES
('arch_rag', 'Reference Architecture - RAG Enablement Sprint', 'architecture', 87.0, 76.0, 'medium', 'Global', 'Remote', 'Solution Architecture', 3500000, 19, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES
('blocker_gpu_capacity', 'Launch Blocker - GPU Capacity Surge', 'blocker', 71.0, 96.0, 'critical', 'West', 'Seattle', 'Capacity Signal', 12800000, 37, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES
('center_sjc', 'San Jose Product Availability Center', 'capacity_center', 82.0, 88.0, 'high', 'West', 'San Jose', 'Availability Center', 9600000, 24, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES
('signal_private5g', 'Signal Cluster - Private 5G Factory Rollout', 'signal_cluster', 84.0, 86.5, 'high', 'Midwest', 'Detroit', 'Signal Cluster', 6200000, 28, 1);

INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('adv_npi_lena', 'Lena Park - NPI Product Readiness Lead', 'advocate', 93.0, 90.0, 'high', 'West', 'Santa Clara', 'NPI Control Tower', 9800000, 38, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('adv_quality_omar', 'Omar Singh - Field Quality Analytics Lead', 'advocate', 89.0, 87.0, 'high', 'East', 'Raleigh', 'Quality Analytics', 5700000, 34, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('partner_foundry_alpha', 'AlphaFoundry Capacity Desk', 'partner', 90.5, 88.0, 'high', 'Asia Pacific', 'Hsinchu', 'Foundry Partner', 11800000, 31, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('partner_cm_vector', 'VectorEMS Contract Manufacturing', 'partner', 87.0, 82.5, 'high', 'Asia Pacific', 'Penang', 'Contract Manufacturing', 7600000, 27, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('partner_supplier_kinetic', 'Kinetic Components Supplier Risk Desk', 'partner', 85.0, 91.0, 'critical', 'Global', 'Taipei', 'Supplier Risk', 13200000, 43, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('partner_osat_pacific', 'Pacific OSAT Test and Package Team', 'partner', 82.5, 79.0, 'medium', 'Asia Pacific', 'Osaka', 'OSAT Partner', 5400000, 21, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('portfolio_lithography_ai', 'Lithography Throughput Analyzer Portfolio', 'portfolio', 96.0, 94.5, 'critical', 'West', 'San Jose', 'Fab Operations', 18400000, 62, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('portfolio_edge_controller', 'Connected Edge Controller Portfolio', 'portfolio', 88.5, 85.0, 'high', 'South', 'Austin', 'Connected Products', 8700000, 37, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('portfolio_auto_sensor', 'Automotive Sensor Fusion Portfolio', 'portfolio', 91.0, 89.5, 'high', 'Midwest', 'Detroit', 'Product Lifecycle Management', 11200000, 41, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('portfolio_datacenter_switch', 'Data Center Switch ASIC Portfolio', 'portfolio', 86.5, 83.0, 'medium', 'West', 'Seattle', 'Electronics Manufacturing', 9300000, 33, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('arch_gpu_bom', 'BOM Architecture - GPU Memory Substrate Stack', 'architecture', 88.0, 92.0, 'critical', 'Global', 'Remote', 'Bill of Materials', 12600000, 29, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('arch_litho_eco', 'Engineering Change Order - Lithography Reticle Flow', 'architecture', 86.0, 93.0, 'critical', 'West', 'San Jose', 'Engineering Change Order', 14800000, 36, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('arch_edge_firmware', 'Design-to-Manufacturing Handoff - Edge Firmware', 'architecture', 79.0, 81.0, 'medium', 'South', 'Austin', 'Design Handoff', 6200000, 19, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('arch_sensor_plm', 'PLM Baseline - Automotive Sensor Fusion BOM', 'architecture', 84.0, 87.5, 'high', 'Midwest', 'Detroit', 'Product Lifecycle Management', 9800000, 28, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('arch_switch_dfx', 'DFx Architecture - Data Center Switch ASIC', 'architecture', 80.5, 78.5, 'medium', 'West', 'Seattle', 'Design for Manufacturing', 7300000, 22, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('blocker_abf_substrate', 'Component Shortage - ABF Substrate Allocation', 'blocker', 77.0, 97.0, 'critical', 'Asia Pacific', 'Taipei', 'Component Shortage', 15200000, 48, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('blocker_asic_shortage', 'Supplier Risk - Automotive ASIC Lead Time', 'blocker', 75.0, 92.5, 'critical', 'Global', 'Munich', 'Supplier Risk', 11800000, 39, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('blocker_litho_yield', 'Yield Improvement Blocker - Lithography Drift', 'blocker', 78.0, 95.5, 'critical', 'West', 'Austin', 'Yield Improvement', 16600000, 44, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('blocker_warranty_spike', 'Field Quality Blocker - Warranty Analytics Spike', 'blocker', 74.0, 88.5, 'high', 'East', 'Raleigh', 'Warranty Analytics', 6900000, 32, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('blocker_channel_overhang', 'Channel Inventory Blocker - Switch ASIC Overhang', 'blocker', 69.0, 76.5, 'medium', 'West', 'Seattle', 'Channel Inventory', 5100000, 25, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('blocker_fw_regression', 'Connected Product Blocker - Firmware Regression', 'blocker', 73.0, 84.5, 'high', 'South', 'Austin', 'Connected Products', 6400000, 30, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('center_tsmc_5nm', 'Hsinchu 5nm Foundry Capacity Window', 'capacity_center', 88.0, 91.5, 'critical', 'Asia Pacific', 'Hsinchu', 'Wafer Starts', 15600000, 35, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('center_penang_cm', 'Penang Contract Manufacturing Cell', 'capacity_center', 83.0, 82.0, 'high', 'Asia Pacific', 'Penang', 'Contract Manufacturing', 7900000, 24, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('center_austin_fab', 'Austin Fab Operations Wafer Start Line', 'capacity_center', 91.0, 93.0, 'critical', 'South', 'Austin', 'Fab Operations', 17200000, 40, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('center_guadalajara_cm', 'Guadalajara Electronics Manufacturing Line', 'capacity_center', 78.5, 74.0, 'medium', 'Latin America', 'Guadalajara', 'Electronics Manufacturing', 5600000, 18, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('center_osaka_test', 'Osaka Final Test and Package Center', 'capacity_center', 81.0, 78.0, 'medium', 'Asia Pacific', 'Osaka', 'Final Test', 6100000, 20, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('signal_wafer_starts', 'Signal Cluster - Wafer Starts Below Customer Commitments', 'signal_cluster', 87.5, 94.0, 'critical', 'South', 'Austin', 'Wafer Starts', 16800000, 52, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('signal_field_quality', 'Signal Cluster - Field Quality Escalations', 'signal_cluster', 82.5, 89.0, 'high', 'East', 'Raleigh', 'Field Quality', 7200000, 36, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('signal_channel_inventory', 'Signal Cluster - Channel Inventory Volatility', 'signal_cluster', 76.0, 77.0, 'medium', 'West', 'Seattle', 'Channel Inventory', 5300000, 26, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('signal_supplier_risk', 'Signal Cluster - Component Shortage and Supplier Risk', 'signal_cluster', 90.0, 96.5, 'critical', 'Global', 'Taipei', 'Supplier Risk', 15400000, 57, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('signal_order_promising', 'Signal Cluster - Order Promising Commitments at Risk', 'signal_cluster', 88.5, 92.5, 'critical', 'Global', 'Remote', 'Order Promising', 13900000, 46, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('signal_warranty_claims', 'Signal Cluster - Warranty Analytics Early Warning', 'signal_cluster', 79.5, 86.0, 'high', 'East', 'Raleigh', 'Warranty Analytics', 6600000, 31, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('signal_npi_slip', 'Signal Cluster - New Product Introduction Slip', 'signal_cluster', 84.5, 90.5, 'high', 'West', 'Santa Clara', 'New Product Introduction', 10400000, 34, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('buyer_orion_auto', 'Orion Automotive ADAS Commitment', 'buyer', 86.0, 90.0, 'high', 'Midwest', 'Detroit', 'Customer Commitments', 10400000, 24, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('buyer_nova_cloud', 'NovaCloud AI Server Commitment', 'buyer', 89.0, 91.0, 'critical', 'West', 'Seattle', 'Customer Commitments', 13700000, 28, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('buyer_helio_med', 'HelioMed Connected Device Commitment', 'buyer', 80.0, 84.0, 'high', 'East', 'Boston', 'Customer Commitments', 6300000, 17, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('buyer_quantum_fab', 'QuantumFab Yield Automation Commitment', 'buyer', 92.0, 94.0, 'critical', 'South', 'Austin', 'Customer Commitments', 15100000, 30, 1);

INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('fab_austin_line_7', 'Austin Fab Line 7 Lithography Cell', 'fab', 92.5, 95.0, 'critical', 'South', 'Austin', 'Fab Operations', 17800000, 41, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('fab_hsinchu_line_5', 'Hsinchu Foundry Line 5 Wafer Window', 'fab', 90.0, 91.0, 'critical', 'Asia Pacific', 'Hsinchu', 'Wafer Starts', 16200000, 37, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('wafer_lot_ltx_4408', 'Wafer Lot LTX-4408 Overlay Drift', 'wafer_lot', 86.0, 94.0, 'critical', 'South', 'Austin', 'Wafer Lot Control', 12400000, 31, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('wafer_lot_gpu_2815', 'Wafer Lot GPU-2815 Substrate Hold', 'wafer_lot', 84.5, 91.0, 'high', 'Asia Pacific', 'Hsinchu', 'Wafer Lot Control', 11800000, 28, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('process_litho_overlay', 'Lithography Overlay Process Step', 'process_step', 82.0, 93.5, 'critical', 'South', 'Austin', 'Yield Engineering', 11000000, 24, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('process_probe_test', 'Wafer Probe Test Escape Step', 'process_step', 78.5, 86.5, 'high', 'Asia Pacific', 'Osaka', 'Test Program', 6100000, 18, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('yield_metric_litho_drift', 'Yield Metric - Lithography Drift Delta', 'yield_metric', 83.0, 96.0, 'critical', 'South', 'Austin', 'Yield Engineering', 14300000, 36, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('yield_metric_gpu_escape', 'Yield Metric - GPU Probe Escape Rate', 'yield_metric', 79.5, 88.0, 'high', 'Asia Pacific', 'Hsinchu', 'Yield Engineering', 9300000, 22, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('component_abf_core', 'ABF Substrate Core BOM Component', 'bom_component', 77.0, 97.5, 'critical', 'Asia Pacific', 'Taipei', 'Bill of Materials', 15200000, 44, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('component_hbm_stack', 'HBM3E Memory Stack BOM Component', 'bom_component', 80.0, 90.5, 'high', 'Global', 'Remote', 'Bill of Materials', 12000000, 30, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('supplier_kinetic_abf', 'Kinetic Components ABF Supplier Desk', 'supplier', 84.0, 95.0, 'critical', 'Global', 'Taipei', 'Supplier Risk', 15100000, 40, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('supplier_micron_hbm', 'Micron HBM Allocation Desk', 'supplier', 82.0, 88.0, 'high', 'West', 'Boise', 'Supplier Risk', 10400000, 26, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('supplier_site_taipei', 'Taipei ABF Lamination Site', 'supplier_site', 78.0, 92.0, 'critical', 'Asia Pacific', 'Taipei', 'Supplier Site', 13200000, 29, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('supplier_site_taichung', 'Taichung Substrate Qualification Site', 'supplier_site', 74.0, 84.0, 'high', 'Asia Pacific', 'Taichung', 'Supplier Site', 7600000, 19, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('eco_ltx_reticle', 'ECO-773 Reticle Flow Substitution', 'eco', 85.0, 94.0, 'critical', 'West', 'San Jose', 'Engineering Change', 14800000, 33, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('eco_gpu_substrate_alt', 'ECO-818 Alternate ABF Stack', 'eco', 82.5, 91.5, 'high', 'Global', 'Remote', 'Engineering Change', 11200000, 27, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('npi_milestone_ltx_pvt', 'Lithography Analyzer PVT Exit Gate', 'npi_milestone', 83.5, 90.5, 'high', 'West', 'Santa Clara', 'NPI Control Tower', 9800000, 24, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('npi_milestone_edge_evt', 'Connected Edge Controller EVT Gate', 'npi_milestone', 79.0, 84.0, 'high', 'South', 'Austin', 'NPI Control Tower', 6500000, 18, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('plm_record_gpu_bom_23c', 'PLM Record GPU BOM Baseline 23C', 'plm_record', 80.0, 89.0, 'high', 'Global', 'Remote', 'PLM', 10900000, 21, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('plm_record_sensor_rev', 'PLM Record Sensor Fusion Rev D', 'plm_record', 78.0, 85.0, 'high', 'Midwest', 'Detroit', 'PLM', 8600000, 19, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('osat_site_osaka_line3', 'Osaka OSAT Final Test Line 3', 'osat_site', 81.5, 86.5, 'high', 'Asia Pacific', 'Osaka', 'OSAT', 7100000, 22, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('test_program_adas_burnin', 'ADAS Sensor Burn-In Test Program', 'test_program', 77.0, 86.0, 'high', 'Asia Pacific', 'Osaka', 'Test Program', 6700000, 17, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('contract_mfg_penang_cell12', 'Penang Cell 12 Electronics Manufacturing', 'contract_manufacturer', 80.5, 82.0, 'high', 'Asia Pacific', 'Penang', 'Contract Manufacturing', 7400000, 20, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('channel_inventory_switch_q3', 'Q3 Switch ASIC Channel Inventory Pool', 'channel_inventory', 75.0, 77.5, 'medium', 'West', 'Seattle', 'Channel Inventory', 5300000, 18, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('distributor_arrow_safety', 'Arrow Safety Stock Distributor Allocation', 'distributor', 72.0, 76.0, 'medium', 'West', 'Phoenix', 'Distribution', 4100000, 14, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('warranty_cohort_sensor_early', 'Early-Life Warranty Cohort - ADAS Sensor', 'warranty_cohort', 79.0, 88.5, 'high', 'East', 'Raleigh', 'Warranty Analytics', 6900000, 23, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('field_quality_incident_adas_42', 'Field Quality Incident ADAS-42 Thermal Drift', 'field_quality_incident', 78.0, 89.0, 'high', 'East', 'Raleigh', 'Field Quality', 7200000, 24, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('telemetry_signal_controller_heat', 'Connected Controller Thermal Telemetry Signal', 'telemetry_signal', 76.0, 84.5, 'high', 'South', 'Austin', 'Connected Telemetry', 6100000, 20, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('commitment_novacloud_q3', 'NovaCloud Q3 AI Server Customer Commitment', 'customer_commitment', 88.0, 92.0, 'critical', 'West', 'Seattle', 'Customer Commitments', 13700000, 25, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('order_promise_quantumfab_aug', 'QuantumFab August Order Promise', 'order_promise', 86.0, 93.0, 'critical', 'South', 'Austin', 'Order Promising', 15100000, 28, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('service_case_helio_rma', 'HelioMed RMA Service Case Cluster', 'service_case', 74.0, 83.0, 'high', 'East', 'Boston', 'Service Operations', 5400000, 16, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('firmware_release_edge_7_4', 'Connected Edge Firmware Release 7.4', 'firmware_release', 76.0, 84.0, 'high', 'South', 'Austin', 'Firmware Release', 6200000, 18, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('crb_litho_priority', 'Lithography Priority Change Review Board', 'change_review_board', 81.0, 91.0, 'high', 'West', 'San Jose', 'Change Review Board', 9700000, 21, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('demand_forecast_gpu_q3', 'Q3 GPU Demand Volatility Forecast', 'demand_forecast', 82.0, 90.0, 'high', 'West', 'Seattle', 'Demand Forecast', 12500000, 27, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('allocation_plan_abf_recovery', 'ABF Recovery Allocation Plan', 'allocation_plan', 82.5, 92.5, 'critical', 'Global', 'Remote', 'Allocation Planning', 14400000, 30, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('capacity_reservation_hsinchu_wk32', 'Hsinchu Week 32 Capacity Reservation', 'capacity_reservation', 84.0, 91.0, 'critical', 'Asia Pacific', 'Hsinchu', 'Capacity Reservation', 13200000, 24, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('design_ip_serdes_112g', '112G SerDes Design IP Qualification', 'design_ip', 75.0, 80.0, 'medium', 'West', 'San Jose', 'Design IP', 5800000, 13, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('substrate_material_abf', 'ABF Material Family Qualification', 'substrate_material', 78.0, 90.5, 'high', 'Asia Pacific', 'Taipei', 'Substrate Material', 9600000, 20, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('manufacturing_route_ltx_recovery', 'Lithography Recovery Manufacturing Route', 'manufacturing_route', 80.0, 88.0, 'high', 'South', 'Austin', 'Manufacturing Route', 9300000, 19, 1);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('quality_gate_automotive_ppap', 'Automotive PPAP Quality Gate', 'quality_gate', 77.0, 85.0, 'high', 'Midwest', 'Detroit', 'Quality Gate', 7600000, 17, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('support_operation_warranty_triage', 'Warranty Triage Support Operation', 'support_operation', 74.0, 82.0, 'high', 'East', 'Raleigh', 'Support Operations', 5200000, 15, 0);
INSERT INTO tech_graph_entities (entity_key, display_name, entity_type, influence_score, urgency_score, risk_level, region, city, channel, product_value, signal_count, is_priority) VALUES ('lifecycle_stage_pvt_to_mp', 'PVT to Mass Production Lifecycle Stage', 'lifecycle_stage', 78.0, 87.0, 'high', 'Global', 'Remote', 'Lifecycle Stage', 8800000, 18, 1);

INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'advocates_for', 0.94, 18, 8400000, 'Product forum threads amplify GPU burst reservation demand.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'adv_gpu_maya' AND dst.entity_key = 'portfolio_gpu';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'influences_buyer', 0.82, 13, 5600000, 'Advocate guidance influenced Apex AI platform capacity planning.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'adv_gpu_maya' AND dst.entity_key = 'buyer_apex';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'blocks_launch', 0.91, 21, 12800000, 'Capacity surge delays launch-readiness for GPU reservation packages.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'blocker_gpu_capacity' AND dst.entity_key = 'portfolio_gpu';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'routes_to_capacity_center', 0.79, 14, 7200000, 'San Jose center is the primary mitigation path for GPU allocation.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'portfolio_gpu' AND dst.entity_key = 'center_sjc';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'depends_on_architecture', 0.68, 11, 2700000, 'Zero trust pilots depend on governed RAG enablement assets.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'portfolio_zerotrust' AND dst.entity_key = 'arch_rag';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'partners_with', 0.73, 8, 1900000, 'NebulaWorks supports edge rollout content and partner validation.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'partner_nebula' AND dst.entity_key = 'adv_edge_rafael';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'amplifies_signal', 0.86, 16, 6200000, 'Private 5G factory rollout demand is amplified through partner engineering.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_private5g' AND dst.entity_key = 'partner_nebula';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'influences_buyer', 0.76, 9, 3400000, 'Edge architecture conversations increased Solara interest in availability routing.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'adv_edge_rafael' AND dst.entity_key = 'buyer_solara';

INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'depends_on_architecture', 0.90, 17, 9100000, 'GPU product commitments depend on the high bandwidth memory BOM stack.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'adv_gpu_maya' AND dst.entity_key = 'arch_gpu_bom';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'blocks_launch', 0.96, 29, 15200000, 'ABF substrate allocation is blocking GPU NPI readiness.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'arch_gpu_bom' AND dst.entity_key = 'blocker_abf_substrate';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'partners_with', 0.87, 18, 13200000, 'Supplier risk desk owns substrate recovery plan.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'blocker_abf_substrate' AND dst.entity_key = 'partner_supplier_kinetic';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'routes_to_capacity_center', 0.84, 16, 12600000, 'Kinetic supplier allocations route through the Hsinchu 5nm wafer start window.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'partner_supplier_kinetic' AND dst.entity_key = 'center_tsmc_5nm';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'influences_buyer', 0.81, 12, 13700000, 'Foundry wafer starts drive the NovaCloud AI server delivery promise.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'center_tsmc_5nm' AND dst.entity_key = 'buyer_nova_cloud';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'depends_on_architecture', 0.89, 20, 12600000, 'Cloud GPU Burst Portfolio is gated by the memory substrate BOM.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'portfolio_gpu' AND dst.entity_key = 'arch_gpu_bom';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'routes_to_capacity_center', 0.86, 18, 11700000, 'GPU capacity blocker routes to San Jose availability planning.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'blocker_gpu_capacity' AND dst.entity_key = 'center_sjc';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'influences_buyer', 0.79, 11, 9800000, 'San Jose availability center shapes NovaCloud customer commitments.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'center_sjc' AND dst.entity_key = 'buyer_nova_cloud';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'influences_buyer', 0.91, 24, 12800000, 'Order promising signal flags Apex commitment risk.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_order_promising' AND dst.entity_key = 'buyer_apex';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'amplifies_signal', 0.94, 33, 14600000, 'Supplier risk signal amplifies ABF substrate blocker severity.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_supplier_risk' AND dst.entity_key = 'blocker_abf_substrate';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'partners_with', 0.86, 22, 13200000, 'Supplier risk signal is triaged with Kinetic Components.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_supplier_risk' AND dst.entity_key = 'partner_supplier_kinetic';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'advocates_for', 0.95, 26, 18400000, 'NPI readiness lead is driving Lithography Throughput Analyzer launch decisions.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'adv_npi_lena' AND dst.entity_key = 'portfolio_lithography_ai';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'depends_on_architecture', 0.93, 29, 14800000, 'Lithography portfolio depends on the reticle-flow engineering change order.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'portfolio_lithography_ai' AND dst.entity_key = 'arch_litho_eco';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'blocks_launch', 0.95, 31, 16600000, 'Engineering change order is tied to wafer-start yield drift.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'arch_litho_eco' AND dst.entity_key = 'blocker_litho_yield';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'mentions_product', 0.88, 34, 16800000, 'Wafer starts are below customer commitments for Lithography Throughput Analyzer.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_wafer_starts' AND dst.entity_key = 'portfolio_lithography_ai';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'amplifies_signal', 0.90, 27, 15800000, 'Wafer-start shortfall amplifies the lithography yield blocker.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_wafer_starts' AND dst.entity_key = 'blocker_litho_yield';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'routes_to_capacity_center', 0.92, 25, 16400000, 'Yield blocker routes to Austin fab operations for wafer-start recovery.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'blocker_litho_yield' AND dst.entity_key = 'center_austin_fab';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'influences_buyer', 0.89, 20, 15100000, 'Austin fab recovery controls QuantumFab customer commitment confidence.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'center_austin_fab' AND dst.entity_key = 'buyer_quantum_fab';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'partners_with', 0.88, 18, 11800000, 'AlphaFoundry coordinates capacity scenarios with Austin fab operations.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'partner_foundry_alpha' AND dst.entity_key = 'center_austin_fab';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'mitigates_blocker', 0.82, 15, 9200000, 'Foundry partner action reduces Lithography Throughput Analyzer launch exposure.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'partner_foundry_alpha' AND dst.entity_key = 'portfolio_lithography_ai';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'influences_buyer', 0.90, 19, 15100000, 'Order promising signal changes QuantumFab delivery date confidence.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_order_promising' AND dst.entity_key = 'buyer_quantum_fab';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'influences_buyer', 0.87, 17, 15100000, 'Lithography portfolio demand drives QuantumFab commitment risk.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'portfolio_lithography_ai' AND dst.entity_key = 'buyer_quantum_fab';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'advocates_for', 0.83, 14, 8700000, 'Edge architecture signal supports the Connected Edge Controller portfolio.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'adv_edge_rafael' AND dst.entity_key = 'portfolio_edge_controller';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'depends_on_architecture', 0.79, 13, 6200000, 'Connected Edge Controller depends on firmware design handoff readiness.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'portfolio_edge_controller' AND dst.entity_key = 'arch_edge_firmware';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'blocks_launch', 0.84, 17, 6400000, 'Firmware regression blocks connected product NPI validation.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'arch_edge_firmware' AND dst.entity_key = 'blocker_fw_regression';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'amplifies_signal', 0.82, 21, 6100000, 'Field quality escalations amplify firmware regression risk.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_field_quality' AND dst.entity_key = 'blocker_fw_regression';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'routes_to_capacity_center', 0.77, 12, 5900000, 'Firmware recovery is routed through Penang contract manufacturing.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'blocker_fw_regression' AND dst.entity_key = 'center_penang_cm';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'influences_buyer', 0.81, 13, 8700000, 'Penang contract manufacturing capacity drives Orion delivery confidence.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'center_penang_cm' AND dst.entity_key = 'buyer_orion_auto';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'partners_with', 0.80, 15, 7600000, 'VectorEMS owns connected controller manufacturing recovery.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'partner_cm_vector' AND dst.entity_key = 'center_penang_cm';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'mitigates_blocker', 0.76, 11, 6100000, 'VectorEMS mitigation reduces connected controller launch blocker.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'partner_cm_vector' AND dst.entity_key = 'portfolio_edge_controller';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'mentions_product', 0.79, 18, 8700000, 'NPI slip signal references the connected product launch package.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_npi_slip' AND dst.entity_key = 'portfolio_edge_controller';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'influences_buyer', 0.75, 9, 7700000, 'NPI slip creates customer-commitment concern for Orion Automotive.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_npi_slip' AND dst.entity_key = 'buyer_orion_auto';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'depends_on_architecture', 0.85, 18, 9800000, 'Automotive sensor portfolio depends on PLM-controlled BOM baseline.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'portfolio_auto_sensor' AND dst.entity_key = 'arch_sensor_plm';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'blocks_launch', 0.91, 23, 11800000, 'PLM baseline exposes automotive ASIC lead-time supplier risk.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'arch_sensor_plm' AND dst.entity_key = 'blocker_asic_shortage';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'partners_with', 0.78, 12, 5400000, 'Pacific OSAT coordinates test capacity for constrained automotive ASICs.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'blocker_asic_shortage' AND dst.entity_key = 'partner_osat_pacific';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'routes_to_capacity_center', 0.73, 10, 5100000, 'OSAT partner routes final test through Osaka package center.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'partner_osat_pacific' AND dst.entity_key = 'center_osaka_test';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'influences_buyer', 0.83, 15, 10400000, 'Osaka final test output drives Orion automotive customer commitments.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'center_osaka_test' AND dst.entity_key = 'buyer_orion_auto';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'amplifies_signal', 0.86, 21, 6600000, 'Warranty analytics spike amplifies field quality blocker.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_warranty_claims' AND dst.entity_key = 'blocker_warranty_spike';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'blocks_launch', 0.79, 16, 6900000, 'Warranty analytics spike is blocking automotive sensor expansion.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'blocker_warranty_spike' AND dst.entity_key = 'portfolio_auto_sensor';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'influences_buyer', 0.84, 18, 10400000, 'Automotive sensor portfolio exposure affects Orion ADAS commitment.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'portfolio_auto_sensor' AND dst.entity_key = 'buyer_orion_auto';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'amplifies_signal', 0.82, 20, 7200000, 'Quality analytics lead amplifies field quality signal for service and support operations.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'adv_quality_omar' AND dst.entity_key = 'signal_field_quality';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'advocates_for', 0.80, 14, 9800000, 'Quality analytics lead advocates warranty containment for Automotive Sensor Fusion.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'adv_quality_omar' AND dst.entity_key = 'portfolio_auto_sensor';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'influences_buyer', 0.76, 9, 6300000, 'Field quality signal affects HelioMed connected-device commitment risk.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_field_quality' AND dst.entity_key = 'buyer_helio_med';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'depends_on_architecture', 0.77, 13, 7300000, 'Data Center Switch ASIC portfolio depends on DFx architecture readiness.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'portfolio_datacenter_switch' AND dst.entity_key = 'arch_switch_dfx';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'blocks_launch', 0.74, 12, 5100000, 'DFx workstream is constrained by channel inventory overhang.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'arch_switch_dfx' AND dst.entity_key = 'blocker_channel_overhang';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'amplifies_signal', 0.78, 19, 5300000, 'Channel inventory volatility amplifies switch ASIC overhang.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_channel_inventory' AND dst.entity_key = 'blocker_channel_overhang';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'blocks_launch', 0.72, 11, 5100000, 'Switch ASIC channel overhang blocks production ramp decisions.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'blocker_channel_overhang' AND dst.entity_key = 'portfolio_datacenter_switch';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'routes_to_capacity_center', 0.69, 8, 5600000, 'Data center switch portfolio routes electronics manufacturing to Guadalajara.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'portfolio_datacenter_switch' AND dst.entity_key = 'center_guadalajara_cm';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'influences_buyer', 0.74, 10, 9300000, 'Guadalajara electronics manufacturing capacity influences NovaCloud commitments.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'center_guadalajara_cm' AND dst.entity_key = 'buyer_nova_cloud';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'advocates_for', 0.70, 9, 7300000, 'NebulaWorks supports Data Center Switch ASIC partner engineering.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'partner_nebula' AND dst.entity_key = 'portfolio_datacenter_switch';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'partners_with', 0.72, 8, 5400000, 'NebulaWorks validates DFx architecture readiness.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'partner_nebula' AND dst.entity_key = 'arch_switch_dfx';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'mentions_product', 0.77, 13, 6200000, 'Private 5G factory rollout signal references Connected Edge Controller demand.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_private5g' AND dst.entity_key = 'portfolio_edge_controller';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'routes_to_capacity_center', 0.71, 8, 5200000, 'Private 5G factory rollout routes manufacturing to Penang.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_private5g' AND dst.entity_key = 'center_penang_cm';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'depends_on_architecture', 0.73, 9, 4400000, 'Zero Trust portfolio shares connected product firmware handoff risks.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'portfolio_zerotrust' AND dst.entity_key = 'arch_edge_firmware';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'blocks_launch', 0.68, 7, 3900000, 'RAG enablement architecture exposes connected product firmware regression.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'arch_rag' AND dst.entity_key = 'blocker_fw_regression';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'influences_buyer', 0.69, 7, 4200000, 'Channel inventory signal changes Solara product availability expectations.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_channel_inventory' AND dst.entity_key = 'buyer_solara';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'partners_with', 0.75, 9, 6900000, 'San Jose availability center coordinates foundry capacity scenarios.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'center_sjc' AND dst.entity_key = 'center_tsmc_5nm';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'partners_with', 0.67, 6, 5100000, 'Hsinchu foundry capacity coordinates with Osaka final test.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'center_tsmc_5nm' AND dst.entity_key = 'center_osaka_test';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'partners_with', 0.66, 6, 4700000, 'Osaka final test coordinates with Penang contract manufacturing.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'center_osaka_test' AND dst.entity_key = 'center_penang_cm';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'partners_with', 0.64, 5, 4300000, 'Penang manufacturing coordinates overflow with Guadalajara electronics manufacturing.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'center_penang_cm' AND dst.entity_key = 'center_guadalajara_cm';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'amplifies_signal', 0.89, 22, 12400000, 'Order promising commitments amplify GPU capacity surge blocker.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_order_promising' AND dst.entity_key = 'blocker_gpu_capacity';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'blocks_launch', 0.88, 17, 12800000, 'GPU capacity blocker directly threatens Apex platform customer commitments.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'blocker_gpu_capacity' AND dst.entity_key = 'buyer_apex';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'mentions_product', 0.86, 18, 14600000, 'Supplier risk signal mentions GPU product portfolio exposure.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_supplier_risk' AND dst.entity_key = 'portfolio_gpu';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'mitigates_blocker', 0.80, 14, 9500000, 'Kinetic supplier recovery mitigates ABF substrate allocation risk.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'partner_supplier_kinetic' AND dst.entity_key = 'blocker_abf_substrate';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'mitigates_blocker', 0.79, 13, 8400000, 'AlphaFoundry capacity action mitigates lithography yield drift.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'partner_foundry_alpha' AND dst.entity_key = 'blocker_litho_yield';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'mitigates_blocker', 0.76, 10, 5300000, 'VectorEMS recovery mitigates firmware regression.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'partner_cm_vector' AND dst.entity_key = 'blocker_fw_regression';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'mitigates_blocker', 0.74, 8, 4600000, 'Pacific OSAT adds final-test mitigation for automotive ASIC shortage.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'partner_osat_pacific' AND dst.entity_key = 'blocker_asic_shortage';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'partners_with', 0.68, 7, 6100000, 'Austin fab shares wafer start recovery planning with Hsinchu foundry capacity.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'center_austin_fab' AND dst.entity_key = 'center_tsmc_5nm';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'influences_buyer', 0.72, 8, 6000000, 'Warranty signal changes Orion support and service commitment exposure.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_warranty_claims' AND dst.entity_key = 'buyer_orion_auto';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'amplifies_signal', 0.78, 11, 7800000, 'NPI slip amplifies lithography yield recovery urgency.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_npi_slip' AND dst.entity_key = 'blocker_litho_yield';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'depends_on_architecture', 0.70, 8, 5100000, 'Sensor PLM baseline informs warranty analytics interpretation.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'arch_sensor_plm' AND dst.entity_key = 'signal_warranty_claims';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'routes_to_capacity_center', 0.71, 9, 5800000, 'Automotive sensor portfolio routes final test through Osaka.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'portfolio_auto_sensor' AND dst.entity_key = 'center_osaka_test';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'routes_to_capacity_center', 0.74, 12, 6500000, 'Connected Edge Controller routes manufacturing to Penang.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'portfolio_edge_controller' AND dst.entity_key = 'center_penang_cm';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'routes_to_capacity_center', 0.82, 14, 11600000, 'Cloud GPU Burst Portfolio routes wafer starts to Hsinchu.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'portfolio_gpu' AND dst.entity_key = 'center_tsmc_5nm';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'mentions_product', 0.84, 16, 14800000, 'Order promising signal references Lithography Throughput Analyzer commitments.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_order_promising' AND dst.entity_key = 'portfolio_lithography_ai';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'mentions_product', 0.73, 10, 5300000, 'Channel inventory signal references Data Center Switch ASIC portfolio.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_channel_inventory' AND dst.entity_key = 'portfolio_datacenter_switch';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'mentions_product', 0.80, 13, 7200000, 'Field quality signal references Automotive Sensor Fusion portfolio.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_field_quality' AND dst.entity_key = 'portfolio_auto_sensor';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'mentions_product', 0.77, 12, 6600000, 'Warranty analytics signal references Automotive Sensor Fusion portfolio.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_warranty_claims' AND dst.entity_key = 'portfolio_auto_sensor';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'mentions_product', 0.88, 20, 14600000, 'Supplier risk signal references Lithography Throughput Analyzer commitments.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_supplier_risk' AND dst.entity_key = 'portfolio_lithography_ai';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'blocks_launch', 0.92, 24, 14600000, 'ABF substrate shortage blocks GPU portfolio customer commitments.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'blocker_abf_substrate' AND dst.entity_key = 'portfolio_gpu';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'blocks_launch', 0.91, 22, 14800000, 'ABF substrate shortage also blocks Lithography Throughput Analyzer NPI allocation.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'blocker_abf_substrate' AND dst.entity_key = 'portfolio_lithography_ai';

INSERT INTO product_signal_cases (case_ref, case_type, status, urgency_score, product_value_at_risk, signal_count, executive_summary) VALUES
('SIG-GPU-2026-001', 'GPU capacity surge', 'investigating', 96.0, 12800000, 37, 'Product advocate and enterprise buyer demand for Cloud GPU Burst Reservation exceeds West region capacity.');
INSERT INTO product_signal_cases (case_ref, case_type, status, urgency_score, product_value_at_risk, signal_count, executive_summary) VALUES
('SIG-5G-2026-014', 'Private 5G factory rollout', 'mitigating', 86.5, 6200000, 28, 'Private 5G factory demand is rising through partner engineering and Midwest buyer accounts.');
INSERT INTO product_signal_cases (case_ref, case_type, status, urgency_score, product_value_at_risk, signal_count, executive_summary) VALUES
('SIG-ZT-2026-022', 'Zero trust gateway pilot', 'watching', 81.5, 6900000, 31, 'Zero Trust Access Gateway pilots need reference architecture alignment before launch expansion.');

INSERT INTO product_signal_cases (case_ref, case_type, status, urgency_score, product_value_at_risk, signal_count, executive_summary) VALUES ('SIG-LITHO-2026-031', 'Wafer starts below customer commitments', 'investigating', 94.0, 16800000, 52, 'Austin fab operations show wafer starts below QuantumFab customer commitments for Lithography Throughput Analyzer.');
INSERT INTO product_signal_cases (case_ref, case_type, status, urgency_score, product_value_at_risk, signal_count, executive_summary) VALUES ('SIG-BOM-2026-044', 'BOM and engineering change order collision', 'investigating', 93.0, 14800000, 36, 'A bill of materials update and engineering change order collision is delaying design-to-manufacturing handoff.');
INSERT INTO product_signal_cases (case_ref, case_type, status, urgency_score, product_value_at_risk, signal_count, executive_summary) VALUES ('SIG-SUP-2026-057', 'Component shortage supplier risk', 'mitigating', 96.5, 15400000, 57, 'Component shortage and supplier risk could block new product introduction unless allocation shifts to qualified partners.');
INSERT INTO product_signal_cases (case_ref, case_type, status, urgency_score, product_value_at_risk, signal_count, executive_summary) VALUES ('SIG-FQ-2026-063', 'Field quality and warranty analytics risk', 'mitigating', 89.0, 7200000, 36, 'Field quality escalations and warranty analytics indicate support operations exposure on connected products.');
INSERT INTO product_signal_cases (case_ref, case_type, status, urgency_score, product_value_at_risk, signal_count, executive_summary) VALUES ('SIG-OP-2026-078', 'Order promising capacity exposure', 'investigating', 92.5, 13900000, 46, 'Order promising dates are at risk because fab capacity and contract manufacturing commitments diverged from demand volatility.');
INSERT INTO product_signal_cases (case_ref, case_type, status, urgency_score, product_value_at_risk, signal_count, executive_summary) VALUES ('SIG-CHAN-2026-088', 'Channel inventory volatility', 'watching', 77.0, 5300000, 26, 'Channel inventory volatility is masking demand for Data Center Switch ASIC and creating customer commitment uncertainty.');
INSERT INTO product_signal_cases (case_ref, case_type, status, urgency_score, product_value_at_risk, signal_count, executive_summary) VALUES ('SIG-NPI-2026-091', 'New product introduction slip', 'investigating', 90.5, 10400000, 34, 'New product introduction readiness slipped because firmware, BOM, and manufacturing handoff signals are not aligned.');

INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'source_signal', 96, 'Capacity surge signal cluster opened the product case.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-GPU-2026-001' AND e.entity_key = 'blocker_gpu_capacity';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'impacted_product', 94, 'Cloud GPU Burst Portfolio is the impacted product family.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-GPU-2026-001' AND e.entity_key = 'portfolio_gpu';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'developer_advocate', 88, 'Advocate activity raised urgency score.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-GPU-2026-001' AND e.entity_key = 'adv_gpu_maya';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'buyer_account', 84, 'Enterprise buyer account anchors the use case.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-5G-2026-014' AND e.entity_key = 'buyer_apex';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'mitigation_path', 79, 'Reference architecture reduces pilot friction.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-ZT-2026-022' AND e.entity_key = 'arch_rag';

INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'source_signal', 95, 'Wafer-start signal opened the fab operations case.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-LITHO-2026-031' AND e.entity_key = 'signal_wafer_starts';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'impacted_product', 94, 'Lithography portfolio carries the highest commitment value at risk.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-LITHO-2026-031' AND e.entity_key = 'portfolio_lithography_ai';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'capacity_owner', 93, 'Austin fab owns wafer-start recovery.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-LITHO-2026-031' AND e.entity_key = 'center_austin_fab';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'buyer_account', 91, 'QuantumFab commitment is affected by the wafer-start gap.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-LITHO-2026-031' AND e.entity_key = 'buyer_quantum_fab';

INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'source_signal', 94, 'Engineering change order drives the BOM case.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-BOM-2026-044' AND e.entity_key = 'arch_litho_eco';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'impacted_product', 92, 'Product lifecycle exposure is tied to Lithography Throughput Analyzer.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-BOM-2026-044' AND e.entity_key = 'portfolio_lithography_ai';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'launch_blocker', 90, 'Yield drift blocks the ECO handoff.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-BOM-2026-044' AND e.entity_key = 'blocker_litho_yield';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'mitigation_path', 84, 'NPI readiness lead can coordinate ECO recovery.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-BOM-2026-044' AND e.entity_key = 'adv_npi_lena';

INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'source_signal', 97, 'Supplier risk signal opened the component shortage case.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-SUP-2026-057' AND e.entity_key = 'signal_supplier_risk';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'launch_blocker', 96, 'ABF substrate allocation is the launch blocker.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-SUP-2026-057' AND e.entity_key = 'blocker_abf_substrate';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'mitigation_path', 90, 'Kinetic Components owns supplier-risk mitigation.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-SUP-2026-057' AND e.entity_key = 'partner_supplier_kinetic';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'capacity_owner', 88, 'Hsinchu foundry window is the constrained capacity path.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-SUP-2026-057' AND e.entity_key = 'center_tsmc_5nm';

INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'source_signal', 90, 'Field quality signal opened the warranty analytics case.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-FQ-2026-063' AND e.entity_key = 'signal_field_quality';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'launch_blocker', 88, 'Warranty spike is the active blocker.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-FQ-2026-063' AND e.entity_key = 'blocker_warranty_spike';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'impacted_product', 86, 'Automotive Sensor Fusion is the product family at risk.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-FQ-2026-063' AND e.entity_key = 'portfolio_auto_sensor';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'buyer_account', 82, 'HelioMed service operations need warranty containment.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-FQ-2026-063' AND e.entity_key = 'buyer_helio_med';

INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'source_signal', 93, 'Order promising risk opened the capacity case.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-OP-2026-078' AND e.entity_key = 'signal_order_promising';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'capacity_owner', 91, 'San Jose availability center owns allocation review.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-OP-2026-078' AND e.entity_key = 'center_sjc';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'capacity_owner', 89, 'Hsinchu foundry capacity is part of the mitigation path.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-OP-2026-078' AND e.entity_key = 'center_tsmc_5nm';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'buyer_account', 88, 'NovaCloud delivery commitment is exposed.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-OP-2026-078' AND e.entity_key = 'buyer_nova_cloud';

INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'source_signal', 79, 'Channel inventory signal opened the overhang case.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-CHAN-2026-088' AND e.entity_key = 'signal_channel_inventory';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'impacted_product', 77, 'Data Center Switch ASIC has channel inventory exposure.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-CHAN-2026-088' AND e.entity_key = 'portfolio_datacenter_switch';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'launch_blocker', 75, 'Channel overhang blocks production ramp decisions.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-CHAN-2026-088' AND e.entity_key = 'blocker_channel_overhang';

INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'source_signal', 91, 'NPI slip signal opened the launch readiness case.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-NPI-2026-091' AND e.entity_key = 'signal_npi_slip';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'impacted_product', 89, 'Connected Edge Controller is the slipped NPI product.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-NPI-2026-091' AND e.entity_key = 'portfolio_edge_controller';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'launch_blocker', 86, 'Firmware regression blocks release readiness.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-NPI-2026-091' AND e.entity_key = 'blocker_fw_regression';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'mitigation_path', 82, 'VectorEMS and Penang manufacturing can mitigate NPI handoff risk.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-NPI-2026-091' AND e.entity_key = 'partner_cm_vector';

INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'consumes_wafer_starts', 0.94, 24, 16800000, 'Lithography portfolio consumes Austin Fab Line 7 wafer starts for QuantumFab commitments.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'portfolio_lithography_ai' AND dst.entity_key = 'fab_austin_line_7';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'manufactured_at', 0.92, 20, 12400000, 'Wafer Lot LTX-4408 is manufactured through Austin Fab Line 7.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'wafer_lot_ltx_4408' AND dst.entity_key = 'fab_austin_line_7';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'impacts_yield', 0.95, 29, 14300000, 'Overlay drift process telemetry is driving the lithography yield metric.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'process_litho_overlay' AND dst.entity_key = 'yield_metric_litho_drift';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'constrained_by', 0.93, 27, 12400000, 'Wafer lot release is constrained by lithography overlay drift.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'wafer_lot_ltx_4408' AND dst.entity_key = 'process_litho_overlay';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'requires_component', 0.90, 22, 15200000, 'Cloud GPU Burst Portfolio requires ABF substrate core supply.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'portfolio_gpu' AND dst.entity_key = 'component_abf_core';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'requires_component', 0.88, 18, 12000000, 'Cloud GPU Burst Portfolio requires HBM3E memory stack allocation.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'portfolio_gpu' AND dst.entity_key = 'component_hbm_stack';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'supplied_by', 0.96, 31, 15100000, 'ABF substrate core component is supplied by Kinetic Components.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'component_abf_core' AND dst.entity_key = 'supplier_kinetic_abf';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'supplied_by', 0.84, 18, 10400000, 'HBM3E memory stack allocation is supplied by Micron HBM desk.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'component_hbm_stack' AND dst.entity_key = 'supplier_micron_hbm';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'manufactured_at', 0.91, 24, 13200000, 'Kinetic ABF recovery depends on Taipei lamination site output.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'supplier_kinetic_abf' AND dst.entity_key = 'supplier_site_taipei';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'qualified_by_test_program', 0.76, 12, 7600000, 'Taichung substrate qualification site uses ADAS burn-in style qualification controls.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'supplier_site_taichung' AND dst.entity_key = 'test_program_adas_burnin';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'changes_bom', 0.91, 21, 11200000, 'Alternate ABF stack ECO changes the GPU BOM baseline.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'eco_gpu_substrate_alt' AND dst.entity_key = 'plm_record_gpu_bom_23c';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'changes_bom', 0.93, 25, 14800000, 'Reticle flow ECO changes the lithography analyzer manufacturing route.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'eco_ltx_reticle' AND dst.entity_key = 'manufacturing_route_ltx_recovery';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'delays_npi', 0.90, 19, 9800000, 'Reticle flow ECO delays the lithography PVT exit gate.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'eco_ltx_reticle' AND dst.entity_key = 'npi_milestone_ltx_pvt';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'delays_npi', 0.82, 15, 6500000, 'Firmware release validation delays Connected Edge Controller EVT.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'firmware_release_edge_7_4' AND dst.entity_key = 'npi_milestone_edge_evt';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'governed_by_plm_record', 0.88, 18, 10900000, 'GPU BOM architecture is governed by PLM baseline 23C.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'arch_gpu_bom' AND dst.entity_key = 'plm_record_gpu_bom_23c';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'governed_by_plm_record', 0.84, 16, 8600000, 'Sensor PLM baseline governs automotive sensor revision D.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'arch_sensor_plm' AND dst.entity_key = 'plm_record_sensor_rev';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'requires_osat_capacity', 0.86, 18, 7100000, 'Automotive sensor fusion requires Osaka OSAT final test capacity.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'portfolio_auto_sensor' AND dst.entity_key = 'osat_site_osaka_line3';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'tested_by', 0.85, 14, 6700000, 'ADAS sensor program is tested by the burn-in test program.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'portfolio_auto_sensor' AND dst.entity_key = 'test_program_adas_burnin';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'manufactured_at', 0.83, 16, 7400000, 'Connected Edge Controller is manufactured at Penang Cell 12.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'portfolio_edge_controller' AND dst.entity_key = 'contract_mfg_penang_cell12';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'reallocated_to_channel', 0.78, 13, 5300000, 'Switch ASIC channel inventory can be reallocated to the Q3 channel pool.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'portfolio_datacenter_switch' AND dst.entity_key = 'channel_inventory_switch_q3';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'splits_channel_supply', 0.74, 11, 4100000, 'Distributor safety stock splits channel supply for Switch ASIC recovery.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'channel_inventory_switch_q3' AND dst.entity_key = 'distributor_arrow_safety';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'correlates_with_field_quality', 0.89, 22, 7200000, 'ADAS thermal drift incident correlates with field quality escalation.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'field_quality_incident_adas_42' AND dst.entity_key = 'signal_field_quality';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'triggers_warranty_exposure', 0.87, 19, 6900000, 'ADAS thermal drift triggers early-life warranty cohort exposure.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'field_quality_incident_adas_42' AND dst.entity_key = 'warranty_cohort_sensor_early';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'monitored_by_telemetry', 0.81, 17, 6100000, 'Firmware regression is monitored by connected controller thermal telemetry.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'blocker_fw_regression' AND dst.entity_key = 'telemetry_signal_controller_heat';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'blocks_commitment', 0.92, 21, 13700000, 'ABF substrate shortage blocks NovaCloud Q3 AI Server customer commitment.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'blocker_abf_substrate' AND dst.entity_key = 'commitment_novacloud_q3';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'blocks_commitment', 0.90, 20, 15100000, 'Lithography yield drift blocks QuantumFab August order promise.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'blocker_litho_yield' AND dst.entity_key = 'order_promise_quantumfab_aug';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'feeds_order_promise', 0.91, 19, 15100000, 'QuantumFab order promise is fed by fab and ECO recovery signals.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'order_promise_quantumfab_aug' AND dst.entity_key = 'buyer_quantum_fab';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'creates_order_risk', 0.88, 18, 13700000, 'Demand volatility forecast creates order risk for NovaCloud Q3 commitment.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'demand_forecast_gpu_q3' AND dst.entity_key = 'commitment_novacloud_q3';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'drives_demand_forecast', 0.86, 22, 12500000, 'GPU capacity signal drives the Q3 demand volatility forecast.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_order_promising' AND dst.entity_key = 'demand_forecast_gpu_q3';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'updates_allocation_plan', 0.91, 24, 14400000, 'Supplier risk updates the ABF recovery allocation plan.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'signal_supplier_risk' AND dst.entity_key = 'allocation_plan_abf_recovery';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'backed_by_capacity_reservation', 0.88, 19, 13200000, 'ABF recovery allocation is backed by Hsinchu week 32 capacity reservation.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'allocation_plan_abf_recovery' AND dst.entity_key = 'capacity_reservation_hsinchu_wk32';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'mitigated_by_eco', 0.84, 17, 11200000, 'Alternate ABF stack ECO mitigates substrate shortage exposure.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'blocker_abf_substrate' AND dst.entity_key = 'eco_gpu_substrate_alt';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'reviewed_by_crb', 0.82, 16, 9700000, 'Reticle flow ECO is reviewed by the Lithography Priority CRB.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'eco_ltx_reticle' AND dst.entity_key = 'crb_litho_priority';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'shares_design_ip', 0.75, 10, 5800000, 'Data Center Switch ASIC shares 112G SerDes design IP qualification.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'portfolio_datacenter_switch' AND dst.entity_key = 'design_ip_serdes_112g';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'routed_through_logistics', 0.69, 9, 4100000, 'Distributor safety stock routes urgent channel shipments through safety allocation.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'distributor_arrow_safety' AND dst.entity_key = 'buyer_solara';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'certified_by', 0.79, 12, 7600000, 'Automotive sensor release is certified by PPAP quality gate.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'portfolio_auto_sensor' AND dst.entity_key = 'quality_gate_automotive_ppap';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'passes_quality_gate', 0.78, 11, 6700000, 'ADAS burn-in test program must pass the automotive PPAP quality gate.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'test_program_adas_burnin' AND dst.entity_key = 'quality_gate_automotive_ppap';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'escalates_service_case', 0.82, 14, 5400000, 'Warranty analytics spike escalates HelioMed RMA service case cluster.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'warranty_cohort_sensor_early' AND dst.entity_key = 'service_case_helio_rma';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'escalates_service_case', 0.80, 12, 5200000, 'HelioMed RMA cluster escalates to warranty triage support operations.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'service_case_helio_rma' AND dst.entity_key = 'support_operation_warranty_triage';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'releases_firmware_to', 0.77, 13, 6200000, 'Connected Edge Firmware 7.4 releases to the edge controller portfolio.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'firmware_release_edge_7_4' AND dst.entity_key = 'portfolio_edge_controller';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'advances_lifecycle_stage', 0.81, 15, 8800000, 'Lithography PVT exit gate advances the PVT to mass production lifecycle stage.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'npi_milestone_ltx_pvt' AND dst.entity_key = 'lifecycle_stage_pvt_to_mp';
INSERT INTO tech_graph_relationships (from_entity, to_entity, relationship_type, strength, signal_count, product_value, evidence_text)
SELECT src.entity_id, dst.entity_id, 'advances_lifecycle_stage', 0.73, 9, 6500000, 'Connected Edge Controller EVT gate advances toward mass production readiness.'
FROM tech_graph_entities src, tech_graph_entities dst
WHERE src.entity_key = 'npi_milestone_edge_evt' AND dst.entity_key = 'lifecycle_stage_pvt_to_mp';

INSERT INTO product_signal_cases (case_ref, case_type, status, urgency_score, product_value_at_risk, signal_count, executive_summary) VALUES ('SIG-WAFER-2026-112', 'Wafer lot yield recovery', 'investigating', 96.0, 17800000, 41, 'Wafer Lot LTX-4408, overlay process drift, and Austin Fab Line 7 yield metrics threaten Lithography Throughput Analyzer order promises.');
INSERT INTO product_signal_cases (case_ref, case_type, status, urgency_score, product_value_at_risk, signal_count, executive_summary) VALUES ('SIG-OSAT-2026-118', 'OSAT final test bottleneck', 'mitigating', 88.0, 10400000, 24, 'Osaka OSAT final test and ADAS burn-in capacity are constraining Automotive Sensor Fusion customer commitments.');
INSERT INTO product_signal_cases (case_ref, case_type, status, urgency_score, product_value_at_risk, signal_count, executive_summary) VALUES ('SIG-ECO-2026-141', 'ECO and PLM BOM substitution', 'investigating', 92.5, 14400000, 33, 'Alternate ABF stack ECO, PLM baseline, and change review board decisions must accelerate BOM substitution before NPI slips.');
INSERT INTO product_signal_cases (case_ref, case_type, status, urgency_score, product_value_at_risk, signal_count, executive_summary) VALUES ('SIG-WARR-2026-133', 'Connected product warranty containment', 'mitigating', 89.5, 7200000, 27, 'Field quality incident ADAS-42, connected telemetry, warranty cohorts, and service operations show early warranty exposure.');
INSERT INTO product_signal_cases (case_ref, case_type, status, urgency_score, product_value_at_risk, signal_count, executive_summary) VALUES ('SIG-ALLOC-2026-151', 'Allocation and capacity reservation recovery', 'investigating', 93.5, 15100000, 35, 'ABF recovery allocation plan, Hsinchu capacity reservation, supplier sites, and order promising must be reconciled for NovaCloud and QuantumFab.');

INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'source_signal', 96, 'Wafer lot overlay drift opened the yield recovery case.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-WAFER-2026-112' AND e.entity_key = 'wafer_lot_ltx_4408';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'fab_owner', 95, 'Austin Fab Line 7 owns wafer-start recovery.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-WAFER-2026-112' AND e.entity_key = 'fab_austin_line_7';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'quality_signal', 94, 'Yield metric confirms lithography drift severity.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-WAFER-2026-112' AND e.entity_key = 'yield_metric_litho_drift';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'order_promise', 92, 'QuantumFab August order promise is exposed.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-WAFER-2026-112' AND e.entity_key = 'order_promise_quantumfab_aug';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'eco_owner', 89, 'Reticle flow ECO is the mitigation lever.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-WAFER-2026-112' AND e.entity_key = 'eco_ltx_reticle';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'mitigation_path', 87, 'Manufacturing route changes reduce yield exposure.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-WAFER-2026-112' AND e.entity_key = 'manufacturing_route_ltx_recovery';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'capacity_owner', 85, 'PVT exit gate is the lifecycle control point.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-WAFER-2026-112' AND e.entity_key = 'npi_milestone_ltx_pvt';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'buyer_account', 83, 'QuantumFab commitment depends on recovered wafer starts.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-WAFER-2026-112' AND e.entity_key = 'buyer_quantum_fab';

INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'osat_owner', 90, 'Osaka OSAT Line 3 is the final-test bottleneck.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-OSAT-2026-118' AND e.entity_key = 'osat_site_osaka_line3';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'quality_signal', 88, 'ADAS burn-in program is gating release.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-OSAT-2026-118' AND e.entity_key = 'test_program_adas_burnin';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'impacted_product', 87, 'Automotive Sensor Fusion is constrained by final test.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-OSAT-2026-118' AND e.entity_key = 'portfolio_auto_sensor';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'buyer_account', 85, 'Orion ADAS customer commitments depend on OSAT throughput.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-OSAT-2026-118' AND e.entity_key = 'buyer_orion_auto';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'quality_signal', 84, 'PPAP gate anchors automotive release quality.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-OSAT-2026-118' AND e.entity_key = 'quality_gate_automotive_ppap';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'plm_owner', 82, 'Sensor PLM record identifies the affected BOM revision.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-OSAT-2026-118' AND e.entity_key = 'plm_record_sensor_rev';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'launch_blocker', 80, 'ASIC lead-time shortage remains the launch blocker.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-OSAT-2026-118' AND e.entity_key = 'blocker_asic_shortage';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'mitigation_path', 78, 'Pacific OSAT owns mitigation coordination.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-OSAT-2026-118' AND e.entity_key = 'partner_osat_pacific';

INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'eco_owner', 93, 'Alternate ABF stack ECO is the substitution decision.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-ECO-2026-141' AND e.entity_key = 'eco_gpu_substrate_alt';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'plm_owner', 91, 'GPU BOM PLM baseline carries the controlled change.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-ECO-2026-141' AND e.entity_key = 'plm_record_gpu_bom_23c';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'bom_component', 90, 'ABF substrate core is the constrained BOM component.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-ECO-2026-141' AND e.entity_key = 'component_abf_core';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'supplier_owner', 89, 'Kinetic supplier desk owns ABF recovery.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-ECO-2026-141' AND e.entity_key = 'supplier_kinetic_abf';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'mitigation_path', 87, 'ABF recovery allocation plan is the mitigation path.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-ECO-2026-141' AND e.entity_key = 'allocation_plan_abf_recovery';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'eco_owner', 84, 'Lithography CRB reviews priority ECO collisions.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-ECO-2026-141' AND e.entity_key = 'crb_litho_priority';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'demand_plan', 82, 'GPU demand forecast quantifies substitution urgency.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-ECO-2026-141' AND e.entity_key = 'demand_forecast_gpu_q3';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'buyer_account', 80, 'NovaCloud commitment is exposed if substitution is late.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-ECO-2026-141' AND e.entity_key = 'commitment_novacloud_q3';

INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'quality_signal', 90, 'Field quality incident ADAS-42 opened the warranty containment case.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-WARR-2026-133' AND e.entity_key = 'field_quality_incident_adas_42';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'warranty_exposure', 89, 'Early-life warranty cohort shows exposure.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-WARR-2026-133' AND e.entity_key = 'warranty_cohort_sensor_early';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'source_signal', 87, 'Connected telemetry confirms thermal signal pattern.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-WARR-2026-133' AND e.entity_key = 'telemetry_signal_controller_heat';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'field_service_owner', 85, 'HelioMed RMA case cluster is the active service exposure.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-WARR-2026-133' AND e.entity_key = 'service_case_helio_rma';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'field_service_owner', 83, 'Warranty triage support operations own containment.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-WARR-2026-133' AND e.entity_key = 'support_operation_warranty_triage';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'firmware_owner', 82, 'Firmware release 7.4 is part of connected-product containment.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-WARR-2026-133' AND e.entity_key = 'firmware_release_edge_7_4';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'impacted_product', 80, 'Connected Edge Controller has firmware and service exposure.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-WARR-2026-133' AND e.entity_key = 'portfolio_edge_controller';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'buyer_account', 78, 'HelioMed commitment is tied to warranty containment.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-WARR-2026-133' AND e.entity_key = 'buyer_helio_med';

INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'source_signal', 94, 'Supplier-risk signal opened allocation recovery.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-ALLOC-2026-151' AND e.entity_key = 'signal_supplier_risk';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'mitigation_path', 92, 'ABF recovery allocation plan coordinates constrained supply.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-ALLOC-2026-151' AND e.entity_key = 'allocation_plan_abf_recovery';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'capacity_owner', 91, 'Hsinchu week 32 capacity reservation backs the allocation plan.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-ALLOC-2026-151' AND e.entity_key = 'capacity_reservation_hsinchu_wk32';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'supplier_owner', 90, 'Taipei ABF site is the constrained supplier location.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-ALLOC-2026-151' AND e.entity_key = 'supplier_site_taipei';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'order_promise', 88, 'QuantumFab order promise consumes recovered allocation.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-ALLOC-2026-151' AND e.entity_key = 'order_promise_quantumfab_aug';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'buyer_account', 87, 'NovaCloud Q3 customer commitment is exposed.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-ALLOC-2026-151' AND e.entity_key = 'commitment_novacloud_q3';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'channel_owner', 83, 'Channel inventory must be protected while allocation is recovered.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-ALLOC-2026-151' AND e.entity_key = 'channel_inventory_switch_q3';
INSERT INTO product_signal_case_entities (case_id, entity_id, role, evidence_score, evidence_note)
SELECT c.case_id, e.entity_id, 'demand_plan', 82, 'Demand forecast quantifies order promising exposure.'
FROM product_signal_cases c, tech_graph_entities e WHERE c.case_ref = 'SIG-ALLOC-2026-151' AND e.entity_key = 'demand_forecast_gpu_q3';

COMMIT;

PROMPT Seeded High Tech Product Signal Graph.
