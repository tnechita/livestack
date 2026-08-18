import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Legend
} from 'recharts';
import { api } from '../utils/api';
import { useData } from '../hooks/useData';
import { formatNumber, formatCurrency } from '../utils/format';
import { FeatureBadge, SqlBlock, DiagramBox } from '../components/OracleInfoPanel';
import { JetButton, JetProgressCircle, JetSelectSingle } from '../components/JetControls';
import { RegisterOraclePanel } from '../context/OraclePanelContext';
import { useUser } from '../context/UserContext';
import { SceneStoryPanel } from '../components/HighTechStory';
import HelpTip from '../components/HelpTip';

// ── Color palette ──────────────────────────────────────
const SEGMENT_COLORS = {
  Champion:       '#AA643B',
  Loyal:          '#4C825C',
  'New Enterprise Buyer': '#4F7D7B',
  'At Risk':      '#C74634',
  Lost:           '#7A736E',
  'Big Spender':  '#796087',
  Promising:      '#437C94',
  Potential:      '#6F757E',
};

const MOMENTUM_COLORS = {
  mega_viral: '#C74634',
  viral:      '#AA643B',
  rising:     '#AA643B',
  normal:     '#7A736E',
};

const CHART_COLORS = ['#C74634','#4F7D7B','#AA643B','#4C825C','#A36472','#437C94','#796087','#AA643B'];

// ── Tab definitions ────────────────────────────────────
const CLUSTER_COLORS = ['#C74634','#4F7D7B','#AA643B','#4C825C','#A36472','#437C94','#796087','#AA643B','#437C94','#4C825C','#796087','#A36472','#4F7D7B','#5F7D4F','#AA643B'];

const TABS = [
  { key: 'demand',    label: 'Demand Volatility Forecasting',      buttonLabel: 'Demand Volatility',   iconClass: 'oj-fwk-icon-sortrelevancehigh', color: '#AA643B' },
  { key: 'rfm',       label: 'Customer Commitment Segments',        buttonLabel: 'Commitment Segments', iconClass: 'oj-fwk-icon-users',             color: '#C74634' },
  { key: 'forecast',  label: 'Commitment Value Forecast',           buttonLabel: 'Commitment Forecast', iconClass: 'oj-fwk-icon-view',              color: '#4C825C' },
  { key: 'clusters',  label: 'Product Signal Clusters',             buttonLabel: 'Signal Clusters',     iconClass: 'oj-fwk-icon-grid',              color: '#4F7D7B' },
  { key: 'capacity',  label: 'BOM & Capacity Intelligence',         buttonLabel: 'BOM Capacity',        iconClass: 'oj-fwk-icon-tree-document',     color: '#796087' },
];

const DEMAND_WINDOW_OPTIONS = [
  { value: '168', label: 'Last 7 days' },
  { value: '336', label: 'Last 14 days' },
  { value: '720', label: 'Last 30 days' },
  { value: '2160', label: 'Last 90 days' },
];

const FORECAST_DAY_OPTIONS = [
  { value: '3', label: '+3 day forecast' },
  { value: '7', label: '+7 day forecast' },
  { value: '14', label: '+14 day forecast' },
];

const STOCK_COLORS = {
  OUT_OF_STOCK: '#C74634',
  CRITICAL: '#AA643B',
  LOW: '#AA643B',
  AT_RISK: '#437C94',
  ADEQUATE: '#4C825C',
};

function JetGlyph({ iconClass, className = '', style }) {
  return <span className={`oj-fwk-icon ${iconClass} ${className}`.trim()} aria-hidden="true" style={style} />;
}

