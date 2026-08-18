/*
 * Keeps the bundled demo dataset time-relative when a persisted database
 * volume is reused after the original load date.
 */

SET SERVEROUTPUT ON
SET DEFINE OFF

PROMPT Refreshing demo data temporal anchor...

DECLARE
    v_is_demo        NUMBER := 1;
    v_anchor         TIMESTAMP;
    v_day_offset     NUMBER;
    v_rows_shifted   NUMBER := 0;

    PROCEDURE shift_timestamp(p_table_name IN VARCHAR2, p_column_name IN VARCHAR2) IS
        v_rows NUMBER := 0;
    BEGIN
        EXECUTE IMMEDIATE
            'UPDATE ' || p_table_name ||
            ' SET ' || p_column_name || ' = ' || p_column_name || ' + NUMTODSINTERVAL(:1, ''DAY'')' ||
            ' WHERE ' || p_column_name || ' IS NOT NULL'
            USING v_day_offset;
        v_rows := SQL%ROWCOUNT;
        v_rows_shifted := v_rows_shifted + v_rows;
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE NOT IN (-942, -904) THEN
                RAISE;
            END IF;
    END;

    PROCEDURE shift_date(p_table_name IN VARCHAR2, p_column_name IN VARCHAR2) IS
        v_rows NUMBER := 0;
    BEGIN
        EXECUTE IMMEDIATE
            'UPDATE ' || p_table_name ||
            ' SET ' || p_column_name || ' = TRUNC(' || p_column_name || ' + :1)' ||
            ' WHERE ' || p_column_name || ' IS NOT NULL'
            USING v_day_offset;
        v_rows := SQL%ROWCOUNT;
        v_rows_shifted := v_rows_shifted + v_rows;
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE NOT IN (-942, -904) THEN
                RAISE;
            END IF;
    END;
BEGIN
    BEGIN
        SELECT CASE WHEN LOWER(active_source) = 'demo' THEN 1 ELSE 0 END
        INTO v_is_demo
        FROM app_dataset_state
        WHERE state_id = 1;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            v_is_demo := 1;
        WHEN OTHERS THEN
            IF SQLCODE = -942 THEN
                v_is_demo := 1;
            ELSE
                RAISE;
            END IF;
    END;

    IF v_is_demo = 0 THEN
        DBMS_OUTPUT.PUT_LINE('Active dataset is custom; date refresh skipped.');
        RETURN;
    END IF;

    SELECT MAX(anchor_ts)
    INTO v_anchor
    FROM (
        SELECT MAX(posted_at) AS anchor_ts FROM social_posts
        UNION ALL SELECT MAX(created_at) FROM orders
        UNION ALL SELECT MAX(created_at) FROM shipments
        UNION ALL SELECT MAX(delivered_at) FROM shipments
        UNION ALL SELECT MAX(updated_at) FROM inventory
        UNION ALL SELECT MAX(last_mention) FROM brand_influencer_links
        UNION ALL SELECT MAX(last_interaction) FROM influencer_connections
    );

    IF v_anchor IS NULL THEN
        DBMS_OUTPUT.PUT_LINE('No temporal demo anchor found; date refresh skipped.');
        RETURN;
    END IF;

    v_day_offset := CAST(SYSTIMESTAMP AS DATE) - CAST(v_anchor AS DATE);

    IF ABS(v_day_offset) < (1 / 24) THEN
        DBMS_OUTPUT.PUT_LINE('Demo data is already anchored within one hour; date refresh skipped.');
        RETURN;
    END IF;

    shift_timestamp('brands', 'created_at');
    shift_timestamp('brands', 'updated_at');
    shift_date('products', 'launch_date');
    shift_timestamp('products', 'created_at');
    shift_timestamp('products', 'updated_at');
    shift_timestamp('fulfillment_centers', 'created_at');
    shift_timestamp('customers', 'created_at');
    shift_timestamp('influencers', 'created_at');
    shift_timestamp('social_posts', 'posted_at');
    shift_timestamp('social_posts', 'processed_at');
    shift_timestamp('social_posts', 'created_at');
    shift_timestamp('post_product_mentions', 'created_at');
    shift_date('orders', 'estimated_delivery');
    shift_date('orders', 'actual_delivery');
    shift_timestamp('orders', 'created_at');
    shift_timestamp('orders', 'updated_at');
    shift_date('inventory', 'last_restock_date');
    shift_timestamp('inventory', 'updated_at');
    shift_timestamp('shipments', 'shipped_at');
    shift_timestamp('shipments', 'delivered_at');
    shift_timestamp('shipments', 'created_at');
    shift_timestamp('demand_regions', 'updated_at');
    shift_date('demand_forecasts', 'forecast_date');
    shift_timestamp('demand_forecasts', 'created_at');
    shift_timestamp('influencer_connections', 'first_seen');
    shift_timestamp('influencer_connections', 'last_interaction');
    shift_timestamp('brand_influencer_links', 'first_mention');
    shift_timestamp('brand_influencer_links', 'last_mention');
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Demo data shifted by ' || ROUND(v_day_offset, 4) || ' day(s); temporal values updated: ' || v_rows_shifted);
END;
/
