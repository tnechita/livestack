SET SERVEROUTPUT ON
WHENEVER SQLERROR EXIT SQL.SQLCODE

DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM user_tab_cols
  WHERE table_name = 'ORDERS'
    AND column_name = 'CANCELLATION_REASON';

  IF v_count = 0 THEN
    EXECUTE IMMEDIATE 'ALTER TABLE orders ADD (cancellation_reason VARCHAR2(120))';
    DBMS_OUTPUT.PUT_LINE('Added ORDERS.CANCELLATION_REASON');
  ELSE
    DBMS_OUTPUT.PUT_LINE('ORDERS.CANCELLATION_REASON already exists');
  END IF;
END;
/

UPDATE orders
   SET cancellation_reason = CASE MOD(order_id, 8)
     WHEN 0 THEN 'Capacity unavailable at assigned terminal'
     WHEN 1 THEN 'Shipper cancelled tender'
     WHEN 2 THEN 'Missed pickup appointment window'
     WHEN 3 THEN 'Weather disruption on planned lane'
     WHEN 4 THEN 'Permit or documentation issue'
     WHEN 5 THEN 'Carrier no-show'
     WHEN 6 THEN 'Port appointment missed'
     ELSE 'Equipment unavailable for requested service'
   END
 WHERE order_status = 'cancelled'
   AND cancellation_reason IS NULL;

UPDATE orders
   SET cancellation_reason = NULL
 WHERE order_status <> 'cancelled'
   AND cancellation_reason IS NOT NULL;

COMMENT ON COLUMN orders.cancellation_reason IS 'Business reason for cancelled shipment orders, such as terminal capacity, missed pickup appointment, weather disruption, carrier no-show, or documentation issue.';

CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW orders_dv AS
SELECT JSON {
    '_id'         : o.order_id,
    'customerId'  : o.customer_id,
    'status'      : o.order_status,
    'cancellationReason' : o.cancellation_reason,
    'total'       : o.order_total,
    'shippingCost': o.shipping_cost,
    'demandScore' : o.demand_score,
    'createdAt'   : o.created_at,
    'items' : [
        SELECT JSON {
            'itemId'    : oi.item_id,
            'productId' : oi.product_id,
            'quantity'  : oi.quantity,
            'unitPrice' : oi.unit_price
        }
        FROM order_items oi WITH UPDATE
        WHERE oi.order_id = o.order_id
    ]
}
FROM orders o WITH UPDATE;

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

COMMIT;

SELECT COUNT(*) AS cancelled_orders_with_reasons
FROM orders
WHERE order_status = 'cancelled'
  AND cancellation_reason IS NOT NULL;

SELECT object_name, status
FROM user_objects
WHERE object_name IN ('ORDERS_DV', 'TRANSPORT_ORDERS_V')
ORDER BY object_name;
