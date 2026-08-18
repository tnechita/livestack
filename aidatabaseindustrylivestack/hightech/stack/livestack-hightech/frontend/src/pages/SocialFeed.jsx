import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { TrendingUp, Filter, Search, Flame, Eye, Share2, MessageCircle, Heart, Package, Sparkles, Loader2, DollarSign, X } from 'lucide-react';
// recharts removed - Platform Activity chart removed
import { api, apiFetch } from '../utils/api';
import { useData } from '../hooks/useData';
import { useUser } from '../context/UserContext';
import { formatNumber, formatCurrency, timeAgo, getPlatformColor } from '../utils/format';
import { FeatureBadge, SqlBlock, DiagramBox } from '../components/OracleInfoPanel';
import { RegisterOraclePanel } from '../context/OraclePanelContext';
import { JetButton, JetInputText, JetSelectSingle } from '../components/JetControls';
import { SceneStoryPanel } from '../components/HighTechStory';
import HelpTip from '../components/HelpTip';

function SignalMetric({ icon: Icon, label, value }) {
  return (
    <span className="flex items-center gap-1 whitespace-nowrap" title={label}>
      <Icon size={12} />
      {label} {formatNumber(value)}
    </span>
  );
}

const SIGNAL_CARD_ACTIONS = [
  { label: 'Review supplier risk', page: 'graph' },
  { label: 'Check component capacity', page: 'fulfillment' },
  { label: 'Inspect customer commitments', page: 'orders' },
  { label: 'Route quality follow-up', page: 'agents' },
];

const ELEVATED_SIGNAL_FLAGS = new Set(['viral', 'mega_viral']);

const SIGNAL_CONCERN_LABELS = {
  instagram: 'channel inventory and connected product demand volatility',
  tiktok: 'field quality and warranty analytics signal movement',
  twitter: 'component shortage and supplier risk escalation',
  youtube: 'new product introduction and design-to-manufacturing handoff concern',
  threads: 'service and support operations follow-up',
  default: 'customer commitment, BOM, and order promising exposure',
};

const SIGNAL_NEXT_STEPS = {
  instagram: 'Review channel inventory and customer commitments',
  tiktok: 'Route field quality and warranty analytics review',
  twitter: 'Check component shortages and supplier risk',
  youtube: 'Validate NPI, ECO, and bill of materials readiness',
  threads: 'Route service and support operations follow-up',
  default: 'Open Supply & Commitment Control Tower',
};

function SignalCardActions() {
  return (
    <div className="signal-card-actions" aria-label="High Tech signal actions">
      {SIGNAL_CARD_ACTIONS.map((action) => (
        <a key={action.label} className="btn-ghost signal-card-action" href={`?page=${action.page}`}>
          {action.label}
        </a>
      ))}
    </div>
  );
}

function signalPlatformKey(value) {
  return String(value || '').toLowerCase();
}

