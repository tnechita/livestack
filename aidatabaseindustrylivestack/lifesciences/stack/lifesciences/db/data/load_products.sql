/*
 * load_products.sql
 * Life sciences products across manufacturer brands and regulated categories
 * Uses PL/SQL to generate volume with variety
 */

SET SERVEROUTPUT ON
PROMPT Loading life sciences products...

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
    -- Life sciences supply catalog. Existing table and column names stay
    -- unchanged for route/import compatibility; visible values represent
    -- therapies, diagnostics, trial kits, reagents, and regulated services.
    add_prod('vitacore','mRNA LNP Clinical Batch','Biologics','mRNA Therapeutics',18500,12600,12,'mrna,lnp,clinical-batch,cold-chain');
    add_prod('vitacore','Recombinant Protein GMP Lot','Biologics','Recombinant Proteins',14200,9100,8,'recombinant-protein,gmp,release-testing');
    add_prod('vitacore','AAV Vector Reference Lot','Cell and Gene Therapy','Viral Vectors',26400,18800,6,'aav,viral-vector,gene-therapy');
    add_prod('vitacore','Sterile Fill Finish Batch Slot','Manufacturing Services','Fill Finish',11800,7200,1,'fill-finish,sterile,capacity');
    add_prod('vitacore','Stability Study Sample Set','Quality Control','Stability',3900,2100,3,'stability,ich,quality');
    add_prod('solvanta','Phase II Site Activation Kit','Clinical Trial Supplies','Site Startup',720,420,9,'site-activation,trial-kit,protocol');
    add_prod('solvanta','eConsent Participant Packet','Clinical Trial Supplies','Patient Materials',95,38,2,'econsent,patient-materials,trial');
    add_prod('solvanta','Randomization Label Pack','Clinical Trial Supplies','IRT Labeling',210,92,1,'randomization,labeling,irt');
    add_prod('solvanta','Comparator Drug Blinding Kit','Clinical Trial Supplies','Blinding',1280,740,4,'comparator,blinding,trial-supply');
    add_prod('solvanta','Rescue Medication Site Pack','Clinical Trial Supplies','Rescue Medication',860,510,5,'rescue-medication,site-pack,safety');
    add_prod('biopure','qPCR Respiratory Panel','Diagnostics','Molecular Panels',1180,690,3,'qpcr,diagnostics,respiratory');
    add_prod('biopure','NGS Oncology Library Kit','Diagnostics','Sequencing',3250,2180,2,'ngs,oncology,library-prep');
    add_prod('biopure','ELISA Cytokine Monitoring Kit','Diagnostics','Immunoassay',760,430,2,'elisa,cytokine,immunoassay');
    add_prod('biopure','Companion Diagnostic Control Set','Diagnostics','Controls',1450,890,1,'companion-diagnostic,controls,ivd');
    add_prod('biopure','Digital Pathology Slide Batch','Diagnostics','Pathology',540,260,4,'digital-pathology,slide-batch');
    add_prod('genenova','Autologous Cell Therapy Lot','Cell and Gene Therapy','Autologous Therapy',52000,38100,7,'autologous,cell-therapy,patient-specific');
    add_prod('genenova','Allogeneic Cell Bank Vial Set','Cell and Gene Therapy','Cell Banks',14800,10100,4,'allogeneic,cell-bank,cryogenic');
    add_prod('genenova','Plasmid DNA GMP Batch','Cell and Gene Therapy','Plasmid DNA',21400,15200,5,'plasmid,gmp,gene-therapy');
    add_prod('genenova','Viral Vector Release Panel','Quality Control','Vector Release',4200,2600,1,'vector-release,qc,potency');
    add_prod('genenova','Cryopreserved Dose Shipper','Cold Chain','Cryogenic Shipment',1850,1100,16,'cryogenic,shipper,cell-therapy');
    add_prod('immunoworks','Monoclonal Antibody Pilot Lot','Biologics','mAb Manufacturing',33400,24100,10,'monoclonal-antibody,pilot-lot,gmp');
    add_prod('immunoworks','High-Concentration Formulation Buffer','Pharma Excipients','Biologics Buffer',640,360,12,'formulation-buffer,biologics,excipient');
    add_prod('immunoworks','Host Cell Protein Assay Kit','Quality Control','Process Impurities',1280,780,2,'hcp,quality-control,bioprocess');
    add_prod('immunoworks','Protein A Resin Qualification Pack','Manufacturing Consumables','Chromatography',8800,6200,14,'protein-a,chromatography,qualification');
    add_prod('immunoworks','Bioburden Rapid Test Cartridge','Quality Control','Microbiology',920,520,2,'bioburden,microbiology,rapid-test');
    add_prod('preclinix','GLP Toxicology Study Kit','Preclinical','Toxicology',2400,1420,6,'glp,toxicology,preclinical');
    add_prod('preclinix','Animal Health Vaccine Batch','Vaccines','Animal Health',8700,5800,10,'animal-health,vaccine,batch');
    add_prod('preclinix','Bioanalytical Plasma Sample Set','Preclinical','Bioanalysis',680,360,5,'bioanalysis,plasma,sample-set');
    add_prod('preclinix','PK Sampling Visit Pack','Clinical Trial Supplies','PK Sampling',340,170,3,'pk,pharmacokinetics,visit-pack');
    add_prod('preclinix','GLP Histopathology Slide Set','Preclinical','Histopathology',1320,760,4,'histopathology,glp,slides');
    add_prod('cryograde','-80C Biologic Transport Lane','Cold Chain','Ultra-Low Temperature',3100,1900,24,'ultra-low,cold-chain,biologic');
    add_prod('cryograde','2-8C Vaccine Distribution Lane','Cold Chain','Refrigerated',1180,690,18,'vaccine,2-8c,refrigerated');
    add_prod('cryograde','Dry Ice Replenishment Service','Cold Chain','Dry Ice',420,240,30,'dry-ice,replenishment,shipment');
    add_prod('cryograde','Cryogenic Dewar Validation Pack','Cold Chain','Cryogenic Validation',2450,1510,20,'dewar,validation,cryogenic');
    add_prod('cryograde','Temperature Excursion Triage Kit','Quality Control','Excursion Management',860,410,2,'temperature-excursion,quality,cold-chain');
    add_prod('safegxp','FDA IND Submission Pack','Regulatory Services','IND',6200,3100,1,'fda,ind,regulatory');
    add_prod('safegxp','EMA Variation Dossier Review','Regulatory Services','EMA',7400,3850,1,'ema,variation,dossier');
    add_prod('safegxp','GxP Audit Evidence Bundle','Quality Compliance','GxP Audit',2850,1500,1,'gxp,audit,evidence');
    add_prod('safegxp','Labeling Change Impact Review','Regulatory Services','Labeling',1950,930,1,'labeling,change-control,regulatory');
    add_prod('safegxp','Pharmacovigilance Case Pack','Safety Operations','PV Case',520,230,1,'pharmacovigilance,safety,case');
    add_prod('sterileprocess','Single-Use Bioreactor Bag 500L','Manufacturing Consumables','Single Use',2200,1460,11,'single-use,bioreactor,manufacturing');
    add_prod('sterileprocess','Sterile Connector Assembly','Manufacturing Consumables','Fluid Path',480,260,2,'sterile-connector,fluid-path');
    add_prod('sterileprocess','Gamma-Irradiated Tubing Set','Manufacturing Consumables','Tubing',620,340,3,'gamma-irradiated,tubing,sterile');
    add_prod('sterileprocess','Depth Filter Capsule Set','Manufacturing Consumables','Filtration',1400,860,7,'depth-filter,filtration,bioprocess');
    add_prod('sterileprocess','Cleanroom Gowning Kit','Manufacturing Consumables','Cleanroom',58,29,1,'cleanroom,gowning,gmp');
    add_prod('greenlab','Sustainable Lab Plastics Kit','Lab Supplies','Consumables',185,92,5,'lab-plastics,sustainable,consumables');
    add_prod('greenlab','Validated Sample Return Mailer','Clinical Trial Supplies','Sample Logistics',72,35,1,'sample-return,mailer,trial');
    add_prod('greenlab','Ambient Biospecimen Ship Kit','Clinical Trial Supplies','Biospecimen',126,64,2,'biospecimen,ambient,shipping');
    add_prod('greenlab','Recyclable Cold Pack Set','Cold Chain','Passive Cooling',88,40,5,'cold-pack,recyclable,passive');
    add_prod('greenlab','Low-Waste Lab Starter Pack','Lab Supplies','Sustainable Lab',240,128,6,'low-waste,lab-supplies,sustainability');
    add_prod('medpack','Sterile Vial Stopper Set','Packaging Components','Container Closure',340,190,3,'vial-stopper,sterile,closure');
    add_prod('medpack','Prefilled Syringe Component Kit','Packaging Components','Device Components',920,520,4,'prefilled-syringe,device,packaging');
    add_prod('medpack','Autoinjector Assembly Lot','Combination Products','Autoinjector',8200,5600,9,'autoinjector,combination-product');
    add_prod('medpack','Tamper-Evident Carton Batch','Packaging Components','Serialization',260,135,7,'carton,serialization,tamper-evident');
    add_prod('medpack','UDI Label Validation Pack','Regulatory Services','UDI',780,390,1,'udi,label-validation,device');
    add_prod('catalysthub','Continuous Bioprocess Sensor Set','Manufacturing Analytics','Process Sensors',5600,3300,3,'bioprocess,sensor,continuous');
    add_prod('catalysthub','PAT Spectroscopy Model Pack','Manufacturing Analytics','PAT',7600,4400,1,'pat,spectroscopy,model');
    add_prod('catalysthub','Cell Culture Media Feed Lot','Bioprocess Materials','Media Feed',1180,720,18,'cell-culture,media-feed,bioprocess');
    add_prod('catalysthub','Viral Clearance Study Pack','Quality Control','Viral Clearance',9400,6100,2,'viral-clearance,quality,study');
    add_prod('catalysthub','Process Deviation Triage Service','Quality Compliance','Deviation',1750,820,1,'deviation,triage,quality');
    add_prod('purepac','Purified Water Monitoring Kit','Quality Control','Utilities',390,210,3,'purified-water,monitoring,gmp');
    add_prod('siliconeworks','Medical-Grade Silicone Tubing','Device Components','Tubing',520,310,5,'medical-grade,silicone,device');
    add_prod('endoclear','Endotoxin Removal Cartridge','Bioprocess Materials','Endotoxin Control',1480,920,4,'endotoxin,cartridge,bioprocess');
    add_prod('sterilityguard','Sterility Assurance Swab Pack','Quality Control','Sterility',260,120,1,'sterility,swab,environmental-monitoring');
    add_prod('stabilityco','Antioxidant Excipient Blend','Pharma Excipients','Stabilizers',640,390,6,'antioxidant,excipient,stability');
    add_prod('asepticoast','Aseptic Process Simulation Kit','Quality Control','Media Fill',3200,1980,8,'aseptic,media-fill,simulation');
    add_prod('citricsource','Citrate Buffer USP Batch','Pharma Excipients','Buffers',540,330,9,'citrate-buffer,usp,excipient');
    add_prod('wfidirect','Sterile WFI Vial Batch','Pharma Excipients','Water for Injection',780,460,10,'wfi,sterile,vial');
    add_prod('adhesiveone','Device Adhesive Biocompatibility Lot','Device Components','Biocompatible Adhesives',1450,920,3,'device,adhesive,biocompatibility');
    add_prod('medpropel','Medical-Grade Resin Cartridge','Device Components','Medical Device Material',1180,730,8,'medical-grade,resin,device');
    add_prod('cleansteamcare','Clean Steam Integrity Audit','Quality Compliance','Utilities Audit',2100,1160,1,'clean-steam,audit,gmp');
    add_prod('pharmaprep','USP Propylene Glycol Excipient','Pharma Excipients','Glycols',540,360,215,'usp,propylene-glycol,pharma');
    add_prod('cleansuite','Stainless Bioreactor Passivation Kit','Manufacturing Consumables','Passivation',680,410,7,'passivation,bioreactor,cleaning');
    add_prod('formulationbridge','Acrylic Device Housing Resin','Device Components','Device Housing',330,202,10,'device-housing,resin,medical-device');
    add_prod('finebiodirect','Trace Impurity Reference Standard','Quality Control','Reference Standards',1180,760,1,'impurity,reference-standard,qc');
    add_prod('portbio','Imported API Release Lot','Active Pharmaceutical Ingredients','API',9200,6800,12,'api,release-lot,import');
    add_prod('peptidepartners','Peptide Intermediate Batch','Active Pharmaceutical Ingredients','Peptide Intermediate',12600,9300,3,'peptide,intermediate,api');
    add_prod('labgradeconnect','Sodium Chloride USP Buffer Component','Lab Reagents','Salts',215,140,10,'sodium-chloride,usp,buffer');
    add_prod('specbioexchange','Specialty Amine API Intermediate','Active Pharmaceutical Ingredients','API Intermediate',6800,4300,4,'amine,api,intermediate');

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
    DBMS_OUTPUT.PUT_LINE('Life sciences products loaded: ' || v_idx);
END;
/

-- ============================================================
-- GENERATE INVENTORY (each product stocked at 5-15 random sites)
-- ============================================================
PROMPT Generating inventory...

DECLARE
    v_count       NUMBER := 0;
    v_num_centers NUMBER;
BEGIN
    FOR p IN (SELECT product_id FROM products) LOOP
        v_num_centers := FLOOR(DBMS_RANDOM.VALUE(5, 16));
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
    DBMS_OUTPUT.PUT_LINE('Inventory records loaded: ' || v_count);
END;
/
