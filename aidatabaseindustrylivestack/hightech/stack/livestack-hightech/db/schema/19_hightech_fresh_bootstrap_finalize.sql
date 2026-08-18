/*
 * Fresh-bootstrap derived-data finalizer.
 *
 * The base schema creates Spatial and native JSON objects before demo rows are
 * loaded. Rebuild their row-derived state after load and on every retained
 * database startup so a clean Compose deployment is feature-ready without
 * requiring Restore Demo Data.
 */

UPDATE fulfillment_centers
SET location = SDO_GEOMETRY(
    2001,
    4326,
    SDO_POINT_TYPE(longitude, latitude, NULL),
    NULL,
    NULL
)
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL;

UPDATE customers
SET location = SDO_GEOMETRY(
    2001,
    4326,
    SDO_POINT_TYPE(longitude, latitude, NULL),
    NULL,
    NULL
)
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL;

MERGE INTO product_attributes target
USING (
    SELECT p.product_id,
           JSON_OBJECT(
               'sku' VALUE p.sku,
               'productName' VALUE p.product_name,
               'category' VALUE p.category,
               'subcategory' VALUE p.subcategory,
               'commercial' VALUE JSON_OBJECT(
                   'unitPrice' VALUE p.unit_price,
                   'unitCost' VALUE p.unit_cost
                   RETURNING JSON
               ),
               'lifecycle' VALUE JSON_OBJECT(
                   'active' VALUE p.is_active,
                   'launchDate' VALUE TO_CHAR(p.launch_date, 'YYYY-MM-DD')
                   RETURNING JSON
               ),
               'tags' VALUE p.tags
               RETURNING JSON
           ) AS attributes
    FROM products p
) incoming
ON (target.product_id = incoming.product_id)
WHEN MATCHED THEN UPDATE SET
    target.attributes = incoming.attributes
WHEN NOT MATCHED THEN INSERT (
    product_id,
    attributes
) VALUES (
    incoming.product_id,
    incoming.attributes
);

DECLARE
    product_count         PLS_INTEGER;
    bootstrap_event_count PLS_INTEGER;
BEGIN
    SELECT COUNT(*) INTO product_count FROM products;
    SELECT COUNT(*)
      INTO bootstrap_event_count
      FROM event_stream
     WHERE event_type = 'product_catalog_bootstrapped'
       AND event_source = 'fresh_bootstrap';

    IF bootstrap_event_count > 0
       AND bootstrap_event_count <> product_count THEN
        RAISE_APPLICATION_ERROR(
            -20422,
            'Pre-existing fresh-bootstrap event evidence is partial'
        );
    END IF;
END;
/

MERGE INTO event_stream target
USING (
    SELECT 'fresh-bootstrap-product-' || TO_CHAR(p.product_id) AS correlation_id,
           JSON_OBJECT(
               'productId' VALUE p.product_id,
               'sku' VALUE p.sku,
               'category' VALUE p.category,
               'active' VALUE p.is_active,
               'datasetVersion' VALUE 'v1'
               RETURNING JSON
           ) AS event_data
    FROM products p
    WHERE NOT EXISTS (
              SELECT 1
              FROM event_stream
          )
       OR EXISTS (
              SELECT 1
              FROM event_stream
              WHERE event_type = 'product_catalog_bootstrapped'
                AND event_source = 'fresh_bootstrap'
          )
) incoming
ON (
    target.event_type = 'product_catalog_bootstrapped'
    AND target.event_source = 'fresh_bootstrap'
    AND target.correlation_id = incoming.correlation_id
)
WHEN MATCHED THEN UPDATE SET
    target.event_data = incoming.event_data,
    target.processed = 0
WHEN NOT MATCHED THEN INSERT (
    event_type,
    event_source,
    event_data,
    correlation_id,
    processed
) VALUES (
    'product_catalog_bootstrapped',
    'fresh_bootstrap',
    incoming.event_data,
    incoming.correlation_id,
    0
);

DECLARE
    product_count           PLS_INTEGER;
    attribute_count         PLS_INTEGER;
    event_count             PLS_INTEGER;
    bootstrap_event_count   PLS_INTEGER;
    center_count            PLS_INTEGER;
    center_location_count   PLS_INTEGER;
    customer_count          PLS_INTEGER;
    customer_location_count PLS_INTEGER;
BEGIN
    SELECT COUNT(*) INTO product_count FROM products;
    SELECT COUNT(*) INTO attribute_count FROM product_attributes;
    SELECT COUNT(*) INTO event_count FROM event_stream;
    SELECT COUNT(*)
      INTO bootstrap_event_count
      FROM event_stream
     WHERE event_type = 'product_catalog_bootstrapped'
       AND event_source = 'fresh_bootstrap';
    SELECT COUNT(*) INTO center_count
      FROM fulfillment_centers
     WHERE latitude IS NOT NULL
       AND longitude IS NOT NULL;
    SELECT COUNT(*) INTO center_location_count
      FROM fulfillment_centers
     WHERE latitude IS NOT NULL
       AND longitude IS NOT NULL
       AND location IS NOT NULL;
    SELECT COUNT(*) INTO customer_count
      FROM customers
     WHERE latitude IS NOT NULL
       AND longitude IS NOT NULL;
    SELECT COUNT(*) INTO customer_location_count
      FROM customers
     WHERE latitude IS NOT NULL
       AND longitude IS NOT NULL
       AND location IS NOT NULL;

    IF product_count < 1
       OR attribute_count <> product_count
       OR event_count < 1
       OR bootstrap_event_count NOT IN (0, product_count)
       OR center_count < 1
       OR center_location_count <> center_count
       OR customer_count < 1
       OR customer_location_count <> customer_count THEN
        RAISE_APPLICATION_ERROR(
            -20420,
            'Fresh-bootstrap native JSON or Spatial derived data is incomplete'
        );
    END IF;
END;
/

SELECT
    (SELECT COUNT(*) FROM product_attributes) AS product_attributes,
    (SELECT COUNT(*) FROM event_stream
      WHERE event_type = 'product_catalog_bootstrapped'
        AND event_source = 'fresh_bootstrap') AS bootstrap_events,
    (SELECT COUNT(*) FROM fulfillment_centers
      WHERE location IS NOT NULL) AS center_locations,
    (SELECT COUNT(*) FROM customers
      WHERE location IS NOT NULL) AS customer_locations
FROM dual;