// ── Helper components ──────────────────────────────────
function StatCard({ iconClass, label, value, sub, color = '#C74634', badge }) {
  return (
    <div className="stat-card oml-stat-card">
      <div className="oml-stat-card__top">
        <div className="oml-stat-card__icon" style={{ background: `${color}18`, color }}>
          <JetGlyph iconClass={iconClass} className="oml-stat-card__icon-glyph" />
        </div>
        {badge && (
          <span
            className="oml-stat-card__badge"
            style={{ background: `${color}22`, color: 'var(--color-text)', border: `1px solid ${color}33` }}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="oml-stat-card__copy">
        <p className="oml-stat-card__value">{value}</p>
        <p className="oml-stat-card__label">{label}</p>
      </div>
      {sub && <p className="oml-stat-card__meta">{sub}</p>}
    </div>
  );
}

function MomentumBadge({ flag }) {
  const label = flag === 'mega_viral' ? 'MEGA' : flag?.replace('_', ' ') || '-';
  return (
    <span className={`momentum-badge momentum-${flag}`}>{label}</span>
  );
}

function ConfidenceBar({ pct }) {
  const color = pct >= 80 ? '#4C825C' : pct >= 60 ? '#AA643B' : '#C74634';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full surface-bark-soft">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] font-mono" style={{ color }}>{pct}%</span>
    </div>
  );
}

const HIGH_TECH_MODEL_EVIDENCE = [
  {
    title: 'Semiconductor Manufacturing',
    body: 'Demand volatility is scored against fab operations, wafer starts, yield improvement signals, and design-to-manufacturing handoff risk.',
    badge: 'Fab',
    color: '#AA643B',
  },
  {
    title: 'NPI / ECO Readiness',
    body: 'Customer commitments are segmented with NPI / ECO timing, bill of materials exposure, component shortage alerts, and supplier risk evidence.',
    badge: 'PLM',
    color: '#796087',
  },
  {
    title: 'Order Promising',
    body: 'Commitment forecasts connect channel inventory, contract manufacturing capacity, and order promising constraints before customer commitments slip.',
    badge: 'ATP',
    color: '#4C825C',
  },
  {
    title: 'Field Quality',
    body: 'Product-signal clusters surface connected products, field quality patterns, warranty analytics, and service and support operations impact.',
    badge: 'Quality',
    color: '#4F7D7B',
  },
];

function HighTechModelEvidencePanel() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider font-semibold">High Tech model evidence</p>
          <h3 className="text-base font-bold mt-1">Predictive Product & Commitment Analytics</h3>
          <p className="text-xs text-[var(--color-text-dim)] mt-1 max-w-3xl">
            Oracle Machine Learning ties product signals to semiconductor manufacturing, fab operations, customer commitments, and order promising decisions without moving the data out of Oracle AI Database 26ai.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FeatureBadge label="wafer starts" color="orange" />
          <FeatureBadge label="yield improvement" color="green" />
          <FeatureBadge label="bill of materials" color="purple" />
          <FeatureBadge label="component shortage" color="red" />
          <FeatureBadge label="supplier risk" color="yellow" />
          <FeatureBadge label="field quality" color="cyan" />
          <FeatureBadge label="warranty analytics" color="blue" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {HIGH_TECH_MODEL_EVIDENCE.map((item) => (
          <div key={item.title} className="rounded-lg p-3" style={{ background: `${item.color}10`, border: `1px solid ${item.color}30` }}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold" style={{ color: item.color }}>{item.title}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: `${item.color}20`, color: item.color }}>
                {item.badge}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-[var(--color-text-dim)]">{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatRunTime(value) {
  if (!value) return 'Not refreshed';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function LifecycleModelPill({ model }) {
  const isActive = Boolean(model?.active);
  const color = isActive ? '#4C825C' : model?.latestStatus === 'failed' ? '#C74634' : '#AA643B';
  return (
    <div className="oml-lifecycle-pill" style={{ borderColor: `${color}44`, background: `${color}0F` }}>
      <div className="oml-lifecycle-pill__status" style={{ background: color }} aria-hidden="true" />
      <div className="min-w-0">
        <p className="oml-lifecycle-pill__name">{model?.modelName}</p>
        <p className="oml-lifecycle-pill__meta">
          {isActive ? 'Active in USER_MINING_MODELS' : model?.latestStatus ? `Last ${model.latestStatus}` : 'Pending refresh'}
        </p>
      </div>
    </div>
  );
}

function PersistedMlEvidencePanel({ canRefresh, userKey }) {
  const { data: persistence, loading, error, refetch } = useData(
    () => api.ml.persistenceStatus(),
    [userKey]
  );
  const [refreshing, setRefreshing] = useState(false);

  const latestRun = persistence?.latestRun || {};
  const rowCounts = persistence?.counts || {};
  const lifecycle = persistence?.modelLifecycle || {};
  const models = lifecycle.models || [];

  async function refreshOutputs() {
    setRefreshing(true);
    try {
      await api.ml.refreshPersistence();
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <section className="oml-persistence-panel" aria-label="Persisted machine learning evidence">
      <div className="oml-persistence-panel__header">
        <div>
          <p className="oml-persistence-panel__eyebrow">Latest prediction refresh</p>
          <h3 className="oml-persistence-panel__title">Prediction readiness and durable results</h3>
          <p className="oml-persistence-panel__copy">
            Prediction results are stored in Oracle so this scene remains ready after app restarts, demo-data restores, and container rebuilds. Technical model object names are available below for specialists.
          </p>
        </div>
        {canRefresh ? (
          <JetButton
            label={refreshing ? 'Refreshing' : 'Refresh persisted ML outputs'}
            iconClass="oj-fwk-icon oj-fwk-icon-refresh"
            chroming="outlined"
            disabled={loading || refreshing}
            onAction={refreshOutputs}
          />
        ) : (
          <span className="text-[10px] text-[var(--color-text-dim)]">
            Persisted model refresh is available to the demo administrator only.
          </span>
        )}
      </div>

      {error && (
        <div className="oml-persistence-panel__warning">
          OML capability unavailable. Oracle model readiness could not be verified: {error}
        </div>
      )}

      <div className="oml-persistence-grid">
        <div className="oml-persistence-card oml-persistence-card--run">
          <p className="oml-persistence-card__label">Last completed refresh</p>
          <p className="oml-persistence-card__value oml-persistence-card__value--date">{loading ? '...' : formatRunTime(latestRun.COMPLETED_AT)}</p>
          <p className="oml-persistence-card__meta">
            Results are available to every predictive view on this page.
          </p>
          <p className="oml-persistence-card__source">Dataset source: <strong>{latestRun.SOURCE || 'pending'}</strong></p>
        </div>
        <div className="oml-persistence-card">
          <p className="oml-persistence-card__label">Persisted rows</p>
          <div className="oml-row-counts">
            <span>Demand scores <strong>{formatNumber(rowCounts.oml_demand_scores || 0)}</strong></span>
            <span>Commitment segments <strong>{formatNumber(rowCounts.oml_customer_segments || 0)}</strong></span>
            <span>Forecast rows <strong>{formatNumber(rowCounts.oml_commitment_forecasts || 0)}</strong></span>
            <span>Signal clusters <strong>{formatNumber(rowCounts.oml_product_clusters || 0)}</strong></span>
            <span>Capacity alerts <strong>{formatNumber(rowCounts.oml_capacity_alerts || 0)}</strong></span>
          </div>
        </div>
        <div className="oml-persistence-card oml-persistence-card--models">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="oml-persistence-card__label">Prediction readiness</p>
              <p className="oml-persistence-card__meta">
                <strong>{formatNumber(lifecycle.activeCount ?? 0)} of {formatNumber(lifecycle.expectedModels?.length ?? 0)}</strong> prediction models ready in Oracle
              </p>
            </div>
            <span className={`oml-lifecycle-state ${lifecycle.activeCount ? 'is-active' : 'is-pending'}`}>
              {lifecycle.activeCount ? 'Active' : lifecycle.attempted ? 'Attempted' : 'Pending'}
            </span>
          </div>
          <p className="oml-persistence-card__meta mt-3">Ready models support demand volatility, commitment segments, commitment value, and product signal grouping.</p>
          <details className="oml-technical-details">
            <summary>Technical model details</summary>
            <p className="oml-persistence-card__meta">Oracle Database Data Mining package lifecycle · Run {latestRun.RUN_ID || '-'} · Version {latestRun.MODEL_VERSION || 'pending'}</p>
            <div className="oml-lifecycle-list">
              {(models.length ? models : [
                { modelName: 'HT_DEMAND_VOLATILITY_MODEL' },
                { modelName: 'HT_CUSTOMER_COMMITMENT_SEGMENT_MODEL' },
                { modelName: 'HT_COMMITMENT_VALUE_MODEL' },
                { modelName: 'HT_PRODUCT_SIGNAL_CLUSTER_MODEL' },
              ]).map((model) => (
                <LifecycleModelPill key={model.modelName} model={model} />
              ))}
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}

// Custom tooltip for forecast chart
function ForecastTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const ciLower = payload.find(p => p.dataKey === 'ci_lower')?.value;
  const ciUpper = payload.find(p => p.dataKey === 'ci_upper')?.value;
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs shadow-xl">
      <p className="font-semibold mb-1 text-[var(--color-text)]">{label}</p>
      {payload.map((p, i) => p.value != null && p.dataKey !== 'ci_lower' && p.dataKey !== 'ci_upper' && (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
      {ciLower != null && ciUpper != null && (
        <p className="text-[#C74634] mt-1 border-t border-[var(--color-border)] pt-1">
          95% CI: {formatCurrency(ciLower)} – {formatCurrency(ciUpper)}
        </p>
      )}
    </div>
  );
}

// ── Oracle Panel content per tab ───────────────────────
function DemandOraclePanel() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider mb-2">
          HT_DEMAND_VOLATILITY_MODEL - Random Forest Classification
        </p>
        <p className="text-sm text-[var(--color-text)] leading-relaxed">
          A <span className="tone-sienna font-mono">Random Forest</span> model trained via{' '}
          <code className="text-xs tone-sienna">DBMS_DATA_MINING.CREATE_MODEL</code> on 12 product-signal engagement
          and customer-commitment features. Oracle scores every high-tech product <em>inline</em> at query time using{' '}
          <code className="text-xs tone-sienna">PREDICTION()</code> and{' '}
          <code className="text-xs tone-sienna">PREDICTION_PROBABILITY()</code> - no external ML pipeline,
          no model export. The trained model lives in the database as a persistent mining model object.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <FeatureBadge label="DBMS_DATA_MINING" color="yellow" />
        <FeatureBadge label="ALGO_RANDOM_FOREST" color="yellow" />
        <FeatureBadge label="PREDICTION()" color="orange" />
        <FeatureBadge label="PREDICTION_PROBABILITY()" color="orange" />
        <FeatureBadge label="12 Training Features" color="green" />
        <FeatureBadge label="In-DB Model Persistence" color="purple" />
      </div>
      <SqlBlock code={`-- Step 1: Train the model (one-time)
BEGIN
  DBMS_DATA_MINING.CREATE_MODEL(
    model_name      => 'HT_DEMAND_VOLATILITY_MODEL',
    mining_function => DBMS_DATA_MINING.CLASSIFICATION,
    data_table_name => 'OML_DEMAND_TRAINING_V',
    case_id_column_name => 'PRODUCT_ID',
    target_column_name  => 'SURGE_FLAG',
    settings_table_name => 'DEMAND_SURGE_SETTINGS'
    -- ALGO_RANDOM_FOREST, PREP_AUTO_ON
  );
END;

-- Step 2: Score high-tech products in real-time SQL
SELECT p.product_name, p.category,

  -- Random Forest prediction: SURGE or NORMAL
  PREDICTION(HT_DEMAND_VOLATILITY_MODEL USING
    p.category, p.unit_price,
    eng.total_posts, eng.avg_sentiment,
    eng.total_likes, eng.total_shares,
    eng.total_views, eng.avg_virality,
    eng.viral_posts, eng.rising_posts,
    service.units_requested, service.service_value
  ) AS predicted_surge,

  -- Probability of SURGE class (0.0 – 1.0)
  ROUND(PREDICTION_PROBABILITY(
    HT_DEMAND_VOLATILITY_MODEL, 'SURGE' USING ...
  ) * 100, 1) AS surge_probability

FROM products p
JOIN product_engagement eng  ...
JOIN product_value service ...
ORDER BY surge_probability DESC;`} />
      <div className="oml-model-flow">
        <div className="text-[9px] text-center text-[var(--color-text)] font-bold mb-1">DBMS_DATA_MINING Pipeline</div>
        <DiagramBox label="OML_DEMAND_TRAINING_V" sub="12 features: engagement + product value + product signals" color="#AA643B" />
        <div className="text-center text-[10px] text-[var(--color-text)]">↓ CREATE_MODEL</div>
        <DiagramBox label="HT_DEMAND_VOLATILITY_MODEL (Random Forest)" sub="ALGO_RANDOM_FOREST · PREP_AUTO" color="#C74634" />
        <div className="text-center text-[10px] text-[var(--color-text)]">↓ PREDICTION()</div>
        <DiagramBox label="Real-Time Scoring in SQL" sub="PREDICTION_PROBABILITY('SURGE' USING *)" color="#437C94" />
        <div className="text-center text-[10px] text-[var(--color-text)]">↓ result</div>
        <DiagramBox label="SURGE / NORMAL + probability %" sub="scored inline · no ETL · model persists in DB" color="#4C825C" />
      </div>
    </div>
  );
}

function RFMOraclePanel() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider mb-2">
          HT_CUSTOMER_COMMITMENT_SEGMENT_MODEL - K-Means Clustering
        </p>
        <p className="text-sm text-[var(--color-text)] leading-relaxed">
          A <span className="tone-plum font-mono">K-Means</span> model (4 clusters) trained via{' '}
          <code className="text-xs tone-plum">DBMS_DATA_MINING.CREATE_MODEL</code> on 6 RFM features.
          Each synthetic enterprise buyer is assigned to a cluster using{' '}
          <code className="text-xs tone-plum">CLUSTER_ID()</code> with{' '}
          <code className="text-xs tone-plum">CLUSTER_PROBABILITY()</code> confidence.
          RFM quartile labels (Champion, Loyal, At Risk, etc.) are layered on top via NTILE(4) window functions.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <FeatureBadge label="DBMS_DATA_MINING" color="violet" />
        <FeatureBadge label="ALGO_KMEANS (4 clusters)" color="violet" />
        <FeatureBadge label="CLUSTER_ID()" color="cyan" />
        <FeatureBadge label="CLUSTER_PROBABILITY()" color="cyan" />
        <FeatureBadge label="NTILE(4) RFM Labels" color="purple" />
        <FeatureBadge label="Churn Risk Scoring" color="red" />
      </div>
      <SqlBlock code={`-- Step 1: Train K-Means model (one-time)
BEGIN
  DBMS_DATA_MINING.CREATE_MODEL(
    model_name      => 'HT_CUSTOMER_COMMITMENT_SEGMENT_MODEL',
    mining_function => DBMS_DATA_MINING.CLUSTERING,
    data_table_name => 'OML_CUSTOMER_RFM_V',
    case_id_column_name => 'CUSTOMER_ID',
    settings_table_name => 'CUST_SEGMENT_SETTINGS'
    -- ALGO_KMEANS, 4 clusters, PREP_AUTO_ON
  );
END;

-- Step 2: Score synthetic enterprise buyers with CLUSTER_ID()
SELECT c.first_name || ' ' || c.last_name AS full_name,

  -- K-Means cluster assignment
  CLUSTER_ID(HT_CUSTOMER_COMMITMENT_SEGMENT_MODEL USING
    cm.lifetime_value, cm.recency_days,
    cm.frequency, cm.monetary,
    cm.avg_order_value, cm.total_items
  ) AS oml_cluster_id,

  -- Cluster membership probability
  ROUND(CLUSTER_PROBABILITY(
    HT_CUSTOMER_COMMITMENT_SEGMENT_MODEL USING ...
  ), 3) AS cluster_probability,

  -- RFM quartile labels layered on top
  NTILE(4) OVER (ORDER BY recency ASC)  AS R,
  NTILE(4) OVER (ORDER BY frequency DESC) AS F,
  NTILE(4) OVER (ORDER BY monetary DESC)  AS M

FROM customer_metrics cm
ORDER BY total_spent DESC;`} />
      <div className="oml-model-flow">
        <div className="text-[9px] text-center text-[var(--color-text)] font-bold mb-1">DBMS_DATA_MINING K-Means Pipeline</div>
        <DiagramBox label="OML_CUSTOMER_RFM_V" sub="6 features: LTV proxy, recency, frequency, monetary, AOV, items" color="#C74634" />
        <div className="text-center text-[10px] text-[var(--color-text-dim)]">↓ CREATE_MODEL</div>
        <DiagramBox label="HT_CUSTOMER_COMMITMENT_SEGMENT_MODEL (K-Means)" sub="ALGO_KMEANS · 4 clusters · PREP_AUTO" color="#796087" />
        <div className="text-center text-[10px] text-[var(--color-text-dim)]">↓ CLUSTER_ID()</div>
        <DiagramBox label="Cluster Assignment + Probability" sub="each synthetic enterprise buyer -> nearest centroid" color="#437C94" />
        <div className="text-center text-[10px] text-[var(--color-text-dim)]">↓ NTILE(4)</div>
        <DiagramBox label="RFM Segment Labels + Churn Risk" sub="Champion · Loyal · At Risk · Lost · …" color="#4C825C" />
      </div>
    </div>
  );
}

function ForecastOraclePanel() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider mb-2">
          HT_COMMITMENT_VALUE_MODEL - GLM Regression + OLS Trend
        </p>
        <p className="text-sm text-[var(--color-text)] leading-relaxed">
          Two complementary Oracle ML techniques:{' '}
          <code className="text-xs tone-pine">HT_COMMITMENT_VALUE_MODEL</code> (Generalized Linear Model)
          trained via <code className="text-xs tone-pine">DBMS_DATA_MINING</code> predicts per-request product value
          from synthetic enterprise buyer and high-tech product features. The time-series trend uses{' '}
          <code className="text-xs tone-pine">REGR_SLOPE / REGR_R2</code> (ISO SQL:2003) for OLS regression
          with forward projection and widening confidence intervals.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <FeatureBadge label="DBMS_DATA_MINING" color="green" />
        <FeatureBadge label="ALGO_GLM (Regression)" color="green" />
        <FeatureBadge label="PREDICTION()" color="yellow" />
        <FeatureBadge label="REGR_SLOPE / REGR_R2" color="cyan" />
        <FeatureBadge label="7-Day Moving Average" color="cyan" />
        <FeatureBadge label="Confidence Intervals" color="purple" />
      </div>
      <SqlBlock code={`-- Step 1: Train GLM model (one-time)
BEGIN
  DBMS_DATA_MINING.CREATE_MODEL(
    model_name      => 'HT_COMMITMENT_VALUE_MODEL',
    mining_function => DBMS_DATA_MINING.REGRESSION,
    data_table_name => 'OML_COMMITMENT_VALUE_TRAINING_V',
    case_id_column_name => 'ORDER_ID',
    target_column_name  => 'TARGET_SERVICE_VALUE',
    settings_table_name => 'SERVICE_VALUE_PREDICT_SETTINGS'
    -- ALGO_GENERALIZED_LINEAR_MODEL, PREP_AUTO_ON
  );
END;

-- Step 2: Score customer commitments + time-series trend
WITH daily_value AS (
  SELECT TRUNC(CAST(created_at AS DATE)) AS day,
    SUM(order_total) AS service_value,
    ROW_NUMBER() OVER (ORDER BY TRUNC(CAST(created_at AS DATE))) AS rn
  FROM orders
  WHERE created_at >= SYSDATE - 30
  GROUP BY TRUNC(CAST(created_at AS DATE))
),
params AS (
  SELECT REGR_SLOPE(service_value, rn)     AS slope,
         REGR_INTERCEPT(service_value, rn) AS intercept,
         REGR_R2(service_value, rn)        AS r2
  FROM daily_value
),
-- GLM model: per-request predicted product value
glm_stats AS (
  SELECT AVG(PREDICTION(HT_COMMITMENT_VALUE_MODEL USING *))
    AS avg_predicted
  FROM OML_COMMITMENT_VALUE_TRAINING_V
)
SELECT day, service_value, slope * rn + intercept AS trend,
  r2, avg_predicted
FROM daily_value CROSS JOIN params CROSS JOIN glm_stats;`} />
      <div className="oml-model-flow">
        <div className="text-[9px] text-center text-[var(--color-text)] font-bold mb-1">Dual Model Pipeline</div>
        <DiagramBox label="OML_COMMITMENT_VALUE_TRAINING_V" sub="features: tier, LTV, demand_score, items, avg_price" color="#4C825C" />
        <div className="text-center text-[10px] text-[var(--color-text-dim)]">↓ CREATE_MODEL</div>
        <DiagramBox label="HT_COMMITMENT_VALUE_MODEL (GLM)" sub="ALGO_GENERALIZED_LINEAR_MODEL · PREP_AUTO" color="#C74634" />
        <div className="text-center text-[10px] text-[var(--color-text-dim)]">↓ PREDICTION()</div>
        <DiagramBox label="Per-Commitment Product Value Prediction" sub="GLM scores each customer commitment inline in SQL" color="#437C94" />
        <div className="text-center text-[10px] text-[var(--color-text-dim)]">+ REGR_SLOPE</div>
        <DiagramBox label="OLS Trend + Forward Projection" sub="REGR_R2 fit quality · CI widens 7%/day" color="#AA643B" />
      </div>
    </div>
  );
}

function ClustersOraclePanel() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider mb-2">
          HT_PRODUCT_SIGNAL_CLUSTER_MODEL - K-Means Clustering
        </p>
        <p className="text-sm text-[var(--color-text)] leading-relaxed">
          A <span className="tone-teal font-mono">K-Means</span> model (5 clusters) trained via{' '}
          <code className="text-xs tone-teal">DBMS_DATA_MINING.CREATE_MODEL</code> on 8 high-tech product behavioral
          features (value, utilization, engagement, sentiment). High-Tech Products are assigned using{' '}
          <code className="text-xs tone-teal">CLUSTER_ID()</code> with{' '}
          <code className="text-xs tone-teal">CLUSTER_PROBABILITY()</code> - real trained K-Means
          with convergence, not manual centroid selection. The model persists in the database and
          scores new high-tech products automatically.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <FeatureBadge label="DBMS_DATA_MINING" color="cyan" />
        <FeatureBadge label="ALGO_KMEANS (5 clusters)" color="cyan" />
        <FeatureBadge label="CLUSTER_ID()" color="purple" />
        <FeatureBadge label="CLUSTER_PROBABILITY()" color="purple" />
        <FeatureBadge label="8 Behavioral Features" color="green" />
        <FeatureBadge label="ONNX Embeddings Available" color="orange" />
        <FeatureBadge label="In-DB Model Persistence" color="yellow" />
      </div>
      <SqlBlock code={`-- Step 1: Train K-Means model (one-time)
BEGIN
  DBMS_DATA_MINING.CREATE_MODEL(
    model_name      => 'HT_PRODUCT_SIGNAL_CLUSTER_MODEL',
    mining_function => DBMS_DATA_MINING.CLUSTERING,
    data_table_name => 'OML_PRODUCT_CLUSTER_V',
    case_id_column_name => 'PRODUCT_ID',
    settings_table_name => 'PRODUCT_CLUSTER_SETTINGS'
    -- ALGO_KMEANS, 5 clusters, PREP_AUTO_ON
  );
END;

-- Step 2: Score high-tech products with CLUSTER_ID()
SELECT p.product_name, p.category, p.unit_price,

  -- K-Means cluster assignment
  CLUSTER_ID(HT_PRODUCT_SIGNAL_CLUSTER_MODEL USING
    pcv.unit_price, pcv.weight_kg,
    pcv.units_requested, pcv.service_value,
    pcv.order_count, pcv.total_engagement,
    pcv.avg_sentiment, pcv.avg_virality
  ) AS cluster_id,

  -- Membership probability (0.0 – 1.0)
  ROUND(CLUSTER_PROBABILITY(
    HT_PRODUCT_SIGNAL_CLUSTER_MODEL USING *
  ), 4) AS cluster_prob

FROM OML_PRODUCT_CLUSTER_V pcv
JOIN products p ON pcv.PRODUCT_ID = p.PRODUCT_ID
ORDER BY cluster_id, cluster_prob DESC;

-- Training view features:
-- unit_price, weight_kg, units_requested, service_value,
-- order_count, total_engagement, avg_sentiment,
-- avg_virality`} />
      <div className="oml-model-flow">
        <div className="text-[9px] text-center text-[var(--color-text)] font-bold mb-1">DBMS_DATA_MINING K-Means Pipeline</div>
        <DiagramBox label="OML_PRODUCT_CLUSTER_V" sub="8 features: value, utilization, engagement, sentiment" color="#4F7D7B" />
        <div className="text-center text-[10px] text-[var(--color-text-dim)]">↓ CREATE_MODEL</div>
        <DiagramBox label="HT_PRODUCT_SIGNAL_CLUSTER_MODEL (K-Means)" sub="ALGO_KMEANS · 5 clusters · PREP_AUTO · convergence" color="#AA643B" />
        <div className="text-center text-[10px] text-[var(--color-text-dim)]">↓ CLUSTER_ID()</div>
        <DiagramBox label="Cluster Assignment + Probability" sub="trained centroids · proper distance calculation" color="#796087" />
        <div className="text-center text-[10px] text-[var(--color-text-dim)]">↓ JOIN</div>
        <DiagramBox label="High-Tech Product Details + Cluster Stats" sub="size · top category · avg probability" color="#4C825C" />
      </div>
    </div>
  );
}

