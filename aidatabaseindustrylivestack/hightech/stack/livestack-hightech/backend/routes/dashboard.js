/**
 * Dashboard API — Aggregated metrics for the main dashboard
 *
 * Uses data-relative timestamps (MAX posted_at / created_at) instead of
 * SYSTIMESTAMP so demo data always appears "fresh" regardless of load date.
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM orders) AS orders_total,
        (SELECT COUNT(*) FROM orders WHERE created_at >= (SELECT MAX(created_at) FROM orders) - INTERVAL '7' DAY) AS orders_7d,
        (SELECT COUNT(*) FROM orders WHERE created_at >= (SELECT MAX(created_at) FROM orders) - INTERVAL '30' DAY) AS orders_30d,
        (SELECT NVL(SUM(order_total), 0) FROM orders) AS revenue_total,
        (SELECT NVL(SUM(order_total), 0) FROM orders WHERE created_at >= (SELECT MAX(created_at) FROM orders) - INTERVAL '7' DAY) AS revenue_7d,
        (SELECT NVL(SUM(order_total), 0) FROM orders WHERE created_at >= (SELECT MAX(created_at) FROM orders) - INTERVAL '30' DAY) AS revenue_30d,
        (SELECT COUNT(*) FROM social_posts WHERE momentum_flag IN ('viral','mega_viral')) AS viral_posts,
        (SELECT COUNT(*) FROM social_posts WHERE momentum_flag = 'rising') AS rising_posts,
        (SELECT COUNT(*) FROM social_posts) AS posts_total,
        (SELECT COUNT(DISTINCT product_id) FROM post_product_mentions
         WHERE post_id IN (SELECT post_id FROM social_posts WHERE momentum_flag IN ('viral','mega_viral'))) AS trending_products,
        (SELECT COUNT(*) FROM agent_actions) AS agent_actions_total,
        (SELECT COUNT(*) FROM shipments WHERE ship_status = 'in_transit') AS shipments_in_transit
      FROM dual
    `);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/trending-products
// Supports: ?limit=10 &search=<product/brand text> &brand=<exact brand name>
router.get('/trending-products', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 10, 100);
    const search = (req.query.search || '').trim();
    const brand  = (req.query.brand  || '').trim();

    let whereExtra = '';
    const binds = { limit };

    if (search) {
      whereExtra += " AND (UPPER(p.product_name) LIKE UPPER(:search) OR UPPER(b.brand_name) LIKE UPPER(:search))";
      binds.search = `%${search}%`;
    }
    if (brand) {
      whereExtra += " AND UPPER(b.brand_name) = UPPER(:brand)";
      binds.brand = brand;
    }

    const result = await db.execute(`
      WITH signal_stats AS (
        SELECT ppm.product_id,
               COUNT(DISTINCT ppm.post_id) AS mention_count,
               SUM(sp.likes_count) AS total_likes,
               SUM(sp.shares_count) AS total_shares,
               SUM(sp.views_count) AS total_views,
               ROUND(AVG(sp.virality_score), 2) AS avg_virality,
               MAX(CASE sp.momentum_flag
                     WHEN 'mega_viral' THEN 4
                     WHEN 'viral' THEN 3
                     WHEN 'rising' THEN 2
                     ELSE 1
                   END) AS peak_momentum_rank
        FROM post_product_mentions ppm
        JOIN social_posts sp ON ppm.post_id = sp.post_id
        WHERE sp.posted_at >= (SELECT MAX(posted_at) FROM social_posts) - INTERVAL '7' DAY
        GROUP BY ppm.product_id
      ),
      supply_stats AS (
        SELECT i.product_id,
               SUM(GREATEST(i.quantity_on_hand - NVL(i.quantity_reserved, 0), 0)) AS available_units,
               COUNT(DISTINCT CASE
                 WHEN i.quantity_on_hand - NVL(i.quantity_reserved, 0) > 0 THEN i.center_id
               END) AS flexible_sites
        FROM inventory i
        GROUP BY i.product_id
      ),
      request_stats AS (
        SELECT oi.product_id, SUM(oi.quantity) AS requested_units
        FROM order_items oi
        JOIN orders o ON o.order_id = oi.order_id
        WHERE o.order_status NOT IN ('cancelled', 'returned')
          AND o.created_at >= (SELECT MAX(created_at) FROM orders) - INTERVAL '30' DAY
        GROUP BY oi.product_id
      )
      SELECT p.product_id, p.product_name, p.category, p.unit_price,
             b.brand_name, b.social_tier,
             ss.mention_count, ss.total_likes, ss.total_shares, ss.total_views,
             ss.avg_virality,
             CASE ss.peak_momentum_rank
               WHEN 4 THEN 'mega_viral'
               WHEN 3 THEN 'viral'
               WHEN 2 THEN 'rising'
               ELSE 'normal'
             END AS peak_momentum,
             NVL(sup.available_units, 0) AS available_units,
             NVL(sup.flexible_sites, 0) AS flexible_sites,
             NVL(req.requested_units, 0) AS requested_units,
             ROUND(LEAST(100,
               NVL(ss.avg_virality, 0) * 0.45
               + LEAST(NVL(ss.mention_count, 0), 100) * 0.20
               + LEAST(NVL(ss.total_views, 0) / 100000, 15)
               + CASE
                   WHEN NVL(sup.available_units, 0) = 0 THEN 15
                   ELSE LEAST(15, NVL(req.requested_units, 0) / sup.available_units * 15)
                 END
               + CASE
                   WHEN NVL(sup.flexible_sites, 0) <= 1 THEN 5
                   WHEN NVL(sup.flexible_sites, 0) = 2 THEN 2
                   ELSE 0
                 END
             ), 0) AS constraint_risk
      FROM products p
      JOIN brands b ON p.brand_id = b.brand_id
      JOIN signal_stats ss ON ss.product_id = p.product_id
      LEFT JOIN supply_stats sup ON sup.product_id = p.product_id
      LEFT JOIN request_stats req ON req.product_id = p.product_id
      WHERE 1 = 1
      ${whereExtra}
      ORDER BY constraint_risk DESC, ss.avg_virality DESC, ss.total_views DESC
      FETCH FIRST :limit ROWS ONLY
    `, binds);

    res.json(result.rows);
  } catch (err) {
    console.error('Trending products error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/social-velocity?hours=48
router.get('/social-velocity', async (req, res) => {
  try {
    const hours = Math.min(Math.max(parseInt(req.query.hours) || 48, 1), 8760); // 1h–1yr

    // Pick truncation granularity based on range so we get ~20-60 buckets
    let truncFmt, labelFmt;
    if (hours <= 6) {
      // Per-hour buckets, show HH:MI
      truncFmt = "'HH'";
      labelFmt = "'YYYY-MM-DD HH24:MI'";
    } else if (hours <= 168) {
      // ≤7 days → hourly buckets
      truncFmt = "'HH'";
      labelFmt = "'YYYY-MM-DD HH24:MI'";
    } else if (hours <= 1440) {
      // ≤60 days → daily buckets
      truncFmt = "'DD'";
      labelFmt = "'YYYY-MM-DD'";
    } else {
      // >60 days → weekly buckets
      truncFmt = "'IW'";
      labelFmt = "'YYYY-MM-DD'";
    }

    const result = await db.execute(`
      SELECT
        TO_CHAR(TRUNC(posted_at, ${truncFmt}), ${labelFmt}) AS hour_bucket,
        COUNT(*) AS post_count,
        SUM(likes_count) AS total_likes,
        SUM(shares_count) AS total_shares,
        ROUND(AVG(sentiment_score), 3) AS avg_sentiment,
        COUNT(CASE WHEN momentum_flag IN ('viral','mega_viral') THEN 1 END) AS viral_count
      FROM social_posts
      WHERE posted_at >= (SELECT MAX(posted_at) FROM social_posts) - NUMTODSINTERVAL(:hours, 'HOUR')
      GROUP BY TRUNC(posted_at, ${truncFmt})
      ORDER BY hour_bucket
    `, { hours });

    res.json(result.rows);
  } catch (err) {
    console.error('Social velocity error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/revenue-by-category
router.get('/revenue-by-category', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT p.category,
             COUNT(DISTINCT o.order_id) AS order_count,
             SUM(oi.quantity * oi.unit_price) AS total_revenue,
             COUNT(DISTINCT CASE WHEN o.social_source_id IS NOT NULL THEN o.order_id END) AS social_driven_orders
      FROM order_items oi
      JOIN products p ON oi.product_id = p.product_id
      JOIN orders o ON oi.order_id = o.order_id
      WHERE o.created_at >= (SELECT MAX(created_at) FROM orders) - INTERVAL '30' DAY
      GROUP BY p.category
      ORDER BY total_revenue DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Revenue by category error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/demand-map
router.get('/demand-map', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT c.city, c.state_province,
             ROUND(AVG(c.latitude), 4) AS lat,
             ROUND(AVG(c.longitude), 4) AS lon,
             COUNT(DISTINCT o.order_id) AS order_count,
             SUM(o.order_total) AS total_revenue,
             COUNT(DISTINCT CASE WHEN o.social_source_id IS NOT NULL THEN o.order_id END) AS social_orders
      FROM orders o
      JOIN customers c ON o.customer_id = c.customer_id
      WHERE o.created_at >= (SELECT MAX(created_at) FROM orders) - INTERVAL '30' DAY
        AND c.latitude IS NOT NULL
      GROUP BY c.city, c.state_province
      HAVING COUNT(DISTINCT o.order_id) >= 3
      ORDER BY order_count DESC
      FETCH FIRST 50 ROWS ONLY
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Demand map error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/inmemory — runtime proof for the In-Memory Column Store.
router.get('/inmemory', async (req, res) => {
  try {
    const evidence = await db.withUserConnection(req.demoUser, async ({ execute }) => {
      await execute('ALTER SESSION SET INMEMORY_QUERY = ENABLE');
      await execute(`
        SELECT /*+ GATHER_PLAN_STATISTICS FULL(customer) NO_INDEX(customer) */
               /* HIGHTECH_INMEMORY_PROOF */
               customer.customer_tier,
               COUNT(*) AS customer_count,
               SUM(customer.lifetime_value) AS lifetime_value
        FROM customers customer
        GROUP BY customer.customer_tier
      `);

      const sqlIdResult = await execute(`
        SELECT prev_sql_id AS sql_id
        FROM sys.v_$session
        WHERE audsid = SYS_CONTEXT('USERENV', 'SESSIONID')
      `);
      const sqlId = sqlIdResult.rows?.[0]?.SQL_ID || null;
      const planResult = sqlId
        ? await execute(`
            SELECT plan_table_output
            FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR(:sqlId, NULL, 'ALLSTATS LAST'))
          `, { sqlId })
        : { rows: [] };
      const planLines = (planResult.rows || [])
        .map((row) => row.PLAN_TABLE_OUTPUT || '')
        .filter(Boolean);
      const planUsedInMemory = /TABLE ACCESS\s+INMEMORY FULL/i.test(planLines.join('\n'));

      const statusResult = await execute('SELECT * FROM hightech_inmemory_status_v');
      const segmentsResult = await execute(`
        SELECT segment_name,
               table_num_rows,
               table_inmemory,
               inmemory_priority,
               inmemory_compression,
               populate_status,
               disk_bytes,
               inmemory_bytes,
               bytes_not_populated
        FROM hightech_inmemory_segments_v
        ORDER BY segment_name
      `);

      return {
        status: statusResult.rows?.[0] || null,
        segments: segmentsResult.rows || [],
        requestPlan: {
          sqlId,
          operation: planUsedInMemory ? 'TABLE ACCESS INMEMORY FULL' : null,
          usedInMemory: planUsedInMemory,
          lines: planLines,
        },
      };
    });

    if (!evidence.status) {
      return res.status(503).json({
        error: 'Oracle In-Memory runtime evidence is unavailable',
        evidenceStatus: 'UNAVAILABLE',
        active: false,
        segments: [],
      });
    }

    const catalogStatus = evidence.status.EVIDENCE_STATUS;
    const active = catalogStatus === 'ACTIVE' && evidence.requestPlan.usedInMemory;
    const evidenceStatus = active
      ? 'ACTIVE'
      : catalogStatus === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'NOT_READY';

    return res.json({
      evidenceStatus,
      active,
      evidenceSources: ['V$OPTION', 'V$PARAMETER', 'V$INMEMORY_AREA', 'V$IM_SEGMENTS', 'DBMS_XPLAN.DISPLAY_CURSOR'],
      inmemoryOption: evidence.status.INMEMORY_OPTION,
      databaseInmemorySizeBytes: evidence.status.DATABASE_INMEMORY_SIZE_BYTES,
      inmemoryForce: evidence.status.INMEMORY_FORCE,
      inmemoryQuery: evidence.status.INMEMORY_QUERY,
      areaAllocatedBytes: evidence.status.AREA_ALLOCATED_BYTES,
      areaUsedBytes: evidence.status.AREA_USED_BYTES,
      expectedSegmentCount: evidence.status.EXPECTED_SEGMENT_COUNT,
      populatedSegmentCount: evidence.status.POPULATED_SEGMENT_COUNT,
      bytesNotPopulated: evidence.status.BYTES_NOT_POPULATED,
      planProof: {
        sqlId: evidence.status.PLAN_PROOF_SQL_ID,
        operation: evidence.status.PLAN_PROOF_OPERATION,
      },
      requestPlan: evidence.requestPlan,
      segments: evidence.segments,
    });
  } catch (err) {
    console.error('In-Memory stats error:', err);
    return res.status(503).json({
      error: 'Oracle In-Memory runtime evidence is unavailable',
      detail: err.message,
      evidenceStatus: 'UNAVAILABLE',
      active: false,
      segments: [],
    });
  }
});

module.exports = router;
