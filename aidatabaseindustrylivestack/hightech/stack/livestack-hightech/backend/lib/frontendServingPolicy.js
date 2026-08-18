function normalize(value) {
  return String(value == null ? '' : value).trim().toLowerCase();
}

function shouldServeFrontend(env = process.env) {
  const nodeEnv = normalize(env.NODE_ENV);
  if (nodeEnv === 'production') return true;
  return nodeEnv === 'test' && normalize(env.SERVE_FRONTEND_IN_TEST) === '1';
}

module.exports = {
  shouldServeFrontend,
};
