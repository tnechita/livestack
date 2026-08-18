/*
 * load_products.sql
 * High-tech products, launch programs, capacity slots, and hardware supply kits
 * Uses PL/SQL to generate volume with variety
 */

SET SERVEROUTPUT ON
PROMPT Loading high-tech products and capacity items...

DECLARE
    TYPE t_prod IS RECORD (
        bslug VARCHAR2(100),
        pname VARCHAR2(300),
        cat   VARCHAR2(100),
        subcat VARCHAR2(100),
        price NUMBER(10,2),
        cost  NUMBER(10,2),
        wt    NUMBER(8,3),
        tags  VARCHAR2(1000)
    );
    TYPE t_prod_arr IS TABLE OF t_prod;
    v_prods t_prod_arr := t_prod_arr();
    v_brand_id NUMBER;
    v_sku VARCHAR2(50);
    v_idx NUMBER := 0;

    PROCEDURE add_prod(p_slug VARCHAR2, p_name VARCHAR2, p_cat VARCHAR2, p_sub VARCHAR2,
                       p_price NUMBER, p_cost NUMBER, p_wt NUMBER, p_tags VARCHAR2) IS
        v_rec t_prod;
    BEGIN
        v_rec.bslug := p_slug; v_rec.pname := p_name; v_rec.cat := p_cat;
        v_rec.subcat := p_sub; v_rec.price := p_price; v_rec.cost := p_cost;
        v_rec.wt := p_wt; v_rec.tags := p_tags;
        v_prods.EXTEND; v_prods(v_prods.COUNT) := v_rec;
    END;
