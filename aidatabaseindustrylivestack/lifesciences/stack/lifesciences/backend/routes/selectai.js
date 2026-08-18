const express = require('express');
const crypto = require('node:crypto');
const router = express.Router();
const {
  DEFAULT_PROFILE,
  answerQuestion,
  checkAskDataHealth,
  describeGeneratedSql,
  generateQuestionSql,
  getAskDataSchemaObjectMetadata,
  getAvailableSelectAiProfiles,
  getOllamaRuntimeConfig,
  getProfileModel,
  groupAskDataSchemaObjectMetadata,
  normalizeProfile,
  normalizeAskDataError,
  runQuestionQuery,
  summarizeRunSqlResult,
} = require('../lib/ollamaAssistant');

function requestTrace(req, mode, profile, question = '') {
  const runtime = getOllamaRuntimeConfig(profile);
  return { correlationId: req.headers['x-correlation-id'] || crypto.randomUUID(), mode, profile, model: runtime.model, ollamaHost: runtime.host, promptLength: question.length, startedAt: Date.now() };
}

function logTrace(trace, status, extra = {}) {
  console.info(JSON.stringify({ event: 'ask_seer_data_request', correlation_id: trace.correlationId, mode: trace.mode, profile: trace.profile, selected_model: trace.model, ollama_host: trace.ollamaHost, prompt_length: trace.promptLength, final_status: status, elapsed_ms: Date.now() - trace.startedAt, ...extra }));
}

function isUserQueryError(error) {
  if (error?.isUserQueryError) return true;
  return /Unable to generate|No SQL generated|Only SELECT or WITH|not allowed|unsupported tables|Use .* instead|Oracle equivalents|PostgreSQL syntax|valid Oracle SQL query/i.test(
    error.message || ''
  );
}

router.get('/profiles', async (_req, res) => {
  res.json({
    profiles: getAvailableSelectAiProfiles(),
    activeProfile: DEFAULT_PROFILE,
  });
});

router.get('/schema-objects', async (_req, res) => {
  try {
    const objects = await getAskDataSchemaObjectMetadata();
    res.json({
      objects,
      domains: groupAskDataSchemaObjectMetadata(objects),
      meta: {
        object_count: objects.length,
        domain_count: new Set(objects.map((object) => object.domain)).size,
        raw_object_names_preserved: true,
        queryable_only: true,
      },
    });
  } catch (err) {
    console.error('Select AI schema metadata error:', err.message);
    res.status(500).json({ error: 'Unable to load Ask Data schema metadata' });
  }
});

router.get('/health', async (req, res) => {
  const result = await checkAskDataHealth({ demoUser: req.demoUser, profile: normalizeProfile(req.query.profile) });
  res.status(result.status === 'healthy' ? 200 : 503).json({ ...result, timestamp: new Date().toISOString() });
});

async function handleNarrativeMode(req, res, mode) {
  const { question, showSql = true, profile, history = [] } = req.body;
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'A question is required' });
  }

  const q = question.trim();
  const startTime = Date.now();
  const resolvedProfile = normalizeProfile(profile);
  const trace = requestTrace(req, mode === 'narrate' ? 'explain' : 'chat', resolvedProfile, q);
  res.setHeader('X-Correlation-ID', trace.correlationId);

  try {
    const result = await Promise.race([
      answerQuestion(q, {
        mode,
        demoUser: req.demoUser,
        profile: resolvedProfile,
        history: mode === 'chat' && Array.isArray(history) ? history : [],
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 180000)),
    ]);

    logTrace(trace, 'success', { row_count: result.rowCount });
    return res.json({
      mode: mode === 'narrate' ? 'explain' : 'chat',
      question: q,
      answer: result.answer,
      keyFindings: result.keyFindings || [],
      resultSummary: result.resultSummary || '',
      followUpQuestions: result.followUpQuestions || [],
      referencedData: result.referencedData || null,
      rowCount: result.rowCount,
      sql: showSql ? result.sql : null,
      warnings: result.warnings || [],
      elapsed: Date.now() - startTime,
      profile: resolvedProfile,
      model: result.model || getProfileModel(resolvedProfile),
      repairedFromSql: result.repairedFromSql || null,
      correlationId: trace.correlationId,
    });
  } catch (err) {
    const elapsed = Date.now() - startTime;
    const normalized = normalizeAskDataError(err);
    logTrace(trace, 'failed', { error_category: normalized.category });
    console.error(`Select AI ${mode} error [${trace.correlationId}]:`, normalized.developerMessage);
    return res.status(normalized.statusCode || (isUserQueryError(err) ? 400 : 500)).json({
      question: q,
      error: normalized.userMessage,
      category: normalized.category,
      correlationId: trace.correlationId,
      elapsed,
      profile: err.profile || resolvedProfile,
      model: err.model || getProfileModel(resolvedProfile),
      sql: err.sql || null,
      oracleError: err.oracleError || null,
    });
  }
}

router.post('/chat', async (req, res) => {
  return handleNarrativeMode(req, res, 'narrate');
});

router.post('/chat-mode', async (req, res) => {
  return handleNarrativeMode(req, res, 'chat');
});

router.post('/showsql', async (req, res) => {
  const { question, profile } = req.body;
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'A question is required' });
  }

  const q = question.trim();
  const startTime = Date.now();
  const resolvedProfile = normalizeProfile(profile);

  try {
    const result = await Promise.race([
      generateQuestionSql(q, { mode: 'showsql', profile: resolvedProfile }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 150000)),
    ]);

    return res.json({
      mode: 'show_sql',
      question: q,
      sql: result.sql,
      explanation: describeGeneratedSql(result.sql, q),
      warnings: result.warnings || [],
      elapsed: Date.now() - startTime,
      profile: resolvedProfile,
      model: result.model || getProfileModel(resolvedProfile),
      repairedFromSql: result.repairedFromSql || null,
    });
  } catch (err) {
    console.error('Select AI showsql error:', err.message);
    return res.status(isUserQueryError(err) ? 400 : 500).json({
      question: q,
      error: err.message === 'timeout'
        ? 'The request took too long. Try a narrower question.'
        : err.message,
      elapsed: Date.now() - startTime,
      profile: err.profile || resolvedProfile,
      model: err.model || getProfileModel(resolvedProfile),
      sql: err.sql || null,
      oracleError: err.oracleError || null,
    });
  }
});

router.post('/runsql', async (req, res) => {
  const { question, profile } = req.body;
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'A question is required' });
  }

  const q = question.trim();
  const startTime = Date.now();
  const resolvedProfile = normalizeProfile(profile);

  try {
    const result = await Promise.race([
      runQuestionQuery(q, { mode: 'runsql', demoUser: req.demoUser, profile: resolvedProfile }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 150000)),
    ]);

    return res.json({
      mode: 'run_sql',
      question: q,
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rowCount,
      sql: result.sql,
      explanation: summarizeRunSqlResult(result),
      warnings: result.warnings || [],
      elapsed: Date.now() - startTime,
      profile: resolvedProfile,
      model: result.model || getProfileModel(resolvedProfile),
      repairedFromSql: result.repairedFromSql || null,
    });
  } catch (err) {
    console.error('Select AI runsql error:', err.message);
    return res.status(isUserQueryError(err) ? 400 : 500).json({
      question: q,
      error: err.message === 'timeout'
        ? 'The request took too long. Try a narrower question.'
        : err.message,
      elapsed: Date.now() - startTime,
      profile: err.profile || resolvedProfile,
      model: err.model || getProfileModel(resolvedProfile),
      sql: err.sql || null,
      oracleError: err.oracleError || null,
    });
  }
});

module.exports = router;
