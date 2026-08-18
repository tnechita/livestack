import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Network, Users, Star, Search, X, TrendingUp, MapPin, Award, Zap, ChevronRight, Play, Loader2, Code2, Table2, Clock, ArrowRight, RotateCcw } from 'lucide-react';
import * as d3 from 'd3';
import { api, apiFetch } from '../utils/api';
import { useData } from '../hooks/useData';
import { useUser } from '../context/UserContext';
import { formatNumber, getPlatformColor } from '../utils/format';
import { FeatureBadge, SqlBlock, DiagramBox } from '../components/OracleInfoPanel';
import { RegisterOraclePanel } from '../context/OraclePanelContext';
import { SceneStoryPanel } from '../components/HighTechStory';
import HelpTip from '../components/HelpTip';

// ── Connection type colors ──────────────────────────────────────────────────
const EDGE_CATEGORY_ORDER = [
  'Demand & Channel Signals',
  'Customer Commitments',
  'Channel & Order Promising',
  'Supply Chain Resilience',
  'Fab & Manufacturing Flow',
  'Product Data & Engineering Change Control',
  'Quality & Service Intelligence',
  'Product Lifecycle Risk',
];

const CONNECTION_COLORS = {
  advocates_for: '#C74634',
  mentions_product: '#AA643B',
  influences_buyer: '#437C94',
  blocks_launch: '#C74634',
  depends_on_architecture: '#796087',
  amplifies_signal: '#4F7D7B',
  partners_with: '#4C825C',
  routes_to_capacity_center: '#AA643B',
  mitigates_blocker: '#4C825C',
  supplied_by: '#4C825C',
  constrained_by: '#C74634',
  manufactured_at: '#AA643B',
  tested_by: '#437C94',
  requires_component: '#796087',
  changes_bom: '#796087',
  delays_npi: '#C74634',
  impacts_yield: '#C74634',
  blocks_commitment: '#C74634',
  creates_order_risk: '#AA643B',
  correlates_with_field_quality: '#437C94',
  triggers_warranty_exposure: '#C74634',
  mitigated_by_eco: '#4C825C',
  reallocated_to_channel: '#AA643B',
  requires_osat_capacity: '#AA643B',
  feeds_order_promise: '#437C94',
  consumes_wafer_starts: '#AA643B',
  qualified_by_test_program: '#437C94',
  governed_by_plm_record: '#796087',
  releases_firmware_to: '#4F7D7B',
  routed_through_logistics: '#AA643B',
  certified_by: '#437C94',
  backed_by_capacity_reservation: '#4C825C',
  escalates_service_case: '#C74634',
  updates_allocation_plan: '#4C825C',
  shares_design_ip: '#796087',
  monitored_by_telemetry: '#4F7D7B',
  reviewed_by_crb: '#796087',
  drives_demand_forecast: '#4F7D7B',
  splits_channel_supply: '#AA643B',
  passes_quality_gate: '#437C94',
  advances_lifecycle_stage: '#4C825C',
  follows:      '#312D2A',
  collaborates: '#437C94',
  reshared:     '#AA643B',
  inspired_by:  '#796087',
  tagged:       '#4C825C',
  co_creator:   '#C74634',
  mentions:     '#4F7D7B',
};

