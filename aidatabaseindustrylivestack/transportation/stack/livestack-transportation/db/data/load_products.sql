/*
 * load_products.sql
 * Transportation services, service lines, capacity slots, and transport equipment
 * Uses PL/SQL to generate volume with variety
 */

SET SERVEROUTPUT ON
PROMPT Loading transportation services, capacity slots, and equipment...

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
    -- Transportation service lines, lane products, capacity slots, and equipment
    add_prod('metroline','Regional LTL Freight Move','Less-than-Truckload','Regional Lane',125,48,8.5,'ltl,regional,pallet,terminal');
    add_prod('metroline','Expedited Dock-to-Dock Transfer','Fleet Logistics','Expedited',210,82,12.0,'expedited,cross-dock,linehaul,priority');
    add_prod('metroline','Hazmat Documentation Review','Compliance','Safety',95,35,0.001,'hazmat,compliance,bill-of-lading,safety');
    add_prod('vitalroute','Same-Day Final Mile Slot','Final Mile','Metro Delivery',160,65,4.0,'same-day,final-mile,metro,delivery');
    add_prod('vitalroute','White Glove Delivery Crew','Final Mile','Premium Delivery',340,125,18.0,'white-glove,scheduled,crew,delivery');
    add_prod('vitalroute','Remote Trailer Telematics Onboarding','Fleet Monitoring','Telematics',275,98,0.05,'telematics,trailer,gps,monitoring');
    add_prod('pulsepoint','Time-Critical Air Freight Tender','Time-Critical Freight','Air Freight',420,175,2.0,'air-freight,critical,tender,airport');
    add_prod('pulsepoint','High-Value Load Monitoring Kit','Fleet Monitoring','Security',680,260,1.2,'high-value,gps,seal,sensor,monitoring');
    add_prod('pulsepoint','Priority Recovery Dispatch','Disruption Response','Recovery',520,210,0.001,'recovery,reroute,priority,exception');
    add_prod('clearlane','Brokered Truckload Match','Brokerage','Truckload',180,70,0.001,'brokerage,truckload,spot-market,capacity');
    add_prod('clearlane','Carrier Exception Follow-Up','Brokerage','Exception',140,58,0.001,'exception,carrier,follow-up,eta');
    add_prod('clearlane','Contract Lane Rebid','Brokerage','Procurement',260,105,0.001,'contract,lane,rebid,procurement');
    add_prod('orthomotion','Oversize Permit Coordination','Heavy Haul','Permitting',220,90,0.001,'oversize,permit,escort,heavy-haul');
    add_prod('orthomotion','Heavy Equipment Recovery Bundle','Heavy Haul','Recovery',780,310,1.4,'heavy-equipment,recovery,route-survey,escort');
    add_prod('orthomotion','Bridge Clearance Assessment','Heavy Haul','Route Survey',195,74,0.001,'bridge,clearance,route-survey,safety');
    add_prod('homeport','Regional Pool Distribution','Regional Distribution','Pool Point',240,96,0.001,'pool-distribution,regional,freight-consolidation,terminal-capacity');
    add_prod('homeport','Trailer Yard Starter Kit','Transport Equipment','Yard Operations',145,54,0.9,'yard,dock,seal,placard,equipment');
    add_prod('homeport','Remote Yard Check Onboarding','Fleet Monitoring','Yard Visibility',310,120,0.4,'yard-check,onboarding,device,visibility');
    add_prod('intermodal','Intermodal Ramp Transfer','Intermodal','Ramp Drayage',89,31,0.35,'intermodal,ramp,container,drayage');
    add_prod('intermodal','Container Seal Sensor LTE','Fleet Monitoring','Container Security',115,42,0.5,'container,seal,lte,sensor');
    add_prod('intermodal','Rail ETA Visibility Kit','Rail Freight','Visibility',185,70,0.6,'rail,eta,visibility,intermodal');
    add_prod('wellnest','Paratransit Reservation Window','Passenger Mobility','Paratransit',170,68,0.001,'paratransit,reservation,passenger,route');
    add_prod('wellnest','School Route Capacity Review','Passenger Mobility','School Route',145,55,0.001,'school-route,capacity,passenger');
    add_prod('silverline','Refrigerated Truckload Slot','Cold Chain','Reefer',190,78,0.001,'reefer,cold-chain,temperature,truckload');
    add_prod('silverline','Cold Chain Exception Review','Cold Chain','Temperature Excursion',130,50,0.001,'temperature,exception,cold-chain,quality');
    add_prod('onroute','Port Drayage Appointment','Port Drayage','Port Appointment',360,145,0.001,'port,drayage,appointment,container');
    add_prod('onroute','Empty Container Return Slot','Port Drayage','Equipment Return',640,260,0.001,'empty-container,return,port,capacity');
    add_prod('railflow','Railcar Spotting Request','Rail Freight','Yard Service',520,210,0.001,'railcar,spotting,yard,capacity');
    add_prod('railflow','Interchange Delay Coaching','Rail Freight','Delay Recovery',155,62,0.001,'interchange,delay,recovery,rail');
    add_prod('routefirst','Fleet Maintenance Window','Fleet Services','Maintenance',210,86,0.001,'fleet,maintenance,pm,availability');
    add_prod('routefirst','Driver Safety Briefing','Fleet Services','Safety',135,53,0.001,'driver,safety,briefing,compliance');

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
    DBMS_OUTPUT.PUT_LINE('Transportation service records loaded: ' || v_idx);
END;
/

-- ============================================================
-- GENERATE CAPACITY / EQUIPMENT LEVELS (each service available at 5-12 terminals)
-- ============================================================
PROMPT Generating fleet capacity and equipment levels...

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
                        FLOOR(DBMS_RANDOM.VALUE(30, 500)),
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
