/*
 * load_transport_network_graph.sql
 * Deterministic Seer Transport graph seed data for shipper-signal, terminal,
 * lane, carrier, port, and exception-case demos.
 */

SET SERVEROUTPUT ON
PROMPT Loading Seer Transport graph demo data...

DELETE FROM transport_case_entities;
DELETE FROM transport_relationships;
DELETE FROM transport_exception_cases;
DELETE FROM transport_entities;
COMMIT;

INSERT INTO transport_entities VALUES (1, 'SHIP-ACME-FOODS', 'Acme Foods Midwest Refrigerated Network', 'shipper', 92.0, 'critical', 'Midwest', 'Chicago', 'shipper', 1840000, 38, SYSTIMESTAMP - INTERVAL '12' DAY, SYSTIMESTAMP - INTERVAL '2' HOUR, 1);
INSERT INTO transport_entities VALUES (2, 'SHIP-NOVA-RETAIL', 'Nova Retail Regional Pool Program', 'shipper', 84.0, 'high', 'Northeast', 'Newark', 'shipper', 1265000, 25, SYSTIMESTAMP - INTERVAL '10' DAY, SYSTIMESTAMP - INTERVAL '4' HOUR, 1);
INSERT INTO transport_entities VALUES (3, 'SHIP-MEDLINE-COLD', 'MedLine Cold Chain Expansion', 'shipper', 79.0, 'high', 'Southeast', 'Atlanta', 'shipper', 980000, 19, SYSTIMESTAMP - INTERVAL '7' DAY, SYSTIMESTAMP - INTERVAL '3' HOUR, 0);
INSERT INTO transport_entities VALUES (4, 'SHIP-AERO-PARTS', 'AeroParts Expedited Lane Desk', 'shipper', 73.0, 'medium', 'West', 'Phoenix', 'shipper', 745000, 17, SYSTIMESTAMP - INTERVAL '9' DAY, SYSTIMESTAMP - INTERVAL '6' HOUR, 0);
INSERT INTO transport_entities VALUES (5, 'CAR-SILVERLINE', 'SilverLine Cold Chain Carrier Pool', 'carrier', 88.0, 'high', 'Southeast', 'Miami', 'carrier', 1530000, 32, SYSTIMESTAMP - INTERVAL '11' DAY, SYSTIMESTAMP - INTERVAL '1' HOUR, 1);
INSERT INTO transport_entities VALUES (6, 'CAR-RAILFLOW', 'RailFlow Intermodal Partner', 'carrier', 71.0, 'medium', 'South', 'Houston', 'carrier', 890000, 14, SYSTIMESTAMP - INTERVAL '20' DAY, SYSTIMESTAMP - INTERVAL '1' DAY, 0);
INSERT INTO transport_entities VALUES (7, 'BROKER-CLEARLANE', 'ClearLane Brokerage Escalation Desk', 'broker', 81.0, 'high', 'West', 'Seattle', 'broker', 1120000, 24, SYSTIMESTAMP - INTERVAL '8' DAY, SYSTIMESTAMP - INTERVAL '5' HOUR, 1);
INSERT INTO transport_entities VALUES (8, 'TERM-LAX-INLAND', 'Los Angeles Inland Empire Terminal', 'terminal', 94.0, 'critical', 'West', 'Ontario', 'operations', 2410000, 52, SYSTIMESTAMP - INTERVAL '14' DAY, SYSTIMESTAMP - INTERVAL '30' MINUTE, 1);
INSERT INTO transport_entities VALUES (9, 'TERM-CHI-RAIL', 'Chicago Midwest Rail Hub', 'terminal', 87.0, 'high', 'Midwest', 'Joliet', 'operations', 1715000, 41, SYSTIMESTAMP - INTERVAL '13' DAY, SYSTIMESTAMP - INTERVAL '3' HOUR, 1);
INSERT INTO transport_entities VALUES (10, 'TERM-MIA-COLD', 'Miami Cold Chain Hub', 'terminal', 78.0, 'high', 'Southeast', 'Hialeah', 'operations', 995000, 22, SYSTIMESTAMP - INTERVAL '9' DAY, SYSTIMESTAMP - INTERVAL '8' HOUR, 0);
INSERT INTO transport_entities VALUES (11, 'PORT-LAX-DRAY', 'LAX/LB Port Drayage Gateway', 'port', 96.0, 'critical', 'West', 'Long Beach', 'port', 2650000, 61, SYSTIMESTAMP - INTERVAL '15' DAY, SYSTIMESTAMP - INTERVAL '1' HOUR, 1);
INSERT INTO transport_entities VALUES (12, 'PORT-SEA-TAC', 'Seattle-Tacoma Port Interface', 'port', 76.0, 'medium', 'West', 'Tacoma', 'port', 810000, 15, SYSTIMESTAMP - INTERVAL '18' DAY, SYSTIMESTAMP - INTERVAL '11' HOUR, 0);
INSERT INTO transport_entities VALUES (13, 'LANE-LAX-PHX', 'LAX to Phoenix Expedited Lane', 'lane', 91.0, 'critical', 'West', 'Interstate 10', 'lane', 1375000, 44, SYSTIMESTAMP - INTERVAL '6' DAY, SYSTIMESTAMP - INTERVAL '2' HOUR, 1);
INSERT INTO transport_entities VALUES (14, 'LANE-CHI-NYC', 'Chicago to NYC LTL Lane', 'lane', 83.0, 'high', 'Midwest', 'Interstate 80', 'lane', 1225000, 31, SYSTIMESTAMP - INTERVAL '9' DAY, SYSTIMESTAMP - INTERVAL '4' HOUR, 1);
INSERT INTO transport_entities VALUES (15, 'POOL-REEFER-07', 'Reefer Trailer Pool 07', 'equipment_pool', 89.0, 'high', 'Southeast', 'Miami', 'equipment', 725000, 28, SYSTIMESTAMP - INTERVAL '5' DAY, SYSTIMESTAMP - INTERVAL '2' HOUR, 1);
INSERT INTO transport_entities VALUES (16, 'YARD-ONT-OVERFLOW', 'Ontario Yard Overflow Queue', 'yard', 86.0, 'high', 'West', 'Ontario', 'operations', 610000, 36, SYSTIMESTAMP - INTERVAL '4' DAY, SYSTIMESTAMP - INTERVAL '1' HOUR, 1);
INSERT INTO transport_entities VALUES (17, 'CARRIER-PACIFIC-RAIL', 'Pacific Rail Intermodal Recovery Partner', 'carrier', 82.0, 'high', 'West', 'Tacoma', 'carrier', 930000, 21, SYSTIMESTAMP - INTERVAL '6' DAY, SYSTIMESTAMP - INTERVAL '3' HOUR, 1);
INSERT INTO transport_entities VALUES (18, 'TERM-SEA-RAIL', 'Puget Sound Intermodal Rail Terminal', 'terminal', 80.0, 'high', 'West', 'Tacoma', 'operations', 1180000, 29, SYSTIMESTAMP - INTERVAL '8' DAY, SYSTIMESTAMP - INTERVAL '2' HOUR, 1);
INSERT INTO transport_entities VALUES (19, 'LANE-SEA-SLC', 'Seattle to Salt Lake Intermodal Lane', 'lane', 78.0, 'high', 'West', 'Interstate 84', 'lane', 1040000, 26, SYSTIMESTAMP - INTERVAL '7' DAY, SYSTIMESTAMP - INTERVAL '4' HOUR, 1);
INSERT INTO transport_entities VALUES (20, 'SHIP-NORTHSTAR-RETAIL', 'NorthStar Retail Pacific Replenishment', 'shipper', 77.0, 'high', 'West', 'Salt Lake City', 'shipper', 1430000, 23, SYSTIMESTAMP - INTERVAL '9' DAY, SYSTIMESTAMP - INTERVAL '5' HOUR, 1);
INSERT INTO transport_entities VALUES (21, 'CAR-CASCADIA-INTERMODAL', 'Cascadia Rail and Drayage Network', 'carrier', 85.0, 'high', 'West', 'Portland', 'carrier', 1260000, 34, SYSTIMESTAMP - INTERVAL '6' DAY, SYSTIMESTAMP - INTERVAL '90' MINUTE, 1);
INSERT INTO transport_entities VALUES (22, 'POOL-CHASSIS-12', 'Chassis Pool 12 Pacific Northwest', 'equipment_pool', 74.0, 'medium', 'West', 'Tacoma', 'equipment', 540000, 18, SYSTIMESTAMP - INTERVAL '5' DAY, SYSTIMESTAMP - INTERVAL '6' HOUR, 1);
INSERT INTO transport_entities VALUES (23, 'BROKER-NORTHWEST-CAPACITY', 'Northwest Capacity Exchange', 'broker', 79.0, 'high', 'West', 'Seattle', 'broker', 860000, 20, SYSTIMESTAMP - INTERVAL '8' DAY, SYSTIMESTAMP - INTERVAL '3' HOUR, 1);
INSERT INTO transport_entities VALUES (24, 'TERM-TACOMA-CROSSDOCK', 'Tacoma Cross-Dock Recovery Terminal', 'terminal', 83.0, 'high', 'West', 'Tacoma', 'operations', 970000, 27, SYSTIMESTAMP - INTERVAL '5' DAY, SYSTIMESTAMP - INTERVAL '2' HOUR, 1);
INSERT INTO transport_entities VALUES (25, 'PORT-OAK-TRANSLOAD', 'Oakland Bay Transload Gateway', 'port', 75.0, 'medium', 'West', 'Oakland', 'port', 1120000, 19, SYSTIMESTAMP - INTERVAL '12' DAY, SYSTIMESTAMP - INTERVAL '8' HOUR, 1);
INSERT INTO transport_entities VALUES (26, 'LANE-OAK-SLC', 'Oakland to Salt Lake Recovery Lane', 'lane', 81.0, 'high', 'West', 'Interstate 80', 'lane', 930000, 22, SYSTIMESTAMP - INTERVAL '6' DAY, SYSTIMESTAMP - INTERVAL '4' HOUR, 1);
INSERT INTO transport_entities VALUES (27, 'CAR-GOLDENSTATE-DRAY', 'GoldenState Port Drayage Cooperative', 'carrier', 84.0, 'high', 'West', 'Oakland', 'carrier', 1010000, 28, SYSTIMESTAMP - INTERVAL '7' DAY, SYSTIMESTAMP - INTERVAL '2' HOUR, 1);
INSERT INTO transport_entities VALUES (28, 'SHIP-PACIFIC-MEDICAL', 'Pacific Medical Devices Priority Freight', 'shipper', 88.0, 'high', 'West', 'San Jose', 'shipper', 1180000, 31, SYSTIMESTAMP - INTERVAL '4' DAY, SYSTIMESTAMP - INTERVAL '1' HOUR, 1);
INSERT INTO transport_entities VALUES (29, 'YARD-TACOMA-CONGESTION', 'Tacoma Yard Congestion Queue', 'yard', 87.0, 'critical', 'West', 'Tacoma', 'operations', 680000, 39, SYSTIMESTAMP - INTERVAL '3' DAY, SYSTIMESTAMP - INTERVAL '45' MINUTE, 1);
INSERT INTO transport_entities VALUES (30, 'POOL-DRAY-04', 'Drayage Chassis Pool 04', 'equipment_pool', 73.0, 'medium', 'West', 'Seattle', 'equipment', 455000, 16, SYSTIMESTAMP - INTERVAL '6' DAY, SYSTIMESTAMP - INTERVAL '7' HOUR, 1);

