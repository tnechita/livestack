/**
 * Read-only demo readiness API.
 *
 * Dataset mutation is available only through the guarded durable workflow at
 * POST /api/import/restore-demo.
 */

const express = require('express');
const db = require('../config/database');

const router = express.Router();

router.get('/status', async (req, res) => {
  try {
    const result = await db.executeAsUser(`
      SELECT
        (SELECT COUNT(*) FROM brands) AS brands,
        (SELECT COUNT(*) FROM products) AS products,
        (SELECT COUNT(*) FROM influencers) AS influencers,
        (SELECT COUNT(*) FROM customers) AS customers,
        (SELECT COUNT(*) FROM social_posts) AS social_posts,
        (SELECT COUNT(*) FROM orders) AS orders,
        (SELECT COUNT(*) FROM fulfillment_centers) AS fulfillment_centers,
        (SELECT COUNT(*) FROM fulfillment_zones) AS fulfillment_zones,
        (SELECT COUNT(*) FROM demand_regions) AS demand_regions,
        (SELECT COUNT(*) FROM demand_forecasts) AS demand_forecasts,
        (SELECT COUNT(*) FROM product_embeddings) AS product_embeddings,
        (SELECT COUNT(*) FROM post_embeddings) AS post_embeddings,
        (SELECT COUNT(*) FROM semantic_matches) AS semantic_matches,
        (SELECT COUNT(*) FROM tech_graph_entities) AS tech_graph_nodes,
        (SELECT COUNT(*) FROM tech_graph_relationships) AS tech_graph_edges,
        (SELECT COUNT(*) FROM influencer_connections) AS graph_edges,
        (SELECT COUNT(*) FROM brand_influencer_links) AS graph_links
      FROM dual
    `, {}, req.demoUser);

    const row = result.rows[0];
    res.json({
      brands: row.BRANDS,
      products: row.PRODUCTS,
      influencers: row.INFLUENCERS,
      customers: row.CUSTOMERS,
      social_posts: row.SOCIAL_POSTS,
      orders: row.ORDERS,
      fulfillment_centers: row.FULFILLMENT_CENTERS,
      fulfillment_zones: row.FULFILLMENT_ZONES,
      demand_regions: row.DEMAND_REGIONS,
      demand_forecasts: row.DEMAND_FORECASTS,
      product_embeddings: row.PRODUCT_EMBEDDINGS,
      signal_embeddings: row.POST_EMBEDDINGS,
      post_embeddings: row.POST_EMBEDDINGS,
      semantic_matches: row.SEMANTIC_MATCHES,
      graph_nodes: row.TECH_GRAPH_NODES || (row.GRAPH_EDGES + row.GRAPH_LINKS),
      graph_edges: row.TECH_GRAPH_EDGES || row.GRAPH_EDGES,
      graph_links: row.GRAPH_LINKS,
      semantic_views: [
        'tech_portfolios_v',
        'hightech_products_v',
        'product_signals_v',
        'developer_advocates_v',
        'solution_orders_v',
        'product_capacity_v',
        'fulfillment_routes_v',
      ],
    });
  } catch (err) {
    console.error('Demo status error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/native-json-readiness', async (req, res) => {
  try {
    const [metadataResult, operatorResult] = await Promise.all([
      db.executeAsUser(`
        SELECT table_name, column_name, data_type
        FROM user_tab_columns
        WHERE data_type = 'JSON'
          AND (
            (table_name = 'PRODUCT_ATTRIBUTES' AND column_name = 'ATTRIBUTES')
            OR (table_name = 'EVENT_STREAM' AND column_name = 'EVENT_DATA')
          )
        ORDER BY table_name, column_name
      `, {}, req.demoUser),
      db.executeAsUser(`
        SELECT
          (SELECT COUNT(*) FROM products) AS product_count,
          (SELECT COUNT(*) FROM product_attributes) AS attribute_count,
          (SELECT COUNT(*) FROM event_stream) AS event_count,
          (SELECT COUNT(*)
           FROM product_attributes pa
           WHERE JSON_VALUE(pa.attributes, '$.sku' RETURNING VARCHAR2(50)) IS NOT NULL
             AND JSON_QUERY(pa.attributes, '$.commercial' RETURNING VARCHAR2(4000)) IS NOT NULL
             AND JSON_SERIALIZE(pa.attributes RETURNING VARCHAR2(4000)) IS NOT NULL
          ) AS operator_count
        FROM dual
      `, {}, req.demoUser),
    ]);

    const row = operatorResult.rows?.[0] || {};
    const nativeColumns = (metadataResult.rows || []).map((column) => ({
      tableName: column.TABLE_NAME,
      columnName: column.COLUMN_NAME,
      dataType: column.DATA_TYPE,
    }));
    const counts = {
      products: Number(row.PRODUCT_COUNT || 0),
      productAttributes: Number(row.ATTRIBUTE_COUNT || 0),
      eventStream: Number(row.EVENT_COUNT || 0),
      operatorValidated: Number(row.OPERATOR_COUNT || 0),
    };
    const restricted = String(req.demoIdentity?.accessScope || '').toUpperCase() === 'RESTRICTED';
    const ready = !restricted
      && nativeColumns.length === 2
      && counts.products > 0
      && counts.productAttributes === counts.products
      && counts.eventStream > 0
      && counts.operatorValidated === counts.productAttributes;

    return res.json({
      status: restricted ? 'RESTRICTED' : (ready ? 'ACTIVE' : 'INCOMPLETE'),
      ready,
      source: 'ORACLE_NATIVE_JSON',
      metadataSource: 'USER_TAB_COLUMNS',
      nativeColumns,
      counts,
      operators: ['JSON_VALUE', 'JSON_QUERY', 'JSON_SERIALIZE'],
      identity: req.demoUser,
      message: restricted
        ? 'Native JSON documents are hidden by the selected restricted VPD identity.'
        : (ready
          ? 'Oracle native JSON documents and operators are active.'
          : 'Oracle native JSON documents or operator evidence are incomplete.'),
    });
  } catch (err) {
    console.error('Native JSON readiness error:', err);
    return res.status(503).json({
      status: 'UNAVAILABLE',
      ready: false,
      source: 'ORACLE_NATIVE_JSON',
      code: 'NATIVE_JSON_UNAVAILABLE',
      error: 'Oracle native JSON readiness could not be established.',
    });
  }
});

router.get('/start', (req, res) => res.status(410).json({
  status: 'deprecated',
  code: 'DEMO_START_DEPRECATED',
  mutating: false,
  message: 'This legacy unguarded mutation endpoint is permanently disabled.',
  canonical: {
    method: 'POST',
    path: '/api/import/restore-demo',
    authorization: 'Oracle-derived active Admin identity plus explicit same-origin dataset command',
  },
}));

module.exports = router;
