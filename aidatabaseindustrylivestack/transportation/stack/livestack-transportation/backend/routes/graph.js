/**
 * Graph API - Seer Transport signal network queries using Oracle Property Graph / SQL/PGQ.
 *
 * Endpoint names retain the original frontend contract, but returned fields are
 * compatibility aliases over dedicated transportation graph entities.
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');

function intParam(value, fallback, max) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function safeEntityIdList(nodeIds) {
  return [...new Set(nodeIds.map(Number).filter(Number.isFinite))];
}

async function fetchConnections(nodeIds, limit, demoUser) {
  const ids = safeEntityIdList(nodeIds);
  if (!ids.length) return [];
  const binds = { limit };
  const placeholders = ids.map((id, index) => {
    const key = `id${index}`;
    binds[key] = id;
    return `:${key}`;
  }).join(',');

  const result = await db.executeAsUser(`
    SELECT tr.relationship_id AS connection_id,
           tr.from_entity AS from_influencer,
           tr.to_entity AS to_influencer,
           tr.relationship_type AS connection_type,
           tr.strength,
           tr.event_count AS interaction_count,
           tr.service_value,
           tr.first_seen,
           tr.last_seen AS last_interaction,
           e_f.entity_key AS from_handle,
           e_f.display_name AS from_display,
           e_f.channel AS from_platform,
           e_f.service_value AS from_followers,
           e_f.risk_score AS from_score,
           e_f.entity_type AS from_niche,
           e_f.city AS from_city,
           e_f.is_active_risk AS from_verified,
           ROUND(e_f.risk_score / 100, 4) AS from_engagement,
           e_f.risk_level AS from_risk_level,
           e_f.event_count AS from_event_count,
           e_t.entity_key AS to_handle,
           e_t.display_name AS to_display,
           e_t.channel AS to_platform,
           e_t.service_value AS to_followers,
           e_t.risk_score AS to_score,
           e_t.entity_type AS to_niche,
           e_t.city AS to_city,
           e_t.is_active_risk AS to_verified,
           ROUND(e_t.risk_score / 100, 4) AS to_engagement,
           e_t.risk_level AS to_risk_level,
           e_t.event_count AS to_event_count
    FROM transport_relationships tr
    JOIN transport_entities e_f ON tr.from_entity = e_f.entity_id
    JOIN transport_entities e_t ON tr.to_entity = e_t.entity_id
    WHERE tr.from_entity IN (${placeholders})
       OR tr.to_entity IN (${placeholders})
    ORDER BY tr.strength DESC, tr.service_value DESC
    FETCH FIRST :limit ROWS ONLY
  `, binds, demoUser);

  return result.rows;
}

function nodeFromEdge(row, side) {
  const from = side === 'from';
  return {
    INFLUENCER_ID: from ? row.FROM_INFLUENCER : row.TO_INFLUENCER,
    HANDLE: from ? row.FROM_HANDLE : row.TO_HANDLE,
    DISPLAY_NAME: from ? row.FROM_DISPLAY : row.TO_DISPLAY,
    PLATFORM: from ? row.FROM_PLATFORM : row.TO_PLATFORM,
    FOLLOWER_COUNT: from ? row.FROM_FOLLOWERS : row.TO_FOLLOWERS,
    INFLUENCE_SCORE: from ? row.FROM_SCORE : row.TO_SCORE,
    NICHE: from ? row.FROM_NICHE : row.TO_NICHE,
    CITY: from ? row.FROM_CITY : row.TO_CITY,
    IS_VERIFIED: from ? row.FROM_VERIFIED : row.TO_VERIFIED,
    ENGAGEMENT_RATE: from ? row.FROM_ENGAGEMENT : row.TO_ENGAGEMENT,
    RISK_LEVEL: from ? row.FROM_RISK_LEVEL : row.TO_RISK_LEVEL,
    EVENT_COUNT: from ? row.FROM_EVENT_COUNT : row.TO_EVENT_COUNT,
  };
}

// GET /api/graph/influencers - transportation network entities with compatibility aliases.
router.get('/influencers', async (req, res) => {
  try {
    const { platform, niche, search } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    let where = 'WHERE 1=1';
    const binds = { limit };

    if (platform) {
      where += ' AND channel = :platform';
      binds.platform = platform;
    }
    if (niche) {
      where += ' AND entity_type = :niche';
      binds.niche = niche;
    }
    if (search) {
      where += ` AND (
        UPPER(entity_key) LIKE UPPER(:search)
        OR UPPER(display_name) LIKE UPPER(:search)
        OR UPPER(entity_type) LIKE UPPER(:search)
        OR UPPER(risk_level) LIKE UPPER(:search)
      )`;
      binds.search = `%${search}%`;
    }

    const result = await db.executeAsUser(`
      SELECT entity_id AS influencer_id,
             entity_key AS handle,
             display_name,
             channel AS platform,
             service_value AS follower_count,
             ROUND(risk_score / 100, 4) AS engagement_rate,
             risk_score AS influence_score,
             entity_type AS niche,
             city,
             is_active_risk AS is_verified,
             risk_level,
             event_count,
             (SELECT COUNT(*)
              FROM transport_relationships tr
              WHERE tr.from_entity = e.entity_id
                 OR tr.to_entity = e.entity_id) AS connection_count,
             event_count AS recent_posts
      FROM transport_entities e
      ${where}
      ORDER BY risk_score DESC, service_value DESC
      FETCH FIRST :limit ROWS ONLY
    `, binds, req.demoUser);

    res.json(result.rows);
  } catch (err) {
    console.error('Transportation graph entities error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/graph/network/:id - ego transportation network, depth 1-5 hops.
router.get('/network/:id', async (req, res) => {
  try {
    const seedId = parseInt(req.params.id, 10);
    const depth = intParam(req.query.depth, 3, 5);

    const centerRes = await db.executeAsUser(`
      SELECT e.entity_id AS influencer_id,
             e.entity_key AS handle,
             e.display_name,
             e.channel AS platform,
             e.service_value AS follower_count,
             ROUND(e.risk_score / 100, 4) AS engagement_rate,
             e.risk_score AS influence_score,
             e.entity_type AS niche,
             e.city,
             e.is_active_risk AS is_verified,
             e.risk_level,
             e.event_count,
             e.service_value,
             e.event_count AS recent_posts,
             (SELECT COUNT(*)
              FROM transport_relationships tr
              WHERE tr.from_entity = e.entity_id
                 OR tr.to_entity = e.entity_id) AS total_connections,
             (SELECT COUNT(*)
              FROM transport_case_entities tce
              WHERE tce.entity_id = e.entity_id) AS brand_count
      FROM transport_entities e
      WHERE e.entity_id = :id
    `, { id: seedId }, req.demoUser);

    if (!centerRes.rows.length) {
      return res.status(404).json({ error: 'Transportation network entity not found' });
    }

    const nodesMap = new Map();
    const edgesSet = new Set();
    const edgesList = [];

    const addNode = (row, type, hopLevel) => {
      const id = row.INFLUENCER_ID;
      if (!nodesMap.has(id)) nodesMap.set(id, { ...row, type, hopLevel });
    };

    const addEdge = (row, hopLevel) => {
      const key = [
        Math.min(row.FROM_INFLUENCER, row.TO_INFLUENCER),
        Math.max(row.FROM_INFLUENCER, row.TO_INFLUENCER),
        row.CONNECTION_TYPE,
      ].join('-');
      if (edgesSet.has(key)) return;
      edgesSet.add(key);
      edgesList.push({
        source: row.FROM_INFLUENCER,
        target: row.TO_INFLUENCER,
        type: row.CONNECTION_TYPE,
        strength: row.STRENGTH,
        interactions: row.INTERACTION_COUNT,
        amount: row.SERVICE_VALUE,
        hopLevel,
      });
    };

    addNode(centerRes.rows[0], 'center', 0);

    const hop1Rows = await fetchConnections([seedId], 60, req.demoUser);
    const hop1Ids = new Set([seedId]);
    for (const row of hop1Rows) {
      addNode(nodeFromEdge(row, 'from'), 'hop1', 1);
      addNode(nodeFromEdge(row, 'to'), 'hop1', 1);
      hop1Ids.add(row.FROM_INFLUENCER);
      hop1Ids.add(row.TO_INFLUENCER);
      addEdge(row, 1);
    }

    if (depth >= 2) {
      const hop1Only = [...hop1Ids].filter(id => id !== seedId).slice(0, 30);
      if (hop1Only.length) {
        const hop2Rows = await fetchConnections(hop1Only, 140, req.demoUser);
        const hop2Ids = new Set(hop1Ids);
        for (const row of hop2Rows) {
          addNode(nodeFromEdge(row, 'from'), 'hop2', 2);
          addNode(nodeFromEdge(row, 'to'), 'hop2', 2);
          hop2Ids.add(row.FROM_INFLUENCER);
          hop2Ids.add(row.TO_INFLUENCER);
          addEdge(row, 2);
        }

        if (depth >= 3) {
          const newHop2 = [...hop2Ids].filter(id => !hop1Ids.has(id)).slice(0, 18);
          const hop3Ids = new Set(hop2Ids);
          if (newHop2.length) {
            const hop3Rows = await fetchConnections(newHop2, 80, req.demoUser);
            for (const row of hop3Rows) {
              addNode(nodeFromEdge(row, 'from'), 'hop3', 3);
              addNode(nodeFromEdge(row, 'to'), 'hop3', 3);
              hop3Ids.add(row.FROM_INFLUENCER);
              hop3Ids.add(row.TO_INFLUENCER);
              addEdge(row, 3);
            }
          }

          if (depth >= 4) {
            const newHop3 = [...hop3Ids].filter(id => !hop2Ids.has(id)).slice(0, 12);
            const hop4Ids = new Set(hop3Ids);
            if (newHop3.length) {
              const hop4Rows = await fetchConnections(newHop3, 50, req.demoUser);
              for (const row of hop4Rows) {
                addNode(nodeFromEdge(row, 'from'), 'hop4', 4);
                addNode(nodeFromEdge(row, 'to'), 'hop4', 4);
                hop4Ids.add(row.FROM_INFLUENCER);
                hop4Ids.add(row.TO_INFLUENCER);
                addEdge(row, 4);
              }
            }

            if (depth >= 5) {
              const newHop4 = [...hop4Ids].filter(id => !hop3Ids.has(id)).slice(0, 8);
              if (newHop4.length) {
                const hop5Rows = await fetchConnections(newHop4, 30, req.demoUser);
                for (const row of hop5Rows) {
                  addNode(nodeFromEdge(row, 'from'), 'hop5', 5);
                  addNode(nodeFromEdge(row, 'to'), 'hop5', 5);
                  addEdge(row, 5);
                }
              }
            }
          }
        }
      }
    }

    const casesRes = await db.executeAsUser(`
      SELECT tce.case_entity_id AS link_id,
             tc.case_id AS brand_id,
             tce.role AS relationship_type,
             tc.event_count AS post_count,
             ROUND(tc.risk_score / 100, 4) AS avg_engagement,
             tc.service_value_at_risk AS revenue_attributed,
             tc.case_ref AS brand_name,
             tc.case_type AS brand_category,
             tc.status AS social_tier,
             tc.risk_score,
             tc.opened_at
      FROM transport_case_entities tce
      JOIN transport_exception_cases tc ON tce.case_id = tc.case_id
      WHERE tce.entity_id = :id
      ORDER BY tc.risk_score DESC, tc.service_value_at_risk DESC
    `, { id: seedId }, req.demoUser);

    res.json({
      center: centerRes.rows[0],
      nodes: Array.from(nodesMap.values()),
      edges: edgesList,
      brands: casesRes.rows,
      stats: {
        nodeCount: nodesMap.size,
        edgeCount: edgesList.length,
        brandCount: casesRes.rows.length,
        depth,
      },
    });
  } catch (err) {
    console.error('Transportation graph network error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/graph/propagation/:caseRef - entities linked to a transportation exception case.
router.get('/propagation/:caseRef', async (req, res) => {
  try {
    const result = await db.executeAsUser(`
      SELECT tc.case_ref,
             tc.case_type,
             e.entity_id AS entity_id,
             e.entity_key AS entity_key,
             e.display_name,
             e.entity_type,
             e.risk_score,
             e.service_value,
             tce.role,
             tr.to_entity AS reached_id,
             reached.entity_key AS reached_entity,
             reached.risk_score AS reached_risk_score,
             tr.relationship_type,
             tr.strength AS connection_strength
      FROM transport_exception_cases tc
      JOIN transport_case_entities tce ON tc.case_id = tce.case_id
      JOIN transport_entities e ON tce.entity_id = e.entity_id
      LEFT JOIN transport_relationships tr ON tr.from_entity = e.entity_id
      LEFT JOIN transport_entities reached ON tr.to_entity = reached.entity_id
      WHERE LOWER(tc.case_ref) = LOWER(:case_ref)
      ORDER BY e.risk_score DESC, tr.strength DESC NULLS LAST
      FETCH FIRST 100 ROWS ONLY
    `, { case_ref: req.params.caseRef }, req.demoUser);

    res.json(result.rows);
  } catch (err) {
    console.error('Transportation case propagation error:', err);
    res.status(500).json({ error: err.message });
  }
});

const EXAMPLE_QUERIES = {
  signal_reach: {
    name: 'Signal Reach (N-Hop Traversal)',
    description: 'Trace shippers, terminals, ports, lanes, brokers, carriers, and equipment pools reachable from a transportation signal entity using SQL/PGQ traversal.',
    params: [
      { key: 'entity_key', label: 'Seed Entity', default: 'PORT-LAX-DRAY' },
      { key: 'hops', label: 'Max Hops (1-3)', default: 2, type: 'number' },
    ],
    buildSql: (p) => {
      const hops = intParam(p.hops, 2, 3);
      const entityKey = p.entity_key || 'PORT-LAX-DRAY';
      return {
        sql: `SELECT DISTINCT entity_key, display_name, entity_type,
       risk_score, risk_level, service_value, channel
FROM GRAPH_TABLE ( transport_signal_network
    MATCH (seed IS entity) -[e IS related_to]->{1,${hops}} (reached IS entity)
    WHERE seed.entity_key = :entity_key
    COLUMNS (
        reached.entity_key AS entity_key,
        reached.display_name AS display_name,
        reached.entity_type AS entity_type,
        reached.risk_score AS risk_score,
        reached.risk_level AS risk_level,
        reached.service_value AS service_value,
        reached.channel AS channel
    )
)
ORDER BY risk_score DESC
FETCH FIRST 25 ROWS ONLY`,
        binds: { entity_key: entityKey },
        display: `-- SQL/PGQ: Transportation entities within ${hops} hops
SELECT DISTINCT entity_key, display_name, entity_type,
       risk_score, risk_level, service_value, channel
FROM GRAPH_TABLE ( transport_signal_network
    MATCH (seed IS entity)
          -[e IS related_to]->{1,${hops}}
          (reached IS entity)
    WHERE seed.entity_key = '${entityKey}'
    COLUMNS (
        reached.entity_key AS entity_key,
        reached.display_name AS display_name,
        reached.entity_type AS entity_type,
        reached.risk_score AS risk_score,
        reached.risk_level AS risk_level,
        reached.service_value AS service_value,
        reached.channel AS channel
    )
)
ORDER BY risk_score DESC
FETCH FIRST 25 ROWS ONLY;`,
      };
    },
  },

  shared_terminal_cluster: {
    name: 'Shared Terminal Cluster',
    description: 'Find shippers, carriers, and lanes converging on constrained logistics terminals or yards.',
    params: [
      { key: 'min_risk', label: 'Minimum Risk Score', default: 75, type: 'number' },
    ],
    buildSql: (p) => {
      const minRisk = parseInt(p.min_risk, 10) || 75;
      return {
        sql: `SELECT source_entity, shared_terminal, shared_type, related_entity,
       source_risk, related_risk,
       ROUND((source_risk + related_risk) / 2, 1) AS combined_risk,
       e1_type, e2_type
FROM GRAPH_TABLE ( transport_signal_network
    MATCH (a IS entity) -[e1 IS related_to]-> (shared IS entity) <-[e2 IS related_to]- (b IS entity)
    WHERE a.entity_id < b.entity_id
      AND shared.entity_type IN ('terminal','yard','port')
      AND (a.risk_score >= :min_risk OR b.risk_score >= :min_risk)
    COLUMNS (
        a.entity_key AS source_entity,
        shared.entity_key AS shared_terminal,
        shared.entity_type AS shared_type,
        b.entity_key AS related_entity,
        a.risk_score AS source_risk,
        b.risk_score AS related_risk,
        e1.relationship_type AS e1_type,
        e2.relationship_type AS e2_type
    )
)
ORDER BY combined_risk DESC, shared_terminal
FETCH FIRST 25 ROWS ONLY`,
        binds: { min_risk: minRisk },
        display: `-- SQL/PGQ: Shared terminal, yard, or port clusters
SELECT source_entity, shared_terminal, shared_type, related_entity,
       source_risk, related_risk,
       ROUND((source_risk + related_risk) / 2, 1) AS combined_risk,
       e1_type, e2_type
FROM GRAPH_TABLE ( transport_signal_network
    MATCH (a IS entity)
          -[e1 IS related_to]-> (shared IS entity)
          <-[e2 IS related_to]- (b IS entity)
    WHERE a.entity_id < b.entity_id
      AND shared.entity_type IN ('terminal','yard','port')
      AND (a.risk_score >= ${minRisk} OR b.risk_score >= ${minRisk})
    COLUMNS (
        a.entity_key AS source_entity,
        shared.entity_key AS shared_terminal,
        shared.entity_type AS shared_type,
        b.entity_key AS related_entity,
        a.risk_score AS source_risk,
        b.risk_score AS related_risk,
        e1.relationship_type AS e1_type,
        e2.relationship_type AS e2_type
    )
)
ORDER BY combined_risk DESC, shared_terminal
FETCH FIRST 25 ROWS ONLY;`,
      };
    },
  },

  exception_value_flow: {
    name: 'Exception Value Flow',
    description: 'Identify high-value transportation entities tied to open exception cases.',
    params: [
      { key: 'min_value', label: 'Minimum Service Value', default: 500000, type: 'number' },
    ],
    buildSql: (p) => {
      const minValue = parseInt(p.min_value, 10) || 500000;
      return {
        sql: `SELECT case_ref, case_type, entity_key, display_name, entity_type,
       risk_score, service_value, role, evidence_score
FROM transport_exception_cases tc
JOIN transport_case_entities tce ON tc.case_id = tce.case_id
JOIN transport_entities e ON tce.entity_id = e.entity_id
WHERE e.service_value >= :min_value
ORDER BY tc.risk_score DESC, e.service_value DESC
FETCH FIRST 25 ROWS ONLY`,
        binds: { min_value: minValue },
        display: `-- Transportation exception cases by service value at risk
SELECT case_ref, case_type, entity_key, display_name, entity_type,
       risk_score, service_value, role, evidence_score
FROM transport_exception_cases tc
JOIN transport_case_entities tce ON tc.case_id = tce.case_id
JOIN transport_entities e ON tce.entity_id = e.entity_id
WHERE e.service_value >= ${minValue}
ORDER BY tc.risk_score DESC, e.service_value DESC
FETCH FIRST 25 ROWS ONLY;`,
      };
    },
  },

  logistics_hubs: {
    name: 'Logistics Hub Detection',
    description: 'Rank network entities by graph degree, risk, and service value to surface operational priorities.',
    params: [
      { key: 'entity_type', label: 'Entity Type (optional)', default: '' },
    ],
    buildSql: (p) => {
      const typeWhere = p.entity_type ? `\n    WHERE src.entity_type = :entity_type` : '';
      return {
        sql: `SELECT entity_key, entity_type, risk_level, risk_score,
       service_value, COUNT(*) AS degree,
       COUNT(DISTINCT relationship_type) AS relationship_types,
       ROUND(AVG(strength), 3) AS avg_strength
FROM GRAPH_TABLE ( transport_signal_network
    MATCH (src IS entity) -[e IS related_to]-> (dst IS entity)${typeWhere}
    COLUMNS (
        src.entity_key AS entity_key,
        src.entity_type AS entity_type,
        src.risk_level AS risk_level,
        src.risk_score AS risk_score,
        src.service_value AS service_value,
        e.relationship_type AS relationship_type,
        e.strength AS strength
    )
)
GROUP BY entity_key, entity_type, risk_level, risk_score, service_value
ORDER BY degree DESC, risk_score DESC
FETCH FIRST 20 ROWS ONLY`,
        binds: p.entity_type ? { entity_type: p.entity_type } : {},
        display: `-- SQL/PGQ: Logistics degree centrality and risk priority
SELECT entity_key, entity_type, risk_level, risk_score,
       service_value, COUNT(*) AS degree,
       COUNT(DISTINCT relationship_type) AS relationship_types,
       ROUND(AVG(strength), 3) AS avg_strength
FROM GRAPH_TABLE ( transport_signal_network
    MATCH (src IS entity)
          -[e IS related_to]->
          (dst IS entity)${p.entity_type ? `\n    WHERE src.entity_type = '${p.entity_type}'` : ''}
    COLUMNS (
        src.entity_key AS entity_key,
        src.entity_type AS entity_type,
        src.risk_level AS risk_level,
        src.risk_score AS risk_score,
        src.service_value AS service_value,
        e.relationship_type AS relationship_type,
        e.strength AS strength
    )
)
GROUP BY entity_key, entity_type, risk_level, risk_score, service_value
ORDER BY degree DESC, risk_score DESC
FETCH FIRST 20 ROWS ONLY;`,
      };
    },
  },
};

router.get('/edge-metadata', async (req, res) => {
  try {
    const result = await db.executeAsUser(`
      SELECT DISTINCT relationship_type AS edge_type
      FROM transport_relationships
      ORDER BY relationship_type
    `, {}, req.demoUser);
    const edges = (result.rows || []).map((row) => {
      const edgeType = row.EDGE_TYPE;
      return {
        edgeType,
        edge_type: edgeType,
        displayName: String(edgeType || '').split('_').map((part) =>
          part ? part[0].toUpperCase() + part.slice(1) : part
        ).join(' '),
        category: 'Transportation Operations',
        description: 'Native TRANSPORT_SIGNAL_NETWORK relationship type.',
      };
    });
    return res.json(edges);
  } catch (err) {
    return res.status(503).json({ error: err.message });
  }
});

router.get('/readiness', async (req, res) => {
  try {
    const [catalog, probe] = await Promise.all([
      db.executeAsUser(`SELECT graph_name
        FROM user_property_graphs
        WHERE graph_name = 'TRANSPORT_SIGNAL_NETWORK'`, {}, req.demoUser),
      db.executeAsUser(`SELECT COUNT(*) AS probe_row_count
        FROM GRAPH_TABLE (
          transport_signal_network
          MATCH (a IS entity) -[e IS related_to]-> (b IS entity)
          COLUMNS (
            a.entity_id AS source_id,
            b.entity_id AS target_id
          )
        )`, {}, req.demoUser),
    ]);
    const probeRowCount = Number(probe.rows?.[0]?.PROBE_ROW_COUNT || 0);
    const ready = catalog.rows.length === 1 && probeRowCount > 0;
    return res.status(ready ? 200 : 503).json({
      status: ready ? 'ACTIVE' : 'NOT_READY',
      available: ready,
      sourceObject: 'TRANSPORT_SIGNAL_NETWORK',
      executionSource: 'SQL_PGQ_GRAPH_TABLE',
      metadataSource: 'USER_PROPERTY_GRAPHS',
      probeRowCount,
    });
  } catch (err) {
    return res.status(503).json({
      status: 'UNAVAILABLE',
      available: false,
      sourceObject: 'TRANSPORT_SIGNAL_NETWORK',
      error: err.message,
    });
  }
});

router.get('/example-queries', (req, res) => {
  const queries = Object.entries(EXAMPLE_QUERIES).map(([id, query]) => ({
    id,
    name: query.name,
    description: query.description,
    params: query.params,
  }));
  res.json(queries);
});

router.post('/run-example', async (req, res) => {
  try {
    const { queryId, params = {} } = req.body;
    const queryDef = EXAMPLE_QUERIES[queryId];
    if (!queryDef) {
      return res.status(400).json({ error: `Unknown query: ${queryId}` });
    }

    const { sql, binds, display } = queryDef.buildSql(params);
    const startTime = Date.now();
    const result = await db.executeAsUser(sql, binds, req.demoUser);
    const elapsed = Date.now() - startTime;

    res.json({
      queryId,
      name: queryDef.name,
      sql: display,
      rows: result.rows,
      rowCount: result.rows.length,
      elapsed,
    });
  } catch (err) {
    console.error('Transportation graph example query error:', err);
    const queryDef = EXAMPLE_QUERIES[req.body?.queryId];
    res.status(500).json({
      error: err.message,
      sql: queryDef ? queryDef.buildSql(req.body?.params || {}).display : null,
    });
  }
});

module.exports = router;
