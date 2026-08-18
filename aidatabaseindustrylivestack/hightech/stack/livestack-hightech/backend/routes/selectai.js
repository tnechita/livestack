const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const {
  DEFAULT_PROFILE,
  answerQuestion,
  describeGeneratedSql,
  generateQuestionSql,
  getAvailableSelectAiProfiles,
  getHighTechSchemaObjectMetadata,
  getOllamaRuntimeConfig,
  getProfileModel,
  groupHighTechSchemaObjectMetadata,
  normalizeProfile,
  runQuestionQuery,
  summarizeRunSqlResult,
} = require('../lib/ollamaAssistant');

function isUserQueryError(error) {
  if (error?.statusCode) return error.statusCode >= 400 && error.statusCode < 500;
  if (error?.isUserQueryError) return true;
  return /Unable to generate|No SQL generated|Only SELECT or WITH|not allowed|unsupported tables|Use .* instead|Oracle equivalents|PostgreSQL syntax|valid Oracle SQL query/i.test(
    error.message || ''
  );
}

function createCorrelationId() {
  return crypto.randomUUID ? crypto.randomUUID() : `ask-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createTrace(req, mode, profile, question = '') {
  const resolvedProfile = normalizeProfile(profile);
  const runtime = getOllamaRuntimeConfig(resolvedProfile);
  return {
    correlationId: req.headers['x-correlation-id'] || createCorrelationId(),
    mode,
    promptLength: String(question || '').length,
    profile: resolvedProfile,
    model: runtime.model,
    ollamaHost: runtime.host,
    startedAt: Date.now(),
  };
}

function logTrace(trace, status, extra = {}) {
  console.info(JSON.stringify({
    event: 'ask_hightech_data_request',
    correlation_id: trace.correlationId,
    mode: trace.mode,
    prompt_length: trace.promptLength,
    profile: trace.profile,
    selected_model: trace.model,
    ollama_host: trace.ollamaHost,
    row_count: trace.rowCount ?? null,
    final_status: status,
    elapsed_ms: Date.now() - trace.startedAt,
    ...extra,
  }));
}

function normalizeAskDataError(error) {
  const message = error?.message || 'Ask High Tech Data could not complete the request.';
  let category = 'UNEXPECTED_BACKEND_RESPONSE';
  let statusCode = error?.statusCode || 500;
  let userMessage = 'Ask High Tech Data could not complete the request.';

  if (/timeout|took too long/i.test(message)) {
    category = 'REQUEST_TIMEOUT';
    statusCode = 504;
    userMessage = 'The request took too long. Try a narrower High Tech question.';
  } else if (/Only SELECT or WITH|Comments and multiple statements|Write operations and PL\/SQL|System packages|unsupported tables|not allowed|safe read-only SQL query|valid Oracle SQL query|Oracle equivalents|PostgreSQL syntax/i.test(message)) {
    category = 'SQL_VALIDATION_BLOCKED';
    statusCode = 400;
    userMessage = 'This query was not executed because it falls outside the allowed governed High Tech schema.';
  } else if (/Ollama|fetch failed|ECONNREFUSED|ENOTFOUND|model/i.test(message)) {
    category = /model/i.test(message) ? 'OLLAMA_MODEL_MISSING' : 'OLLAMA_UNAVAILABLE';
    statusCode = 503;
    userMessage = /model/i.test(message)
      ? 'The configured Ollama model is not available. Pull or configure the model before using Ask High Tech Data.'
      : 'The local Ollama service is unavailable. Check that the Ollama container is running.';
  } else if (/ORA-\d{5}|Oracle/i.test(message)) {
    category = 'ORACLE_QUERY_FAILED';
    statusCode = isUserQueryError(error) ? 400 : 500;
    userMessage = 'Oracle could not execute the generated query. Try rephrasing with a more specific governed High Tech object.';
  } else if (isUserQueryError(error)) {
    category = 'SQL_GENERATION_FAILED';
    statusCode = 400;
    userMessage = message;
  }

  return {
    category,
    statusCode,
    userMessage,
    developerMessage: message,
    detail: category === 'SQL_VALIDATION_BLOCKED' && message !== userMessage ? message : null,
    sql: error?.sql || null,
    profile: error?.profile || null,
    model: error?.model || null,
  };
}

function safeErrorResponse(err, trace, fallbackProfile) {
  const normalized = normalizeAskDataError(err);
  const profile = normalized.profile || fallbackProfile || trace.profile;
  return {
    error: normalized.userMessage,
    category: normalized.category,
    detail: normalized.detail,
    correlationId: trace.correlationId,
    profile,
    model: normalized.model || getProfileModel(profile),
    elapsed: Date.now() - trace.startedAt,
    sql: normalized.category === 'SQL_VALIDATION_BLOCKED' ? null : normalized.sql,
  };
}

function timeoutAfter(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(Object.assign(new Error('The request took too long. Try a narrower High Tech question.'), {
      statusCode: 504,
    })), ms);
  });
}

router.get('/profiles', async (_req, res) => {
  res.json({
    profiles: getAvailableSelectAiProfiles(),
    activeProfile: DEFAULT_PROFILE,
  });
});

router.get('/schema-objects', async (_req, res) => {
  const objects = getHighTechSchemaObjectMetadata();
  res.json({
    objects,
    domains: groupHighTechSchemaObjectMetadata(objects),
    meta: {
      object_count: objects.length,
      domain_count: new Set(objects.map((object) => object.domain)).size,
      raw_object_names_preserved: true,
      queryable_only: true,
    },
  });
});

router.get('/health', async (req, res) => {
  const profile = normalizeProfile(req.query.profile);
  const runtime = getOllamaRuntimeConfig(profile);
  res.json({
    status: 'healthy',
    profile,
    model: runtime.model,
    checks: {
      profiles: getAvailableSelectAiProfiles().length,
      schemaObjects: getHighTechSchemaObjectMetadata().length,
    },
  });
});

async function handleNarrativeMode(req, res, mode) {
  const { question, showSql = true, profile, history = [] } = req.body;
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'A question is required' });
  }

  const q = question.trim();
  const resolvedProfile = normalizeProfile(profile);
  const trace = createTrace(req, mode === 'narrate' ? 'explain' : 'chat', resolvedProfile, q);
  res.setHeader('X-Correlation-ID', trace.correlationId);

  try {
    const result = await Promise.race([
      answerQuestion(q, {
        mode,
        demoUser: req.demoUser,
        profile: resolvedProfile,
        conversationContext: history,
      }),
      timeoutAfter(180000),
    ]);
    trace.rowCount = result.rowCount;
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
      elapsed: Date.now() - trace.startedAt,
      profile: resolvedProfile,
      model: result.model || getProfileModel(resolvedProfile),
      repairedFromSql: result.repairedFromSql || null,
      correlationId: trace.correlationId,
    });
  } catch (err) {
    const normalized = normalizeAskDataError(err);
    logTrace(trace, 'failed', {
      error_category: normalized.category,
      developer_message: normalized.developerMessage,
    });
    console.error(`Select AI ${mode} error [${trace.correlationId}]:`, normalized.developerMessage);
    return res.status(normalized.statusCode || (isUserQueryError(err) ? 400 : 500)).json({
      question: q,
      ...safeErrorResponse(err, trace, resolvedProfile),
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
  const { question, profile, history = [] } = req.body;
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'A question is required' });
  }

  const q = question.trim();
  const resolvedProfile = normalizeProfile(profile);
  const trace = createTrace(req, 'show_sql', resolvedProfile, q);
  res.setHeader('X-Correlation-ID', trace.correlationId);

  try {
    const result = await Promise.race([
      generateQuestionSql(q, { mode: 'showsql', profile: resolvedProfile, conversationContext: history }),
      timeoutAfter(150000),
    ]);
    logTrace(trace, 'success', { row_count: null });

    return res.json({
      mode: 'show_sql',
      question: q,
      sql: result.sql,
      explanation: describeGeneratedSql(result.sql, q),
      warnings: result.warnings || [],
      elapsed: Date.now() - trace.startedAt,
      profile: resolvedProfile,
      model: result.model || getProfileModel(resolvedProfile),
      repairedFromSql: result.repairedFromSql || null,
      correlationId: trace.correlationId,
    });
  } catch (err) {
    const normalized = normalizeAskDataError(err);
    logTrace(trace, 'failed', {
      error_category: normalized.category,
      developer_message: normalized.developerMessage,
    });
    console.error(`Select AI showsql error [${trace.correlationId}]:`, normalized.developerMessage);
    return res.status(normalized.statusCode || (isUserQueryError(err) ? 400 : 500)).json({
      question: q,
      ...safeErrorResponse(err, trace, resolvedProfile),
    });
  }
});

router.post('/runsql', async (req, res) => {
  const { question, profile, history = [] } = req.body;
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'A question is required' });
  }

  const q = question.trim();
  const resolvedProfile = normalizeProfile(profile);
  const trace = createTrace(req, 'run_sql', resolvedProfile, q);
  res.setHeader('X-Correlation-ID', trace.correlationId);

  try {
    const result = await Promise.race([
      runQuestionQuery(q, { mode: 'runsql', demoUser: req.demoUser, profile: resolvedProfile, conversationContext: history }),
      timeoutAfter(150000),
    ]);
    trace.rowCount = result.rowCount;
    logTrace(trace, 'success', { row_count: result.rowCount });

    return res.json({
      mode: 'run_sql',
      question: q,
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rowCount,
      sql: result.sql,
      explanation: summarizeRunSqlResult(result),
      warnings: result.warnings || [],
      elapsed: Date.now() - trace.startedAt,
      profile: resolvedProfile,
      model: result.model || getProfileModel(resolvedProfile),
      repairedFromSql: result.repairedFromSql || null,
      correlationId: trace.correlationId,
    });
  } catch (err) {
    const normalized = normalizeAskDataError(err);
    logTrace(trace, 'failed', {
      error_category: normalized.category,
      developer_message: normalized.developerMessage,
    });
    console.error(`Select AI runsql error [${trace.correlationId}]:`, normalized.developerMessage);
    return res.status(normalized.statusCode || (isUserQueryError(err) ? 400 : 500)).json({
      question: q,
      ...safeErrorResponse(err, trace, resolvedProfile),
    });
  }
});

module.exports = router;
