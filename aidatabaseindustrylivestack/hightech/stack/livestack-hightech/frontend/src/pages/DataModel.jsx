import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Database,
  Boxes,
  Gauge,
  TrendingUp,
  Network,
  MapPin,
  BrainCircuit,
  FileJson,
  Package,
  ShieldCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { JetButton } from '../components/JetControls';
import { SceneStoryPanel } from '../components/HighTechStory';
import { FeatureBadge, SqlBlock } from '../components/OracleInfoPanel';
import { RegisterOraclePanel } from '../context/OraclePanelContext';
import { useUser } from '../context/UserContext';
import { api } from '../utils/api';

const CAPABILITY_GROUPS = [
  {
    title: 'High Tech Data Foundation',
    accent: '#437C94',
    icon: Database,
    summary: 'Product lifecycle, manufacturing, supply, quality, support, and customer-commitment records share one governed Oracle foundation.',
    detail: 'Technology portfolios, high-tech products, enterprise buyers, solution orders, allocation routes, product capacity, product signals, and agent actions are modeled together.',
  },
  {
    title: 'Fab and Manufacturing Operations',
    accent: '#C74634',
    icon: Gauge,
    summary: 'The same schema supports semiconductor manufacturing, fab operations, wafer starts, yield improvement, electronics manufacturing, and contract manufacturing views.',
    detail: 'Operators can inspect capacity pressure, launch readiness, product availability, and manufacturing constraints from governed Oracle data.',
  },
  {
    title: 'Product, Supply, and Quality Signals',
    accent: '#4F7D7B',
    icon: TrendingUp,
    summary: 'Component shortages, supplier risk, demand volatility, design-to-manufacturing handoff, field quality, warranty analytics, and support signals become searchable events.',
    detail: 'Vector search and semantic matching help surface product risk, customer-commitment exposure, quality urgency, and support follow-up.',
  },
  {
    title: 'Product Lifecycle Event Graph',
    accent: '#796087',
    icon: Network,
    summary: 'NPI milestones, product portfolios, engineering change orders, bill of materials dependencies, supplier constraints, contract manufacturing partners, quality cases, and customer commitments are connected.',
    detail: 'The graph layer shows how structured, spatial, graph, vector, and operational data combine across High Tech workflows.',
  },
  {
    title: 'Supply Chain Resilience Spatial Layer',
    accent: '#5F7D4F',
    icon: MapPin,
    summary: 'Availability centers, supplier lanes, contract manufacturing sites, channel inventory pools, demand regions, and customer-commitment destinations live as Oracle Spatial data.',
    detail: 'The map experience can reason over proximity, capacity, regional demand, allocation routes, and order-promising decisions.',
  },
  {
    title: 'JSON Relational Duality',
    accent: '#AA643B',
    icon: FileJson,
    summary: 'Customer commitments, solution orders, product availability, quality follow-ups, and support records can be exposed as nested JSON documents without duplicating source rows.',
    detail: 'Duality views support application-style payloads for High Tech commitment records on the same transactional data.',
  },
  {
    title: 'Quality, Warranty, and Support',
    accent: '#A36472',
    icon: ShieldCheck,
    summary: 'Connected-product telemetry, field quality signals, warranty analytics, support operations, and customer commitments remain linked to product and supply work.',
    detail: 'The same foundation can support quality triage, warranty follow-up, support prioritization, and auditable agent recommendations.',
  },
  {
    title: 'ML, Vector, and AI Agents',
    accent: '#4C825C',
    icon: BrainCircuit,
    summary: 'Yield, capacity, demand, product-risk scoring, vector search, semantic matching, and agent workflows run against the same governed Oracle foundation.',
    detail: 'Analytics and AI actions stay anchored to auditable data, PL/SQL tools, and live High Tech application context.',
  },
];

const LOADED_GROUPS_PER_PAGE = 3;