INSERT INTO transport_exception_cases VALUES (1, 'CASE-PORT-2026-041', 'Port congestion drayage escalation', 'escalated', 96.0, 2475000, 118, SYSTIMESTAMP - INTERVAL '5' DAY, SYSTIMESTAMP - INTERVAL '1' HOUR);
INSERT INTO transport_exception_cases VALUES (2, 'CASE-COLD-2026-018', 'Cold-chain trailer imbalance', 'investigating', 89.0, 1580000, 74, SYSTIMESTAMP - INTERVAL '3' DAY, SYSTIMESTAMP - INTERVAL '2' HOUR);
INSERT INTO transport_exception_cases VALUES (3, 'CASE-LANE-2026-027', 'Expedited lane service-risk cluster', 'monitoring', 84.0, 1320000, 63, SYSTIMESTAMP - INTERVAL '7' DAY, SYSTIMESTAMP - INTERVAL '5' HOUR);

INSERT INTO transport_relationships VALUES (1, 11, 8, 'port_constrained_by', 0.982, 42, 1875000, SYSTIMESTAMP - INTERVAL '5' DAY, SYSTIMESTAMP - INTERVAL '1' HOUR);
INSERT INTO transport_relationships VALUES (2, 8, 16, 'capacity_depends_on', 0.936, 37, 610000, SYSTIMESTAMP - INTERVAL '4' DAY, SYSTIMESTAMP - INTERVAL '1' HOUR);
INSERT INTO transport_relationships VALUES (3, 8, 13, 'serves_lane', 0.921, 31, 1375000, SYSTIMESTAMP - INTERVAL '6' DAY, SYSTIMESTAMP - INTERVAL '2' HOUR);
INSERT INTO transport_relationships VALUES (4, 13, 4, 'exception_linked_to', 0.872, 18, 745000, SYSTIMESTAMP - INTERVAL '6' DAY, SYSTIMESTAMP - INTERVAL '3' HOUR);
INSERT INTO transport_relationships VALUES (5, 7, 13, 'brokers_for', 0.817, 14, 690000, SYSTIMESTAMP - INTERVAL '5' DAY, SYSTIMESTAMP - INTERVAL '2' HOUR);
INSERT INTO transport_relationships VALUES (6, 1, 9, 'shares_terminal', 0.888, 22, 980000, SYSTIMESTAMP - INTERVAL '9' DAY, SYSTIMESTAMP - INTERVAL '4' HOUR);
INSERT INTO transport_relationships VALUES (7, 9, 14, 'serves_lane', 0.902, 29, 1225000, SYSTIMESTAMP - INTERVAL '9' DAY, SYSTIMESTAMP - INTERVAL '4' HOUR);
INSERT INTO transport_relationships VALUES (8, 14, 2, 'hands_off_to', 0.743, 12, 545000, SYSTIMESTAMP - INTERVAL '7' DAY, SYSTIMESTAMP - INTERVAL '8' HOUR);
INSERT INTO transport_relationships VALUES (9, 3, 10, 'shares_terminal', 0.856, 17, 645000, SYSTIMESTAMP - INTERVAL '5' DAY, SYSTIMESTAMP - INTERVAL '6' HOUR);
INSERT INTO transport_relationships VALUES (10, 10, 15, 'uses_equipment_pool', 0.931, 26, 725000, SYSTIMESTAMP - INTERVAL '5' DAY, SYSTIMESTAMP - INTERVAL '2' HOUR);
INSERT INTO transport_relationships VALUES (11, 5, 15, 'uses_equipment_pool', 0.912, 22, 690000, SYSTIMESTAMP - INTERVAL '4' DAY, SYSTIMESTAMP - INTERVAL '2' HOUR);
INSERT INTO transport_relationships VALUES (12, 5, 3, 'serves_lane', 0.802, 12, 512000, SYSTIMESTAMP - INTERVAL '3' DAY, SYSTIMESTAMP - INTERVAL '9' HOUR);
INSERT INTO transport_relationships VALUES (13, 12, 7, 'hands_off_to', 0.684, 9, 320000, SYSTIMESTAMP - INTERVAL '10' DAY, SYSTIMESTAMP - INTERVAL '1' DAY);
INSERT INTO transport_relationships VALUES (14, 6, 9, 'hands_off_to', 0.773, 14, 450000, SYSTIMESTAMP - INTERVAL '12' DAY, SYSTIMESTAMP - INTERVAL '10' HOUR);
INSERT INTO transport_relationships VALUES (15, 16, 7, 'escalates_to', 0.832, 16, 610000, SYSTIMESTAMP - INTERVAL '3' DAY, SYSTIMESTAMP - INTERVAL '2' HOUR);
INSERT INTO transport_relationships VALUES (16, 12, 17, 'rerouted_through', 0.761, 11, 485000, SYSTIMESTAMP - INTERVAL '2' DAY, SYSTIMESTAMP - INTERVAL '3' HOUR);
INSERT INTO transport_relationships VALUES (17, 8, 18, 'rerouted_through', 0.846, 24, 910000, SYSTIMESTAMP - INTERVAL '4' DAY, SYSTIMESTAMP - INTERVAL '2' HOUR);
INSERT INTO transport_relationships VALUES (18, 18, 19, 'serves_lane', 0.812, 21, 1040000, SYSTIMESTAMP - INTERVAL '5' DAY, SYSTIMESTAMP - INTERVAL '3' HOUR);
INSERT INTO transport_relationships VALUES (19, 19, 20, 'hands_off_to', 0.774, 15, 720000, SYSTIMESTAMP - INTERVAL '4' DAY, SYSTIMESTAMP - INTERVAL '5' HOUR);
INSERT INTO transport_relationships VALUES (20, 20, 21, 'capacity_depends_on', 0.801, 19, 820000, SYSTIMESTAMP - INTERVAL '3' DAY, SYSTIMESTAMP - INTERVAL '2' HOUR);
INSERT INTO transport_relationships VALUES (21, 18, 22, 'uses_equipment_pool', 0.793, 17, 540000, SYSTIMESTAMP - INTERVAL '5' DAY, SYSTIMESTAMP - INTERVAL '4' HOUR);
INSERT INTO transport_relationships VALUES (22, 22, 23, 'brokers_for', 0.718, 12, 420000, SYSTIMESTAMP - INTERVAL '4' DAY, SYSTIMESTAMP - INTERVAL '6' HOUR);
INSERT INTO transport_relationships VALUES (23, 23, 24, 'hands_off_to', 0.786, 14, 610000, SYSTIMESTAMP - INTERVAL '3' DAY, SYSTIMESTAMP - INTERVAL '3' HOUR);
INSERT INTO transport_relationships VALUES (24, 7, 25, 'rerouted_through', 0.729, 13, 510000, SYSTIMESTAMP - INTERVAL '5' DAY, SYSTIMESTAMP - INTERVAL '5' HOUR);
INSERT INTO transport_relationships VALUES (25, 25, 26, 'serves_lane', 0.768, 16, 930000, SYSTIMESTAMP - INTERVAL '4' DAY, SYSTIMESTAMP - INTERVAL '2' HOUR);
INSERT INTO transport_relationships VALUES (26, 13, 26, 'rerouted_through', 0.744, 11, 455000, SYSTIMESTAMP - INTERVAL '3' DAY, SYSTIMESTAMP - INTERVAL '4' HOUR);
INSERT INTO transport_relationships VALUES (27, 26, 27, 'brokers_for', 0.821, 18, 690000, SYSTIMESTAMP - INTERVAL '4' DAY, SYSTIMESTAMP - INTERVAL '2' HOUR);
INSERT INTO transport_relationships VALUES (28, 27, 28, 'hands_off_to', 0.806, 20, 740000, SYSTIMESTAMP - INTERVAL '2' DAY, SYSTIMESTAMP - INTERVAL '90' MINUTE);
INSERT INTO transport_relationships VALUES (29, 16, 29, 'capacity_depends_on', 0.854, 23, 680000, SYSTIMESTAMP - INTERVAL '2' DAY, SYSTIMESTAMP - INTERVAL '1' HOUR);
INSERT INTO transport_relationships VALUES (30, 29, 30, 'uses_equipment_pool', 0.779, 14, 455000, SYSTIMESTAMP - INTERVAL '2' DAY, SYSTIMESTAMP - INTERVAL '3' HOUR);
INSERT INTO transport_relationships VALUES (31, 30, 21, 'capacity_depends_on', 0.733, 10, 390000, SYSTIMESTAMP - INTERVAL '1' DAY, SYSTIMESTAMP - INTERVAL '4' HOUR);
INSERT INTO transport_relationships VALUES (32, 21, 24, 'hands_off_to', 0.747, 13, 515000, SYSTIMESTAMP - INTERVAL '2' DAY, SYSTIMESTAMP - INTERVAL '2' HOUR);
INSERT INTO transport_relationships VALUES (33, 22, 30, 'uses_equipment_pool', 0.701, 9, 285000, SYSTIMESTAMP - INTERVAL '2' DAY, SYSTIMESTAMP - INTERVAL '5' HOUR);
INSERT INTO transport_relationships VALUES (34, 24, 17, 'rerouted_through', 0.719, 8, 335000, SYSTIMESTAMP - INTERVAL '1' DAY, SYSTIMESTAMP - INTERVAL '6' HOUR);