function edgeLabel(type) {
  return String(type || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeEdgeMetadata(item = {}) {
  const edgeType = item.edgeType || item.edge_type || item.RELATIONSHIP_TYPE || item.relationship_type;
  return {
    edgeType,
    displayName: item.displayName || item.display_name || edgeLabel(edgeType),
    category: item.category || item.CATEGORY || 'Uncategorized',
    description: item.description || item.DESCRIPTION || '',
    color: item.color || item.COLOR || CONNECTION_COLORS[edgeType] || '#7A736E',
  };
}

function getEdgeLegendGroups(edgeMetadata = []) {
  const groups = new Map();
  (edgeMetadata || []).map(normalizeEdgeMetadata).forEach((item) => {
    if (!groups.has(item.category)) groups.set(item.category, []);
    groups.get(item.category).push(item);
  });
  return [...groups.entries()]
    .sort(([left], [right]) => {
      const leftRank = EDGE_CATEGORY_ORDER.indexOf(left);
      const rightRank = EDGE_CATEGORY_ORDER.indexOf(right);
      return (leftRank === -1 ? EDGE_CATEGORY_ORDER.length : leftRank)
        - (rightRank === -1 ? EDGE_CATEGORY_ORDER.length : rightRank);
    })
    .map(([category, items]) => ({
      category,
      items: items.sort((a, b) => a.displayName.localeCompare(b.displayName)),
    }));
}

function EdgeLegend({ edgeMetadata = [] }) {
  const groups = getEdgeLegendGroups(edgeMetadata);
  if (!groups.length) return null;
  return (
    <div className="glass-card p-3 graph-edge-legend">
      <p className="text-[10px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider mb-2">Edge Legend</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {groups.map((group) => (
          <div key={group.category}>
            <p className="text-[10px] font-bold text-[var(--color-text)] mb-1">{group.category}</p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <div key={item.edgeType} className="flex items-start gap-2 text-[10px] text-[var(--color-text-dim)]">
                  <span className="w-2.5 h-2.5 rounded-sm mt-0.5 flex-shrink-0" style={{ background: item.color }} />
                  <span><strong className="text-[var(--color-text)]">{item.displayName}</strong>{item.description ? ` - ${item.description}` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PathwayFindingsPanel({ findings = [], depth }) {
  if (!findings.length) return null;
  return (
    <section className="glass-card p-4 graph-pathway-findings">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-bold">Key Pathway Findings</h3>
          <p className="text-xs text-[var(--color-text-dim)]">Product lifecycle evidence from the current {depth}-hop Product Signal Graph: wafer lots, outsourced semiconductor assembly and test, engineering change orders, product lifecycle records, order promises, warranty cohorts, and capacity reservations.</p>
        </div>
        <span className="text-[10px] px-2 py-1 rounded font-mono surface-sienna-soft text-[var(--color-text)]">
          {findings.length} findings
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {findings.slice(0, 4).map((finding) => {
          const risk = Number(finding.riskScore ?? finding.risk_score ?? 0);
          const tone = risk >= 90 ? '#C74634' : risk >= 75 ? '#AA643B' : '#437C94';
          return (
            <article key={finding.findingId || finding.finding_id || finding.title} className="rounded-lg p-3" style={{ background: `${tone}0E`, border: `1px solid ${tone}30` }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full" style={{ background: tone }} />
                <h4 className="text-xs font-bold">{finding.title}</h4>
                {risk > 0 && <span className="ml-auto text-xs font-mono font-bold" style={{ color: tone }}>Risk {risk} / 100</span>}
              </div>
              <p className="text-[11px] text-[var(--color-text-dim)] leading-relaxed">{finding.description}</p>
              {(finding.supportingEdgeTypes?.length || finding.supporting_edge_types) ? (
                <p className="text-[10px] text-[var(--color-text-dim)] mt-1">
                  Pathways: {(finding.supportingEdgeTypes || String(finding.supporting_edge_types).split(',')).slice(0, 4).map(edgeLabel).join(' · ')}
                </p>
              ) : null}
              {finding.recommendedAction || finding.recommended_action ? (
                <p className="text-[11px] text-[var(--color-text)] mt-2">{finding.recommendedAction || finding.recommended_action}</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function GraphImpactSummary({ network, depth }) {
  if (!network) return null;
  const hopCounts = network.stats?.hopCounts || {};
  const hop0 = hopCounts.hop0 || 0;
  const hop1 = hopCounts.hop1 || 0;
  const hop2 = hopCounts.hop2 || 0;
  const deepHops = Object.entries(hopCounts).reduce((total, [key, value]) => {
    const hop = Number(String(key).replace('hop', ''));
    return hop >= 3 ? total + Number(value || 0) : total;
  }, 0);
  const caseCount = network.stats?.caseCount || network.cases?.length || 0;
  const edgeCount = network.stats?.edgeCount || network.edges?.length || 0;

  const cards = [
    { label: 'Hop Coverage', value: `${hop0 + hop1 + hop2 + deepHops}`, detail: `1-hop ${hop1} · 2-hop ${hop2} · 3+ hop ${deepHops}` },
    { label: 'Signal-to-commitment', value: caseCount, detail: 'Cases tied to customer commitments and order promising' },
    { label: 'Lifecycle Paths', value: edgeCount, detail: 'Bill of materials, engineering change, wafer lot, outsourced test, product lifecycle, warranty, channel, and fab relationships' },
    { label: 'Graph Depth', value: `${depth} hop${depth > 1 ? 's' : ''}`, detail: 'Increase depth to reveal hidden handoffs' },
  ];

  return (
    <section className="glass-card p-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)' }}>
            <p className="text-[10px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">{card.label}</p>
            <p className="text-lg font-bold mt-1">{card.value}</p>
            <p className="text-[10px] text-[var(--color-text-dim)] leading-relaxed mt-0.5">{card.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Platform colors (Redwood) ───────────────────────────────────────────────
const PLATFORM_COLORS = {
  instagram: '#A36472',
  tiktok:    '#4F7D7B',
  youtube:   '#C74634',
  twitter:   '#437C94',
  twitch:    '#796087',
};

function platformColor(p) {
  return PLATFORM_COLORS[(p || '').toLowerCase()] || '#C74634';
}

const GRAPH_CANVAS_BACKGROUND = 'var(--color-surface)';
const GRAPH_NODE_STROKE = 'rgba(49,45,42,0.24)';
const GRAPH_NODE_HOVER_STROKE = '#312D2A';
const GRAPH_CENTER_STROKE = '#FFFFFF';
const GRAPH_LABEL_COLOR = '#161513';
const GRAPH_LABEL_HALO = '#FFFFFF';
const GRAPH_LINK_MIN_OPACITY = 0.2;
const GRAPH_LINK_MAX_OPACITY = 0.52;

// ── ForceGraph ───────────────────────────────────────────────────────────────
function ForceGraph({ data, depth, height = 520, onNodeClick }) {
  const svgRef       = useRef(null);
  const containerRef = useRef(null);
  const tooltipRef   = useRef(null);
  const onClickRef   = useRef(onNodeClick);
  const [measuredWidth, setMeasuredWidth] = useState(800);

  // Keep stable reference to callback so D3 handlers don't go stale
  useEffect(() => { onClickRef.current = onNodeClick; }, [onNodeClick]);

  // Measure actual container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        if (w > 0) setMeasuredWidth(w);
      }
    });
    ro.observe(el);
    // Set initial width immediately
    const initW = el.getBoundingClientRect().width;
    if (initW > 0) setMeasuredWidth(Math.round(initW));
    return () => ro.disconnect();
  }, []);

  const width = measuredWidth;

  useEffect(() => {
    if (!data || !data.nodes?.length || !width) return;

    // ── Clean up previous render ──────────────────────────────────────────
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    const tip = d3.select(tooltipRef.current);
    tip.style('opacity', 0);

    // ── Build node/link data ──────────────────────────────────────────────
    // Count links per node to scale vertex size by connectivity
    const linkCounts = new Map();
    data.edges.forEach(e => {
      linkCounts.set(e.source, (linkCounts.get(e.source) || 0) + 1);
      linkCounts.set(e.target, (linkCounts.get(e.target) || 0) + 1);
    });
    const maxLinks = Math.max(1, ...linkCounts.values());

    const nodeMap = new Map();
    const nodes = data.nodes.map(d => {
      const lc = linkCounts.get(d.INFLUENCER_ID) || 0;
      const n = {
        ...d,
        id:         d.INFLUENCER_ID,
        linkCount:  lc,
        // Scale radius by number of connections: more links → larger vertex
        radius: d.type === 'center'
          ? Math.max(22, 18 + (lc / maxLinks) * 14)
          : Math.max(6, 6 + (lc / maxLinks) * 16),
        hopOpacity: d.type === 'center' ? 1.0
          : d.hopLevel === 1 ? 0.96
          : d.hopLevel === 2 ? 0.86
          : 0.72,
      };
      nodeMap.set(n.id, n);
      return n;
    });

    const links = data.edges.map(d => ({
      ...d,
      source:   d.source,
      target:   d.target,
      color:    CONNECTION_COLORS[d.type] || '#312D2A',
      strength: d.strength || 0.5,
    }));

    // ── SVG scaffolding ───────────────────────────────────────────────────
    const g = svg.append('g');

    const zoomBehavior = d3.zoom().scaleExtent([0.2, 5]).on('zoom', (event) => {
      g.attr('transform', event.transform);
    });
    svg.call(zoomBehavior);

    // ── Simulation ────────────────────────────────────────────────────────
    const chargeStr = depth === 1 ? -280 : depth === 2 ? -200 : depth === 3 ? -140 : depth === 4 ? -100 : -70;
    const linkDist  = depth === 1 ?  110 : depth === 2 ?   90 : depth === 3 ?  70 : depth === 4 ?   55 :  45;

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(linkDist).strength(d => d.strength * 0.4))
      .force('charge', d3.forceManyBody().strength(chargeStr))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => d.radius + 5));

    // ── Arrowhead marker definitions (one per connection color) ────────────
    const defs = svg.append('defs');
    const usedColors = [...new Set(links.map(d => d.color))];
    usedColors.forEach(color => {
      defs.append('marker')
        .attr('id', `arrow-${color.replace('#', '')}`)
        .attr('viewBox', '0 -4 8 8')
        .attr('refX', 8)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
          .attr('d', 'M0,-3.5L8,0L0,3.5')
          .attr('fill', color)
          .attr('opacity', 0.72);
    });

    // ── Edge visible lines ────────────────────────────────────────────────
    const link = g.selectAll('.link')
      .data(links).enter().append('line')
      .attr('class', 'link')
      .attr('stroke', d => d.color)
      .attr('stroke-opacity', d => Math.max(GRAPH_LINK_MIN_OPACITY, Math.min(GRAPH_LINK_MAX_OPACITY, d.strength * 0.5)))
      .attr('stroke-width', d => Math.max(1, d.strength * 1.9))
      .attr('marker-end', d => `url(#arrow-${d.color.replace('#', '')})`);

    // ── Edge invisible hit-area lines (for hover) ─────────────────────────
    const linkHit = g.selectAll('.link-hit')
      .data(links).enter().append('line')
      .attr('class', 'link-hit')
      .attr('stroke', 'transparent')
      .attr('stroke-width', 14)
      .style('cursor', 'default')
      .on('mouseover', function(event, d) {
        const typeLabel = (d.type || 'unknown').replace(/_/g, ' ');
        const color     = CONNECTION_COLORS[d.type] || '#6F757E';
        tip.html(`
          <div style="font-size:11px;line-height:1.65;color:#161513">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color}"></span>
              <strong style="text-transform:capitalize;color:#161513">${typeLabel}</strong>
            </div>
            <div>Strength: <strong>${Math.round((d.strength || 0) * 100)}%</strong></div>
            <div>Signals: <strong>${formatNumber(d.interactions || 0)}</strong></div>
            <div style="color:#6F757E;font-size:10px;margin-top:2px">Hop ${d.hopLevel}</div>
          </div>
        `)
        .style('opacity', 1)
        .style('left', (event.pageX + 14) + 'px')
        .style('top',  (event.pageY - 10) + 'px');
      })
      .on('mousemove', function(event) {
        tip.style('left', (event.pageX + 14) + 'px').style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', () => tip.style('opacity', 0));

    // ── Node groups ───────────────────────────────────────────────────────
    const node = g.selectAll('.node')
      .data(nodes).enter().append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag',  (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end',   (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    // Center node orbit ring
    node.filter(d => d.type === 'center').append('circle')
      .attr('r', d => d.radius + 8)
      .attr('fill', 'none')
      .attr('stroke', '#C74634')
      .attr('stroke-width', 1.25)
      .attr('stroke-dasharray', '5 4')
      .attr('opacity', 0.38);

    // Main circle
    node.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => d.type === 'center' ? '#C74634' : platformColor(d.PLATFORM))
      .attr('stroke', d => d.type === 'center' ? GRAPH_CENTER_STROKE : GRAPH_NODE_STROKE)
      .attr('stroke-width', d => d.type === 'center' ? 2.5 : 1.4)
      .attr('opacity', d => d.hopOpacity);

    // Verified badge (✓)
    const isVerified = d => d.IS_VERIFIED === 'Y' || d.IS_VERIFIED === 1 || d.IS_VERIFIED === true;
    node.filter(d => isVerified(d)).append('text')
      .text('✓')
      .attr('dy', d => -d.radius + 4)
      .attr('dx', d => d.radius - 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#4C825C')
      .attr('font-size', '9px');

    // Handle label
    node.append('text')
      .text(d => (d.HANDLE || '').replace('@', ''))
      .attr('dy', d => d.radius + 13)
      .attr('text-anchor', 'middle')
      .attr('fill', GRAPH_LABEL_COLOR)
      .attr('stroke', GRAPH_LABEL_HALO)
      .attr('stroke-width', d => d.type === 'center' ? 3.5 : 3)
      .attr('stroke-linejoin', 'round')
      .attr('paint-order', 'stroke fill')
      .attr('font-size', d => d.type === 'center' ? '12px' : '9.5px')
      .attr('font-weight', d => d.type === 'center' ? 700 : 600)
      .attr('font-family', '"Oracle Sans", "Oracle Sans VF", sans-serif')
      .attr('pointer-events', 'none');

    // ── Node hover tooltip ────────────────────────────────────────────────
    node
      .on('mouseover', function(event, d) {
        const pc    = platformColor(d.PLATFORM);
        const score = typeof d.INFLUENCE_SCORE === 'number'
          ? d.INFLUENCE_SCORE.toFixed(1)
          : (d.INFLUENCE_SCORE || '-');
        const eng   = typeof d.ENGAGEMENT_RATE === 'number'
          ? (d.ENGAGEMENT_RATE * 100).toFixed(2) + '%'
          : (d.ENGAGEMENT_RATE || '-');
        tip.html(`
          <div style="font-size:11px;min-width:180px;line-height:1.7;color:#161513">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;border-bottom:1px solid rgba(49,45,42,0.12);padding-bottom:6px">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${pc}"></span>
              <strong style="color:#161513">${d.HANDLE || '?'}</strong>
              ${isVerified(d) ? '<span style="color:#4C825C;font-size:10px;font-weight:600">priority</span>' : ''}
            </div>
            <div style="display:grid;grid-template-columns:auto auto;gap:2px 12px">
              <span style="color:#6F757E">Domain</span><span style="text-transform:capitalize">${d.PLATFORM || '-'}</span>
              <span style="color:#6F757E">Lifecycle role</span><span>${d.NICHE || '-'}</span>
              <span style="color:#6F757E">City</span><span>${d.CITY || '-'}</span>
              <span style="color:#6F757E">Signal volume</span><span>${formatNumber(d.PATHWAY_VOLUME || d.FOLLOWER_COUNT || 0)}</span>
              <span style="color:#6F757E">Links</span><span style="color:#161513;font-weight:600">${d.linkCount || 0}</span>
              <span style="color:#6F757E">Risk score</span><span>${d.RISK_SCORE || score}</span>
              <span style="color:#6F757E">Confidence</span><span>${eng}</span>
              <span style="color:#6F757E">Hop</span><span>${d.type === 'center' ? '0 (center)' : d.hopLevel}</span>
            </div>
            <div style="color:#C74634;font-size:10px;font-weight:600;margin-top:6px;text-align:center">Click to explore signal path</div>
          </div>
        `)
        .style('opacity', 1)
        .style('left', (event.pageX + 14) + 'px')
        .style('top',  (event.pageY - 10) + 'px');

        d3.select(this).select('circle:last-of-type')
          .attr('stroke', d.type === 'center' ? GRAPH_CENTER_STROKE : GRAPH_NODE_HOVER_STROKE)
          .attr('stroke-width', d.type === 'center' ? 2.5 : 2);
      })
      .on('mousemove', function(event) {
        tip.style('left', (event.pageX + 14) + 'px').style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function(event, d) {
        tip.style('opacity', 0);
        d3.select(this).select('circle:last-of-type')
          .attr('stroke', d.type === 'center' ? GRAPH_CENTER_STROKE : GRAPH_NODE_STROKE)
          .attr('stroke-width', d.type === 'center' ? 2.5 : 1.4);
      })
      .on('click', function(event, d) {
        event.stopPropagation();
        tip.style('opacity', 0);
        onClickRef.current?.(d);
      });

    // ── Tick ──────────────────────────────────────────────────────────────
    simulation.on('tick', () => {
      // Shorten edge at target end so arrow sits at the node boundary
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => {
          const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          return d.target.x - (dx / dist) * (d.target.radius + 2);
        })
        .attr('y2', d => {
          const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          return d.target.y - (dy / dist) * (d.target.radius + 2);
        });
      linkHit.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
              .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // ── Auto-center & fit graph after simulation settles ────────────────
    simulation.on('end', () => {
      // Compute bounding box of all nodes
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach(d => {
        const r = d.radius + 15; // include label space
        if (d.x - r < minX) minX = d.x - r;
        if (d.y - r < minY) minY = d.y - r;
        if (d.x + r > maxX) maxX = d.x + r;
        if (d.y + r + 15 > maxY) maxY = d.y + r + 15;
      });
      const bw = maxX - minX;
      const bh = maxY - minY;
      if (bw <= 0 || bh <= 0) return;

      const padding = 40;
      const scale = Math.min(
        (width - padding * 2) / bw,
        (height - padding * 2) / bh,
        1.5 // don't zoom in too much
      );
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const tx = width / 2 - cx * scale;
      const ty = height / 2 - cy * scale;

      svg.transition().duration(600).call(
        zoomBehavior.transform,
        d3.zoomIdentity.translate(tx, ty).scale(scale)
      );
    });

    return () => { simulation.stop(); tip.style('opacity', 0); };
  }, [data, depth, width, height]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <svg ref={svgRef} width={width} height={height}
        style={{ background: GRAPH_CANVAS_BACKGROUND, borderRadius: 4, border: '1px solid var(--color-border)', display: 'block' }} />
      {/* D3-managed tooltip (not React state - avoids re-render conflicts) */}
      <div ref={tooltipRef} style={{
        position: 'fixed', pointerEvents: 'none', opacity: 0,
        background: 'var(--color-surface)', border: '1px solid rgba(49,45,42,0.14)',
        borderRadius: 8, padding: '8px 12px', zIndex: 9999, color: '#161513',
        boxShadow: '0 8px 24px rgba(49,45,42,0.18)', maxWidth: 260,
        transition: 'opacity 0.1s ease',
      }} />
    </div>
  );
}

// ── NodeDetailPanel ──────────────────────────────────────────────────────────
function NodeDetailPanel({ node, network, onExplore, onClose }) {
  if (!node) return null;

  const score = typeof node.INFLUENCE_SCORE === 'number' ? node.INFLUENCE_SCORE.toFixed(1) : (node.INFLUENCE_SCORE || '-');
  const eng   = typeof node.ENGAGEMENT_RATE === 'number'
    ? (node.ENGAGEMENT_RATE * 100).toFixed(2) + '%'
    : (node.ENGAGEMENT_RATE || '-');

  // Count connections by type for this node
  const connTypes = {};
  (network?.edges || []).forEach(e => {
    const isRelated = e.source === node.INFLUENCER_ID || e.target === node.INFLUENCER_ID
      || e.source?.id === node.INFLUENCER_ID || e.target?.id === node.INFLUENCER_ID;
    if (isRelated) {
      connTypes[e.type] = (connTypes[e.type] || 0) + 1;
    }
  });

  return (
    <div className="glass-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
            style={{ background: platformColor(node.PLATFORM) + '33', border: `2px solid ${platformColor(node.PLATFORM)}`, color: platformColor(node.PLATFORM) }}>
            {(node.HANDLE || '?').slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-sm flex items-center gap-1">
              {node.HANDLE}
              {(node.IS_VERIFIED === 'Y' || node.IS_VERIFIED === 1) && (
                <span className="tone-pine text-xs">✓</span>
              )}
            </p>
            <p className="text-xs text-[var(--color-text-dim)]">{node.DISPLAY_NAME}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Platform + Niche */}
      <div className="flex flex-wrap gap-1.5">
        <span className={`platform-badge platform-${(node.PLATFORM || '').toLowerCase()}`}>{node.PLATFORM}</span>
        {node.NICHE && <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--color-surface-muted)] border border-[var(--color-border)]">{node.NICHE}</span>}
        {node.CITY && <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex items-center gap-1"><MapPin size={8} />{node.CITY}</span>}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Signal Volume', value: formatNumber(node.PATHWAY_VOLUME || node.FOLLOWER_COUNT || 0), icon: Users },
          { label: 'Risk Score / 100', value: node.RISK_SCORE || score,                                icon: Star },
          { label: 'Confidence', value: eng,                                    icon: TrendingUp },
          { label: 'Hop Level', value: node.type === 'center' ? 'Center' : `Hop ${node.hopLevel}`, icon: Network },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg p-2.5 text-center" style={{ background: 'var(--color-surface-muted)', border: '1px solid var(--color-border)' }}>
            <Icon size={12} className="mx-auto mb-1 text-[var(--color-accent)]" />
            <p className="text-sm font-bold">{value}</p>
            <p className="text-[10px] text-[var(--color-text-dim)]">{label}</p>
          </div>
        ))}
      </div>

      {/* Connection types */}
      {Object.keys(connTypes).length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider mb-2">Pathway Types</p>
          <div className="space-y-1">
            {Object.entries(connTypes).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: CONNECTION_COLORS[type] || '#6F757E' }} />
                  <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                </span>
                <span className="text-[var(--color-text-dim)]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Brand relationships (from network.brands for center node) */}
      {node.type === 'center' && network?.brands?.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider mb-2">Product Signal Cases</p>
          <div className="space-y-1">
            {network.brands.slice(0, 5).map(b => (
              <div key={b.LINK_ID} className="flex items-center justify-between text-xs py-1 border-b border-[var(--color-border)]">
                <span className="font-medium truncate">{b.BRAND_NAME}</span>
                {b.REVENUE_ATTRIBUTED > 0 && (
                  <span className="text-[var(--color-text-dim)] text-[10px] ml-2">Value at risk: ${formatNumber(b.REVENUE_ATTRIBUTED)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explore button */}
      <button
        onClick={() => onExplore(node.INFLUENCER_ID)}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all"
        style={{ background: 'var(--color-accent)', color: '#fff' }}>
        <Network size={13} /> Explore Pathways
        <ChevronRight size={13} />
      </button>
    </div>
  );
}

// ── Query Explorer colors ────────────────────────────────────────────────────
const QUERY_COLORS = {
  bom_eco_commitment_path:       { color: '#C74634', icon: Network },
  supplier_shortage_npi_risk:    { color: '#AA643B', icon: Zap },
  field_quality_warranty_path:   { color: '#A36472', icon: TrendingUp },
  order_promising_capacity_path: { color: '#4F7D7B', icon: Users },
  product_lifecycle_hubs:        { color: '#4C825C', icon: Star },
};

// ── GraphQueryExplorer ───────────────────────────────────────────────────────
function GraphQueryExplorer() {
  const { currentUser } = useUser();
  const [queries, setQueries]         = useState([]);
  const [activeQuery, setActiveQuery] = useState(null);
  const [params, setParams]           = useState({});
  const [result, setResult]           = useState(null);
  const [running, setRunning]         = useState(false);
  const [error, setError]             = useState(null);
  const [showSql, setShowSql]         = useState(false);
  const {
    data: readiness,
    loading: readinessLoading,
    error: readinessError,
    refetch: refetchReadiness,
  } = useData(
    () => apiFetch('/graph/readiness'),
    [currentUser?.USERNAME]
  );
  const nativeAvailable = readiness?.available === true && readiness?.status === 'ACTIVE';

  // Load available queries on mount
  useEffect(() => {
    api.graph.exampleQueries().then(qs => {
      setQueries(qs);
    }).catch(() => {});
  }, []);

  // Set default params when selecting a query
  const selectQuery = useCallback((q) => {
    setActiveQuery(q);
    setResult(null);
    setError(null);
    setShowSql(false);
    const defaults = {};
    (q.params || []).forEach(p => { defaults[p.key] = p.default || ''; });
    setParams(defaults);
  }, []);

  const runQuery = useCallback(async () => {
    if (!activeQuery) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.graph.runExample(activeQuery.id, params);
      setResult(res);
      setShowSql(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }, [activeQuery, params]);

  const resetExplorer = useCallback(() => {
    setActiveQuery(null);
    setResult(null);
    setError(null);
    setShowSql(false);
    setParams({});
  }, []);

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <Code2 size={18} className="text-[var(--color-accent)]" />
            Graph Query Explorer
          </h3>
          <p className="text-xs text-[var(--color-text-dim)] mt-0.5">
            Execute native Oracle SQL/PGQ traversals against the <span className="tone-sienna font-mono">tech_product_signal_network</span> property graph
          </p>
        </div>
        {activeQuery && (
          <button onClick={resetExplorer}
            className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)]/50 transition-colors text-[var(--color-text-dim)] hover:text-[var(--color-text)]">
            <RotateCcw size={11} /> Back to queries
          </button>
        )}
      </div>

      <div
        data-testid="native-graph-readiness"
        className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs"
        style={{
          background: nativeAvailable ? 'rgba(76,130,92,0.08)' : 'rgba(199,70,52,0.08)',
          border: `1px solid ${nativeAvailable ? 'rgba(76,130,92,0.35)' : 'rgba(199,70,52,0.35)'}`,
        }}
      >
        <div>
          <span className={`font-semibold ${nativeAvailable ? 'tone-pine' : 'tone-red'}`}>
            Native SQL/PGQ: {readinessLoading ? 'CHECKING' : nativeAvailable ? 'ACTIVE' : 'UNAVAILABLE'}
          </span>
          <span className="ml-2 text-[var(--color-text-dim)]">
            {nativeAvailable
              ? `${readiness.executionSource} · VPD-scoped traversal probe passed`
              : readinessError || 'Oracle did not confirm the property graph and native traversal.'}
          </span>
        </div>
        {!readinessLoading && !nativeAvailable && (
          <button
            onClick={refetchReadiness}
            className="px-2 py-1 rounded border border-[var(--color-border)] text-[var(--color-text)]"
          >
            Retry
          </button>
        )}
      </div>

      {/* Query selector cards */}
      {!activeQuery && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {queries.map(q => {
            const qStyle = QUERY_COLORS[q.id] || { color: '#C74634', icon: Network };
            const QIcon = qStyle.icon;
            return (
              <button key={q.id} onClick={() => selectQuery(q)}
                className="text-left p-3.5 rounded-xl border border-[var(--color-border)]/50 hover:border-opacity-100 transition-all group"
                style={{ background: `${qStyle.color}08`, borderColor: `${qStyle.color}30` }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${qStyle.color}22` }}>
                    <QIcon size={16} style={{ color: qStyle.color }} />
                  </div>
                  <span className="text-xs font-bold leading-tight group-hover:text-[var(--color-accent)] transition-colors">
                    {q.name}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--color-text-dim)] leading-relaxed">{q.description}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Active query: params + run */}
      {activeQuery && (
        <div className="space-y-4">
          {/* Query header */}
          <div className="flex items-start gap-3 p-3 rounded-xl"
            style={{ background: `${(QUERY_COLORS[activeQuery.id] || {}).color || '#C74634'}10`, border: `1px solid ${(QUERY_COLORS[activeQuery.id] || {}).color || '#C74634'}30` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${(QUERY_COLORS[activeQuery.id] || {}).color || '#C74634'}22` }}>
              {(() => { const QI = (QUERY_COLORS[activeQuery.id] || {}).icon || Network; return <QI size={20} style={{ color: (QUERY_COLORS[activeQuery.id] || {}).color || '#C74634' }} />; })()}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold">{activeQuery.name}</h4>
              <p className="text-xs text-[var(--color-text-dim)] mt-0.5">{activeQuery.description}</p>
            </div>
          </div>

          {/* Parameters */}
          <div className="flex flex-wrap items-end gap-3">
            {(activeQuery.params || []).map(p => (
              <div key={p.key} className="flex-1 min-w-[180px]">
                <label className="text-[10px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider block mb-1">
                  {p.label}
                </label>
                <input
                  type={p.type === 'number' ? 'number' : 'text'}
                  value={params[p.key] || ''}
                  onChange={e => setParams(prev => ({ ...prev, [p.key]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
                  placeholder={String(p.default)}
                />
              </div>
            ))}
            <button onClick={runQuery} disabled={running || !nativeAvailable}
              title={nativeAvailable ? 'Execute this statement in Oracle SQL/PGQ' : 'Native property graph is unavailable'}
              className="px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              style={{ background: 'var(--color-accent)', color: '#fff' }}>
              {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {running ? 'Running…' : 'Run Query'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg text-sm tone-red" style={{ background: 'rgba(199,70,52,0.1)', border: '1px solid rgba(199,70,52,0.3)' }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3">
              {/* Stats bar */}
              <div className="flex items-center gap-4 text-xs text-[var(--color-text-dim)]">
                <span
                  data-testid="native-graph-execution-source"
                  className="font-mono tone-pine"
                >
                  {result.executionSource}
                </span>
                <span className="flex items-center gap-1">
                  <Table2 size={12} className="text-[var(--color-accent)]" />
                  <strong className="text-[var(--color-text)]">{result.rowCount}</strong> rows returned
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} className="tone-pine" />
                  <strong className="text-[var(--color-text)]">{result.elapsed}</strong>ms
                </span>
                <button onClick={() => setShowSql(!showSql)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--color-border)] hover:border-[var(--color-accent)]/50 transition-colors ml-auto">
                  <Code2 size={11} /> {showSql ? 'Hide' : 'Show'} SQL
                </button>
              </div>

              {/* SQL display */}
              {showSql && result.executedSql && (
                <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(49,45,42,0.4)', border: '1px solid rgba(107,116,148,0.25)' }}>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--color-accent)] uppercase tracking-wider" style={{ background: 'rgba(107,116,148,0.1)' }}>
                    Exact SQL/PGQ executed by Oracle
                  </div>
                  <pre
                    data-testid="native-graph-executed-sql"
                    className="p-3 text-[11px] font-mono tone-pine overflow-x-auto leading-relaxed whitespace-pre"
                  >{result.executedSql}</pre>
                </div>
              )}

              {/* Results table */}
              {result.rows?.length > 0 && (
                <div className="rounded-lg overflow-hidden border border-[var(--color-border)]">
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-[var(--color-surface)]">
                          {Object.keys(result.rows[0]).map(col => (
                            <th key={col} className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider whitespace-nowrap border-b border-[var(--color-border)]">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.map((row, i) => (
                          <tr key={i} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface)]/50 transition-colors">
                            {Object.entries(row).map(([col, val], j) => (
                              <td key={j} className="px-3 py-2 whitespace-nowrap font-mono">
                                {typeof val === 'number'
                                  ? (Number.isInteger(val) ? val.toLocaleString() : val.toFixed(3))
                                  : (val ?? '-')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result.rows?.length === 0 && (
                <div className="text-center py-6 text-sm text-[var(--color-text-dim)]">
                  No results found. Try different parameters.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function InfluencerGraph() {
  const { currentUser } = useUser();
  const [selectedId,  setSelectedId]  = useState(null);
  const [depth,       setDepth]       = useState(5);
  const [search,      setSearch]      = useState('');
  const [clickedNode, setClickedNode] = useState(null);

  // Track which user the current product signal node list belongs to
  const [listUser, setListUser] = useState(null);

  // Product signal node list - refetch when user or search changes (VPD filtering)
  const { data: rawInfluencers, loading } = useData(
    () => api.graph.influencers({ limit: 50, ...(search ? { search } : {}) }),
    [search, currentUser?.USERNAME]
  );
  const { data: graphEdgeMetadata } = useData(
    () => api.graph.edgeMetadata(),
    [currentUser?.USERNAME]
  );

  // When the product signal node list loads, stamp which user it belongs to
  useEffect(() => {
    if (rawInfluencers?.length) {
      setListUser(currentUser?.USERNAME);
    }
  }, [rawInfluencers]);

  // When user changes, reset selection immediately
  useEffect(() => {
    setSelectedId(null);
    setClickedNode(null);
  }, [currentUser?.USERNAME]);

  // Auto-select the first product signal node only when the list is fresh for the current user
  useEffect(() => {
    if (rawInfluencers?.length && !selectedId && listUser === currentUser?.USERNAME) {
      setSelectedId(rawInfluencers[0].INFLUENCER_ID);
    }
  }, [rawInfluencers, selectedId, listUser, currentUser?.USERNAME]);

  // Network for selected product signal node
  const { data: network, loading: loadingNet, refetch: refetchNet, setData: setNetwork } = useData(
    () => selectedId ? api.graph.network(selectedId, depth) : Promise.resolve(null),
    [selectedId, depth, currentUser?.USERNAME],
    { autoFetch: false }
  );

  // Refetch network only when we have a valid selection
  useEffect(() => {
    if (selectedId) {
      refetchNet();
    } else {
      setNetwork(null);
    }
  }, [selectedId, depth]);

  // Close detail panel when a new product signal node is selected from the list
  const handleSelectId = useCallback((id) => {
    setSelectedId(id);
    setClickedNode(null);
  }, []);

  // Node click from graph
  const handleNodeClick = useCallback((d) => {
    setClickedNode(d);
  }, []);

  const handleExplore = useCallback((id) => {
    setSelectedId(id);
    setClickedNode(null);
  }, []);

  // Stats
  const stats = network?.stats || {};
  const activeEdgeMetadata = network?.edgeMetadata?.length ? network.edgeMetadata : graphEdgeMetadata;

  return (
    <div className="space-y-6 fade-in">

      {/* Oracle panel */}
      <RegisterOraclePanel title="Product Signal Graph">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider mb-2">What's Happening</p>
            <p className="text-[var(--color-text)] leading-relaxed">
              Oracle's <span className="tone-sienna font-mono">Property Graph</span> engine (SQL/PGQ - ISO standard) treats the
              Product Signal Graph as a first-class graph object. Edges encode relationships like
              <code className="text-xs tone-plum mx-1">advocates_for · influences_buyer · blocks_launch · routes_to_capacity_center</code>
              with a numeric <span className="tone-sienna font-mono">strength</span> weight.
              Graph traversal finds multi-hop paths across product advocacy, supplier risk, bill of materials constraints,
              customer commitments, fab capacity, field quality, warranty analytics, and engineering change exposure without any external graph database.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FeatureBadge label="SQL/PGQ (ISO Property Graph)" color="yellow" />
            <FeatureBadge label="GRAPH_TABLE()" color="yellow" />
            <FeatureBadge label="PGQL Traversal" color="orange" />
            <FeatureBadge label="Vertex / Edge Tables" color="purple" />
            <FeatureBadge label="Commitment Risk Scoring" color="pink" />
            <FeatureBadge label="CONNECT BY" color="blue" />
            <FeatureBadge label="Product Lifecycle Attribution" color="green" />
          </div>
          <SqlBlock code={`-- ISO SQL/PGQ: 5-hop Product Signal Graph traversal
SELECT reached.entity_id, reached.entity_key,
       reached.entity_type, reached.urgency_score,
       reached.product_value
FROM GRAPH_TABLE(
  tech_product_signal_network
  MATCH
    (seed IS entity {entity_key: :entity_key})
    -[e IS related_to]->{1,5}
    (reached IS entity)
  COLUMNS (
    reached.entity_id,
    reached.entity_key,
    reached.entity_type,
    reached.urgency_score,
    reached.product_value
  )
)
ORDER BY urgency_score DESC, product_value DESC
FETCH FIRST 50 ROWS ONLY;`} />
          <SqlBlock code={`-- Create the property graph over relational tables
CREATE PROPERTY GRAPH tech_product_signal_network
  VERTEX TABLES (
    tech_graph_entities KEY (entity_id) LABEL entity
      PROPERTIES (entity_id, entity_key, display_name,
        entity_type, influence_score, urgency_score,
        risk_level, region, channel, product_value,
        signal_count, is_priority),
    product_signal_cases KEY (case_id) LABEL signal_case
      PROPERTIES (case_ref, case_type, status,
        urgency_score, product_value_at_risk,
        signal_count, executive_summary)
  )
  EDGE TABLES (
    tech_graph_relationships KEY (relationship_id)
      SOURCE KEY (from_entity)
        REFERENCES tech_graph_entities (entity_id)
      DESTINATION KEY (to_entity)
        REFERENCES tech_graph_entities (entity_id)
      LABEL related_to
      PROPERTIES (relationship_type, strength,
        signal_count, product_value, evidence_text),
    product_signal_case_entities KEY (case_entity_id)
      SOURCE KEY (case_id)
        REFERENCES product_signal_cases (case_id)
      DESTINATION KEY (entity_id)
        REFERENCES tech_graph_entities (entity_id)
      LABEL contains_entity
      PROPERTIES (role, evidence_score, evidence_note)
  );`} />
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            <DiagramBox label="tech_graph_entities" sub="Product signal vertices" color="#C74634" />
            <DiagramBox label="tech_graph_relationships" sub="Lifecycle edges" color="#AA643B" />
            <DiagramBox label="product_signal_cases" sub="Risk cases" color="#A36472" />
            <DiagramBox label="case_entities" sub="Evidence map" color="#4C825C" />
          </div>
          <div>
            <EdgeLegend edgeMetadata={activeEdgeMetadata} />
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider mb-2">Virtual Private Database (VPD)</p>
            <p className="text-[var(--color-text)] leading-relaxed">
              Oracle <span className="tone-pine font-mono">DBMS_RLS</span> policies transparently filter graph data based on the logged-in user's role and region.
              {currentUser?.ROLE === 'fulfillment_mgr' ? (
                <span className="tone-sienna"> You are viewing only <strong>{currentUser.REGION}</strong> region data.</span>
              ) : currentUser?.ROLE === 'admin' || currentUser?.ROLE === 'analyst' ? (
                <span className="tone-pine"> You have full access to all regions.</span>
              ) : (
                <span className="tone-ocean"> Restricted VPD state: no regional graph rows.</span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FeatureBadge label="DBMS_RLS" color="green" />
            <FeatureBadge label="Row-Level Security" color="green" />
            <FeatureBadge label="Region Filtering" color="blue" />
          </div>
          <SqlBlock code={`-- VPD policy function (applied to Product Signal Graph tables)
CREATE FUNCTION vpd_hightech_graph(
  p_schema VARCHAR2, p_table VARCHAR2
) RETURN VARCHAR2 AS
  v_role   VARCHAR2(30) := SYS_CONTEXT('HIGHTECH_APP_CTX','ROLE');
  v_region VARCHAR2(100):= SYS_CONTEXT('HIGHTECH_APP_CTX','REGION');
  v_scope  VARCHAR2(20) := SYS_CONTEXT('HIGHTECH_APP_CTX','ACCESS_SCOPE');
BEGIN
  IF SYS_CONTEXT('HIGHTECH_APP_CTX','AUTHENTICATED') <> 'Y' THEN
    RETURN '1 = 0';
  END IF;
  IF v_scope = 'GLOBAL' AND v_role IN ('admin','analyst') THEN
    RETURN NULL;        -- full access
  END IF;
  IF v_scope = 'REGIONAL' AND v_role = 'fulfillment_mgr'
     AND v_region IS NOT NULL THEN
    RETURN 'region = ''' || v_region || '''';
  END IF;
  RETURN '1 = 0';       -- restricted, missing, unsupported
END;

-- Applied via DBMS_RLS.ADD_POLICY to:
--   tech_graph_entities,
--   tech_graph_relationships,
--   product_signal_cases,
--   product_signal_case_entities`} />
        </div>
      </RegisterOraclePanel>

      <SceneStoryPanel scene="graph" />

      <section className="business-explanation" aria-labelledby="graph-score-title">
        <div>
          <h3 id="graph-score-title" className="business-explanation__title">How risk scores and hops guide the decision</h3>
          <p className="business-explanation__copy">This demo keeps the scoring transparent. Higher values mean the selected product path is more likely to affect launch readiness or a customer commitment.</p>
        </div>
        <dl className="business-explanation__metrics">
          <div className="business-explanation__metric">
            <dt>Stored case or node risk</dt>
            <dd>The seeded 0–100 urgency score attached to the product signal evidence.</dd>
          </div>
          <div className="business-explanation__metric">
            <dt>Derived pathway risk</dt>
            <dd>Deep-path findings use 72 plus the number of entities found at three or more hops, capped at 99. Relationship hot spots use 60 plus five points per repeated relationship, capped at 100.</dd>
          </div>
          <div className="business-explanation__metric">
            <dt>Why hops matter</dt>
            <dd>A hop is one connected lifecycle step. More hops reveal longer dependency chains and more places where supplier, fab, quality, or allocation delays can propagate.</dd>
          </div>
        </dl>
      </section>

      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Network className="text-[var(--color-accent)]" /> Product Signal Graph
        </h2>
        <p className="text-sm text-[var(--color-text-dim)] mt-1">
          Explore multi-hop product lifecycle paths with <span className="tone-sienna">Oracle Property Graph and SQL property graph queries</span> across bill of materials, supplier risk, fab capacity, field quality, warranty, and customer commitments.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* ── Left column: list + controls ─────────────────────────────── */}
        <div className="space-y-3">

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search product signal, BOM, fab, customer..."
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-accent)]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)] hover:text-[var(--color-text)]">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Depth toggle */}
          <div className="glass-card p-3">
            <p className="text-[10px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider mb-2">
              Graph Depth (Hops)
              <HelpTip label="Graph hops" definition="Each hop is one relationship between lifecycle entities. Increasing depth exposes longer dependency chains and additional delay-propagation points." />
            </p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(d => (
                <button key={d} onClick={() => setDepth(d)}
                  className="flex-1 py-1.5 rounded text-xs font-semibold transition-all"
                  style={{
                    background: depth === d ? 'var(--color-accent)' : 'rgba(255,255,255,0.05)',
                    color:      depth === d ? '#fff'                 : 'var(--color-text-dim)',
                    border:     `1px solid ${depth === d ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}>
                  {d} Hop{d > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Product signal node list */}
          <div className="glass-card p-3 max-h-[480px] overflow-y-auto">
            <h3 className="text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider mb-2 flex items-center gap-1">
              <Users size={11} /> Product Signal Nodes {rawInfluencers?.length ? `(${rawInfluencers.length})` : ''}
            </h3>
            {loading ? (
              <p className="text-xs text-[var(--color-text-dim)] py-4 text-center">Loading…</p>
            ) : (rawInfluencers || []).map(inf => (
              <button key={inf.INFLUENCER_ID}
                onClick={() => handleSelectId(inf.INFLUENCER_ID)}
                className={`w-full text-left p-2 rounded-lg transition-colors text-xs mb-1 ${
                  selectedId === inf.INFLUENCER_ID
                    ? 'bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/40'
                    : 'hover:bg-[var(--color-surface-hover)] border border-transparent'
                }`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{inf.HANDLE}</span>
                  <span className={`platform-badge platform-${(inf.PLATFORM || '').toLowerCase()} !text-[9px] !py-0`}>{inf.PLATFORM}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[var(--color-text-dim)]">
                  <span>{formatNumber(inf.FOLLOWER_COUNT)}</span>
                  <span className="text-[var(--color-accent)]">★ {inf.INFLUENCE_SCORE}</span>
                  {inf.CONNECTION_COUNT > 0 && <span>{inf.CONNECTION_COUNT} links</span>}
                </div>
              </button>
            ))}
          </div>

          {/* Node detail panel */}
          {clickedNode && (
            <NodeDetailPanel
              node={clickedNode}
              network={network}
              onExplore={handleExplore}
              onClose={() => setClickedNode(null)}
            />
          )}
        </div>

        {/* ── Right column: graph + stats ──────────────────────────────── */}
        <div className="lg:col-span-3 space-y-3">

          {/* Selected product signal metrics + stats bar */}
          {network && (
            <div className="glass-card p-3">
              {network.center && (
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: '#C74634', border: '2px solid #C74634', color: '#FFFFFF' }}>
                    {(network.center.HANDLE || '?').replace('@','').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm flex items-center gap-1.5">
                      {network.center.HANDLE}
                      {(network.center.IS_VERIFIED === 'Y' || network.center.IS_VERIFIED === 1) && (
                        <span className="tone-pine text-xs">✓</span>
                      )}
                      <span className={`platform-badge platform-${(network.center.PLATFORM || '').toLowerCase()} !text-[9px] !py-0 ml-1`}>{network.center.PLATFORM}</span>
                      {network.center.NICHE && <span className="text-[10px] text-[var(--color-text-dim)] font-normal ml-1">{network.center.NICHE}</span>}
                    </p>
              <p className="text-[10px] text-[var(--color-text-dim)]">Center node - highest product and commitment influence score in network</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-7 gap-2">
                {[
                  { label: 'Signal Volume', value: formatNumber(network.center?.PATHWAY_VOLUME || network.center?.FOLLOWER_COUNT || 0) },
                  { label: 'Risk Score / 100', value: network.center?.RISK_SCORE || network.center?.INFLUENCE_SCORE || 0, definition: 'Stored urgency score for the selected product signal evidence.' },
                  { label: 'Confidence',    value: network.center?.ENGAGEMENT_RATE ? `${(network.center.ENGAGEMENT_RATE * 100).toFixed(1)}%` : '-' },
                  { label: 'Connections', value: network.center?.TOTAL_CONNECTIONS || 0 },
                  { label: 'Nodes',       value: stats.nodeCount  || network.nodes?.length  || 0 },
                  { label: 'Edges',       value: stats.edgeCount  || network.edges?.length  || 0 },
                  { label: 'Depth',       value: `${stats.depth || depth} hop${(stats.depth || depth) > 1 ? 's' : ''}` },
                ].map(s => (
                  <div key={s.label} className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <p className="text-sm font-bold">{s.value}</p>
                    <p className="text-[9px] text-[var(--color-text-dim)]">{s.label}{s.definition && <HelpTip label={s.label} definition={s.definition} />}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <GraphImpactSummary network={network} depth={depth} />

          {/* Graph or placeholder */}
          {loadingNet ? (
            <div className="glass-card p-14 text-center text-[var(--color-text-dim)]">
              <Network size={28} className="mx-auto mb-3 opacity-40" />
              Loading product signal pathways...
            </div>
          ) : network ? (
            <ForceGraph
              data={network}
              depth={depth}
              height={520}
              onNodeClick={handleNodeClick}
            />
          ) : (
            <div className="glass-card p-14 text-center text-[var(--color-text-dim)]">
              <Network size={28} className="mx-auto mb-3 opacity-40" />
              Select a product signal node to explore its pathways
            </div>
          )}

          {/* Edge type legend */}
          {network && (
            <EdgeLegend edgeMetadata={activeEdgeMetadata} />
          )}

          <PathwayFindingsPanel findings={network?.findings || []} depth={depth} />

          {/* Brand relationships */}
          {network?.brands?.length > 0 && !clickedNode && (
            <div className="glass-card p-4">
              <h4 className="text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider mb-2">
                Product Signal Cases - {network.center?.HANDLE}
              </h4>
              <div className="flex flex-wrap gap-2">
                {network.brands.map(b => (
                  <div key={b.LINK_ID} className="px-2.5 py-1.5 rounded-lg text-xs bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <span className="font-medium">{b.BRAND_NAME}</span>
                    {b.REVENUE_ATTRIBUTED > 0 && (
                      <span className="tone-pine ml-1.5 text-[10px]">
                        Value at risk: ${formatNumber(b.REVENUE_ATTRIBUTED)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Graph Query Explorer ── */}
      <GraphQueryExplorer />
    </div>
  );
}