function getTopSignalType(signalRows, fallbackPlatform) {
  if (fallbackPlatform) return signalPlatformKey(fallbackPlatform);
  const counts = new Map();
  signalRows.forEach((signal) => {
    const key = signalPlatformKey(signal.PLATFORM);
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'default';
}

function getHighestImpactSource(signalRows, fallbackSource) {
  if (fallbackSource) return fallbackSource;
  const topSignal = signalRows
    .filter((signal) => signal.INFLUENCER_HANDLE)
    .sort((a, b) => Number(b.FOLLOWER_COUNT || 0) - Number(a.FOLLOWER_COUNT || 0))[0];
  return topSignal?.INFLUENCER_HANDLE || 'Product operations signal cluster';
}

function SignalSummaryPanel({
  total,
  posts,
  postSearchResults,
  viralPosts,
  momentum,
  platform,
  influencer,
}) {
  const summaryItems = useMemo(() => {
    const searchPosts = postSearchResults?.posts || [];
    const isSearchView = Boolean(postSearchResults);
    const visibleSignals = isSearchView ? searchPosts : posts;
    const hasFilters = Boolean(momentum || platform || influencer);
    const currentCount = isSearchView ? (postSearchResults?.count || searchPosts.length) : total;
    const visibleElevatedCount = visibleSignals.filter((signal) => ELEVATED_SIGNAL_FLAGS.has(signal.MOMENTUM_FLAG)).length;
    const topSignalType = getTopSignalType(visibleSignals, platform);
    const topConcern = SIGNAL_CONCERN_LABELS[topSignalType] || SIGNAL_CONCERN_LABELS.default;
    const highestImpactSource = getHighestImpactSource(visibleSignals, influencer);
    const nextStep = SIGNAL_NEXT_STEPS[topSignalType] || SIGNAL_NEXT_STEPS.default;

    if (isSearchView && currentCount === 0) {
      return [
        { label: 'Indexed signals', value: '0 matched signals' },
        { label: 'Elevated / critical', value: '0 elevated or critical matches' },
        { label: 'Top concern', value: 'No matched High Tech concern yet' },
        { label: 'Highest impact source', value: 'No matched source yet' },
        { label: 'Recommended next step', value: 'Adjust query or review broader signal filters', tone: 'action' },
      ];
    }

    return [
      { label: 'Indexed signals', value: `${formatNumber(currentCount)} ${isSearchView ? 'matched ' : hasFilters ? 'filtered ' : ''}signals` },
      { label: 'Elevated / critical', value: `${formatNumber(isSearchView || hasFilters ? visibleElevatedCount : (viralPosts?.length ?? visibleElevatedCount))} elevated or critical` },
      { label: 'Top concern', value: topConcern },
      { label: 'Highest impact source', value: highestImpactSource },
      { label: 'Recommended next step', value: nextStep, tone: 'action' },
    ];
  }, [total, posts, postSearchResults, viralPosts, momentum, platform, influencer]);

  return (
    <section className="glass-card border border-teal-soft signal-summary-panel" aria-labelledby="signal-summary-title">
      <div className="signal-summary-panel__header">
        <div>
          <h3 id="signal-summary-title" className="signal-summary-panel__title">Signal Summary</h3>
          <p className="signal-summary-panel__subtitle">What the current product signal view means for supply, quality, and customer commitments.</p>
        </div>
        <span className="social-vector-search-panel__chip text-[var(--color-text)] border border-teal-soft font-mono">LIVE VIEW</span>
      </div>
      <dl className="signal-summary-panel__grid">
        {summaryItems.map((item) => (
          <div key={item.label} className="signal-summary-panel__item">
            <dt className="signal-summary-panel__label">{item.label}</dt>
            <dd className={`signal-summary-panel__value${item.tone === 'action' ? ' signal-summary-panel__value--action' : ''}`}>
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function PostCard({ post }) {
  const momentumClass = `momentum-${post.MOMENTUM_FLAG}`;
  return (
    <div className="glass-card p-4 fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`platform-badge platform-${post.PLATFORM}`}>{post.PLATFORM}</span>
            <span className={`momentum-badge ${momentumClass}`}>
              {post.MOMENTUM_FLAG === 'mega_viral' ? '🔥 MEGA VIRAL' :
               post.MOMENTUM_FLAG === 'viral' ? '🔥 Viral' :
               post.MOMENTUM_FLAG === 'rising' ? '📈 Rising' : 'Normal'}
            </span>
            <span className="text-[11px] text-[var(--color-text-dim)]">{timeAgo(post.POSTED_AT)}</span>
          </div>
          {post.INFLUENCER_HANDLE && (
            <p className="text-xs text-[var(--color-accent)] font-medium mb-1">
              {post.INFLUENCER_HANDLE}
              <span className="text-[var(--color-text-dim)] font-normal ml-2">
                {formatNumber(post.FOLLOWER_COUNT)} followers · Score {post.INFLUENCE_SCORE}
              </span>
            </p>
          )}
          <p className="text-sm leading-relaxed line-clamp-3">{post.POST_TEXT}</p>
        </div>
        {post.VIRALITY_SCORE && (
          <div className="flex-shrink-0 text-center">
            <div className="text-lg font-bold font-mono" style={{ color: post.VIRALITY_SCORE > 75 ? '#C74634' : post.VIRALITY_SCORE > 50 ? '#AA643B' : '#7A736E' }}>
              {post.VIRALITY_SCORE}
            </div>
            <div className="text-[9px] text-[var(--color-text-dim)] uppercase">Virality</div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-3 border-t border-[var(--color-border)]/30 text-[12px] text-[var(--color-text-dim)]">
        <SignalMetric icon={Heart} label="Related signals" value={post.LIKES_COUNT} />
        <SignalMetric icon={Share2} label="Affected commitments" value={post.SHARES_COUNT} />
        <SignalMetric icon={MessageCircle} label="Open follow-ups" value={post.COMMENTS_COUNT} />
        <SignalMetric icon={Eye} label="Matched records" value={post.VIEWS_COUNT} />
        {post.SENTIMENT_SCORE != null && (
          <span className="ml-auto">
            Sentiment: <span className={post.SENTIMENT_SCORE > 0.5 ? 'tone-pine' : post.SENTIMENT_SCORE > 0 ? 'tone-sienna' : 'tone-red'}>
              {post.SENTIMENT_SCORE.toFixed(2)}
            </span>
          </span>
        )}
      </div>
      <SignalCardActions />
    </div>
  );
}

// ── Similarity bar color ──────────────────────────────────────────────────────
function simColor(score) {
  if (score >= 0.7) return '#4C825C';
  if (score >= 0.5) return '#AA643B';
  if (score >= 0.3) return '#437C94';
  return '#7A736E';
}

// ── Vector Search Section ─────────────────────────────────────────────────────
function VectorSearch({ readiness, readinessLoading, readinessError, userKey }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [meta, setMeta] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const searchGeneration = useRef(0);

  useEffect(() => {
    searchGeneration.current += 1;
    setQuery('');
    setResults(null);
    setMeta(null);
    setError(null);
    setSearching(false);
  }, [userKey]);

  const EXAMPLE_QUERIES = [
    'GPU capacity surge for AI training',
    'developer platform observability spike',
    'edge gateway allocation for field teams',
    'private 5G factory rollout demand',
    'zero trust access gateway pilot',
    'rugged sensor replacement kit',
  ];

  const runSearch = useCallback(async (searchQuery) => {
    const q = searchQuery || query;
    if (!q.trim() || readiness?.ready !== true) return;
    const requestId = ++searchGeneration.current;
    setSearching(true);
    setError(null);
    try {
      const data = await api.social.search(q.trim(), 8);
      if (requestId !== searchGeneration.current) return;
      setResults(data.results || []);
      setMeta({
        model: data.model,
        dimensions: data.dimensions,
        query: data.query,
        source: data.source,
        distanceMetric: data.distanceMetric,
        readiness: data.readiness,
      });
    } catch (err) {
      if (requestId !== searchGeneration.current) return;
      setError(err.message);
      setResults([]);
    } finally {
      if (requestId === searchGeneration.current) setSearching(false);
    }
  }, [query, readiness, userKey]);

  return (
    <div className="glass-card p-5 border border-teal-soft social-vector-search-panel">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={18} className="tone-teal social-vector-search-panel__spark" />
        <h3 className="social-vector-search-panel__title">High-Tech Product Signal Match Search</h3>
        <span className="social-vector-search-panel__chip text-[var(--color-text)] border border-teal-soft font-mono">
          {readinessLoading
            ? 'Checking Oracle vector metadata…'
            : readiness?.ready
              ? 'Oracle native vector ready'
              : readiness?.scope?.status === 'SCOPED_NO_VISIBLE_VECTOR_DATA'
                ? 'No VPD-visible vector signals'
                : 'Vector capability unavailable'}
        </span>
      </div>
      {readiness && (
        <div className={`mb-4 rounded border px-3 py-2 text-xs ${readiness.ready ? 'tone-pine' : 'tone-red'}`}>
          {readiness.ready ? (
            <>
              <strong>Execution readiness:</strong> {readiness.source} confirms {readiness.model?.modelName},
              {' '}{readiness.expected?.dimensions}-dimension {readiness.expected?.elementType} columns,
              {' '}{(readiness.vectorIndexes || []).filter((index) => index.status === 'VALID').length} valid vector indexes,
              {' '}{formatNumber(readiness?.counts?.productEmbeddings || 0)} product embeddings,
              {' '}{formatNumber(readiness?.counts?.postEmbeddings || 0)} signal embeddings, and
              {' '}{formatNumber(readiness?.counts?.semanticMatches || 0)} persisted matches.
              <br />
              <strong>Index organization:</strong> {readiness.expected?.indexOrganization || 'not reported'}.
              {' '}<strong>Actual plan:</strong>{' '}
              {readiness.planEvidence?.usedConfiguredIndex
                ? `${readiness.planEvidence.operator} (${readiness.planEvidence.indexName})`
                : `${readiness.planEvidence?.status || 'UNAVAILABLE'} — no vector index scan is claimed.`}
            </>
          ) : (
            readiness.scope?.status === 'SCOPED_NO_VISIBLE_VECTOR_DATA' ? (
              <>
                <strong>Restricted vector scope.</strong>{' '}
                No vector signal rows are visible for this VPD persona. Search remains disabled and no
                representative result or execution capability is claimed.
              </>
            ) : (
              <><strong>Oracle Vector capability unavailable.</strong> {readiness.error || readinessError || 'The ONNX model, native vector columns, indexes, or representative execution are not ready.'}</>
            )
          )}
        </div>
      )}
      <p className="business-explanation__copy mb-4">
        <strong>Dollar values are product unit prices.</strong> Match percentages show semantic similarity between the search phrase and each product record, calculated as one minus cosine distance; they are not revenue, margin, or forecast uplift.
      </p>

      {/* Search Input */}
      <div className="jet-control-row mb-3">
        <JetInputText
          value={query}
          placeholder="Describe the product signal you are looking for, for example, GPU capacity, edge gateway allocation, or zero trust rollout."
          className="jet-inline-field"
          onValueChange={setQuery}
        />
        <JetButton
          label={searching ? 'Searching…' : 'Search'}
          iconClass={searching ? 'oj-fwk-icon oj-fwk-icon-load' : 'oj-fwk-icon oj-fwk-icon-magnifier'}
          chroming="callToAction"
          disabled={searching || !query.trim() || readiness?.ready !== true}
          onAction={() => runSearch()}
        />
        {(results || query) && (
          <JetButton
            label="Clear"
            iconClass="oj-fwk-icon oj-fwk-icon-cross"
            chroming="outlined"
            onAction={() => { setQuery(''); setResults(null); setMeta(null); setError(null); }}
          />
        )}
      </div>

      {/* Example Queries */}
      {!results && (
        <div className="flex flex-wrap gap-1.5 mb-1 items-center">
          <span className="social-vector-search-panel__helper-label mr-1">Try:</span>
          {EXAMPLE_QUERIES.map(eq => (
            <JetButton
              key={eq}
              label={eq}
              chroming="outlined"
              className="social-vector-search-panel__example-button"
              onAction={() => { setQuery(eq); runSearch(eq); }}
            />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-sm tone-red mt-2">Search error: {error}</div>
      )}

      {/* Results */}
      {results && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[var(--color-text-dim)]">
              {results.length} high-tech products matched for "<span className="tone-teal">{meta?.query}</span>"
            </p>
            {meta && (
              <span className="text-[11px] text-[var(--color-text-dim)]">
                {meta.source === 'ORACLE_VECTOR_SEARCH' ? 'ORACLE_VECTOR_SEARCH' : 'Execution source unverified'}
                <HelpTip
                  label="Semantic match"
                  definition={`One minus ${meta.distanceMetric} distance across ${meta.dimensions}-dimension product vectors. The technical model is ${meta.model}; readiness source is ${meta.readiness?.source}.`}
                />
              </span>
            )}
          </div>
          {results.length === 0 ? (
            <p className="text-sm text-[var(--color-text-dim)]">No high-tech products matched the query vector.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {results.map((r, i) => (
                <div
                  key={r.PRODUCT_ID}
                  className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border)]/40 bg-[var(--color-bg)]/50 hover:border-teal-soft transition-colors"
                >
                  {/* Rank badge */}
                  <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: `${simColor(r.SIMILARITY_SCORE)}22`, color: simColor(r.SIMILARITY_SCORE), border: `1px solid ${simColor(r.SIMILARITY_SCORE)}44` }}>
                    {i + 1}
                  </div>
                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.PRODUCT_NAME}</p>
                    <p className="text-[11px] text-[var(--color-text-dim)]">
                      {r.BRAND_NAME} · {r.CATEGORY}
                      {r.MENTION_COUNT > 0 && <span className="tone-sienna ml-1">· {r.MENTION_COUNT} mentions</span>}
                    </p>
                  </div>
                  {/* Price */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-[10px] text-[var(--color-text-dim)]">Unit Price</div>
                    <div className="text-sm font-mono font-bold">{formatCurrency(r.UNIT_PRICE)}</div>
                  </div>
                  {/* Similarity */}
                  <div className="flex-shrink-0 w-16">
                    <div className="text-right text-[10px] text-[var(--color-text-dim)]">Signal Match</div>
                    <div className="text-right text-xs font-mono font-bold" style={{ color: simColor(r.SIMILARITY_SCORE) }}>
                      {(r.SIMILARITY_SCORE * 100).toFixed(1)}%
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--color-border)]/30 mt-0.5">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${Math.max(r.SIMILARITY_SCORE * 100, 5)}%`,
                        background: simColor(r.SIMILARITY_SCORE),
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SocialFeed() {
  const { currentUser } = useUser();
  const userKey = currentUser?.USERNAME;
  const [momentum, setMomentum] = useState('');
  const [platform, setPlatform] = useState('');
  const [influencer, setInfluencer] = useState('');
  const [page, setPage] = useState(1);
  const [postQuery, setPostQuery] = useState('');
  const [postSearchResults, setPostSearchResults] = useState(null);
  const [postSearching, setPostSearching] = useState(false);
  const postSearchGeneration = useRef(0);

  const runPostSearch = useCallback(async (q) => {
    const query = (q || postQuery).trim();
    if (!query) return;
    const requestId = ++postSearchGeneration.current;
    setPostSearching(true);
    try {
      const res = await api.social.postSearch(query);
      if (requestId !== postSearchGeneration.current) return;
      setPostSearchResults(res);
    } catch (err) {
      if (requestId !== postSearchGeneration.current) return;
      console.error('Post search error:', err);
      setPostSearchResults(null);
    } finally {
      if (requestId === postSearchGeneration.current) setPostSearching(false);
    }
  }, [postQuery, userKey]);

  const clearPostSearch = () => {
    setPostQuery('');
    setPostSearchResults(null);
  };

  // Fetch all developer advocates for dropdown filter
  const { data: influencerList } = useData(
    () => api.social.influencers(),
    [userKey]
  );
  const influencers = influencerList || [];

  // Refetch when user changes (VPD filters social posts by region)
  const { data: postsData, loading } = useData(
    () => api.social.posts({ momentum, platform, page, limit: 15, ...(influencer && { influencer }) }),
    [momentum, platform, influencer, page, userKey]
  );
  const { data: viralPosts } = useData(() => api.social.viral(48), [userKey]);
  const {
    data: vectorReadiness,
    loading: vectorReadinessLoading,
    error: vectorReadinessError,
  } = useData(() => apiFetch('/social/vector-readiness'), [userKey]);

  useEffect(() => {
    postSearchGeneration.current += 1;
    setPostQuery('');
    setPostSearchResults(null);
    setPostSearching(false);
    setInfluencer('');
    setPage(1);
  }, [userKey]);

  const posts = postsData?.posts || [];
  const total = postsData?.total || 0;
  const vectorCounts = vectorReadiness?.counts || {};
  const vectorPlan = vectorReadiness?.planEvidence || {};
  const isGlobalUser = ['admin', 'analyst'].includes(currentUser?.ROLE);
  const isRegionalUser = currentUser?.ROLE === 'fulfillment_mgr';

  return (
    <div className="space-y-6 fade-in">

      {/* Register Oracle Internals into the right panel */}
      <RegisterOraclePanel title="Social Trends">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider mb-2">What's Happening</p>
            <p className="text-[var(--color-text)] leading-relaxed">
              The <span className="tone-teal font-mono">vector search bar</span> embeds your query at runtime using <span className="tone-teal font-mono">VECTOR_EMBEDDING(ALL_MINILM_L12_V2)</span> -
              an ONNX model loaded directly into Oracle. It then computes <span className="tone-sienna font-mono">VECTOR_DISTANCE(COSINE)</span> against{' '}
              <span className="tone-pine">pre-embedded high-tech product vectors</span> with an approximate fetch.
              The actual-plan evidence below states whether Oracle exposed the configured vector index operator; otherwise no index scan is claimed.
              No external embedding service participates in this query path.
              The product signal feed below uses <span className="tone-red font-mono">momentum scoring</span>.
              Live Oracle readiness currently reports <span className="tone-pine">{formatNumber(vectorCounts.postEmbeddings || 0)} signal embeddings</span>
              {' '}and <span className="tone-sienna">{formatNumber(vectorCounts.semanticMatches || 0)} persisted semantic matches</span>.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FeatureBadge label="VECTOR_EMBEDDING (Open Neural Network Exchange model)" color="cyan" />
            <FeatureBadge label="VECTOR_DISTANCE(COSINE)" color="cyan" />
            <FeatureBadge label="ORGANIZATION NEIGHBOR PARTITIONS" color="purple" />
            <FeatureBadge label="ALL_MINILM_L12_V2" color="green" />
            <FeatureBadge label="384-dim Vectors" color="blue" />
            <FeatureBadge label="FETCH APPROXIMATE" color="yellow" />
            <FeatureBadge label="Momentum Scoring" color="red" />
            <FeatureBadge label="product_embeddings" color="orange" />
            <FeatureBadge label="post_embeddings" color="orange" />
          </div>
          <SqlBlock code={`-- Real-time vector semantic search for high-tech products
-- Embeds user query at runtime, then finds nearest
-- service vectors via ANN index (cosine distance)
SELECT p.product_id, p.product_name, p.category,
       p.unit_price, b.brand_name,
       ROUND(1 - VECTOR_DISTANCE(
         pe.embedding,
         VECTOR_EMBEDDING(ALL_MINILM_L12_V2
                          USING :query AS DATA),
         COSINE), 4)             AS similarity_score
FROM   product_embeddings pe
JOIN   products p ON pe.product_id = p.product_id
JOIN   brands   b ON p.brand_id   = b.brand_id
ORDER  BY VECTOR_DISTANCE(
  pe.embedding,
  VECTOR_EMBEDDING(ALL_MINILM_L12_V2
                   USING :query AS DATA),
  COSINE)
FETCH APPROXIMATE FIRST 10 ROWS ONLY;`} />
          <div>
            <p className="text-[10px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider mb-2">Vector Search Pipeline</p>
            <div className="space-y-1.5">
              <DiagramBox label="🔍 User Query" sub="'GPU capacity surge for AI training'" color="#4F7D7B" />
              <div className="text-center text-[var(--color-text-dim)]">↓</div>
              <DiagramBox label="VECTOR_EMBEDDING" sub="ALL_MINILM_L12_V2 ONNX model · 384 dimensions" color="#4F7D7B" />
              <div className="text-center text-[var(--color-text-dim)]">↓</div>
              <DiagramBox label="VECTOR_DISTANCE(COSINE)" sub={`Query vector vs ${formatNumber(vectorCounts.productEmbeddings || 0)} live product embeddings`} color="#AA643B" />
              <div className="text-center text-[var(--color-text-dim)]">↓</div>
              <DiagramBox
                label={vectorPlan.usedConfiguredIndex ? 'Actual Vector Index Plan' : 'Actual Plan Evidence'}
                sub={vectorPlan.usedConfiguredIndex
                  ? `${vectorPlan.operator} · ${vectorPlan.indexName}`
                  : `${vectorPlan.status || 'UNAVAILABLE'} · no index scan claimed`}
                color="#796087"
              />
              <div className="text-center text-[var(--color-text-dim)]">↓</div>
              <DiagramBox label="📦 Ranked High-Tech Products" sub="Similarity score · technology portfolio · cost · product signals" color="#4C825C" />
            </div>
            <p className="text-[10px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider mb-2 mt-4">Embedding Tables</p>
            <div className="space-y-1.5">
              <DiagramBox label="product_embeddings" sub={`${formatNumber(vectorCounts.productEmbeddings || 0)} live rows · 384-dim VECTOR · COSINE`} color="#AA643B" />
              <DiagramBox label="post_embeddings" sub={`${formatNumber(vectorCounts.postEmbeddings || 0)} live rows · 384-dim VECTOR · COSINE`} color="#AA643B" />
              <DiagramBox label="semantic_matches" sub={`${formatNumber(vectorCounts.semanticMatches || 0)} live persisted matches · vector method`} color="#796087" />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider mb-2">Virtual Private Database (VPD)</p>
            <p className="text-[var(--color-text)] leading-relaxed">
              <span className="tone-pine font-mono">DBMS_RLS</span> policies filter social posts and developer advocate data
              based on the active user's role and region - applied transparently at the database kernel level.
              {isRegionalUser ? (
                <span className="tone-sienna"> Showing only high-tech signals from <strong>{currentUser.REGION}</strong> developer advocates.</span>
              ) : isGlobalUser ? (
                <span className="tone-pine"> Global VPD scope - all permitted regions are visible.</span>
              ) : (
                <span className="tone-sienna"> Restricted VPD scope - no regional operational rows are expected.</span>
              )}
            </p>
            <p className="text-[10px] font-mono text-[var(--color-text-dim)] mt-2">
              {isRegionalUser ? 'VPD region-filtered' : isGlobalUser ? 'VPD global' : 'VPD restricted'}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <FeatureBadge label="DBMS_RLS" color="green" />
              <FeatureBadge label="Row-Level Security" color="green" />
              <FeatureBadge label="Region Filtering" color="blue" />
            </div>
          </div>
        </div>
      </RegisterOraclePanel>

      <SceneStoryPanel scene="social" />

      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="text-[var(--color-accent)]" /> Enterprise Buyer Signal Monitor
        </h2>
        <p className="text-sm text-[var(--color-text-dim)] mt-1">
          <span className="tone-teal">Oracle Vector Search</span> with ONNX embeddings · semantic high-tech product matching · momentum detection
        </p>
      </div>

      {currentUser && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg text-sm border border-[var(--color-border)]">
          <span className="text-[var(--color-text)]">
            {currentUser.FULL_NAME} · {isRegionalUser
              ? `signals filtered to ${currentUser.REGION}`
              : isGlobalUser
                ? 'global signal scope'
                : 'restricted signal scope'}
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--color-text-dim)]">
            <Eye size={10} />
            {isRegionalUser ? 'VPD region-filtered' : isGlobalUser ? 'VPD global' : 'VPD restricted'}
          </span>
        </div>
      )}

      {/* ── Vector Search ── */}
      <VectorSearch
        readiness={vectorReadiness}
        readinessLoading={vectorReadinessLoading}
        readinessError={vectorReadinessError}
        userKey={userKey}
      />

      <SignalSummaryPanel
        total={total}
        posts={posts}
        postSearchResults={postSearchResults}
        viralPosts={viralPosts}
        momentum={momentum}
        platform={platform}
        influencer={influencer}
      />

      {/* Filters */}
      <div className="jet-control-row">
        <Filter size={14} className="text-[var(--color-text-dim)]" />
        <JetSelectSingle
          value={momentum}
          className="jet-inline-field"
          placeholder="All Momentum"
          onValueChange={(next) => { setMomentum(next); setPage(1); }}
          options={[
            { value: '', label: 'All Momentum' },
            { value: 'mega_viral', label: 'Mega Viral' },
            { value: 'viral', label: 'Viral' },
            { value: 'rising', label: 'Rising' },
            { value: 'normal', label: 'Normal' },
          ]}
        />
        <JetSelectSingle
          value={platform}
          className="jet-inline-field"
          placeholder="All Platforms"
          onValueChange={(next) => { setPlatform(next); setPage(1); }}
          options={[
            { value: '', label: 'All Platforms' },
            { value: 'instagram', label: 'Instagram' },
            { value: 'tiktok', label: 'TikTok' },
            { value: 'twitter', label: 'Twitter' },
            { value: 'youtube', label: 'YouTube' },
            { value: 'threads', label: 'Threads' },
          ]}
        />
        <JetSelectSingle
          value={influencer}
          className="jet-inline-field"
          placeholder="All Developer Advocates"
          onValueChange={(next) => { setInfluencer(next); setPage(1); }}
          options={[
            { value: '', label: 'All Developer Advocates' },
            ...influencers.map((i) => ({ value: i.HANDLE, label: i.HANDLE })),
          ]}
        />
        <div className="flex items-center gap-1 ml-2">
          <JetInputText
            value={postQuery}
            placeholder="Search enterprise buyer signals..."
            className="jet-inline-field"
            onValueChange={setPostQuery}
          />
          <JetButton
            label={postSearching ? '...' : 'Go'}
            iconClass={postSearching ? 'oj-fwk-icon oj-fwk-icon-load' : 'oj-fwk-icon oj-fwk-icon-magnifier'}
            chroming="callToAction"
            disabled={postSearching || !postQuery.trim()}
            onAction={() => runPostSearch()}
          />
          {postSearchResults && (
            <JetButton
              label="Clear"
              iconClass="oj-fwk-icon oj-fwk-icon-cross"
              chroming="outlined"
              onAction={clearPostSearch}
            />
          )}
        </div>
        <span className="text-xs text-[var(--color-text-dim)] ml-auto">
          {postSearchResults
            ? <><span className="tone-teal">{postSearchResults.count}</span> matches · {postSearchResults.elapsed}ms</>
            : <>{formatNumber(total)} posts</>}
        </span>
      </div>

      {/* Post Feed - vector search results or normal feed */}
      {postSearchResults ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-dim)]">
            <Sparkles size={12} className="tone-teal" />
            <span>Vector search results for "<span className="tone-teal">{postSearchResults.query}</span>"</span>
            <span className="font-mono text-[10px]">{postSearchResults.model} · {postSearchResults.dimensions}d · cosine</span>
          </div>
          {postSearchResults.posts?.length === 0 ? (
            <p className="text-sm text-[var(--color-text-dim)]">No matching posts found.</p>
          ) : (
            postSearchResults.posts.map((p, idx) => (
              <div key={p.POST_ID} className="glass-card p-4 fade-in">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: `${simColor(p.SIMILARITY_SCORE)}22`, color: simColor(p.SIMILARITY_SCORE), border: `1px solid ${simColor(p.SIMILARITY_SCORE)}44` }}>
                        #{idx + 1} · {(p.SIMILARITY_SCORE * 100).toFixed(1)}%
                      </span>
                      <span className={`platform-badge platform-${p.PLATFORM}`}>{p.PLATFORM}</span>
                      <span className={`momentum-badge momentum-${p.MOMENTUM_FLAG}`}>
                        {p.MOMENTUM_FLAG === 'mega_viral' ? '🔥 MEGA VIRAL' :
                         p.MOMENTUM_FLAG === 'viral' ? '🔥 Viral' :
                         p.MOMENTUM_FLAG === 'rising' ? '📈 Rising' : 'Normal'}
                      </span>
                      <span className="text-[11px] text-[var(--color-text-dim)]">{timeAgo(p.POSTED_AT)}</span>
                    </div>
                    {p.INFLUENCER_HANDLE && (
                      <p className="text-xs text-[var(--color-accent)] font-medium mb-1">
                        {p.INFLUENCER_HANDLE}
                        <span className="text-[var(--color-text-dim)] font-normal ml-2">
                          {formatNumber(p.FOLLOWER_COUNT)} followers · Score {p.INFLUENCE_SCORE}
                        </span>
                      </p>
                    )}
                    <p className="text-sm leading-relaxed line-clamp-3">{p.POST_TEXT}</p>
                  </div>
                  <div className="flex-shrink-0 text-center">
                    <div className="w-12 h-12 rounded-lg flex flex-col items-center justify-center"
                      style={{ background: `${simColor(p.SIMILARITY_SCORE)}15`, border: `1px solid ${simColor(p.SIMILARITY_SCORE)}30` }}>
                      <div className="text-sm font-bold font-mono" style={{ color: simColor(p.SIMILARITY_SCORE) }}>
                        {(p.SIMILARITY_SCORE * 100).toFixed(0)}%
                      </div>
                      <div className="text-[8px] text-[var(--color-text-dim)]">match</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--color-border)]/30 text-[12px] text-[var(--color-text-dim)]">
                  <span className="flex items-center gap-1"><Heart size={12} /> {formatNumber(p.LIKES_COUNT)}</span>
                  <span className="flex items-center gap-1"><Share2 size={12} /> {formatNumber(p.SHARES_COUNT)}</span>
                  <span className="flex items-center gap-1"><MessageCircle size={12} /> {formatNumber(p.COMMENTS_COUNT)}</span>
                  <span className="flex items-center gap-1"><Eye size={12} /> {formatNumber(p.VIEWS_COUNT)}</span>
                  {p.SENTIMENT_SCORE != null && (
                    <span className="ml-auto">
                      Sentiment: <span className={p.SENTIMENT_SCORE > 0.5 ? 'tone-pine' : p.SENTIMENT_SCORE > 0 ? 'tone-sienna' : 'tone-red'}>
                        {p.SENTIMENT_SCORE.toFixed(2)}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Normal Post Feed */}
          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-[var(--color-text-dim)]">Loading posts...</p>
            ) : posts.length === 0 ? (
              <p className="text-sm text-[var(--color-text-dim)]">No posts found</p>
            ) : (
              posts.map(p => <PostCard key={p.POST_ID} post={p} />)
            )}
          </div>

          {/* Pagination */}
          {total > 15 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost">← Prev</button>
              <span className="text-sm text-[var(--color-text-dim)]">Page {page} of {Math.ceil(total / 15)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 15)} className="btn-ghost">Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