INSERT INTO transport_case_entities VALUES (1, 1, 11, 'seed', 98.0);
INSERT INTO transport_case_entities VALUES (2, 1, 8, 'terminal', 94.0);
INSERT INTO transport_case_entities VALUES (3, 1, 16, 'terminal', 88.0);
INSERT INTO transport_case_entities VALUES (4, 1, 13, 'lane', 91.0);
INSERT INTO transport_case_entities VALUES (5, 2, 3, 'shipper', 84.0);
INSERT INTO transport_case_entities VALUES (6, 2, 5, 'carrier', 88.0);
INSERT INTO transport_case_entities VALUES (7, 2, 10, 'terminal', 82.0);
INSERT INTO transport_case_entities VALUES (8, 2, 15, 'equipment', 93.0);
INSERT INTO transport_case_entities VALUES (9, 3, 4, 'shipper', 78.0);
INSERT INTO transport_case_entities VALUES (10, 3, 7, 'carrier', 81.0);
INSERT INTO transport_case_entities VALUES (11, 3, 13, 'lane', 87.0);

COMMIT;

SELECT
    (SELECT COUNT(*) FROM transport_entities) AS transport_entities,
    (SELECT COUNT(*) FROM transport_relationships) AS transport_relationships,
    (SELECT COUNT(*) FROM transport_exception_cases) AS transport_exception_cases
FROM dual;
