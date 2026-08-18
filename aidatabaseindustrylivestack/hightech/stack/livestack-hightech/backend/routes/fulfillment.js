/**
 * Fulfillment API — Spatial routing and warehouse management
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');

const SPATIAL_NN_PARAMETERS = 'sdo_batch_size=50 unit=KM';

function metricValue(row, columnName) {
  const value = row?.[columnName] ?? row?.[columnName.toUpperCase()] ?? 0;
  return Number(value) || 0;
}

function rowValue(row, columnName) {
  return row?.[columnName] ?? row?.[columnName.toUpperCase()] ?? row?.[columnName.toLowerCase()];
}

function boundedResultCount(value, fallback = 5) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, 20);
}

function finiteCoordinate(value, min, max) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

// GET /api/fulfillment/kpis
// VPD-aware KPI rollup for the Supply & Commitment Control Tower.
router.get('/kpis', async (req, res) => {
  try {
    const result = await db.executeAsUser(`
      SELECT
        (SELECT COUNT(*)
         FROM fulfillment_centers fc
         WHERE fc.is_active = 1) AS active_supply_site_count,
        (SELECT NVL(SUM(GREATEST(i.quantity_on_hand - NVL(i.quantity_reserved, 0), 0)), 0)
         FROM inventory i
         JOIN fulfillment_centers fc ON fc.center_id = i.center_id
         WHERE fc.is_active = 1) AS available_capacity_units,
        (SELECT COUNT(*)
         FROM orders o
         WHERE o.order_status IN ('pending','confirmed','processing')) AS customer_commitment_count,
        (SELECT COUNT(*)
         FROM inventory i
         JOIN fulfillment_centers fc ON fc.center_id = i.center_id
         WHERE fc.is_active = 1
           AND i.quantity_on_hand <= i.reorder_point) AS component_shortage_alert_count,
        (SELECT COUNT(*)
         FROM inventory i
         JOIN fulfillment_centers fc ON fc.center_id = i.center_id
         WHERE fc.is_active = 1
           AND (i.quantity_on_hand = 0 OR i.quantity_on_hand <= i.reorder_point * 0.5)) AS critical_supply_alert_count,
        (SELECT COUNT(*)
         FROM (
           SELECT fc.center_id,
                  ROUND(NVL(SUM(i.quantity_on_hand), 0) / NULLIF(fc.capacity_units, 0) * 100, 1) AS load_pct
           FROM fulfillment_centers fc
           LEFT JOIN inventory i ON i.center_id = fc.center_id
           WHERE fc.is_active = 1
           GROUP BY fc.center_id, fc.capacity_units
         )
         WHERE load_pct >= 85) AS constrained_capacity_site_count,
        (SELECT COUNT(*)
         FROM demand_forecasts df
         WHERE df.forecast_date BETWEEN TRUNC(SYSDATE) AND TRUNC(SYSDATE) + 7
           AND NVL(df.social_factor, 1) >= 1.35) AS volatile_demand_signal_count
      FROM dual
    `, {}, req.demoUser);

    const row = result.rows?.[0] || {};
    res.json({
      active_supply_site_count: metricValue(row, 'active_supply_site_count'),
      available_capacity_units: metricValue(row, 'available_capacity_units'),
      customer_commitment_count: metricValue(row, 'customer_commitment_count'),
      component_shortage_alert_count: metricValue(row, 'component_shortage_alert_count'),
      critical_supply_alert_count: metricValue(row, 'critical_supply_alert_count'),
      constrained_capacity_site_count: metricValue(row, 'constrained_capacity_site_count'),
      volatile_demand_signal_count: metricValue(row, 'volatile_demand_signal_count'),
      narrative: 'Supply & Commitment Control Tower KPIs combine product capacity, fab and contract manufacturing constraints, component shortages, order promising exposure, and customer commitments.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fulfillment/centers
// VPD: sc_security_ctx filters fulfillment_centers by user's role/region
router.get('/centers', async (req, res) => {
  try {
    const result = await db.executeAsUser(`
      SELECT fc.center_id, fc.center_name, fc.center_type,
             fc.city, fc.state_province, fc.postal_code,
             fc.latitude, fc.longitude, fc.capacity_units,
             ROUND(NVL((SELECT SUM(i2.quantity_on_hand) FROM inventory i2
               WHERE i2.center_id = fc.center_id) / NULLIF(fc.capacity_units, 0) * 100, 0), 1) AS current_load_pct,
             fc.is_active,
             (SELECT COUNT(DISTINCT i.product_id) FROM inventory i
              WHERE i.center_id = fc.center_id AND i.quantity_on_hand > 0) AS products_stocked,
             (SELECT SUM(i.quantity_on_hand) FROM inventory i
              WHERE i.center_id = fc.center_id) AS total_units,
             (SELECT COUNT(*) FROM orders o
              WHERE o.fulfillment_center_id = fc.center_id
                AND o.order_status IN ('pending','confirmed','processing')) AS pending_shipments
      FROM fulfillment_centers fc
      WHERE fc.is_active = 1
      ORDER BY fc.center_name
    `, {}, req.demoUser);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fulfillment/spatial-readiness
// Executes the same indexed-candidate/exact-ranking strategy as /nearest, then
// reads the actual cursor plan on the same connection for live UI evidence.
router.get('/spatial-readiness', async (req, res) => {
  try {
    const evidence = await db.withUserConnection(req.demoUser, async ({ execute }) => {
      const probe = await execute(`
        WITH origin AS (
          SELECT location
          FROM (
            SELECT customer.location
            FROM customers customer
            WHERE customer.location IS NOT NULL
            ORDER BY customer.customer_id
          )
          WHERE ROWNUM = 1
        ),
        indexed_candidates AS (
          SELECT /*+ GATHER_PLAN_STATISTICS LEADING(origin) USE_NL(center) INDEX(center idx_fc_spatial) */
                 /* HIGHTECH_SPATIAL_NN_API_PROOF */
                 center.center_id,
                 center.location AS center_location,
                 origin.location AS origin_location
          FROM origin
          JOIN fulfillment_centers center
            ON SDO_NN(
                 center.location,
                 origin.location,
                 '${SPATIAL_NN_PARAMETERS}'
               ) = 'TRUE'
          WHERE center.is_active = 1
        ),
        measured_candidates AS (
          SELECT candidate.center_id,
                 ROUND(
                   SDO_GEOM.SDO_DISTANCE(
                     candidate.origin_location,
                     candidate.center_location,
                     0.005,
                     'unit=KM'
                   ),
                   2
                 ) AS distance_km
          FROM indexed_candidates candidate
        )
        SELECT center_id, distance_km
        FROM measured_candidates
        ORDER BY distance_km, center_id
        FETCH FIRST 3 ROWS ONLY
      `);

      const planResult = await execute(`
        SELECT plan_table_output
        FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR(NULL, NULL, 'BASIC +ALLSTATS LAST'))
      `);
      const planLines = (planResult.rows || [])
        .map((row) => String(rowValue(row, 'plan_table_output') || ''));
      const indexPlanLine = planLines.find((line) => (
        /\|\s*\*?\s*\d+\s*\|\s*DOMAIN INDEX[^|]*\|/i.test(line)
        && /\|\s*IDX_FC_SPATIAL\s*\|/i.test(line)
      )) || null;

      const indexResult = await execute(`
        SELECT index_name, status, domidx_status, domidx_opstatus
        FROM user_indexes
        WHERE index_name = 'IDX_FC_SPATIAL'
          AND table_name = 'FULFILLMENT_CENTERS'
          AND ityp_owner = 'MDSYS'
          AND ityp_name = 'SPATIAL_INDEX_V2'
      `);
      const indexRow = indexResult.rows?.[0] || {};
      const indexReady = rowValue(indexRow, 'status') === 'VALID'
        && rowValue(indexRow, 'domidx_status') === 'VALID'
        && rowValue(indexRow, 'domidx_opstatus') === 'VALID';
      const probeRowCount = (probe.rows || []).length;
      const executionReady = probeRowCount > 0;

      return {
        status: indexReady && Boolean(indexPlanLine) && executionReady ? 'ACTIVE' : 'INCOMPLETE',
        strategy: 'SDO_NN indexed candidates -> SDO_GEOM.SDO_DISTANCE exact ranking',
        candidate_operator: 'SDO_NN',
        exact_rank_operator: 'SDO_GEOM.SDO_DISTANCE',
        index_name: rowValue(indexRow, 'index_name') || 'IDX_FC_SPATIAL',
        index_status: indexReady ? 'VALID' : 'INVALID',
        plan_operator: indexPlanLine ? 'DOMAIN INDEX' : null,
        plan_evidence: indexPlanLine?.trim() || null,
        probe_result_count: probeRowCount,
      };
    }, { readOnly: true });

    res.json(evidence);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fulfillment/nearest — indexed candidates, then exact distance ranking
router.get('/nearest', async (req, res) => {
  try {
    const { customerId, productId, lat, lon, maxResults = 5 } = req.query;
    const resultCount = boundedResultCount(maxResults);
    const hasCustomerId = customerId !== undefined && customerId !== '';
    const hasProductId = productId !== undefined && productId !== '';
    const hasLatitude = lat !== undefined && lat !== '';
    const hasLongitude = lon !== undefined && lon !== '';

    let result;
    if (hasCustomerId && hasProductId) {
      const parsedCustomerId = Number.parseInt(customerId, 10);
      const parsedProductId = Number.parseInt(productId, 10);
      if (!Number.isSafeInteger(parsedCustomerId) || parsedCustomerId < 1
          || !Number.isSafeInteger(parsedProductId) || parsedProductId < 1) {
        return res.status(400).json({ error: 'customerId and productId must be positive integers' });
      }

      result = await db.executeAsUser(`
        WITH origin AS (
          SELECT customer.location
          FROM customers customer
          WHERE customer.customer_id = :customerId
            AND customer.location IS NOT NULL
        ),
        indexed_candidates AS (
          SELECT /*+ LEADING(origin) USE_NL(center) INDEX(center idx_fc_spatial) */
                 center.center_id, center.center_name, center.city, center.state_province,
                 center.center_type, center.latitude, center.longitude,
                 center.location AS center_location,
                 origin.location AS origin_location
          FROM origin
          JOIN fulfillment_centers center
            ON SDO_NN(
                 center.location,
                 origin.location,
                 '${SPATIAL_NN_PARAMETERS}'
               ) = 'TRUE'
          WHERE center.is_active = 1
        ),
        available_candidates AS (
          SELECT candidate.*, inventory.quantity_on_hand
          FROM indexed_candidates candidate
          JOIN inventory
            ON inventory.center_id = candidate.center_id
           AND inventory.product_id = :productId
          WHERE inventory.quantity_on_hand > inventory.quantity_reserved
        ),
        measured_candidates AS (
          SELECT candidate.*,
                 ROUND(
                   SDO_GEOM.SDO_DISTANCE(
                     candidate.origin_location,
                     candidate.center_location,
                     0.005,
                     'unit=KM'
                   ),
                   2
                 ) AS distance_km
          FROM available_candidates candidate
        )
        SELECT center_id, center_name, city, state_province,
               center_type, latitude, longitude, quantity_on_hand,
               distance_km,
               ROUND(distance_km / 80, 1) AS estimated_hours
        FROM measured_candidates
        ORDER BY distance_km, center_id
        FETCH FIRST :maxResults ROWS ONLY
      `, {
        customerId: parsedCustomerId,
        productId: parsedProductId,
        maxResults: resultCount,
      }, req.demoUser);
    } else if (hasLatitude && hasLongitude) {
      const parsedLatitude = finiteCoordinate(lat, -90, 90);
      const parsedLongitude = finiteCoordinate(lon, -180, 180);
      if (parsedLatitude === null || parsedLongitude === null) {
        return res.status(400).json({ error: 'lat and lon must be valid WGS-84 coordinates' });
      }

      result = await db.executeAsUser(`
        WITH origin AS (
          SELECT SDO_GEOMETRY(
                   2001,
                   4326,
                   SDO_POINT_TYPE(:lon, :lat, NULL),
                   NULL,
                   NULL
                 ) AS location
          FROM dual
        ),
        indexed_candidates AS (
          SELECT /*+ LEADING(origin) USE_NL(center) INDEX(center idx_fc_spatial) */
                 center.center_id, center.center_name, center.city, center.state_province,
                 center.center_type, center.latitude, center.longitude,
                 center.location AS center_location,
                 origin.location AS origin_location
          FROM origin
          JOIN fulfillment_centers center
            ON SDO_NN(
                 center.location,
                 origin.location,
                 '${SPATIAL_NN_PARAMETERS}'
               ) = 'TRUE'
          WHERE center.is_active = 1
        ),
        measured_candidates AS (
          SELECT candidate.*,
                 ROUND(
                   SDO_GEOM.SDO_DISTANCE(
                     candidate.origin_location,
                     candidate.center_location,
                     0.005,
                     'unit=KM'
                   ),
                   2
                 ) AS distance_km
          FROM indexed_candidates candidate
        )
        SELECT center_id, center_name, city, state_province,
               center_type, latitude, longitude, distance_km
        FROM measured_candidates
        ORDER BY distance_km, center_id
        FETCH FIRST :maxResults ROWS ONLY
      `, {
        lat: parsedLatitude,
        lon: parsedLongitude,
        maxResults: resultCount,
      }, req.demoUser);
    } else {
      return res.status(400).json({ error: 'Provide customerId+productId or lat+lon' });
    }

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fulfillment/shipments
router.get('/shipments', async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    let where = '1=1';
    const binds = { limit: parseInt(limit) };

    if (status) { where += " AND s.ship_status = :status"; binds.status = status; }

    const result = await db.executeAsUser(`
      SELECT s.shipment_id, s.order_id, s.carrier, s.tracking_number,
             s.ship_status, s.distance_km,
             ROUND(s.distance_km * 0.621371, 2) AS distance_miles,
             s.estimated_hours, s.ship_cost,
             s.shipped_at, s.delivered_at,
             fc.center_name, fc.city AS center_city, fc.latitude AS center_lat, fc.longitude AS center_lon,
             c.city AS customer_city, c.latitude AS customer_lat, c.longitude AS customer_lon
      FROM shipments s
      JOIN fulfillment_centers fc ON s.center_id = fc.center_id
      JOIN orders o ON s.order_id = o.order_id
      JOIN customers c ON o.customer_id = c.customer_id
      WHERE ${where}
      ORDER BY s.created_at DESC
      FETCH FIRST :limit ROWS ONLY
    `, binds, req.demoUser);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fulfillment/inventory-alerts
router.get('/inventory-alerts', async (req, res) => {
  try {
    const result = await db.executeAsUser(`
      WITH forecast_stats AS (
        SELECT product_id,
               SUM(NVL(predicted_demand, 0)) AS predicted_demand,
               MAX(NVL(social_factor, 1.0)) AS social_factor
        FROM demand_forecasts
        WHERE forecast_date = TRUNC(SYSDATE)
        GROUP BY product_id
      )
      SELECT p.product_id, p.product_name, p.category,
             b.brand_name,
             i.center_id, fc.center_name, fc.city,
             i.quantity_on_hand, i.reorder_point,
             i.quantity_on_hand - i.reorder_point AS deficit,
             NVL(df.social_factor, 1.0) AS social_factor,
             NVL(df.predicted_demand, 0) AS predicted_demand,
             GREATEST(NVL(df.predicted_demand, 0) - i.quantity_on_hand, 0) AS shortage_units,
             CASE
                 WHEN i.quantity_on_hand = 0 THEN 'out_of_stock'
                 WHEN i.quantity_on_hand < i.reorder_point * 0.5 THEN 'critical'
                 WHEN i.quantity_on_hand < i.reorder_point THEN 'low'
                 ELSE 'adequate'
             END AS stock_status,
             CASE
                 WHEN i.quantity_on_hand = 0 OR NVL(df.predicted_demand, 0) > i.quantity_on_hand THEN 'shortage'
                 ELSE 'watchlist'
             END AS alert_group,
             CASE
                 WHEN i.quantity_on_hand = 0 THEN 'No stock is available for current or forecast demand.'
                 WHEN NVL(df.predicted_demand, 0) > i.quantity_on_hand
                   THEN 'Forecast need exceeds stock on hand by ' || TO_CHAR(ROUND(df.predicted_demand - i.quantity_on_hand)) || ' units.'
                 WHEN NVL(df.predicted_demand, 0) = 0
                   THEN 'No current forecast need; monitored because stock is below its reorder threshold.'
                 WHEN NVL(df.social_factor, 1.0) >= 1.35
                   THEN 'Current forecast need is covered; monitored because demand volatility is elevated.'
                 ELSE 'Current forecast need is covered; monitored because stock is below its reorder threshold.'
             END AS alert_reason
      FROM inventory i
      JOIN products p ON i.product_id = p.product_id
      JOIN brands b ON p.brand_id = b.brand_id
      JOIN fulfillment_centers fc ON i.center_id = fc.center_id
      LEFT JOIN forecast_stats df ON p.product_id = df.product_id
      WHERE i.quantity_on_hand <= i.reorder_point
        AND fc.is_active = 1
      ORDER BY alert_group, shortage_units DESC, social_factor DESC, i.quantity_on_hand ASC
      FETCH FIRST 50 ROWS ONLY
    `, {}, req.demoUser);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fulfillment/customers
// Returns customer lat/lon + tier for the Customer Tier spatial layer
router.get('/customers', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 800, 2000);
    const result = await db.execute(`
      SELECT customer_id,
             customer_tier,
             ROUND(latitude, 4)        AS latitude,
             ROUND(longitude, 4)       AS longitude,
             city,
             state_province,
             ROUND(lifetime_value, 0)  AS lifetime_value
      FROM   customers
      WHERE  latitude  IS NOT NULL
        AND  longitude IS NOT NULL
      FETCH FIRST :limit ROWS ONLY
    `, { limit });
    res.json(result.rows);
  } catch (err) {
    console.error('Customers layer error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fulfillment/zones
// Returns service zone polygons. If fulfillment_zones is empty, generates
// virtual zones (express/standard/economy) from center coordinates with
// radius values (km) for the frontend to draw as Leaflet Circle overlays.
router.get('/zones', async (req, res) => {
  try {
    // Try DB zones first — include radius mapping so frontend can draw Circles
    const RADIUS_MAP = { express: 80, overnight: 160, standard: 250, economy: 500 };
    const dbResult = await db.executeAsUser(`
      SELECT fz.zone_id, fz.center_id, fz.zone_type, fz.max_delivery_hrs,
             fc.center_name, fc.center_type,
             fc.latitude, fc.longitude
      FROM   fulfillment_zones fz
      JOIN   fulfillment_centers fc ON fz.center_id = fc.center_id
      WHERE  fc.is_active = 1
      ORDER  BY fc.center_name, fz.zone_type
    `, {}, req.demoUser);

    if (dbResult.rows.length > 0) {
      const zones = dbResult.rows.map(z => ({
        ...z,
        RADIUS_KM: RADIUS_MAP[z.ZONE_TYPE] || 250,
      }));
      return res.json({ source: 'database', zones });
    }

    // Fallback: generate virtual zones from centers
    const centers = await db.executeAsUser(`
      SELECT center_id, center_name, center_type, latitude, longitude
      FROM   fulfillment_centers
      WHERE  is_active = 1 AND latitude IS NOT NULL
      ORDER  BY center_name
    `, {}, req.demoUser);

    const ZONE_RADII = [
      { type: 'express',  km: 80,  hrs: 8  },
      { type: 'standard', km: 250, hrs: 24 },
      { type: 'economy',  km: 500, hrs: 72 },
    ];

    const virtualZones = [];
    centers.rows.forEach(c => {
      ZONE_RADII.forEach(z => {
        virtualZones.push({
          ZONE_TYPE:        z.type,
          CENTER_ID:        c.CENTER_ID,
          CENTER_NAME:      c.CENTER_NAME,
          CENTER_TYPE:      c.CENTER_TYPE,
          LATITUDE:         c.LATITUDE,
          LONGITUDE:        c.LONGITUDE,
          RADIUS_KM:        z.km,
          MAX_DELIVERY_HRS: z.hrs,
        });
      });
    });

    res.json({ source: 'virtual', zones: virtualZones });
  } catch (err) {
    console.error('Zones error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fulfillment/demand-regions
// Returns demand_regions polygons with forecast summary, colored by demand_index.
// SDO_UTIL.TO_GEOJSON converts Oracle SDO_GEOMETRY → GeoJSON string.
// Joins to demand_forecasts by region_name for 7-day forecast context.
router.get('/demand-regions', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT r.region_id,
             r.region_name,
             r.region_type,
             r.population,
             ROUND(r.avg_income, 0)     AS avg_income,
             ROUND(r.social_density, 1) AS social_density,
             r.demand_index,
             TO_CHAR(SDO_UTIL.TO_GEOJSON(r.boundary)) AS geojson,
             (SELECT ROUND(AVG(df.predicted_demand), 0)
              FROM demand_forecasts df
              WHERE UPPER(df.region) = UPPER(r.region_name)
                AND df.forecast_date BETWEEN TRUNC(SYSDATE) AND TRUNC(SYSDATE) + 7
             ) AS avg_7day_forecast,
             (SELECT ROUND(MAX(df.social_factor), 2)
              FROM demand_forecasts df
              WHERE UPPER(df.region) = UPPER(r.region_name)
                AND df.forecast_date BETWEEN TRUNC(SYSDATE) AND TRUNC(SYSDATE) + 7
             ) AS peak_social_factor,
             (SELECT COUNT(DISTINCT df.product_id)
              FROM demand_forecasts df
              WHERE UPPER(df.region) = UPPER(r.region_name)
             ) AS forecast_products
      FROM demand_regions r
      ORDER BY r.demand_index DESC
    `);

    // SDO_UTIL.TO_GEOJSON returns GeoJSON with [lon, lat] pairs.
    // Swap to [lat, lon] for Leaflet Polygon compatibility.
    const regions = result.rows.map(r => {
      let coords = null;
      if (r.GEOJSON) {
        try {
          const geo = JSON.parse(r.GEOJSON);
          coords = (geo.coordinates?.[0] || []).map(([lon, lat]) => [lat, lon]);
        } catch (_) { /* malformed geometry — skip */ }
      }
      return { ...r, COORDS: coords };
    });

    res.json(regions);
  } catch (err) {
    console.error('Demand regions error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