BEGIN
    -- High-tech product families, platform services, launch capacity, and hardware kits
    add_prod('quantumcore','AI Edge Gateway Reference Kit','Edge Computing','AI Inference',1495,620,1.8,'edge-ai,inference,gateway,reference-kit');
    add_prod('quantumcore','Private 5G Factory Starter Pack','Connectivity','Industrial IoT',9800,4100,14.2,'private-5g,iiot,factory,starter');
    add_prod('quantumcore','Secure Device Fleet Manager','Platform Software','Device Management',420,95,0.001,'device-management,zero-trust,ota,fleet');
    add_prod('edgepulse','Cloud GPU Burst Reservation','Cloud Infrastructure','Accelerated Compute',3800,1520,0.001,'gpu,cloud,ai-training,burst');
    add_prod('edgepulse','Kubernetes Edge Node Bundle','Edge Computing','Container Platform',2400,920,5.5,'kubernetes,edge,node,container');
    add_prod('edgepulse','Telemetry Observability Pack','Developer Platform','Observability',760,210,0.001,'telemetry,metrics,tracing,logs');
    add_prod('pulsepoint','RISC-V Evaluation Board','Semiconductor Platforms','Developer Board',690,260,0.7,'risc-v,eval-board,silicon,developer');
    add_prod('pulsepoint','AI Accelerator Module','Semiconductor Platforms','AI Silicon',1280,530,0.45,'ai-accelerator,module,npu,inference');
    add_prod('pulsepoint','Chiplet Integration Workshop','Professional Services','Silicon Design',5200,1850,0.001,'chiplet,packaging,design-workshop');
    add_prod('clearmind','Developer Portal Premium Seat','Developer Experience','Portal',180,44,0.001,'developer-portal,api-docs,sandbox');
    add_prod('clearmind','API Compatibility Certification','Developer Experience','Certification',960,290,0.001,'api,compatibility,certification');
    add_prod('clearmind','Incident Simulation Lab','Reliability Engineering','Chaos Testing',3400,1180,0.001,'sre,incident-simulation,chaos');
    add_prod('optimotion-robotics','Autonomous Robotics Controller','Robotics','Motion Control',1860,740,2.3,'robotics,motion-control,autonomous');
    add_prod('optimotion-robotics','Digital Twin Optimization Suite','Optimization','Simulation',2200,610,0.001,'digital-twin,simulation,optimization');
    add_prod('optimotion-robotics','Computer Vision Calibration Rig','Robotics','Vision',1420,560,6.4,'computer-vision,calibration,camera');
    add_prod('fieldlink-services','Field Service Diagnostics Tablet','Field Services','Diagnostics',1150,430,1.1,'field-service,diagnostics,tablet');
    add_prod('fieldlink-services','Rugged Sensor Replacement Kit','Hardware Kits','Sensors',380,140,0.9,'sensor,replaceable,field-kit,spares');
    add_prod('fieldlink-services','Remote Fleet Onboarding','Telemetry','Onboarding',1250,360,0.001,'fleet,onboarding,remote,device');
    add_prod('modulesupply-direct','Supply Chain Control Tower Seat','Enterprise Software','Supply Planning',540,160,0.001,'supply-chain,control-tower,planning');
    add_prod('modulesupply-direct','Optical Module Test Kit','Hardware Kits','Networking',890,310,0.8,'optical,module,test,networking');
    add_prod('modulesupply-direct','Power Efficiency Validation Kit','Hardware Kits','Validation',640,220,0.6,'power,efficiency,validation,hardware');
    add_prod('nanonest-labs','Smart Building Sensor Mesh','IoT','Smart Facilities',1650,610,3.2,'iot,sensor-mesh,smart-building');
    add_prod('nanonest-labs','Workspace Occupancy Analytics','Analytics','Facilities AI',740,185,0.001,'occupancy,analytics,facilities-ai');
    add_prod('silverline','Enterprise Support Response Pack','Enterprise Support','Premium Support',3200,980,0.001,'support,sla,enterprise,response');
    add_prod('silverline','Partner Enablement Sandbox','Partner Enablement','Sandbox',780,210,0.001,'partner,enablement,sandbox');
    add_prod('optiguide-ai','AI Code Assistant Seat','AI Software','Developer Tools',480,120,0.001,'code-assistant,genai,developer-tools');
    add_prod('optiguide-ai','Vector Search Enablement Sprint','AI Software','Search',7600,2400,0.001,'vector-search,rag,enablement');
    add_prod('signalflow-networks','Low-Latency Network Appliance','Networking','Edge Routing',2100,840,3.8,'low-latency,networking,edge-router');
    add_prod('signalflow-networks','Data Fabric Replication Pack','Data Platform','Replication',1480,420,0.001,'data-fabric,replication,multicloud');
    add_prod('vertexfirst-security','Zero Trust Access Gateway','Security','Identity',1320,390,1.2,'zero-trust,access,identity,gateway');
    add_prod('vertexfirst-security','Secure Collaboration Vault','Security','Data Protection',860,240,0.001,'secure-collaboration,vault,encryption');

    FOR i IN 1..v_prods.COUNT LOOP
        BEGIN
            SELECT brand_id INTO v_brand_id
            FROM brands
            WHERE brand_slug = v_prods(i).bslug;

            v_idx := v_idx + 1;
            v_sku := UPPER(SUBSTR(v_prods(i).bslug, 1, 3)) || '-' ||
                     LPAD(v_idx, 5, '0');

            INSERT INTO products (brand_id, sku, product_name, category, subcategory,
                                  unit_price, unit_cost, weight_kg, tags, launch_date)
            VALUES (v_brand_id, v_sku, v_prods(i).pname, v_prods(i).cat, v_prods(i).subcat,
                    v_prods(i).price, v_prods(i).cost, v_prods(i).wt, v_prods(i).tags,
                    SYSDATE - DBMS_RANDOM.VALUE(30, 730));
        EXCEPTION
            WHEN DUP_VAL_ON_INDEX THEN NULL;  -- skip dupes
        END;
    END LOOP;

    COMMIT;
    DBMS_OUTPUT.PUT_LINE('High-tech product records loaded: ' || v_idx);
END;
/

-- ============================================================
-- GENERATE CAPACITY / SUPPLY LEVELS (each product stocked at 5-12 fulfillment sites)
-- ============================================================
PROMPT Generating product capacity and hardware supply levels...

DECLARE
    v_count       NUMBER := 0;
    v_num_centers NUMBER;
BEGIN
    FOR p IN (SELECT product_id FROM products) LOOP
        v_num_centers := FLOOR(DBMS_RANDOM.VALUE(5, 13));
        FOR c IN (
            SELECT center_id FROM (
                SELECT center_id FROM fulfillment_centers
                ORDER BY DBMS_RANDOM.VALUE
            ) WHERE ROWNUM <= v_num_centers
        ) LOOP
            BEGIN
                INSERT INTO inventory (product_id, center_id, quantity_on_hand,
                                       quantity_reserved, reorder_point, reorder_qty,
                                       last_restock_date)
                VALUES (p.product_id, c.center_id,
                        FLOOR(DBMS_RANDOM.VALUE(10, 500)),
                        FLOOR(DBMS_RANDOM.VALUE(0, 30)),
                        FLOOR(DBMS_RANDOM.VALUE(20, 100)),
                        FLOOR(DBMS_RANDOM.VALUE(100, 500)),
                        SYSDATE - DBMS_RANDOM.VALUE(1, 30));
                v_count := v_count + 1;
            EXCEPTION
                WHEN DUP_VAL_ON_INDEX THEN NULL;
            END;
        END LOOP;
    END LOOP;
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Capacity records loaded: ' || v_count);
END;
/