function StatusGrid({ status, projected = false }) {
  const cards = [
    { label: 'High Tech Products', value: status?.products ?? 0, accent: '#437C94' },
    { label: 'Product Signals', value: status?.social_posts ?? 0, accent: '#A36472' },
    { label: 'Customer Commitments', value: status?.orders ?? 0, accent: '#4C825C' },
    { label: 'Product Vectors', value: status?.product_embeddings ?? 0, accent: '#4F7D7B', vector: true },
    { label: 'Signal Vectors', value: status?.post_embeddings ?? 0, accent: '#4F7D7B', vector: true },
    { label: 'Semantic Matches', value: status?.semantic_matches ?? 0, accent: '#796087', vector: true },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg p-3 text-center border border-[var(--color-border)]"
          style={{ boxShadow: `inset 0 2px 0 ${card.accent}`, background: 'var(--color-surface)' }}
        >
          <p className="text-lg font-bold font-mono">{Number(card.value || 0).toLocaleString()}</p>
          <p className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wide mt-1">{card.label}</p>
          {projected ? (
            <p className="text-[9px] text-[var(--color-text-dim)] mt-1">
              {card.vector ? 'Expected after vector rebuild' : 'Expected restore count'}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function numericCount(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null;
}

function bestCount(...values) {
  return values.reduce((best, value) => {
    const count = numericCount(value);
    return count === null ? best : Math.max(best, count);
  }, 0);
}

function firstCount(source, fallback, keys) {
  return bestCount(...keys.map((key) => source?.[key]), ...keys.map((key) => fallback?.[key]));
}

function restoreCountsToStatus(counts, fallbackStatus) {
  if (!counts && !fallbackStatus) return null;
  return {
    products: firstCount(counts, fallbackStatus, ['products']),
    social_posts: firstCount(counts, fallbackStatus, ['social_posts']),
    orders: firstCount(counts, fallbackStatus, ['orders']),
    product_embeddings: bestCount(counts?.product_embeddings, fallbackStatus?.product_embeddings, counts?.products, fallbackStatus?.products),
    post_embeddings: bestCount(counts?.post_embeddings, fallbackStatus?.post_embeddings, counts?.signal_embeddings, fallbackStatus?.signal_embeddings, counts?.social_posts, fallbackStatus?.social_posts),
    semantic_matches: firstCount(counts, fallbackStatus, ['semantic_matches']),
    fulfillment_zones: firstCount(counts, fallbackStatus, ['fulfillment_zones']),
    demand_regions: firstCount(counts, fallbackStatus, ['demand_regions']),
  };
}

function hasCountData(counts) {
  return Boolean(counts) && Object.values(counts).some((value) => numericCount(value) > 0);
}

function restoreMessageForJob(job) {
  const baseMessage = job?.message || 'Restoring bundled demo dataset...';
  const progress = Number(job?.progress ?? 0);
  if (/demo dates|restore window/i.test(baseMessage)) {
    return `${baseMessage} Seeded timestamps are being re-anchored before vector and analytics artifacts are rebuilt.`;
  }
  if (/validating refreshed demo date windows|date validation/i.test(baseMessage)) {
    return `${baseMessage} Restore checks are confirming recent 7-day, 30-day, forecast, commitment, route, signal, and analytics windows.`;
  }
  if (/freshness guard|freshness validation/i.test(baseMessage)) {
    return `${baseMessage} The restore cannot complete unless refreshed timestamps pass the current demo-window guard.`;
  }
  if (/OML|model refresh/i.test(baseMessage)) {
    return `${baseMessage} Date-sensitive in-database ML artifacts are checked after the refreshed data is committed.`;
  }
  if (progress >= 92 || /vector artifacts|embedding|semantic/i.test(baseMessage)) {
    return `${baseMessage} Vector counts are rebuilt with Oracle VECTOR_EMBEDDING and appear after this final step finishes.`;
  }
  return baseMessage;
}

export default function DataModel() {
  const { currentUser } = useUser();
  const canManageDataset = String(currentUser?.ROLE || '').toLowerCase() === 'admin';
  const [status, setStatus] = useState(null);
  const [nativeJsonReadiness, setNativeJsonReadiness] = useState(null);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoDone, setDemoDone] = useState(false);
  const [demoProgress, setDemoProgress] = useState(0);
  const [demoMessage, setDemoMessage] = useState('');
  const [restoreCounts, setRestoreCounts] = useState(null);
  const [loadedGroupPage, setLoadedGroupPage] = useState(0);
  const [semanticRetryCount, setSemanticRetryCount] = useState(0);
  const loadedGroupPageCount = Math.ceil(CAPABILITY_GROUPS.length / LOADED_GROUPS_PER_PAGE);
  const loadedGroupStart = loadedGroupPage * LOADED_GROUPS_PER_PAGE;
  const visibleLoadedGroups = CAPABILITY_GROUPS.slice(loadedGroupStart, loadedGroupStart + LOADED_GROUPS_PER_PAGE);
  const loadedGroupEnd = Math.min(loadedGroupStart + visibleLoadedGroups.length, CAPABILITY_GROUPS.length);
  const canShowPreviousLoadedGroups = loadedGroupPage > 0;
  const canShowNextLoadedGroups = loadedGroupPage < loadedGroupPageCount - 1;

  const showPreviousLoadedGroups = () => {
    setLoadedGroupPage((page) => Math.max(0, page - 1));
  };

  const showNextLoadedGroups = () => {
    setLoadedGroupPage((page) => Math.min(loadedGroupPageCount - 1, page + 1));
  };

  const refreshStatus = useCallback(async ({ keepExistingOnError = true } = {}) => {
    try {
      const data = await api.demo.status();
      setStatus(data);
      return data;
    } catch {
      if (!keepExistingOnError) setStatus(null);
      return null;
    }
  }, [currentUser?.USERNAME]);

  const refreshNativeJsonReadiness = useCallback(async () => {
    try {
      const readiness = await api.demo.nativeJsonReadiness();
      setNativeJsonReadiness(readiness);
      return readiness;
    } catch (error) {
      const unavailable = {
        status: 'UNAVAILABLE',
        ready: false,
        message: error?.message || 'Oracle native JSON readiness is unavailable.',
      };
      setNativeJsonReadiness(unavailable);
      return unavailable;
    }
  }, [currentUser?.USERNAME]);

  useEffect(() => {
    let cancelled = false;
    refreshStatus({ keepExistingOnError: false }).then((data) => {
      if (cancelled && data) return;
    });
    return () => {
      cancelled = true;
    };
  }, [refreshStatus]);

  useEffect(() => {
    refreshNativeJsonReadiness();
  }, [refreshNativeJsonReadiness]);

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      refreshStatus({ keepExistingOnError: true });
    }, 10000);
    const handleFocus = () => refreshStatus({ keepExistingOnError: true });
    const handleFootprintRefresh = () => refreshStatus({ keepExistingOnError: true });
    window.addEventListener('focus', handleFocus);
    window.addEventListener('hightech-live-footprint-refresh', handleFootprintRefresh);
    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('hightech-live-footprint-refresh', handleFootprintRefresh);
    };
  }, [refreshStatus]);

  useEffect(() => {
    const productVectors = Number(status?.product_embeddings || 0);
    const signalVectors = Number(status?.post_embeddings ?? status?.signal_embeddings ?? 0);
    const semanticMatches = Number(status?.semantic_matches || 0);

    if (semanticMatches > 0 && semanticRetryCount !== 0) {
      setSemanticRetryCount(0);
      return undefined;
    }

    if (!demoRunning && productVectors > 0 && signalVectors > 0 && semanticMatches === 0 && semanticRetryCount < 5) {
      const timer = window.setTimeout(() => {
        setSemanticRetryCount((count) => count + 1);
        refreshStatus({ keepExistingOnError: true });
      }, 1200);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [
    demoRunning,
    refreshStatus,
    semanticRetryCount,
    status?.post_embeddings,
    status?.product_embeddings,
    status?.semantic_matches,
    status?.signal_embeddings,
  ]);

  const displayStatus = useMemo(() => {
    if (demoRunning && hasCountData(restoreCounts)) {
      return restoreCountsToStatus(restoreCounts, status);
    }
    return restoreCountsToStatus(null, status);
  }, [demoRunning, restoreCounts, status]);

  const showingProjectedCounts = demoRunning && hasCountData(restoreCounts);

  const totalArtifacts = useMemo(() => {
    if (!displayStatus) return null;
    return (
      (displayStatus.products || 0) +
      (displayStatus.social_posts || 0) +
      (displayStatus.orders || 0) +
      (displayStatus.product_embeddings || 0) +
      (displayStatus.post_embeddings || 0) +
      (displayStatus.semantic_matches || 0)
    );
  }, [displayStatus]);

  const hasData = useMemo(() => {
    if (!status) return false;
    return Object.values(status).some((value) => typeof value === 'number' && value > 0);
  }, [status]);

  const startDemoRefresh = useCallback(async () => {
    if (demoRunning) return;
    if (!canManageDataset) {
      setDemoDone(false);
      setDemoMessage('Switch to the Admin demo user before restoring demo data.');
      return;
    }

    setDemoRunning(true);
    setDemoDone(false);
    setDemoProgress(0);
    setRestoreCounts(null);
    setDemoMessage(hasData ? 'Restoring and verifying bundled demo data...' : 'Loading bundled demo data...');

    try {
      const startPayload = await api.import.restoreDemo({ source: 'data-model-load-demo' });
      if (!startPayload?.jobId) {
        throw new Error(startPayload?.error || startPayload?.message || 'Demo restore could not be started.');
      }

      setDemoProgress(Number(startPayload.progress || 5));
      if (startPayload.counts) setRestoreCounts(startPayload.counts);
      setDemoMessage(startPayload.message || 'Demo restore started.');

      let finalJob = null;
      for (let attempt = 0; attempt < 90; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 500 : 1500));
        const job = await api.import.status(startPayload.jobId);

        const progress = Math.max(0, Math.min(100, Number(job.progress ?? 0)));
        setDemoProgress(progress);
        if (job.counts) setRestoreCounts(job.counts);
        if (attempt % 3 === 0 || progress >= 90) {
          await refreshStatus({ keepExistingOnError: true });
        }
        setDemoMessage(restoreMessageForJob(job));

        const jobStatus = String(job.status || '').toLowerCase();
        if (jobStatus === 'completed' || jobStatus === 'complete' || jobStatus === 'success' || jobStatus === 'failed' || jobStatus === 'error') {
          finalJob = job;
          break;
        }
      }

      if (!finalJob) {
        throw new Error('Demo restore timed out before completion.');
      }
      if (!['completed', 'complete', 'success'].includes(String(finalJob.status || '').toLowerCase())) {
        throw new Error(finalJob.message || finalJob.errors?.[0] || 'Demo restore failed.');
      }
      if (finalJob.summary?.demoFreshnessGuard?.fresh !== true) {
        throw new Error('Demo restore completed, but the freshness guard did not confirm current demo dates.');
      }

      const nextStatus = await refreshStatus({ keepExistingOnError: false });
      if (!nextStatus || !Object.values(nextStatus).some((value) => typeof value === 'number' && value > 0)) {
        throw new Error('Demo restore completed, but live counts still read as zero.');
      }
      const jsonReadiness = await refreshNativeJsonReadiness();
      if (jsonReadiness?.ready !== true) {
        throw new Error('Demo restore completed, but Oracle native JSON readiness is not active.');
      }

      setRestoreCounts(null);
      setDemoDone(true);
      setDemoProgress(100);
      setDemoMessage(`Demo dataset restored for ${finalJob.summary.demoFreshnessGuard.restoreAnchorDate || 'the current window'}, dates re-anchored, and live counts refreshed.`);
    } catch (err) {
      setDemoDone(false);
      setRestoreCounts(null);
      setDemoMessage(err?.message || 'Demo restore failed.');
      await refreshStatus({ keepExistingOnError: true });
    } finally {
      setDemoRunning(false);
    }
  }, [canManageDataset, demoRunning, hasData, refreshNativeJsonReadiness, refreshStatus]);

  return (
    <div className="space-y-6 fade-in max-w-6xl mx-auto">
      <RegisterOraclePanel title="Data Foundation">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider mb-2">Demo Readiness</p>
            <p className="text-[var(--color-text)] leading-relaxed">
              Start here to load or restore the Seer Tech Product Intelligence dataset before exploring semiconductor manufacturing, fab operations, product lifecycle management, supply chain resilience, customer commitments, warranty analytics, and service and support operations. The action prepares the governed Oracle AI Database 26ai foundation used by the command center, product signals, lifecycle graph, resilience map, analytics, Ask Data, and AI agents.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider mb-2">Why It Matters</p>
            <p className="text-[var(--color-text)] leading-relaxed">
              The same foundation supports high-tech product search, product and quality signals, lifecycle event analysis, spatial allocation, document projections, demand forecasting, field quality and warranty follow-up, and agent actions without splitting the story across separate data stores.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FeatureBadge label="Relational Core" color="blue" />
            <FeatureBadge label="JSON Duality Views" color="orange" />
            <FeatureBadge label="Property Graph" color="purple" />
            <FeatureBadge label="Oracle Spatial" color="green" />
            <FeatureBadge label="Vector Search" color="cyan" />
            <FeatureBadge label="In-DB ML" color="red" />
            <FeatureBadge label="Agent Audit Trail" color="pink" />
          </div>
          <SqlBlock
            code={`-- Demo data prepared by this page
-- relational tables        -> technology portfolios, products, enterprise buyers, commitments, order items, product capacity
-- manufacturing records    -> semiconductor manufacturing, fab operations, wafer starts, yield improvement, electronics manufacturing
-- lifecycle records        -> product lifecycle management, NPI programs, design-to-manufacturing handoff, ECOs, bill of materials
-- supply records           -> supplier risk, component shortages, contract manufacturing, channel inventory, allocation routes
-- quality records          -> connected-product signals, field quality, warranty analytics, support operations
-- json / duality views     -> customer commitment, product availability, support, and quality documents
-- property graph           -> product lifecycle events, suppliers, BOM dependencies, launch blockers, quality cases, commitments
-- spatial geometry         -> availability centers, demand regions, allocation routes, customer commitment destinations
-- vector embeddings        -> product embeddings, signal embeddings, semantic matches
-- in-database analytics    -> yield, capacity, demand, warranty, and commitment risk scoring
-- agent audit trail        -> agent_actions, event_stream`}
          />
        </div>
      </RegisterOraclePanel>

      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Database size={24} className="text-[var(--color-accent)]" />
          Data Foundation
        </h2>
        <p className="text-sm text-[var(--color-text-dim)] mt-1">
          Prepare the governed Seer Tech dataset before you move into the High Tech industry scenarios.
        </p>
      </div>

      <SceneStoryPanel scene="datamodel" />

      <div className="glass-card p-5" style={{ borderLeft: '3px solid var(--color-accent)' }}>
        <p className="text-base text-[var(--color-text)] leading-7">
          Start here to load the Seer Tech Product Intelligence demo dataset. This action prepares product portfolios, semiconductor manufacturing and fab operations context, wafer-start and yield-improvement signals, product lifecycle management records, design-to-manufacturing handoff evidence, electronics manufacturing and contract manufacturing capacity, engineering change orders, bill of materials dependencies, component shortage and supplier-risk signals, demand volatility, channel inventory, customer commitments, order-promising dates, connected-product signals, field quality, warranty analytics, support operations, spatial allocation data, vector embeddings, ML outputs, and agent audit history.
        </p>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Package size={18} className="text-[var(--color-accent)]" />
              Prepare the Dataset
            </h3>
            <p className="text-xs text-[var(--color-text-dim)] mt-1 max-w-2xl">
              Load or restore the bundled High Tech dataset, then verify the live record counts that power every use case in the demo.
            </p>
          </div>
          <JetButton
            label={demoRunning ? 'Loading Demo Data...' : hasData ? 'Restore Demo Data' : 'Load Demo Data'}
            iconClass={demoRunning
              ? 'oj-fwk-icon oj-fwk-icon-load'
              : hasData
                ? 'oj-fwk-icon oj-fwk-icon-refresh'
                : 'oj-fwk-icon oj-fwk-icon-folderhierarchy'}
            chroming="callToAction"
            className="welcome-jet-button welcome-start-demo-button"
            onAction={startDemoRefresh}
            disabled={demoRunning || !canManageDataset}
          />
        </div>
        {!canManageDataset ? (
          <p className="text-xs tone-sienna mb-4">Switch to the Admin demo user to restore the bundled dataset.</p>
        ) : null}
        <p className="text-xs text-[var(--color-text-dim)] mb-4">
          {totalArtifacts == null ? 'Current runtime counts from the live demo stack.' : `${totalArtifacts.toLocaleString()} tracked records across the major demo layers.`}
        </p>
        {(demoMessage || demoRunning || demoDone) && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-[var(--color-text-dim)]">{demoMessage || 'Waiting for demo restore...'}</span>
              <span className="text-xs font-mono font-semibold">{demoProgress}%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--color-border)]/30 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${demoProgress}%`,
                  background: demoDone
                    ? '#4C825C'
                    : 'linear-gradient(135deg, #C74634, #AA643B)',
                }}
              />
            </div>
            {showingProjectedCounts ? (
              <div className="text-[11px] text-[var(--color-text-dim)]">
                Showing the best available live and restore counts while Oracle rebuilds vector artifacts. Product vectors, signal vectors, and semantic matches refresh during the VECTOR_EMBEDDING step and remain visible as soon as the API reports them.
              </div>
            ) : null}
            {demoDone ? (
              <div className="flex items-center gap-1.5 text-[11px] tone-pine">
                <CheckCircle2 size={12} />
                Bundled demo restore finished and live counts were refreshed.
              </div>
            ) : null}
          </div>
        )}
        <StatusGrid status={displayStatus} projected={showingProjectedCounts} />
        <div
          className="mt-4 rounded-lg border border-[var(--color-border)] p-3"
          data-testid="native-json-readiness"
          style={{ background: 'var(--color-surface)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide">
                Oracle Native JSON
              </p>
              <p className="text-[11px] text-[var(--color-text-dim)] mt-1">
                {nativeJsonReadiness?.message || 'Checking native JSON metadata, documents, and operators...'}
              </p>
            </div>
            <span
              className="text-[10px] font-mono font-bold"
              style={{
                color: nativeJsonReadiness?.ready
                  ? '#4C825C'
                  : nativeJsonReadiness?.status === 'RESTRICTED'
                    ? '#AA643B'
                    : '#C74634',
              }}
            >
              {nativeJsonReadiness?.status || 'CHECKING'}
            </span>
          </div>
          {nativeJsonReadiness?.counts ? (
            <p className="text-[10px] text-[var(--color-text-dim)] mt-2">
              {Number(nativeJsonReadiness.counts.productAttributes || 0).toLocaleString()} product documents ·{' '}
              {Number(nativeJsonReadiness.counts.eventStream || 0).toLocaleString()} JSON events ·{' '}
              {(nativeJsonReadiness.operators || []).join(' · ')}
            </p>
          ) : null}
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Boxes size={18} className="text-[var(--color-accent)]" />
            What Gets Loaded
          </h3>
          <div className="flex items-center gap-2" aria-label="Loaded data carousel controls">
            <button
              type="button"
              aria-label="Show previous loaded data groups"
              onClick={showPreviousLoadedGroups}
              disabled={!canShowPreviousLoadedGroups}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Show next loaded data groups"
              onClick={showNextLoadedGroups}
              disabled={!canShowNextLoadedGroups}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
        <p className="text-sm text-[var(--color-text-dim)] leading-6 mt-3">
          The restore prepares semiconductor manufacturing, fab operations, product lifecycle, supplier, electronics manufacturing, contract manufacturing, customer commitment, quality, warranty, support, spatial, graph, vector, analytical, and agent data domains that the rest of the demo uses.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--color-text-dim)]">
            Showing {loadedGroupStart + 1}-{loadedGroupEnd} of {CAPABILITY_GROUPS.length}
          </p>
          <div className="flex items-center gap-1.5" aria-label="Loaded data groups">
            {Array.from({ length: loadedGroupPageCount }).map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Show loaded data group ${index + 1}`}
                aria-current={loadedGroupPage === index ? 'true' : undefined}
                onClick={() => setLoadedGroupPage(index)}
                className="h-2.5 rounded-full transition-all"
                style={{
                  width: loadedGroupPage === index ? '22px' : '10px',
                  background: loadedGroupPage === index ? '#AA643B' : 'var(--color-border)',
                }}
              />
            ))}
          </div>
        </div>
        <div
          className="grid gap-4 mt-4 lg:grid-cols-3"
          aria-live="polite"
          aria-label={`Loaded data groups ${loadedGroupStart + 1} through ${loadedGroupEnd}`}
        >
          {visibleLoadedGroups.map((group) => {
            const Icon = group.icon;
            return (
              <div
                key={group.title}
                className="border p-4"
                style={{
                  borderColor: 'var(--color-border)',
                  borderRadius: '6px',
                  background: 'var(--color-surface)',
                  boxShadow: `inset 0 3px 0 ${group.accent}`,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 flex items-center justify-center rounded" style={{ background: `${group.accent}18` }}>
                    <Icon size={16} style={{ color: group.accent }} />
                  </div>
                  <div className="text-sm font-semibold">{group.title}</div>
                </div>
                <p className="text-sm text-[var(--color-text)] leading-6">{group.summary}</p>
                <p className="text-xs text-[var(--color-text-dim)] leading-5 mt-2">{group.detail}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
