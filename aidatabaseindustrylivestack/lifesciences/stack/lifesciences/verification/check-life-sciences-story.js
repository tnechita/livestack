const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const requiredFileSnippets = [
  ['frontend/src/pages/Welcome.jsx', 'Welcome'],
  ['frontend/src/pages/Welcome.jsx', 'clinical-supply journey'],
  ['frontend/src/pages/SocialFeed.jsx', 'acknowledgements'],
  ['frontend/src/pages/SocialFeed.jsx', 'escalations'],
  ['frontend/src/pages/OMLAnalytics.jsx', 'Trial Site Readiness Segments'],
  ['frontend/src/pages/OMLAnalytics.jsx', 'Clinical Supply Impact Forecast'],
  ['frontend/src/pages/AskData.jsx', 'Ask Seer Regulated Supply Data'],
  ['frontend/src/pages/AgentConsole.jsx', 'Seer Governed Agent Console'],
  ['db/data/load_orders.sql', 'v_delivered_at := v_shipped_at +'],
  ['db/data/load_customers.sql', 'Trial sites loaded'],
  ['db/data/load_all_data.sql', 'UPDATE fulfillment_centers'],
];

const forbiddenVisiblePhrases = [
  ['frontend/src/pages/OMLAnalytics.jsx', 'Churn Risk Distribution'],
  ['frontend/src/pages/OMLAnalytics.jsx', 'Top trial sites by RFM score'],
  ['frontend/src/pages/OMLAnalytics.jsx', 'Demand Surge Predictions'],
  ['frontend/src/pages/AskData.jsx', 'Ask Seer Lifesciences Data'],
  ['frontend/src/pages/AgentConsole.jsx', 'Ollama (llama3.2)'],
  ['frontend/src/pages/FulfillmentMap.jsx', 'buyer address'],
  ['frontend/src/pages/FulfillmentMap.jsx', 'buyer_tier'],
  ['frontend/src/pages/Dashboard.jsx', 'name="Likes"'],
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

const failures = [];

for (const [relativePath, snippet] of requiredFileSnippets) {
  const text = read(relativePath);
  if (!text.includes(snippet)) {
    failures.push(`${relativePath} is missing required story text: ${snippet}`);
  }
}

for (const [relativePath, phrase] of forbiddenVisiblePhrases) {
  const text = read(relativePath);
  if (text.includes(phrase)) {
    failures.push(`${relativePath} still contains deprecated visible wording: ${phrase}`);
  }
}

const loadOrders = read('db/data/load_orders.sql');
if (/delivered_at\s*\)\s*VALUES[\s\S]*SYSTIMESTAMP\s*-\s*NUMTODSINTERVAL\(DBMS_RANDOM\.VALUE\(0,\s*2\)/i.test(loadOrders)) {
  failures.push('load_orders.sql still allows delivered_at to be generated independently from shipped_at.');
}

if (failures.length) {
  console.error('Life sciences story checks failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Life sciences story checks passed.');