function CapacityOraclePanel() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider mb-2">
          HT_DEMAND_VOLATILITY_MODEL x Capacity - Product Availability Risk Intelligence
        </p>
        <p className="text-sm text-[var(--color-text)] leading-relaxed">
          Joins <span className="tone-plum font-mono">HT_DEMAND_VOLATILITY_MODEL</span> (Random Forest) predictions with
          live capacity levels across all product availability centers. Oracle scores each high-tech product in real-time using{' '}
          <code className="text-xs tone-plum">PREDICTION_PROBABILITY()</code>, then compares predicted demand
          against available capacity to identify access risk - high-tech products where product-signal-driven demand will exceed capacity.
          The <code className="text-xs tone-plum">demand_forecasts</code> table stores daily OML predictions.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <FeatureBadge label="HT_DEMAND_VOLATILITY_MODEL" color="purple" />
        <FeatureBadge label="PREDICTION_PROBABILITY()" color="purple" />
        <FeatureBadge label="demand_forecasts table" color="violet" />
        <FeatureBadge label="capacity × product availability centers" color="cyan" />
        <FeatureBadge label="Product Value at Risk" color="red" />
        <FeatureBadge label="Days of Capacity" color="green" />
      </div>
      <SqlBlock code={`-- OML BOM and capacity risk intelligence (actual query)
SELECT p.product_name, fc.center_name,
  i.quantity_on_hand, i.reorder_point,
  df.predicted_demand, df.social_factor,

  -- Real-time OML scoring
  PREDICTION(HT_DEMAND_VOLATILITY_MODEL USING
    p.category, p.unit_price,
    eng.total_posts, eng.avg_sentiment, ...
  ) AS oml_surge_prediction,

  ROUND(PREDICTION_PROBABILITY(
    HT_DEMAND_VOLATILITY_MODEL, 'SURGE' USING ...
  ) * 100, 1) AS oml_surge_probability,

  -- Product availability risk metrics
  CASE WHEN qty = 0 THEN 'NO_CAPACITY'
       WHEN qty < reorder * 0.5 THEN 'CRITICAL'
       WHEN qty < predicted_demand THEN 'AT_RISK'
  END AS capacity_status,

  -- Days of capacity at predicted consumption rate
  ROUND(qty / (predicted_demand / 7), 1)
    AS days_of_capacity,

  -- Product value at risk from capacity shortage
  (predicted_demand - qty) * unit_price
    AS product_value_at_risk

FROM inventory i
JOIN demand_forecasts df ON ...
  AND df.forecast_date = TRUNC(SYSDATE)
ORDER BY oml_surge_probability DESC;`} />
      <div className="oml-model-flow">
        <div className="text-[9px] text-center text-[var(--color-text)] font-bold mb-1">BOM and Capacity Risk Pipeline</div>
        <DiagramBox label="HT_DEMAND_VOLATILITY_MODEL (Random Forest)" sub="PREDICTION_PROBABILITY('SURGE') per high-tech product" color="#796087" />
        <div className="text-center text-[10px] text-[var(--color-text-dim)]">↓ scores stored in</div>
        <DiagramBox label="demand_forecasts (daily OML predictions)" sub="predicted_demand · social_factor · confidence band" color="#A36472" />
        <div className="text-center text-[10px] text-[var(--color-text-dim)]">↓ JOIN</div>
        <DiagramBox label="capacity × product availability centers" sub="quantity_on_hand · reorder_point · fulfillment centers" color="#437C94" />
        <div className="text-center text-[10px] text-[var(--color-text-dim)]">↓ COMPARE</div>
        <DiagramBox label="Product Availability Risk: capacity_status + days_of_capacity + product_value_at_risk" sub="NO_CAPACITY · CRITICAL · AT_RISK · ADEQUATE" color="#C74634" />
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────
export default function OMLAnalytics() {
  const { currentUser } = useUser();
  const userKey = currentUser?.USERNAME;
  const canRefreshPersistence = currentUser?.ROLE === 'admin';
  const [activeTab, setActiveTab]       = useState('demand');
  const [demandHours, setDemandHours]   = useState(720);
  const [forecastDays, setForecastDays] = useState(7);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const clusterK = 5;

  const { data: summary, loading: summaryLoading, error: summaryError } = useData(() => api.ml.summary(), [userKey]);
  const { data: demandData, loading: demandLoading, error: demandError, refetch: refetchDemand } =
    useData(() => api.ml.demandForecast({ hours: demandHours }), [demandHours, userKey]);
  const { data: segData, loading: segLoading, error: segmentError } = useData(() => api.ml.customerSegments(), [userKey]);
  const { data: forecastData, loading: forecastLoading, error: forecastError, refetch: refetchForecast } =
    useData(() => api.ml.revenueForecast({ days: 30, forecast: forecastDays }), [forecastDays, userKey]);
  const { data: clusterData, loading: clusterLoading, error: clusterError, refetch: refetchClusters } =
    useData(() => api.ml.vectorClusters(clusterK), [clusterK, userKey]);
  const { data: invData, loading: invLoading, error: capacityError, refetch: refetchInv } =
    useData(() => api.ml.capacityIntelligence(), [userKey]);
  const capabilityError = [
    summaryError,
    demandError,
    segmentError,
    forecastError,
    clusterError,
    capacityError,
  ].find(Boolean);
  const modelLifecycle = summary?.modelLifecycle
    || demandData?.meta?.model_lifecycle
    || segData?.meta?.model_lifecycle
    || forecastData?.model?.model_lifecycle
    || clusterData?.meta?.model_lifecycle
    || invData?.meta?.model_lifecycle;

  const products   = demandData?.products  || [];
  const customers  = segData?.customers    || [];
  const segSummary = segData?.segmentSummary || [];
  const churnDist  = segData?.churnDistribution || [];
  const historical = forecastData?.historical || [];
  const forecast   = forecastData?.forecast   || [];
  const model      = forecastData?.model;
  const demandDefinitions = demandData?.meta?.calculation_definitions || {
    virality: 'Average 0–100 virality score for the product signals in the selected lookback window.',
    uplift: 'Model-provided probability of the SURGE class.',
    predicted: 'Derived seven-day planning projection scaled by the OML SURGE probability.',
    confidence: 'Probability of the predicted binary class.',
  };

  useEffect(() => {
    setSelectedSegment(null);
  }, [userKey]);

  // Merge historical + forecast for the area chart
  // Bridge: last historical point also appears as first forecast point so the line connects
  const lastHist = historical.length ? historical[historical.length - 1] : null;
  const chartData = [
    ...historical.map(r => ({
      day:     r.DAY?.slice(5),
      actual:  r.ACTUAL_REVENUE,
      trend:   r.TREND_LINE,
      ma7:     r.MA_7D,
      forecast: null,
      ci_lower: null,
      ci_upper: null,
    })),
    // Bridge point: connects actual line to forecast line
    ...(lastHist ? [{
      day:      lastHist.DAY?.slice(5),
      actual:   lastHist.ACTUAL_REVENUE,
      trend:    lastHist.TREND_LINE,
      ma7:      lastHist.MA_7D,
      forecast: lastHist.ACTUAL_REVENUE,
      ci_lower: lastHist.TREND_LINE,
      ci_upper: lastHist.TREND_LINE,
    }] : []),
    ...forecast.map((r) => {
      return {
        day:      r.DAY?.slice(5),
        actual:   null,
        trend:    r.TREND_LINE,
        ma7:      null,
        forecast: Number(r.TREND_LINE),
        ci_lower: r.CI_LOWER,
        ci_upper: r.CI_UPPER,
      };
    }),
  ];

  const filteredEnterpriseBuyers = selectedSegment
    ? customers.filter(c => c.SEGMENT === selectedSegment)
    : customers;

  return (
    <div className="space-y-6 fade-in">

      {/* ── Header ──────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <JetGlyph iconClass="oj-fwk-icon-view" className="oml-header-glyph tone-plum" /> Predictive Product & Commitment Analytics
        </h2>
        <p className="text-sm text-[var(--color-text-dim)] mt-1">
          Oracle Machine Learning for demand volatility, product lifecycle, bill of materials capacity, and commitment-value forecasting - <span className="tone-plum">
            Random Forest · K-Means · Generalized Linear Model regression · Oracle AI Database 26ai
          </span>
        </p>
      </div>

      {/* ── Oracle Panel - switches content based on active tab ── */}
      <RegisterOraclePanel title="Predictive Product & Commitment Analytics">
        {activeTab === 'demand'   && <DemandOraclePanel />}
        {activeTab === 'rfm'      && <RFMOraclePanel />}
        {activeTab === 'forecast' && <ForecastOraclePanel />}
        {activeTab === 'clusters' && <ClustersOraclePanel />}
        {activeTab === 'capacity' && <CapacityOraclePanel />}
      </RegisterOraclePanel>

      <SceneStoryPanel scene="oml" />

      {(capabilityError || (modelLifecycle && !modelLifecycle.ready)) && (
        <div className="oml-persistence-panel__warning" role="alert">
          <strong>OML capability unavailable.</strong>{' '}
          The application will not display substitute predictions. Confirm that all required models are active
          in USER_MINING_MODELS and that the latest refresh completed successfully.
          {capabilityError ? ` ${capabilityError}` : ''}
        </div>
      )}

      <HighTechModelEvidencePanel />

      <PersistedMlEvidencePanel canRefresh={canRefreshPersistence} userKey={userKey} />

      {/* ── Summary stat cards ─────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          iconClass="oj-fwk-icon-sortrelevancehigh"
          label="Products with Demand Volatility"
          value={summaryLoading ? '…' : formatNumber(summary?.PRODUCTS_WITH_SURGE || summary?.products_with_surge || 0)}
          sub="Random Forest demand classification"
          color="#AA643B"
          badge="Random Forest"
        />
        <StatCard
          iconClass="oj-fwk-icon-users"
          label="Enterprise Buyers Segmented"
          value={summaryLoading ? '…' : formatNumber(summary?.TOTAL_CUSTOMERS || summary?.total_customers || 0)}
          sub="K-Means commitment segmentation"
          color="#C74634"
          badge="K-Means"
        />
        <StatCard
          iconClass="oj-fwk-icon-view"
          label="Commitment Value Model Fit"
          value={summaryLoading ? '…' : (summary?.REVENUE_R2 || summary?.revenue_r2
            ? `${((summary?.REVENUE_R2 || summary?.revenue_r2) * 100).toFixed(1)}%`
            : '-')}
          sub="Generalized linear model · 30-day fit"
          color="#4C825C"
          badge="Linear model"
        />
        <StatCard
          iconClass="oj-fwk-icon-grid"
          label="Active Prediction Models"
          value={summaryLoading ? '…' : (summary?.MODELS_ACTIVE ?? summary?.models_active ?? 0)}
          sub="Demand volatility · Commitments · Forecast · K-Means"
          color="#4F7D7B"
          badge="In database"
        />
      </div>

      {/* ── Tab Bar ────────────────────────────── */}
      <div className="oml-tabbar" role="tablist" aria-label="Oracle Machine Learning analytics views">
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <JetButton
              key={tab.key}
              id={`oml-tab-${tab.key}`}
              label={tab.buttonLabel}
              iconClass={`oj-fwk-icon ${tab.iconClass}`}
              chroming={isActive ? 'callToAction' : 'outlined'}
              role="tab"
              ariaSelected={isActive ? 'true' : 'false'}
              ariaControls={`oml-panel-${tab.key}`}
              className="oml-tab-jet-button"
              onAction={() => setActiveTab(tab.key)}
            />
          );
        })}
      </div>

      {/* ══════════════════════════════════════════
          Tab 1 - Demand Volatility Forecasting
      ══════════════════════════════════════════ */}
      {activeTab === 'demand' && (
        <section
          id="oml-panel-demand"
          role="tabpanel"
          aria-labelledby="oml-tab-demand"
          className="glass-card space-y-5"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <JetGlyph iconClass="oj-fwk-icon-sortrelevancehigh" className="tone-sienna" />
                Demand Volatility Forecasting
              </h3>
              <p className="text-xs text-[var(--color-text-dim)] mt-0.5">
                Seven-day product demand estimates from recent requested units and product-signal activity.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <JetSelectSingle
                value={String(demandHours)}
                options={DEMAND_WINDOW_OPTIONS}
                ariaLabel="Demand scoring window"
                className="oml-inline-select"
                onValueChange={(value) => setDemandHours(Number(value))}
              />
              <JetButton
                label={demandLoading ? 'Scoring' : 'Refresh'}
                iconClass="oj-fwk-icon oj-fwk-icon-arrowtail-e"
                chroming="outlined"
                disabled={demandLoading}
                onAction={refetchDemand}
              />
            </div>
          </div>

          <section className="business-explanation" aria-labelledby="demand-values-title">
            <div>
              <h4 id="demand-values-title" className="business-explanation__title">How these values are calculated</h4>
              <p className="business-explanation__copy">The definitions below describe the active data path returned by the API, including the persisted demo-scoring path or live Oracle model path.</p>
            </div>
            <dl className="business-explanation__metrics">
              <div className="business-explanation__metric"><dt>Virality</dt><dd>{demandDefinitions.virality}</dd></div>
              <div className="business-explanation__metric"><dt>OML Surge Probability</dt><dd>{demandDefinitions.uplift}</dd></div>
              <div className="business-explanation__metric"><dt>Predicted Solution Orders</dt><dd>{demandDefinitions.predicted}</dd></div>
            </dl>
          </section>

          {demandLoading ? (
            <p className="text-sm text-[var(--color-text-dim)] py-4 text-center">Scoring via PREDICTION(HT_DEMAND_VOLATILITY_MODEL)...</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-[var(--color-text-dim)] py-4 text-center">No high-tech products with sufficient product-signal activity in this window.</p>
          ) : (
            <div className="space-y-5">
              {/* Bar chart - predicted demand */}
              <div>
                <p className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider mb-2">
                  Top 10 - Predicted Solution Orders (7-day horizon)
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={products.slice(0, 10)} layout="vertical" margin={{ left: 12, right: 28, bottom: 18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(49,45,42,0.12)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#697778' }} label={{ value: 'Predicted Solution Orders', position: 'insideBottom', offset: -10, fill: '#697778', fontSize: 12, fontWeight: 700 }} />
                    <YAxis type="category" dataKey="PRODUCT_NAME" tick={{ fontSize: 9, fill: '#697778' }} width={100}
                      tickFormatter={v => v?.length > 14 ? v.slice(0, 14) + '…' : v} />
                    <Tooltip
                      contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 11, color: 'var(--color-text)' }}
                      itemStyle={{ color: 'var(--color-text)' }}
                      labelStyle={{ color: 'var(--color-text)' }}
                      cursor={{ fill: 'rgba(49,45,42,0.08)' }}
                      formatter={(v, n) => [formatNumber(v), n === 'PREDICTED_DEMAND' ? 'Predicted Solution Orders' : n]}
                    />
                    <Bar dataKey="PREDICTED_DEMAND" radius={[0, 4, 4, 0]}>
                      {products.slice(0, 10).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider border-b border-[var(--color-border)]">
                      <th className="text-left py-2 px-2">High-Tech Product</th>
                      <th className="text-right py-2 px-2">Virality <HelpTip label="Virality" definition={demandDefinitions.virality} /></th>
                      <th className="text-right py-2 px-2">OML Surge Probability <HelpTip label="OML Surge Probability" definition={demandDefinitions.uplift} /></th>
                      <th className="text-right py-2 px-2">Predicted Orders <HelpTip label="Predicted Solution Orders" definition={demandDefinitions.predicted} /></th>
                      <th className="text-right py-2 px-2">Estimated Product Value Opportunity <HelpTip label="Estimated Product Value Opportunity" definition="Predicted solution orders multiplied by the product unit price; this is a demand opportunity estimate, not recognized revenue or margin." /></th>
                      <th className="py-2 px-2">Confidence <HelpTip label="Prediction Confidence" definition={demandDefinitions.confidence} /></th>
                      <th className="text-center py-2 px-2">Signal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, i) => (
                      <tr key={i} className="border-b border-[var(--color-border)]/30 hover:bg-[var(--color-surface-hover)] transition-colors">
                        <td className="py-2 px-2">
                          <div className="font-medium truncate max-w-[120px]">{p.PRODUCT_NAME}</div>
                          <div className="text-[9px] text-[var(--color-text-dim)]">{p.CATEGORY}</div>
                        </td>
                        <td className="py-2 px-2 text-right font-mono" style={{ color: MOMENTUM_COLORS[p.PEAK_MOMENTUM] || '#697778' }}>
                          {p.AVG_VIRALITY}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <span className="tone-pine font-semibold">
                            {p.UPLIFT_PCT}%
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right font-bold">{formatNumber(p.PREDICTED_DEMAND)}</td>
                        <td className="py-2 px-2 text-right tone-sienna">{formatCurrency(p.REVENUE_OPPORTUNITY)}</td>
                        <td className="py-2 px-2 min-w-[90px]">
                          <ConfidenceBar pct={p.CONFIDENCE_PCT} />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <MomentumBadge flag={p.PEAK_MOMENTUM} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Model explanation */}
          <details className="oml-technical-details rounded-lg p-3 text-[10px]"
            style={{ background: 'rgba(170,100,59,0.06)', border: '1px dashed rgba(170,100,59,0.3)', color: 'var(--color-text)' }}>
            <summary>Technical demand-model details</summary>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2">
              <span><strong>Model:</strong> {demandData?.meta?.model || 'High Tech demand scoring'}</span>
              <span><strong>Scoring:</strong> {demandData?.meta?.scoring || 'Oracle in-database scoring'}</span>
              <span><strong>Features:</strong> {(demandData?.meta?.features || []).join(', ')}</span>
              <span><strong>Engine:</strong> {demandData?.meta?.engine || 'Oracle AI Database 26ai'}</span>
            </div>
          </details>
        </section>
      )}

      {/* ══════════════════════════════════════════
          Tab 2 - Customer Commitment Segments
      ══════════════════════════════════════════ */}
      {activeTab === 'rfm' && (
        <section
          id="oml-panel-rfm"
          role="tabpanel"
          aria-labelledby="oml-tab-rfm"
          className="glass-card space-y-5"
        >
          <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <JetGlyph iconClass="oj-fwk-icon-users" className="tone-plum" />
                Customer Commitment Segments
              </h3>
            <p className="text-xs text-[var(--color-text-dim)] mt-0.5">
              HT_CUSTOMER_COMMITMENT_SEGMENT_MODEL (K-Means, 4 clusters) via DBMS_DATA_MINING +{' '}
              <code className="tone-plum">NTILE(4)</code> RFM labeling - CLUSTER_ID() scoring
            </p>
          </div>

          {segLoading ? (
            <p className="text-sm text-[var(--color-text-dim)] py-4 text-center">Scoring synthetic enterprise buyers via CLUSTER_ID(HT_CUSTOMER_COMMITMENT_SEGMENT_MODEL)...</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Segment donut */}
              <div>
                <p className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider mb-2 text-center">
                  Segment Distribution
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={segSummary}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      dataKey="count"
                      nameKey="segment"
                      onClick={d => setSelectedSegment(selectedSegment === d.segment ? null : d.segment)}
                    >
                      {segSummary.map((s, i) => (
                        <Cell
                          key={i}
                          fill={SEGMENT_COLORS[s.segment] || CHART_COLORS[i % CHART_COLORS.length]}
                          opacity={selectedSegment && selectedSegment !== s.segment ? 0.35 : 1}
                          cursor="pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 11, color: 'var(--color-text)' }}
                      itemStyle={{ color: 'var(--color-text)' }}
                      labelStyle={{ color: 'var(--color-text)' }}
                      cursor={false}
                      formatter={(v, n, p) => [`${v} synthetic enterprise buyers`, p.payload.segment]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {segSummary.map((s, i) => (
                    <JetButton
                      key={i}
                      label={`${s.segment} (${s.count})`}
                      chroming={selectedSegment === s.segment ? 'callToAction' : 'outlined'}
                      className="oml-segment-filter-button"
                      onAction={() => setSelectedSegment(selectedSegment === s.segment ? null : s.segment)}
                    />
                  ))}
                </div>
              </div>

              {/* Churn risk bar + segment table */}
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider mb-2">Churn Risk Distribution</p>
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={churnDist} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                      <XAxis dataKey="risk" tick={{ fontSize: 10, fill: '#697778' }} />
                      <YAxis tick={{ fontSize: 9, fill: '#697778' }} width={30} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {churnDist.map((d, i) => (
                          <Cell key={i} fill={d.risk === 'High' ? '#C74634' : d.risk === 'Medium' ? '#AA643B' : '#4C825C'} />
                        ))}
                      </Bar>
                      <Tooltip
                        contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 11, color: 'var(--color-text)' }}
                        itemStyle={{ color: 'var(--color-text)' }}
                        labelStyle={{ color: 'var(--color-text)' }}
                        cursor={{ fill: 'rgba(49,45,42,0.08)' }}
                        formatter={v => [`${v} synthetic enterprise buyers`, 'Count']}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <p className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider mb-2">Segment Summary</p>
                  <div className="space-y-1">
                    {segSummary.map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <span style={{ color: SEGMENT_COLORS[s.segment] || CHART_COLORS[i] }}>{s.segment}</span>
                        <div className="flex gap-3 text-[var(--color-text-dim)]">
                          <span>{s.count} synthetic enterprise buyers</span>
                          <span className="tone-sienna">{formatCurrency(s.total_revenue)}</span>
                          <span className="tone-plum">RFM {s.avg_rfm}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Enterprise Buyer table - filtered by selected segment */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider">
                    {selectedSegment ? `${selectedSegment} synthetic enterprise buyers` : 'Top synthetic enterprise buyers by RFM score'}
                  </p>
                  {selectedSegment && (
                    <JetButton
                      label="Clear"
                      iconClass="oj-fwk-icon oj-fwk-icon-cross"
                      chroming="borderless"
                      className="oml-clear-filter-button"
                      onAction={() => setSelectedSegment(null)}
                    />
                  )}
                </div>
                <div className="overflow-y-auto max-h-[240px] space-y-1">
                  {filteredEnterpriseBuyers.slice(0, 40).map((c, i) => (
                    <div key={i} className="flex items-center justify-between rounded px-2 py-1.5 text-[10px] hover:surface-bark-soft transition-colors">
                      <div>
                        <span className="font-medium">{c.FULL_NAME}</span>
                        <span className="text-[var(--color-text-dim)] ml-1">{c.CITY}, {c.STATE}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span style={{ color: SEGMENT_COLORS[c.SEGMENT] || '#697778' }}
                          className="text-[9px] font-semibold">{c.SEGMENT}</span>
                        <span className="tone-sienna">{formatCurrency(c.TOTAL_SPENT)}</span>
                        <span className={`text-[9px] ${c.CHURN_RISK === 'High' ? 'tone-red' : c.CHURN_RISK === 'Medium' ? 'tone-sienna' : 'tone-pine'}`}>
                          {c.CHURN_RISK}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg p-3 text-[10px] flex flex-wrap gap-x-6 gap-y-1"
            style={{ background: 'rgba(107,116,148,0.06)', border: '1px dashed rgba(107,116,148,0.3)', color: 'var(--color-text)' }}>
            <span><strong>Model:</strong> RFM via Oracle NTILE(4) - ISO SQL:2003 Window Functions</span>
            <span><strong>Segments:</strong> Champion · Loyal · New · At Risk · Lost · Big Spender · Promising · Potential</span>
            <span><strong>Engine:</strong> Oracle AI Database 26ai - no sklearn, no Python, no external cluster</span>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════
          Tab 3 - Commitment Value Forecast
      ══════════════════════════════════════════ */}
      {activeTab === 'forecast' && (
        <section
          id="oml-panel-forecast"
          role="tabpanel"
          aria-labelledby="oml-tab-forecast"
          className="glass-card space-y-5"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <JetGlyph iconClass="oj-fwk-icon-view" className="tone-pine" />
                Commitment Value Forecast - Oracle Linear Regression
              </h3>
              <p className="text-xs text-[var(--color-text-dim)] mt-0.5">
                <code className="text-[var(--color-text)] font-semibold">REGR_SLOPE · REGR_INTERCEPT · REGR_R2</code> - Oracle's native OLS regression
                fits the trend on 30-day history and projects forward
              </p>
            </div>
            <div className="flex items-center gap-2">
              <JetSelectSingle
                value={String(forecastDays)}
                options={FORECAST_DAY_OPTIONS}
                ariaLabel="Product value forecast horizon"
                className="oml-inline-select"
                onValueChange={(value) => setForecastDays(Number(value))}
              />
              <JetButton
                label={forecastLoading ? 'Fitting' : 'Refresh'}
                iconClass="oj-fwk-icon oj-fwk-icon-arrowtail-e"
                chroming="outlined"
                disabled={forecastLoading}
                onAction={refetchForecast}
              />
            </div>
          </div>

          {forecastLoading ? (
            <p className="text-sm text-[var(--color-text-dim)] py-4 text-center">Fitting REGR_SLOPE model…</p>
          ) : (
            <>
              {/* Model quality stats */}
              {model && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'R² (fit quality)', value: `${((model.r_squared || 0) * 100).toFixed(1)}%`, color: model.r_squared > 0.7 ? '#4C825C' : model.r_squared > 0.4 ? '#AA643B' : '#C74634' },
                    { label: 'Daily Slope', value: `${model.daily_slope >= 0 ? '+' : ''}${formatCurrency(model.daily_slope)}/day`, color: model.daily_slope >= 0 ? '#4C825C' : '#C74634' },
                    { label: 'Mean Daily Product Value', value: formatCurrency(model.mean_daily_revenue), color: '#C74634' },
                    { label: 'Observations', value: `${model.observations} days`, color: '#4F7D7B' },
                  ].map((m, i) => (
                    <div key={i} className="rounded-lg p-3 text-center"
                      style={{ background: `${m.color}11`, border: `1px solid ${m.color}33` }}>
                      <p className="text-[10px] text-[var(--color-text-dim)] mb-1">{m.label}</p>
                      <p className="text-sm font-bold">{m.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Main forecast chart */}
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                  <defs>
                    <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#4C825C" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4C825C" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#C74634" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#C74634" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(49,45,42,0.12)" />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#697778' }}
                    interval={Math.floor(chartData.length / 10)} />
                  <YAxis tick={{ fontSize: 9, fill: '#697778' }} width={60}
                    tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ForecastTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, color: '#697778' }} />

                  {/* Confidence interval band for forecast (upper bound filled, lower bound erases) */}
                  <Area type="monotone" dataKey="ci_upper" fill="#C7463422" stroke="#C7463444"
                    strokeWidth={1} strokeDasharray="3 3" dot={false} name="CI Upper" legendType="none" />
                  <Area type="monotone" dataKey="ci_lower" fill="var(--color-bg)" stroke="#C7463444"
                    strokeWidth={1} strokeDasharray="3 3" dot={false} name="CI Lower" legendType="none" />

                  <Area type="monotone" dataKey="actual" stroke="#4C825C" fill="url(#actualGrad)"
                    strokeWidth={2} dot={false} name="Actual Product Value" connectNulls={false} />
                  <Area type="monotone" dataKey="forecast" stroke="#C74634" fill="url(#forecastGrad)"
                    strokeWidth={2.5} strokeDasharray="6 3" dot={false} name="Forecast" connectNulls />
                  <Line type="monotone" dataKey="trend" stroke="#AA643B" strokeWidth={1.5}
                    strokeDasharray="2 2" dot={false} name="Trend (OLS)" connectNulls />
                  <Line type="monotone" dataKey="ma7" stroke="#4F7D7B" strokeWidth={1.5}
                    dot={false} name="7-day MA" />

                  {/* Vertical rule separating actual / forecast */}
                  {historical.length > 0 && (
                    <ReferenceLine
                      x={historical[historical.length - 1]?.DAY?.slice(5)}
                      stroke="rgba(49,45,42,0.18)"
                      strokeDasharray="4 4"
                      label={{ value: 'Forecast →', position: 'top', fill: '#697778', fontSize: 9 }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>

              <div className="flex flex-wrap gap-2" aria-label="Exact API forecast values">
                {forecast.map((row) => {
                  const apiForecastValue = Number(row.TREND_LINE);
                  return (
                    <span
                      key={row.DAY}
                      data-api-forecast-day={row.DAY}
                      data-api-forecast-value={String(apiForecastValue)}
                      className="text-[9px] font-mono text-[var(--color-text-dim)]"
                    >
                      {row.DAY}: {formatCurrency(apiForecastValue)}
                    </span>
                  );
                })}
              </div>

              {/* Model card */}
              {model && (
                <div className="rounded-lg p-3 text-[10px] flex flex-wrap gap-x-6 gap-y-1"
                  style={{ background: 'rgba(76,130,92,0.06)', border: '1px dashed rgba(76,130,92,0.3)', color: 'var(--color-text)' }}>
                  <span><strong>Model:</strong> {model.type}</span>
                  <span><strong>Oracle functions:</strong> {model.engine}</span>
                  <span><strong>R²:</strong> {(model.r_squared * 100).toFixed(1)}%
                    {' · '}<strong>ρ:</strong> {(model.correlation * 100).toFixed(1)}% corr.
                  </span>
                  <span><strong>Forecast:</strong> {model.forecast_days} days
                    {' · '}<strong>Trained on:</strong> {model.lookback_days}-day window
                  </span>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* ══════════════════════════════════════════
          Tab 4 - Product Signal Clusters
      ══════════════════════════════════════════ */}
      {activeTab === 'clusters' && (
        <section
          id="oml-panel-clusters"
          role="tabpanel"
          aria-labelledby="oml-tab-clusters"
          className="glass-card space-y-5"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <JetGlyph iconClass="oj-fwk-icon-grid" className="tone-teal" />
                Product Signal Clusters
              </h3>
              <p className="text-xs text-[var(--color-text-dim)] mt-0.5">
                High-Tech products scored by <code className="tone-teal">HT_PRODUCT_SIGNAL_CLUSTER_MODEL</code> using
                {' '}<code className="tone-teal">CLUSTER_ID()</code> and <code className="tone-teal">CLUSTER_PROBABILITY()</code> over eight product-signal features.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--color-text-dim)]">
                K = {clusterK} (trained model)
              </span>
              <JetButton
                label={clusterLoading ? 'Clustering' : 'Refresh'}
                iconClass="oj-fwk-icon oj-fwk-icon-arrowtail-e"
                chroming="outlined"
                disabled={clusterLoading}
                onAction={refetchClusters}
              />
            </div>
          </div>

          {clusterLoading ? (
            <div className="py-8 text-center">
              <JetProgressCircle className="oml-loading-progress" ariaLabel="Running vector clustering" />
              <p className="text-sm text-[var(--color-text-dim)]">Loading persisted OML K-Means scores (K={clusterK})…</p>
            </div>
          ) : !clusterData?.clusters?.length ? (
            <p className="text-sm text-[var(--color-text-dim)] py-4 text-center">No cluster data available.</p>
          ) : (
            <>
              {/* Cluster summary bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Clusters (K)', value: clusterData.k, color: '#4F7D7B' },
                  { label: 'High-Tech Products Clustered', value: clusterData.total_products, color: '#C74634' },
                  { label: 'Model Features', value: clusterData.meta?.features?.length ?? 0, color: '#AA643B' },
                  { label: 'Scoring Function', value: 'CLUSTER_ID', color: '#4C825C' },
                ].map((m, i) => (
                  <div key={i} className="rounded-lg p-3 text-center"
                    style={{ background: `${m.color}11`, border: `1px solid ${m.color}33` }}>
                    <p className="text-[10px] text-[var(--color-text-dim)] mb-1">{m.label}</p>
                    <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Cluster size overview */}
              <div>
                <p className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider mb-2">Cluster Distribution</p>
                <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
                  {clusterData.clusters.map((cl, i) => (
                    <div
                      key={cl.cluster_id}
                      className="relative group flex items-center justify-center text-[9px] font-bold transition-all hover:opacity-90"
                      style={{
                        width: `${Math.max((cl.size / clusterData.total_products) * 100, 3)}%`,
                        background: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
                      }}
                    >
                      {cl.size}
                      <div className="absolute -top-8 bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1 text-[9px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        Cluster {cl.cluster_id}: {cl.size} high-tech products · {cl.top_category}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cluster cards */}
              <div className="space-y-3">
                {clusterData.clusters.map((cl, i) => {
                  const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
                  return (
                    <div key={cl.cluster_id} className="rounded-xl overflow-hidden"
                      style={{ border: `1px solid ${color}33` }}>
                      {/* Cluster header */}
                      <div className="flex items-center justify-between px-4 py-2.5"
                        style={{ background: `${color}11` }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                            style={{ background: `${color}33`, color }}>
                            {cl.cluster_id}
                          </div>
                          <div>
                            <p className="text-sm font-semibold" style={{ color }}>
                              Cluster {cl.cluster_id} - {cl.top_category}
                            </p>
                            <p className="text-[10px] text-[var(--color-text-dim)]">
                              {cl.size} high-tech products · Mean membership probability:{' '}
                              <span className="font-mono" style={{ color }}>{(cl.avg_probability * 100).toFixed(1)}%</span>
                            </p>
                          </div>
                        </div>
                        {/* Category breakdown pills */}
                        <div className="flex gap-1 flex-wrap justify-end">
                          {Object.entries(cl.category_breakdown)
                            .sort(([,a],[,b]) => b - a)
                            .slice(0, 4)
                            .map(([cat, cnt]) => (
                              <span key={cat} className="text-[9px] px-1.5 py-0.5 rounded-full"
                                style={{ background: `${color}22`, color, border: `1px solid ${color}33` }}>
                                {cat} ({cnt})
                              </span>
                            ))}
                        </div>
                      </div>
                      {/* High-Tech Products grid */}
                      <div className="px-4 py-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                        {cl.products.slice(0, 12).map(p => (
                          <div key={p.product_id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded text-[11px] hover:surface-bark-soft transition-colors"
                            style={p.is_centroid ? { background: `${color}11`, border: `1px solid ${color}33` } : {}}>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium truncate block">
                                {p.is_centroid && <span style={{ color }} className="mr-1">★</span>}
                                {p.product_name}
                              </span>
                              <span className="text-[9px] text-[var(--color-text-dim)]">
                                {p.brand_name} · {p.category} · {formatCurrency(p.unit_price)}
                              </span>
                            </div>
                            <div className="flex-shrink-0 w-12 text-right">
                              <span className="text-[10px] font-mono font-bold"
                                style={{ color: p.cluster_probability >= 0.7 ? '#4C825C' : p.cluster_probability >= 0.5 ? '#AA643B' : '#437C94' }}>
                                {(p.cluster_probability * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))}
                        {cl.products.length > 12 && (
                          <div className="text-[10px] text-[var(--color-text-dim)] px-2 py-1">
                            +{cl.products.length - 12} more high-tech products
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Model explanation */}
              <div className="rounded-lg p-3 text-[10px] flex flex-wrap gap-x-6 gap-y-1"
                style={{ background: 'rgba(79,125,123,0.06)', border: '1px dashed rgba(79,125,123,0.3)', color: 'var(--color-text)' }}>
                <span><strong>Model:</strong> HT_PRODUCT_SIGNAL_CLUSTER_MODEL · ALGO_KMEANS</span>
                <span><strong>Scoring:</strong> CLUSTER_ID() · CLUSTER_PROBABILITY()</span>
                <span><strong>Engine:</strong> Oracle DBMS_DATA_MINING persisted scoring</span>
                <span><strong>K:</strong> {clusterData.k} clusters · {clusterData.total_products} high-tech products</span>
              </div>
            </>
          )}
        </section>
      )}

      {/* ══════════════════════════════════════════
          Tab 5 - BOM & Capacity Intelligence
      ══════════════════════════════════════════ */}
      {activeTab === 'capacity' && (
        <section
          id="oml-panel-capacity"
          role="tabpanel"
          aria-labelledby="oml-tab-capacity"
          className="glass-card space-y-5"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <JetGlyph iconClass="oj-fwk-icon-tree-document" className="tone-plum" />
                BOM & Capacity Intelligence
              </h3>
              <p className="text-xs text-[var(--color-text-dim)] mt-0.5">
                HT_DEMAND_VOLATILITY_MODEL predictions x live capacity - identifies product availability risk from product-signal-driven demand surges
              </p>
            </div>
            <JetButton
              label={invLoading ? 'Scoring' : 'Refresh'}
              iconClass="oj-fwk-icon oj-fwk-icon-arrowtail-e"
              chroming="outlined"
              disabled={invLoading}
              onAction={refetchInv}
            />
          </div>

          {invLoading ? (
            <p className="text-sm text-[var(--color-text-dim)] py-4 text-center">Scoring capacity via PREDICTION(HT_DEMAND_VOLATILITY_MODEL)...</p>
          ) : !invData?.alerts?.length ? (
            <p className="text-sm text-[var(--color-text-dim)] py-4 text-center">No capacity intelligence data available.</p>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="rounded-lg p-3 text-center" style={{ background: '#C7463411', border: '1px solid #C7463433' }}>
                  <p className="text-[10px] text-[var(--color-text-dim)] mb-1">Critical / Out of Stock</p>
                  <p className="text-xl font-bold text-[#C74634]">{invData.summary.critical_count}</p>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: '#437C9411', border: '1px solid #437C9433' }}>
                  <p className="text-[10px] text-[var(--color-text-dim)] mb-1">At Risk (demand {'>'} capacity)</p>
                  <p className="text-xl font-bold text-[#437C94]">{invData.summary.at_risk_count}</p>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: '#AA643B11', border: '1px solid #AA643B33' }}>
                  <p className="text-[10px] text-[var(--color-text-dim)] mb-1">OML Surge Predicted</p>
                  <p className="text-xl font-bold text-[#AA643B]">{invData.summary.surge_products}</p>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: '#79608711', border: '1px solid #79608733' }}>
                  <p className="text-[10px] text-[var(--color-text-dim)] mb-1">Product Value at Risk</p>
                  <p className="text-lg font-bold text-[#796087]">{formatCurrency(invData.summary.total_revenue_at_risk)}</p>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: '#4C825C11', border: '1px solid #4C825C33' }}>
                  <p className="text-[10px] text-[var(--color-text-dim)] mb-1">Total Monitored</p>
                  <p className="text-xl font-bold text-[#4C825C]">{invData.summary.total_alerts}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Stock status distribution */}
                <div>
                  <p className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider mb-2 text-center">
                    Stock Status Distribution
                  </p>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={invData.statusDistribution}
                        cx="50%" cy="50%"
                        innerRadius={45} outerRadius={75}
                        dataKey="count" nameKey="status"
                      >
                        {invData.statusDistribution.map((d, i) => (
                          <Cell key={i} fill={STOCK_COLORS[d.status] || '#7A736E'} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 11, color: 'var(--color-text)' }}
                        itemStyle={{ color: 'var(--color-text)' }}
                        labelStyle={{ color: 'var(--color-text)' }}
                        cursor={false}
                        formatter={(v, n, p) => [`${v} items`, p.payload.status.replace('_', ' ')]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {invData.statusDistribution.map((d, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded"
                        style={{ background: `${STOCK_COLORS[d.status] || '#7A736E'}22`, color: STOCK_COLORS[d.status] || '#7A736E' }}>
                        {d.status.replace('_', ' ')} ({d.count})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Center summary */}
                <div>
                  <p className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider mb-2">
                    Alerts by Fulfillment Center
                  </p>
                  <div className="space-y-1 max-h-[240px] overflow-y-auto">
                    {invData.centerSummary.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-[10px] rounded px-2 py-1.5 hover:surface-bark-soft">
                        <div>
                          <span className="font-medium">{c.center}</span>
                          <span className="text-[var(--color-text-dim)] ml-1">({c.city})</span>
                        </div>
                        <div className="flex gap-2">
                          {c.critical > 0 && (
                            <span className="text-[#C74634] font-bold">{c.critical} critical</span>
                          )}
                          {c.surges > 0 && (
                            <span className="text-[#AA643B]">{c.surges} surges</span>
                          )}
                          <span className="text-[var(--color-text-dim)]">{c.alerts} total</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top surge probability products */}
                <div>
                  <p className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider mb-2">
                    Highest Surge Probability
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={invData.alerts.filter(a => a.OML_SURGE_PREDICTION === 'SURGE').slice(0, 8)}
                      layout="vertical" margin={{ left: 0, right: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(49,45,42,0.12)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 9, fill: '#697778' }} domain={[0, 100]} />
                      <YAxis type="category" dataKey="PRODUCT_NAME" tick={{ fontSize: 8, fill: '#697778' }} width={90}
                        tickFormatter={v => v?.length > 12 ? v.slice(0, 12) + '…' : v} />
                      <Tooltip
                        contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 11, color: 'var(--color-text)' }}
                        itemStyle={{ color: 'var(--color-text)' }}
                        labelStyle={{ color: 'var(--color-text)' }}
                        cursor={{ fill: 'rgba(49,45,42,0.08)' }}
                        formatter={v => [`${v}%`, 'Surge Probability']}
                      />
                      <Bar dataKey="OML_SURGE_PROBABILITY" radius={[0, 4, 4, 0]}>
                        {invData.alerts.filter(a => a.OML_SURGE_PREDICTION === 'SURGE').slice(0, 8).map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Alerts table */}
              <div>
                <p className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider mb-2">
                  Capacity Alerts - Sorted by OML Surge Probability
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider border-b border-[var(--color-border)]">
                        <th className="text-left py-2 px-2">High-Tech Product</th>
                        <th className="text-left py-2 px-2">Center</th>
                        <th className="text-right py-2 px-2">On Hand</th>
                        <th className="text-right py-2 px-2">Predicted</th>
                        <th className="text-right py-2 px-2">Surge %</th>
                        <th className="text-center py-2 px-2">Status</th>
                        <th className="text-right py-2 px-2">Days Supply</th>
                        <th className="text-right py-2 px-2">Rev. at Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invData.alerts.slice(0, 30).map((a, i) => (
                        <tr key={i} className="border-b border-[var(--color-border)]/30 hover:bg-[var(--color-surface-hover)] transition-colors">
                          <td className="py-2 px-2">
                            <div className="font-medium truncate max-w-[120px]">{a.PRODUCT_NAME}</div>
                            <div className="text-[9px] text-[var(--color-text-dim)]">{a.CATEGORY} · {a.BRAND_NAME}</div>
                          </td>
                          <td className="py-2 px-2 text-[10px]">
                            <div className="truncate max-w-[100px]">{a.CENTER_NAME}</div>
                          </td>
                          <td className="py-2 px-2 text-right font-mono">{a.QUANTITY_ON_HAND}</td>
                          <td className="py-2 px-2 text-right font-mono tone-sienna">{a.PREDICTED_DEMAND}</td>
                          <td className="py-2 px-2 text-right">
                            <span className="font-bold" style={{
                              color: a.OML_SURGE_PROBABILITY >= 70 ? '#C74634' :
                                     a.OML_SURGE_PROBABILITY >= 40 ? '#AA643B' : '#4C825C'
                            }}>
                              {a.OML_SURGE_PROBABILITY}%
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{
                                background: `${STOCK_COLORS[a.STOCK_STATUS] || '#7A736E'}22`,
                                color: STOCK_COLORS[a.STOCK_STATUS] || '#7A736E'
                              }}>
                              {a.STOCK_STATUS?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right font-mono" style={{
                            color: a.DAYS_OF_SUPPLY != null && a.DAYS_OF_SUPPLY < 3 ? '#C74634' :
                                   a.DAYS_OF_SUPPLY != null && a.DAYS_OF_SUPPLY < 7 ? '#AA643B' : '#4C825C'
                          }}>
                            {a.DAYS_OF_SUPPLY != null ? `${a.DAYS_OF_SUPPLY}d` : '-'}
                          </td>
                          <td className="py-2 px-2 text-right tone-red">
                            {a.REVENUE_AT_RISK > 0 ? formatCurrency(a.REVENUE_AT_RISK) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Model explanation */}
              <div className="rounded-lg p-3 text-[10px] flex flex-wrap gap-x-6 gap-y-1"
                style={{ background: 'rgba(121,96,135,0.06)', border: '1px dashed rgba(121,96,135,0.3)', color: 'var(--color-text)' }}>
                <span><strong>Model:</strong> HT_DEMAND_VOLATILITY_MODEL (ALGO_RANDOM_FOREST)</span>
                <span><strong>Scoring:</strong> PREDICTION_PROBABILITY() × capacity levels</span>
                <span><strong>Data:</strong> demand_forecasts (daily OML predictions) × capacity × product availability centers</span>
                <span><strong>Engine:</strong> Oracle DBMS_DATA_MINING - product-signal demand surge to product availability risk assessment</span>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
