/**
 * Social Posts API — Social listening, trends, and vector search
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');

const VECTOR_MODEL_NAME = 'ALL_MINILM_L12_V2';
const VECTOR_DIMENSIONS = 384;
const MAX_VECTOR_QUERY_LENGTH = 1000;
const MAX_VECTOR_TOP_K = 50;
const REQUIRED_VECTOR_COLUMNS = new Map([
  ['PRODUCT_EMBEDDINGS.EMBEDDING', 'IDX_PRODUCT_VEC'],
  ['POST_EMBEDDINGS.EMBEDDING', 'IDX_POST_VEC'],
]);
const VECTOR_INDEX_ORGANIZATION = 'ORGANIZATION NEIGHBOR PARTITIONS';

function vectorUnavailable(res, readiness, message = 'Oracle native Vector Search capability is unavailable') {
  return res.status(503).json({
    error: message,
    code: 'VECTOR_CAPABILITY_UNAVAILABLE',
    source: 'ORACLE_METADATA',
    readiness,
  });
}

function parseVectorSearchInput(req, res, defaultTopK) {
  const query = req.body?.query;
  const rawTopK = req.body?.topK ?? defaultTopK;
  const topK = typeof rawTopK === 'number'
    ? rawTopK
    : (typeof rawTopK === 'string' && /^\d+$/.test(rawTopK) ? Number(rawTopK) : NaN);

  if (typeof query !== 'string' || !query.trim() || query.trim().length > MAX_VECTOR_QUERY_LENGTH) {
    res.status(400).json({
      error: `Query text must be a non-empty string of at most ${MAX_VECTOR_QUERY_LENGTH} characters`,
      code: 'VECTOR_QUERY_INVALID',
    });
    return null;
  }
  if (!Number.isInteger(topK) || topK < 1 || topK > MAX_VECTOR_TOP_K) {
    res.status(400).json({
      error: `topK must be an integer between 1 and ${MAX_VECTOR_TOP_K}`,
      code: 'VECTOR_TOP_K_INVALID',
    });
    return null;
  }
  return { query: query.trim(), topK };
}

async function getVectorReadiness(demoUser) {
  return db.withUserConnection(demoUser, async ({ execute }) => {
    const columns = await execute(`
      WITH vector_runtime AS (
        SELECT 'PRODUCT_EMBEDDINGS' AS table_name,
               'EMBEDDING' AS column_name,
               MAX(VECTOR_DIMENSION_COUNT(embedding)) AS dimension_count,
               MAX(VECTOR_DIMENSION_FORMAT(embedding)) AS dimension_type
        FROM product_embeddings
        UNION ALL
        SELECT 'POST_EMBEDDINGS' AS table_name,
               'EMBEDDING' AS column_name,
               MAX(VECTOR_DIMENSION_COUNT(embedding)) AS dimension_count,
               MAX(VECTOR_DIMENSION_FORMAT(embedding)) AS dimension_type
        FROM post_embeddings
      )
      SELECT columns.table_name,
             columns.column_name,
             columns.vector_info,
             TO_NUMBER(
               REGEXP_SUBSTR(
                 REPLACE(columns.vector_info, ' ', ''),
                 '^VECTOR\\(([0-9]+)',
                 1, 1, NULL, 1
               )
             ) AS declared_dimension_count,
             REGEXP_SUBSTR(
               REPLACE(columns.vector_info, ' ', ''),
               '^VECTOR\\([^,]+,([^,]+)',
               1, 1, NULL, 1
             ) AS declared_dimension_type,
             runtime.dimension_count AS actual_dimension_count,
             runtime.dimension_type AS actual_dimension_type
      FROM user_tab_columns columns
      JOIN vector_runtime runtime
        ON runtime.table_name = columns.table_name
       AND runtime.column_name = columns.column_name
      WHERE columns.data_type = 'VECTOR'
      ORDER BY columns.table_name, columns.column_name
    `);
    const models = await execute(`
      SELECT model_name, mining_function, algorithm
      FROM user_mining_models
      WHERE model_name = :modelName
    `, { modelName: VECTOR_MODEL_NAME });
    const indexes = await execute(`
      SELECT ui.index_name, ui.index_type, ui.index_subtype, ui.status,
             uic.table_name, uic.column_name
      FROM user_indexes ui
      JOIN user_ind_columns uic ON uic.index_name = ui.index_name
      WHERE ui.index_name IN ('IDX_PRODUCT_VEC', 'IDX_POST_VEC')
      ORDER BY ui.index_name
    `);
    const countsResult = await execute(`
      SELECT (SELECT COUNT(*) FROM product_embeddings) AS product_embeddings,
             (SELECT COUNT(*) FROM post_embeddings) AS post_embeddings,
             (SELECT COUNT(*) FROM semantic_matches) AS semantic_matches,
             SYS_CONTEXT('HIGHTECH_APP_CTX', 'ACCESS_SCOPE') AS access_scope
      FROM dual
    `);

    const vectorColumns = (columns.rows || []).map((row) => ({
      tableName: row.TABLE_NAME,
      columnName: row.COLUMN_NAME,
      vectorInfo: row.VECTOR_INFO,
      dimensions: Number(row.DECLARED_DIMENSION_COUNT),
      elementType: row.DECLARED_DIMENSION_TYPE,
      actualDimensions: row.ACTUAL_DIMENSION_COUNT == null
        ? null
        : Number(row.ACTUAL_DIMENSION_COUNT),
      actualElementType: row.ACTUAL_DIMENSION_TYPE,
    }));
    const vectorIndexes = (indexes.rows || []).map((row) => ({
      indexName: row.INDEX_NAME,
      tableName: row.TABLE_NAME,
      columnName: row.COLUMN_NAME,
      indexType: row.INDEX_TYPE,
      indexSubtype: row.INDEX_SUBTYPE,
      status: row.STATUS,
    }));
    const modelRow = models.rows?.[0] || null;
    const countRow = countsResult.rows?.[0] || {};
    const declaredColumnKeys = new Set(vectorColumns
      .filter((column) => column.dimensions === VECTOR_DIMENSIONS
        && String(column.elementType).toUpperCase() === 'FLOAT32')
      .map((column) => `${column.tableName}.${column.columnName}`));
    const sampledColumnKeys = new Set(vectorColumns
      .filter((column) => column.dimensions === VECTOR_DIMENSIONS
        && String(column.elementType).toUpperCase() === 'FLOAT32'
        && column.actualDimensions === VECTOR_DIMENSIONS
        && String(column.actualElementType).toUpperCase() === 'FLOAT32')
      .map((column) => `${column.tableName}.${column.columnName}`));
    const validIndexes = new Set(vectorIndexes
      .filter((index) => {
        const columnKey = `${index.tableName}.${index.columnName}`;
        return String(index.status).toUpperCase() === 'VALID'
          && String(index.indexType).toUpperCase() === 'VECTOR'
          && REQUIRED_VECTOR_COLUMNS.get(columnKey) === index.indexName;
      })
      .map((index) => index.indexName));
    const assetsReady = Boolean(modelRow)
      && String(modelRow.MINING_FUNCTION).toUpperCase() === 'EMBEDDING'
      && String(modelRow.ALGORITHM).toUpperCase() === 'ONNX'
      && [...REQUIRED_VECTOR_COLUMNS.keys()].every((key) => declaredColumnKeys.has(key))
      && [...REQUIRED_VECTOR_COLUMNS.values()].every((indexName) => validIndexes.has(indexName));
    const counts = {
      productEmbeddings: Number(countRow.PRODUCT_EMBEDDINGS || 0),
      postEmbeddings: Number(countRow.POST_EMBEDDINGS || 0),
      semanticMatches: Number(countRow.SEMANTIC_MATCHES || 0),
    };
    const accessScope = String(countRow.ACCESS_SCOPE || '').toUpperCase();
    const scopedNoVisibleData = assetsReady
      && ['RESTRICTED', 'NONE'].includes(accessScope)
      && counts.postEmbeddings === 0
      && counts.semanticMatches === 0;
    const metadataReady = assetsReady
      && [...REQUIRED_VECTOR_COLUMNS.keys()].every((key) => sampledColumnKeys.has(key));

    let representativeExecution = {
      executed: false,
      resultCount: 0,
      query: 'representative product vector search',
    };
    let planEvidence = {
      status: 'UNAVAILABLE',
      available: false,
      usedConfiguredIndex: false,
      operator: null,
      indexName: null,
      message: 'Representative search has not executed.',
    };

    if (metadataReady) {
      try {
        const representative = await execute(`
          SELECT /*+ GATHER_PLAN_STATISTICS */
                 product_id, vector_distance
          FROM (
            SELECT p.product_id,
                   VECTOR_DISTANCE(
                     pe.embedding,
                     VECTOR_EMBEDDING(ALL_MINILM_L12_V2 USING :planQuery AS DATA),
                     COSINE
                   ) AS vector_distance
            FROM product_embeddings pe
            JOIN products p ON p.product_id = pe.product_id
            ORDER BY VECTOR_DISTANCE(
              pe.embedding,
              VECTOR_EMBEDDING(ALL_MINILM_L12_V2 USING :planQuery AS DATA),
              COSINE
            )
            FETCH APPROXIMATE FIRST 5 ROWS ONLY
          )
          ORDER BY vector_distance, product_id
        `, { planQuery: 'GPU capacity and edge AI accelerator demand' });
        representativeExecution = {
          executed: true,
          resultCount: representative.rows?.length || 0,
          query: 'representative product vector search',
        };

        try {
          const plan = await execute(`
            SELECT plan_table_output
            FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR(NULL, NULL, 'BASIC +PREDICATE'))
          `);
          const planText = (plan.rows || [])
            .map((row) => row.PLAN_TABLE_OUTPUT)
            .filter(Boolean)
            .join('\n');
          const operator = planText.match(/VECTOR INDEX[^\n|]*/i)?.[0]?.trim() || null;
          const usedConfiguredIndex = Boolean(operator && /IDX_PRODUCT_VEC/i.test(planText));
          planEvidence = {
            status: usedConfiguredIndex ? 'VERIFIED' : 'PLAN_RETURNED_NO_INDEX_OPERATOR',
            available: Boolean(planText),
            usedConfiguredIndex,
            operator,
            indexName: usedConfiguredIndex ? 'IDX_PRODUCT_VEC' : null,
            message: usedConfiguredIndex
              ? 'The actual cursor plan exposes the configured product vector index operator.'
              : 'The actual cursor plan did not expose a vector index operator. No vector index scan is claimed.',
          };
        } catch (planError) {
          planEvidence = {
            status: 'UNAVAILABLE',
            available: false,
            usedConfiguredIndex: false,
            operator: null,
            indexName: null,
            message: `DBMS_XPLAN unavailable: ${String(planError?.message || planError).slice(0, 240)}`,
          };
        }
      } catch (executionError) {
        representativeExecution = {
          executed: false,
          resultCount: 0,
          query: 'representative product vector search',
          error: String(executionError?.message || executionError).slice(0, 240),
        };
        planEvidence = {
          status: 'UNAVAILABLE',
          available: false,
          usedConfiguredIndex: false,
          operator: null,
          indexName: null,
          message: 'Representative vector search failed, so no actual plan can be claimed.',
        };
      }
    }

    return {
      ready: metadataReady && representativeExecution.executed,
      source: 'ORACLE_METADATA_AND_EXECUTION',
      catalogAssetsPresent: assetsReady,
      scope: {
        status: scopedNoVisibleData
          ? 'SCOPED_NO_VISIBLE_VECTOR_DATA'
          : 'VISIBLE_VECTOR_DATA',
        accessScope,
        sampleAvailable: !scopedNoVisibleData,
      },
      model: modelRow ? {
        modelName: modelRow.MODEL_NAME,
        miningFunction: modelRow.MINING_FUNCTION,
        algorithm: modelRow.ALGORITHM,
      } : null,
      vectorColumns,
      vectorIndexes,
      counts,
      representativeExecution,
      planEvidence,
      expected: {
        modelName: VECTOR_MODEL_NAME,
        dimensions: VECTOR_DIMENSIONS,
        elementType: 'FLOAT32',
        distanceMetric: 'COSINE',
        indexOrganization: VECTOR_INDEX_ORGANIZATION,
      },
    };
  }, { readOnly: true });
}

// GET /api/social/posts — paginated social feed
router.get('/posts', async (req, res) => {
  try {
    const { page = 1, limit = 20, momentum, platform, influencer } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE 1=1';
    const binds = { limit: parseInt(limit), offset };

    if (momentum) {
      whereClause += " AND sp.momentum_flag = :momentum";
      binds.momentum = momentum;
    }
    if (platform) {
      whereClause += " AND sp.platform = :platform";
      binds.platform = platform;
    }
    if (influencer) {
      whereClause += " AND i.handle = :influencer";
      binds.influencer = influencer;
    }

    const result = await db.executeAsUser(`
      SELECT sp.post_id, sp.platform, sp.post_text, sp.posted_at,
             sp.likes_count, sp.shares_count, sp.comments_count, sp.views_count,
             sp.sentiment_score, sp.virality_score, sp.momentum_flag,
             i.handle AS influencer_handle,
             i.display_name AS influencer_name,
             i.follower_count,
             i.influence_score
      FROM social_posts sp
      LEFT JOIN influencers i ON sp.influencer_id = i.influencer_id
      ${whereClause}
      ORDER BY sp.virality_score DESC NULLS LAST, sp.posted_at DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `, binds, req.demoUser);

    // Build count binds without pagination-only vars (limit/offset not in COUNT query)
    const countBinds = { ...binds };
    delete countBinds.limit;
    delete countBinds.offset;

    const countFrom = influencer
      ? `social_posts sp LEFT JOIN influencers i ON sp.influencer_id = i.influencer_id`
      : `social_posts sp`;
    const countResult = await db.executeAsUser(`
      SELECT COUNT(*) AS total FROM ${countFrom} ${whereClause}
    `, countBinds, req.demoUser);

    res.json({
      posts: result.rows,
      total: countResult.rows[0].TOTAL,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Social posts error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/social/influencers — lightweight list of influencer handles for dropdown filters
router.get('/influencers', async (req, res) => {
  try {
    const result = await db.executeAsUser(`
      SELECT i.handle, i.platform, i.influence_score
      FROM influencers i
      ORDER BY i.influence_score DESC, i.handle
    `, {}, req.demoUser);
    res.json(result.rows);
  } catch (err) {
    console.error('Social influencers list error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/social/viral — viral and mega_viral posts
router.get('/viral', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 48;
    const result = await db.executeAsUser(`
      SELECT sp.post_id, sp.platform, sp.post_text, sp.posted_at,
             sp.likes_count, sp.shares_count, sp.comments_count, sp.views_count,
             sp.virality_score, sp.momentum_flag,
             i.handle, i.display_name, i.follower_count, i.influence_score,
             (SELECT LISTAGG(p.product_name, ', ') WITHIN GROUP (ORDER BY ppm.confidence_score DESC)
              FROM post_product_mentions ppm
              JOIN products p ON ppm.product_id = p.product_id
              WHERE ppm.post_id = sp.post_id) AS mentioned_products
      FROM social_posts sp
      LEFT JOIN influencers i ON sp.influencer_id = i.influencer_id
      WHERE sp.momentum_flag IN ('viral', 'mega_viral')
        AND sp.posted_at >= (SELECT MAX(posted_at) FROM social_posts) - NUMTODSINTERVAL(:hours, 'HOUR')
      ORDER BY sp.virality_score DESC
      FETCH FIRST 50 ROWS ONLY
    `, { hours }, req.demoUser);

    res.json(result.rows);
  } catch (err) {
    console.error('Viral posts error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/social/momentum-timeline
router.get('/momentum-timeline', async (req, res) => {
  try {
    const result = await db.executeAsUser(`
      SELECT
        TO_CHAR(TRUNC(posted_at, 'HH'), 'YYYY-MM-DD HH24:MI') AS time_bucket,
        momentum_flag,
        COUNT(*) AS post_count,
        SUM(likes_count) AS total_likes,
        SUM(views_count) AS total_views
      FROM social_posts
      WHERE posted_at >= (SELECT MAX(posted_at) FROM social_posts) - INTERVAL '72' HOUR
      GROUP BY TRUNC(posted_at, 'HH'), momentum_flag
      ORDER BY time_bucket, momentum_flag
    `, {}, req.demoUser);

    res.json(result.rows);
  } catch (err) {
    console.error('Momentum timeline error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/social/platform-breakdown
router.get('/platform-breakdown', async (req, res) => {
  try {
    const result = await db.executeAsUser(`
      SELECT platform,
             COUNT(*) AS post_count,
             SUM(likes_count) AS total_likes,
             SUM(shares_count) AS total_shares,
             SUM(views_count) AS total_views,
             ROUND(AVG(sentiment_score), 3) AS avg_sentiment,
             COUNT(CASE WHEN momentum_flag IN ('viral','mega_viral') THEN 1 END) AS viral_count
      FROM social_posts
      WHERE posted_at >= (SELECT MAX(posted_at) FROM social_posts) - INTERVAL '7' DAY
      GROUP BY platform
      ORDER BY total_views DESC
    `, {}, req.demoUser);

    res.json(result.rows);
  } catch (err) {
    console.error('Platform breakdown error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/social/semantic-search — real-time vector similarity search
// Uses Oracle VECTOR_EMBEDDING to embed the query text at runtime,
// then VECTOR_DISTANCE to find the closest product embeddings via ANN index.
router.get('/vector-readiness', async (req, res) => {
  try {
    const readiness = await getVectorReadiness(req.demoUser);
    if (readiness.scope?.status === 'SCOPED_NO_VISIBLE_VECTOR_DATA') {
      readiness.error = 'No vector signal rows are visible for this VPD persona.';
      return res.json(readiness);
    }
    if (!readiness.ready) return vectorUnavailable(res, readiness);
    return res.json(readiness);
  } catch (err) {
    console.error('Vector readiness error:', err);
    return vectorUnavailable(res, {
      ready: false,
      source: 'ORACLE_METADATA',
      error: 'Oracle vector metadata could not be read',
    });
  }
});

router.post('/semantic-search', async (req, res) => {
  try {
    const input = parseVectorSearchInput(req, res, 10);
    if (!input) return;
    const { query, topK } = input;
    const readiness = await getVectorReadiness(req.demoUser);
    if (!readiness.ready) return vectorUnavailable(res, readiness);

    const result = await db.executeAsUser(`
      WITH query_vector AS (
        SELECT VECTOR_EMBEDDING(ALL_MINILM_L12_V2 USING :query AS DATA) AS embedding
        FROM dual
      ),
      ranked_products AS (
        SELECT p.product_id,
               p.product_name,
               p.category,
               p.unit_price,
               b.brand_name,
               pe.embedding_model,
               (SELECT COUNT(*) FROM post_product_mentions ppm
                WHERE ppm.product_id = p.product_id) AS mention_count,
               VECTOR_DISTANCE(pe.embedding, q.embedding, COSINE) AS vector_distance
        FROM product_embeddings pe
        JOIN products p ON pe.product_id = p.product_id
        JOIN brands b ON p.brand_id = b.brand_id
        CROSS JOIN query_vector q
        ORDER BY VECTOR_DISTANCE(pe.embedding, q.embedding, COSINE)
        FETCH APPROXIMATE FIRST :topK ROWS ONLY
      )
      SELECT product_id, product_name, category, unit_price, brand_name,
             embedding_model, mention_count,
             ROUND(vector_distance, 6) AS vector_distance,
             ROUND(1 - vector_distance, 6) AS similarity_score
      FROM ranked_products
      ORDER BY vector_distance ASC, product_id ASC
    `, { query, topK }, req.demoUser);

    return res.json({
      query,
      source: 'ORACLE_VECTOR_SEARCH',
      model: VECTOR_MODEL_NAME,
      dimensions: VECTOR_DIMENSIONS,
      distanceMetric: 'COSINE',
      readiness,
      results: result.rows,
    });
  } catch (err) {
    console.error('Semantic search error:', err);
    if (/ORA-40284|ORA-518|VECTOR|ALL_MINILM_L12_V2/i.test(String(err?.message || ''))) {
      return vectorUnavailable(res, { ready: false, source: 'ORACLE_METADATA' });
    }
    return res.status(500).json({ error: 'Oracle vector search failed', code: 'VECTOR_SEARCH_FAILED' });
  }
});

// POST /api/social/post-search — vector similarity search over social posts
// Embeds query at runtime using ALL_MINILM_L12_V2, finds nearest post_embeddings via ANN index.
router.post('/post-search', async (req, res) => {
  try {
    const input = parseVectorSearchInput(req, res, 20);
    if (!input) return;
    const { query, topK } = input;
    const readiness = await getVectorReadiness(req.demoUser);
    if (!readiness.ready) return vectorUnavailable(res, readiness);

    const startTime = Date.now();
    const result = await db.executeAsUser(`
      WITH query_vector AS (
        SELECT VECTOR_EMBEDDING(ALL_MINILM_L12_V2 USING :query AS DATA) AS embedding
        FROM dual
      ),
      ranked_posts AS (
        SELECT sp.post_id, sp.platform, sp.post_text, sp.posted_at,
               sp.likes_count, sp.shares_count, sp.comments_count, sp.views_count,
               sp.sentiment_score, sp.virality_score, sp.momentum_flag,
               i.handle AS influencer_handle, i.display_name AS influencer_name,
               i.follower_count, i.influence_score,
               VECTOR_DISTANCE(pe.embedding, q.embedding, COSINE) AS vector_distance
        FROM post_embeddings pe
        JOIN social_posts sp ON pe.post_id = sp.post_id
        LEFT JOIN influencers i ON sp.influencer_id = i.influencer_id
        CROSS JOIN query_vector q
        ORDER BY VECTOR_DISTANCE(pe.embedding, q.embedding, COSINE)
        FETCH APPROXIMATE FIRST :topK ROWS ONLY
      )
      SELECT ranked_posts.*,
             ROUND(vector_distance, 6) AS distance,
             ROUND(1 - vector_distance, 6) AS similarity_score
      FROM ranked_posts
      ORDER BY vector_distance ASC, post_id ASC
    `, { query, topK }, req.demoUser);

    const elapsed = Date.now() - startTime;

    return res.json({
      query,
      source: 'ORACLE_VECTOR_SEARCH',
      model: VECTOR_MODEL_NAME,
      dimensions: VECTOR_DIMENSIONS,
      distanceMetric: 'COSINE',
      readiness,
      posts: result.rows,
      count: result.rows.length,
      elapsed,
    });
  } catch (err) {
    console.error('Post vector search error:', err);
    if (/ORA-40284|ORA-518|VECTOR|ALL_MINILM_L12_V2/i.test(String(err?.message || ''))) {
      return vectorUnavailable(res, { ready: false, source: 'ORACLE_METADATA' });
    }
    return res.status(500).json({ error: 'Oracle vector search failed', code: 'VECTOR_SEARCH_FAILED' });
  }
});

module.exports = router;
