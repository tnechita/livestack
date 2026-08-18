/**
 * Graph API - High Tech Product Signal Graph.
 * Keeps inherited endpoint names (/graph/influencers, /graph/network/:id)
 * while returning High Tech graph aliases over dedicated domain tables.
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');

const EDGE_METADATA = [
  {
    edgeType: 'advocates_for',
    displayName: 'Advocates For Product Portfolio',
    category: 'Demand & Channel Signals',
    description: 'Product advocacy, partner engineering, and channel signals are increasing demand volatility for a product portfolio.',
    color: '#C74634',
  },
  {
    edgeType: 'mentions_product',
    displayName: 'Mentions High Tech Product',
    category: 'Demand & Channel Signals',
    description: 'A signal references a product, bill of materials option, or connected-product program.',
    color: '#AA643B',
  },
  {
    edgeType: 'influences_buyer',
    displayName: 'Influences Customer Commitment',
    category: 'Customer Commitments',
    description: 'A product advocate, partner, or product signal affects customer commitments and order promising decisions.',
    color: '#437C94',
  },
  {
    edgeType: 'blocks_launch',
    displayName: 'Blocks Launch or New Product Introduction',
    category: 'Product Lifecycle Risk',
    description: 'A component shortage, engineering change, capacity constraint, or field quality issue blocks launch readiness.',
    color: '#C74634',
  },
  {
    edgeType: 'depends_on_architecture',
    displayName: 'Depends on Architecture',
    category: 'Product Lifecycle Risk',
    description: 'Design-to-manufacturing handoff, reference architecture, or bill of materials readiness influences adoption.',
    color: '#796087',
  },
  {
    edgeType: 'amplifies_signal',
    displayName: 'Amplifies Signal',
    category: 'Demand & Channel Signals',
    description: 'A signal cluster is amplified across channels, suppliers, or partner engineering teams.',
    color: '#4F7D7B',
  },
  {
    edgeType: 'partners_with',
    displayName: 'Partners With',
    category: 'Supply Chain Resilience',
    description: 'Partner engineering, contract manufacturing, or supplier risk relationships support mitigation.',
    color: '#4C825C',
  },
  {
    edgeType: 'routes_to_capacity_center',
    displayName: 'Routes to Capacity Center',
    category: 'Supply Chain Resilience',
    description: 'Portfolio demand is routed to a fab, contract manufacturing site, or product availability center.',
    color: '#AA643B',
  },
  {
    edgeType: 'mitigates_blocker',
    displayName: 'Mitigates Blocker',
    category: 'Supply Chain Resilience',
    description: 'A mitigation path reduces supplier risk, capacity exposure, or customer commitment risk.',
    color: '#4C825C',
  },
  {
    edgeType: 'supplied_by',
    displayName: 'Supplied By',
    category: 'Supply Chain Resilience',
    description: 'A bill of materials component, substrate material, memory stack, or product dependency is supplied by a supplier or supplier site.',
    color: '#4C825C',
  },
  {
    edgeType: 'constrained_by',
    displayName: 'Constrained By',
    category: 'Fab & Manufacturing Flow',
    description: 'A wafer lot, fab route, or manufacturing step is constrained by a process, yield, or capacity issue.',
    color: '#C74634',
  },
  {
    edgeType: 'manufactured_at',
    displayName: 'Manufactured At',
    category: 'Fab & Manufacturing Flow',
    description: 'A product, wafer lot, or supplier flow is manufactured at a fab, foundry, or contract manufacturing site.',
    color: '#AA643B',
  },
  {
    edgeType: 'tested_by',
    displayName: 'Tested By',
    category: 'Quality & Service Intelligence',
    description: 'A product or wafer lot is validated by an OSAT, burn-in, final test, or quality program.',
    color: '#437C94',
  },
  {
    edgeType: 'requires_component',
    displayName: 'Requires Component',
    category: 'Product Data & Engineering Change Control',
    description: 'A product portfolio requires a bill of materials component, substrate material, memory stack, or qualified design input.',
    color: '#796087',
  },
  {
    edgeType: 'changes_bom',
    displayName: 'Changes Bill of Materials',
    category: 'Product Data & Engineering Change Control',
    description: 'An engineering change order changes a bill of materials, product lifecycle management baseline, or manufacturing route.',
    color: '#796087',
  },
  {
    edgeType: 'delays_npi',
    displayName: 'Delays New Product Introduction',
    category: 'Product Data & Engineering Change Control',
    description: 'An engineering change order, firmware release, bill of materials decision, or test gate delays a new product introduction milestone.',
    color: '#C74634',
  },
  {
    edgeType: 'impacts_yield',
    displayName: 'Impacts Yield',
    category: 'Fab & Manufacturing Flow',
    description: 'A process step, wafer lot, or manufacturing signal impacts yield improvement and wafer-start confidence.',
    color: '#C74634',
  },
  {
    edgeType: 'blocks_commitment',
    displayName: 'Blocks Commitment',
    category: 'Customer Commitments',
    description: 'A blocker threatens a customer commitment, order promise, or delivery confidence window.',
    color: '#C74634',
  },
  {
    edgeType: 'creates_order_risk',
    displayName: 'Creates Order Risk',
    category: 'Customer Commitments',
    description: 'Demand volatility, supplier exposure, or channel inventory creates order promising risk.',
    color: '#AA643B',
  },
  {
    edgeType: 'correlates_with_field_quality',
    displayName: 'Correlates with Field Quality',
    category: 'Quality & Service Intelligence',
    description: 'A signal, telemetry pattern, or field incident correlates with field quality exposure.',
    color: '#437C94',
  },
  {
    edgeType: 'triggers_warranty_exposure',
    displayName: 'Triggers Warranty Exposure',
    category: 'Quality & Service Intelligence',
    description: 'A field quality incident or telemetry signal triggers a warranty cohort or service exposure.',
    color: '#C74634',
  },
  {
    edgeType: 'mitigated_by_eco',
    displayName: 'Mitigated by Engineering Change Order',
    category: 'Product Data & Engineering Change Control',
    description: 'A product lifecycle blocker is mitigated by an engineering change order or product lifecycle management-controlled substitution.',
    color: '#4C825C',
  },
  {
    edgeType: 'reallocated_to_channel',
    displayName: 'Reallocated to Channel',
    category: 'Channel & Order Promising',
    description: 'Product supply or inventory is reallocated across channel inventory and distributor pools.',
    color: '#AA643B',
  },
  {
    edgeType: 'requires_osat_capacity',
    displayName: 'Requires Outsourced Assembly and Test Capacity',
    category: 'Fab & Manufacturing Flow',
    description: 'A product, wafer lot, or test program requires outsourced semiconductor assembly and test capacity.',
    color: '#AA643B',
  },
  {
    edgeType: 'feeds_order_promise',
    displayName: 'Feeds Order Promise',
    category: 'Customer Commitments',
    description: 'A signal, capacity reservation, or customer commitment feeds an order promising decision.',
    color: '#437C94',
  },
  {
    edgeType: 'consumes_wafer_starts',
    displayName: 'Consumes Wafer Starts',
    category: 'Fab & Manufacturing Flow',
    description: 'A product portfolio consumes fab wafer starts or foundry allocation windows.',
    color: '#AA643B',
  },
  {
    edgeType: 'qualified_by_test_program',
    displayName: 'Qualified by Test Program',
    category: 'Quality & Service Intelligence',
    description: 'A component, site, or product is qualified through a burn-in, final test, or quality program.',
    color: '#437C94',
  },
  {
    edgeType: 'governed_by_plm_record',
    displayName: 'Governed by Product Lifecycle Record',
    category: 'Product Data & Engineering Change Control',
    description: 'A product architecture, bill of materials, or manufacturing handoff is governed by a product lifecycle management record.',
    color: '#796087',
  },
  {
    edgeType: 'releases_firmware_to',
    displayName: 'Releases Firmware To',
    category: 'Product Data & Engineering Change Control',
    description: 'A firmware release is assigned to a connected product, support operation, or new product introduction milestone.',
    color: '#4F7D7B',
  },
  {
    edgeType: 'routed_through_logistics',
    displayName: 'Routed through Logistics',
    category: 'Channel & Order Promising',
    description: 'A distributor, customer commitment, or inventory action routes urgent supply through a logistics path.',
    color: '#AA643B',
  },
  {
    edgeType: 'certified_by',
    displayName: 'Certified By',
    category: 'Quality & Service Intelligence',
    description: 'A product release or customer program is certified by a quality, compliance, or automotive gate.',
    color: '#437C94',
  },
  {
    edgeType: 'backed_by_capacity_reservation',
    displayName: 'Backed by Capacity Reservation',
    category: 'Fab & Manufacturing Flow',
    description: 'An allocation plan or order promise is backed by a fab, foundry, or outsourced semiconductor assembly and test capacity reservation.',
    color: '#4C825C',
  },
  {
    edgeType: 'escalates_service_case',
    displayName: 'Escalates Service Case',
    category: 'Quality & Service Intelligence',
    description: 'Warranty analytics, field quality, or customer telemetry escalates to service and support operations.',
    color: '#C74634',
  },
  {
    edgeType: 'updates_allocation_plan',
    displayName: 'Updates Allocation Plan',
    category: 'Supply Chain Resilience',
    description: 'A supplier risk, demand, or customer signal updates constrained component allocation planning.',
    color: '#4C825C',
  },
  {
    edgeType: 'shares_design_ip',
    displayName: 'Shares Design IP',
    category: 'Product Data & ECO Control',
    description: 'A product portfolio or architecture shares a design IP dependency or qualification artifact.',
    color: '#796087',
  },
  {
    edgeType: 'monitored_by_telemetry',
    displayName: 'Monitored by Telemetry',
    category: 'Quality & Service Intelligence',
    description: 'A product, firmware, or quality issue is monitored by connected-product telemetry.',
    color: '#4F7D7B',
  },
  {
    edgeType: 'reviewed_by_crb',
    displayName: 'Reviewed by Change Review Board',
    category: 'Product Data & Engineering Change Control',
    description: 'An engineering change order, new product introduction, or product lifecycle decision is reviewed by a change review board.',
    color: '#796087',
  },
  {
    edgeType: 'drives_demand_forecast',
    displayName: 'Drives Demand Forecast',
    category: 'Demand & Channel Signals',
    description: 'Demand volatility, product signals, or customer commitments drive a forecast signal.',
    color: '#4F7D7B',
  },
  {
    edgeType: 'splits_channel_supply',
    displayName: 'Splits Channel Supply',
    category: 'Channel & Order Promising',
    description: 'Supply is split across distributor, channel inventory, or customer commitment pools.',
    color: '#AA643B',
  },
  {
    edgeType: 'passes_quality_gate',
    displayName: 'Passes Quality Gate',
    category: 'Quality & Service Intelligence',
    description: 'A product, test program, or new product introduction milestone must pass a quality gate before release.',
    color: '#437C94',
  },
  {
    edgeType: 'advances_lifecycle_stage',
    displayName: 'Advances Lifecycle Stage',
    category: 'Product Data & Engineering Change Control',
    description: 'A new product introduction milestone, manufacturing route, or engineering change order advances a product lifecycle stage.',
    color: '#4C825C',
  },
];

function toLimit(value, fallback = 50, max = 200) {
  return Math.min(parseInt(value, 10) || fallback, max);
}

function toGraphDepth(value) {
  return Math.min(Math.max(parseInt(value, 10) || 3, 1), 5);
}

function splitList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function edgeMetadataFromType(type) {
  return EDGE_METADATA.find((item) => item.edgeType === type) || {
    edgeType: type,
    displayName: String(type || 'Unknown Edge').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    category: 'Uncategorized',
    description: 'High Tech graph relationship.',
    color: '#7A736E',
  };
}

async function fetchEdgeMetadata() {
  return EDGE_METADATA.map((item) => ({
    ...item,
    edge_type: item.edgeType,
    display_name: item.displayName,
  }));
}

function recommendedQueryForCase(caseRow = {}) {
  const text = `${caseRow.CASE_TYPE || ''} ${caseRow.EXECUTIVE_SUMMARY || ''}`.toLowerCase();
  if (/supplier|component|shortage|npi/.test(text)) return 'supplier_shortage_npi_risk';
  if (/field quality|warranty|support/.test(text)) return 'field_quality_warranty_path';
  if (/order promising|customer|commitment|capacity/.test(text)) return 'order_promising_capacity_path';
  if (/bom|bill of materials|eco|engineering change/.test(text)) return 'bom_eco_commitment_path';
  return 'product_lifecycle_hubs';
}

function findingTypeForCase(caseRow = {}) {
  const text = `${caseRow.CASE_TYPE || ''} ${caseRow.EXECUTIVE_SUMMARY || ''}`.toLowerCase();
  if (/supplier|component|shortage|npi/.test(text)) return 'supplier_shortage_npi_risk';
  if (/field quality|warranty|support/.test(text)) return 'field_quality_warranty_risk';
  if (/order promising|customer|commitment|capacity/.test(text)) return 'order_promising_capacity_risk';
  if (/bom|bill of materials|eco|engineering change/.test(text)) return 'bom_eco_commitment_risk';
  return 'product_lifecycle_signal_risk';
}

function buildPathwayFindings({ cases = [], edges = [], nodes = [], depth = 1 }) {
  const findings = [];
  const uniqueCases = dedupeCases(cases);
  uniqueCases.slice(0, 5).forEach((caseRow, index) => {
    const urgency = Number(caseRow.URGENCY_SCORE || 0);
    const queryKey = recommendedQueryForCase(caseRow);
    const findingType = findingTypeForCase(caseRow);
    const supportingNodeIds = splitList(caseRow.SUPPORTING_NODE_IDS || caseRow.supporting_node_ids);
    const supportingEdgeTypes = splitList(caseRow.SUPPORTING_EDGE_TYPES || caseRow.supporting_edge_types)
      .map((item) => item === 'developer_advocate' ? 'product_advocate' : item);
    findings.push({
      findingId: `case-${caseRow.CASE_REF || index + 1}`,
      finding_id: `case-${caseRow.CASE_REF || index + 1}`,
      findingType: findingType,
      finding_type: findingType,
      title: `${caseRow.CASE_TYPE || 'Product signal case'} exposes commitments`,
      description: caseRow.EXECUTIVE_SUMMARY || 'A High Tech signal case has surfaced order promising, supply, or product lifecycle exposure.',
      supportingNodeIds,
      supporting_node_ids: supportingNodeIds.join(','),
      supportingEdgeTypes,
      supporting_edge_types: supportingEdgeTypes.join(','),
      riskScore: urgency,
      risk_score: urgency,
      recommendedAction: urgency >= 90
        ? 'Escalate product allocation, supplier risk, and customer commitment review.'
        : 'Review capacity, BOM availability, field quality, and demand signal evidence.',
      recommended_action: urgency >= 90
        ? 'Escalate product allocation, supplier risk, and customer commitment review.'
        : 'Review capacity, BOM availability, field quality, and demand signal evidence.',
      recommendedQueryKey: queryKey,
      recommended_query_key: queryKey,
      minGraphDepth: Math.min(Number(depth) || 1, 5),
      min_graph_depth: Math.min(Number(depth) || 1, 5),
    });
  });

  const deepNodes = nodes.filter((node) => Number(node.hopLevel || node.HOP_LEVEL || 0) >= 3);
  if (Number(depth) >= 3 && deepNodes.length) {
    findings.push({
      findingId: 'hop-depth-product-lifecycle-exposure',
      finding_id: 'hop-depth-product-lifecycle-exposure',
      findingType: 'multi_hop_product_lifecycle_path',
      finding_type: 'multi_hop_product_lifecycle_path',
      title: `${deepNodes.length} entities appear only after 3+ hops`,
      description: 'The selected product signal reaches customer commitments through BOM, supplier, fab capacity, field quality, and mitigation paths that are not visible in a one-hop view.',
      supportingNodeIds: deepNodes.slice(0, 8).map((node) => String(node.INFLUENCER_ID)),
      supporting_node_ids: deepNodes.slice(0, 8).map((node) => String(node.INFLUENCER_ID)).join(','),
      supportingEdgeTypes: [...new Set(edges.filter((edge) => Number(edge.hopLevel || 0) >= 3).map((edge) => edge.type))].slice(0, 5),
      supporting_edge_types: [...new Set(edges.filter((edge) => Number(edge.hopLevel || 0) >= 3).map((edge) => edge.type))].slice(0, 5).join(','),
      riskScore: Math.min(99, 72 + deepNodes.length),
      risk_score: Math.min(99, 72 + deepNodes.length),
      recommendedAction: 'Increase graph depth to follow design-to-manufacturing, supplier, and capacity handoffs before committing customer dates.',
      recommended_action: 'Increase graph depth to follow design-to-manufacturing, supplier, and capacity handoffs before committing customer dates.',
      recommendedQueryKey: 'bom_eco_commitment_path',
      recommended_query_key: 'bom_eco_commitment_path',
      minGraphDepth: 3,
      min_graph_depth: 3,
    });
  }

  const relationshipCounts = edges.reduce((acc, edge) => {
    const type = edge.type || edge.relationship_type;
    if (!type) return acc;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  const topRelationshipTypes = Object.entries(relationshipCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  topRelationshipTypes.forEach((topType) => {
    const meta = edgeMetadataFromType(topType[0]);
    findings.push({
      findingId: `edge-${topType[0]}`,
      finding_id: `edge-${topType[0]}`,
      findingType: 'relationship_hotspot',
      finding_type: 'relationship_hotspot',
      title: `${meta.displayName} is the dominant pathway`,
      description: `${topType[1]} relationship${topType[1] === 1 ? '' : 's'} in this graph ${topType[1] === 1 ? 'explains' : 'explain'} demand volatility, supplier risk, or customer commitment exposure.`,
      supportingNodeIds: [],
      supporting_node_ids: '',
      supportingEdgeTypes: [topType[0]],
      supporting_edge_types: topType[0],
      riskScore: Math.min(100, 60 + topType[1] * 5),
      risk_score: Math.min(100, 60 + topType[1] * 5),
      recommendedAction: 'Open the graph query explorer to trace the affected product, supplier, and customer path.',
      recommended_action: 'Open the graph query explorer to trace the affected product, supplier, and customer path.',
      recommendedQueryKey: 'product_lifecycle_hubs',
      recommended_query_key: 'product_lifecycle_hubs',
      minGraphDepth: 1,
      min_graph_depth: 1,
    });
  });

  return findings.slice(0, 6);
}

function dedupeCases(cases = []) {
  const uniqueCases = [];
  const seenCases = new Set();
  cases.forEach((caseRow) => {
    const key = caseRow.CASE_REF || `${caseRow.CASE_TYPE}:${caseRow.EXECUTIVE_SUMMARY}`;
    if (seenCases.has(key)) return;
    seenCases.add(key);
    uniqueCases.push(caseRow);
  });
  return uniqueCases;
}

async function hasDedicatedGraph(demoUser) {
  try {
    const result = await db.executeAsUser(`
      SELECT COUNT(*) AS table_count
      FROM user_tables
      WHERE table_name IN (
        'TECH_GRAPH_ENTITIES',
        'TECH_GRAPH_RELATIONSHIPS',
        'PRODUCT_SIGNAL_CASES',
        'PRODUCT_SIGNAL_CASE_ENTITIES'
      )
    `, {}, demoUser);
    return Number(result.rows?.[0]?.TABLE_COUNT || 0) >= 4;
  } catch {
    return false;
  }
}

const NATIVE_GRAPH_NAME = 'TECH_PRODUCT_SIGNAL_NETWORK';
const GRAPH_METADATA_SQL = `
  SELECT graph_name
  FROM user_property_graphs
  WHERE graph_name = :graph_name
`;
const GRAPH_PROBE_SQL = `
  SELECT source_key, relationship_type, destination_key
  FROM GRAPH_TABLE (
    tech_product_signal_network
    MATCH
      (source IS entity)
      -[relationship IS related_to]->
      (destination IS entity)
    COLUMNS (
      source.entity_key AS source_key,
      relationship.relationship_type AS relationship_type,
      destination.entity_key AS destination_key
    )
  )
  FETCH FIRST 1 ROW ONLY
`;

function nativeGraphUnavailable(reason = 'Native Oracle property graph readiness could not be established.') {
  const error = new Error(reason);
  error.statusCode = 503;
  error.code = 'NATIVE_PROPERTY_GRAPH_UNAVAILABLE';
  return error;
}

async function inspectNativeGraph(demoUser) {
  return db.withUserConnection(demoUser, async ({ execute }) => {
    const metadata = await execute(GRAPH_METADATA_SQL, { graph_name: NATIVE_GRAPH_NAME });
    if (!metadata.rows.length) {
      throw nativeGraphUnavailable('TECH_PRODUCT_SIGNAL_NETWORK is not registered in USER_PROPERTY_GRAPHS.');
    }

    const probe = await execute(GRAPH_PROBE_SQL);
    return {
      status: 'ACTIVE',
      available: true,
      sourceObject: NATIVE_GRAPH_NAME,
      executionSource: 'SQL_PGQ_GRAPH_TABLE',
      metadataSource: 'USER_PROPERTY_GRAPHS',
      metadataSql: GRAPH_METADATA_SQL.trim(),
      probeSql: GRAPH_PROBE_SQL.trim(),
      probeRowCount: probe.rows.length,
      vpdIdentity: demoUser,
    };
  }, { readOnly: true });
}

router.get('/readiness', async (req, res) => {
  try {
    return res.json(await inspectNativeGraph(req.demoUser));
  } catch (error) {
    console.error('Native graph readiness error:', error);
    return res.status(503).json({
      status: 'UNAVAILABLE',
      available: false,
      sourceObject: NATIVE_GRAPH_NAME,
      executionSource: 'SQL_PGQ_GRAPH_TABLE',
      code: error.code || 'NATIVE_PROPERTY_GRAPH_UNAVAILABLE',
      error: 'Native Oracle property graph is unavailable for the current VPD identity.',
    });
  }
});

function graphNode(row, type = 'node', hopLevel = 1) {
  const pathwayVolume = row.SIGNAL_COUNT || row.signal_count || 0;
  const riskScore = row.URGENCY_SCORE ?? row.urgency_score ?? row.INFLUENCE_SCORE;
  const directConnectionCount = row.DIRECT_CONNECTION_COUNT ?? row.direct_connection_count ?? row.CONNECTION_COUNT;
  const nodeType = row.ENTITY_TYPE || row.entity_type || row.NODE_TYPE || row.PLATFORM;
  const nodeLabel = row.ENTITY_LABEL || row.entity_label || row.OPERATIONS_LABEL || row.DISPLAY_NAME;
  return {
    INFLUENCER_ID: row.ENTITY_ID,
    NODE_ID: row.ENTITY_KEY,
    NODE_TYPE: nodeType,
    HOP_LEVEL: hopLevel,
    HANDLE: row.DISPLAY_NAME || row.ENTITY_KEY,
    DISPLAY_NAME: row.DISPLAY_NAME,
    OPERATIONS_LABEL: nodeLabel,
    DESCRIPTION: row.DESCRIPTION || row.SUMMARY || row.EVIDENCE_TEXT,
    PLATFORM: row.CHANNEL || nodeType,
    FOLLOWER_COUNT: pathwayVolume,
    PATHWAY_VOLUME: pathwayVolume,
    ENGAGEMENT_RATE: row.STRENGTH || null,
    INFLUENCE_SCORE: row.INFLUENCE_SCORE,
    RISK_SCORE: riskScore,
    DIRECT_CONNECTION_COUNT: directConnectionCount,
    NICHE: nodeLabel || nodeType,
    CITY: row.CITY,
    REGION: row.REGION,
    IS_VERIFIED: row.IS_PRIORITY,
    URGENCY_SCORE: row.URGENCY_SCORE,
    RISK_LEVEL: row.RISK_LEVEL,
    PRODUCT_VALUE: row.PRODUCT_VALUE,
    type,
    hopLevel,
  };
}

function graphEdge(row, hopLevel = 1) {
  const meta = edgeMetadataFromType(row.RELATIONSHIP_TYPE);
  return {
    source: row.FROM_ENTITY,
    target: row.TO_ENTITY,
    type: row.RELATIONSHIP_TYPE,
    edgeType: row.RELATIONSHIP_TYPE,
    edge_type: row.RELATIONSHIP_TYPE,
    displayName: meta.displayName,
    display_name: meta.displayName,
    category: meta.category,
    description: meta.description,
    strength: row.STRENGTH,
    interactions: row.SIGNAL_COUNT,
    productValue: row.PRODUCT_VALUE,
    evidence: row.EVIDENCE_TEXT,
    hopLevel,
  };
}

function entityLabelCase(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return `CASE ${prefix}entity_type
  WHEN 'advocate' THEN 'Product Advocate'
  WHEN 'partner' THEN 'Partner Engineer'
  WHEN 'portfolio' THEN 'Product Portfolio'
  WHEN 'buyer' THEN 'Customer Commitment'
  WHEN 'architecture' THEN 'Design and BOM Architecture'
  WHEN 'blocker' THEN 'Product Lifecycle Blocker'
  WHEN 'capacity_center' THEN 'Fab or Capacity Center'
  WHEN 'fab' THEN 'Semiconductor Fab'
  WHEN 'wafer_lot' THEN 'Wafer Lot'
  WHEN 'process_step' THEN 'Fab Process Step'
  WHEN 'yield_metric' THEN 'Yield Metric'
  WHEN 'bom_component' THEN 'BOM Component'
  WHEN 'supplier' THEN 'Supplier'
  WHEN 'supplier_site' THEN 'Supplier Site'
  WHEN 'eco' THEN 'Engineering Change Order'
  WHEN 'npi_milestone' THEN 'NPI Milestone'
  WHEN 'plm_record' THEN 'PLM Record'
  WHEN 'osat_site' THEN 'OSAT Site'
  WHEN 'test_program' THEN 'Test Program'
  WHEN 'contract_manufacturer' THEN 'Contract Manufacturer'
  WHEN 'channel_inventory' THEN 'Channel Inventory'
  WHEN 'distributor' THEN 'Distributor'
  WHEN 'warranty_cohort' THEN 'Warranty Cohort'
  WHEN 'field_quality_incident' THEN 'Field Quality Incident'
  WHEN 'telemetry_signal' THEN 'Connected Product Telemetry'
  WHEN 'customer_commitment' THEN 'Customer Commitment'
  WHEN 'order_promise' THEN 'Order Promise'
  WHEN 'service_case' THEN 'Service Case'
  WHEN 'firmware_release' THEN 'Firmware Release'
  WHEN 'change_review_board' THEN 'Change Review Board'
  WHEN 'demand_forecast' THEN 'Demand Forecast'
  WHEN 'allocation_plan' THEN 'Allocation Plan'
  WHEN 'capacity_reservation' THEN 'Capacity Reservation'
  WHEN 'design_ip' THEN 'Design IP'
  WHEN 'substrate_material' THEN 'Substrate Material'
  WHEN 'manufacturing_route' THEN 'Manufacturing Route'
  WHEN 'quality_gate' THEN 'Quality Gate'
  WHEN 'support_operation' THEN 'Support Operation'
  WHEN 'lifecycle_stage' THEN 'Lifecycle Stage'
  ELSE 'Signal Cluster'
END`;
}

const entityLabelSql = entityLabelCase();

function graphNodeFromEdge(edge, side, type, hopLevel) {
  const from = side === 'from';
  return graphNode({
    ENTITY_ID: from ? edge.FROM_ENTITY : edge.TO_ENTITY,
    ENTITY_KEY: from ? edge.FROM_KEY : edge.TO_KEY,
    DISPLAY_NAME: from ? edge.FROM_DISPLAY : edge.TO_DISPLAY,
    ENTITY_TYPE: from ? edge.FROM_TYPE : edge.TO_TYPE,
    ENTITY_LABEL: from ? edge.FROM_LABEL : edge.TO_LABEL,
    INFLUENCE_SCORE: from ? edge.FROM_INFLUENCE_SCORE : edge.TO_INFLUENCE_SCORE,
    URGENCY_SCORE: from ? edge.FROM_URGENCY_SCORE : edge.TO_URGENCY_SCORE,
    RISK_LEVEL: from ? edge.FROM_RISK_LEVEL : edge.TO_RISK_LEVEL,
    REGION: from ? edge.FROM_REGION : edge.TO_REGION,
    CITY: from ? edge.FROM_CITY : edge.TO_CITY,
    CHANNEL: from ? edge.FROM_CHANNEL : edge.TO_CHANNEL,
    PRODUCT_VALUE: from ? edge.FROM_PRODUCT_VALUE : edge.TO_PRODUCT_VALUE,
    SIGNAL_COUNT: from ? edge.FROM_SIGNAL_COUNT : edge.TO_SIGNAL_COUNT,
    IS_PRIORITY: from ? edge.FROM_IS_PRIORITY : edge.TO_IS_PRIORITY,
    DIRECT_CONNECTION_COUNT: from ? edge.FROM_DIRECT_CONNECTION_COUNT : edge.TO_DIRECT_CONNECTION_COUNT,
    EVIDENCE_TEXT: edge.EVIDENCE_TEXT,
  }, type, hopLevel);
}

async function fetchDedicatedConnections(nodeIds, limit, demoUser) {
  if (!nodeIds.length) return [];
  const idList = [...new Set(nodeIds.map(Number).filter(Number.isFinite))].join(',');
  if (!idList) return [];
  const rowLimit = Math.max(1, Math.min(Number(limit) || 80, 250));

  const result = await db.executeAsUser(`
    SELECT r.relationship_id, r.from_entity, r.to_entity, r.relationship_type,
           r.strength, r.signal_count, r.product_value, r.evidence_text,
           src.entity_key AS from_key,
           src.display_name AS from_display,
           src.entity_type AS from_type,
           ${entityLabelCase('src')} AS from_label,
           src.influence_score AS from_influence_score,
           src.urgency_score AS from_urgency_score,
           src.risk_level AS from_risk_level,
           src.region AS from_region,
           src.city AS from_city,
           src.channel AS from_channel,
           src.product_value AS from_product_value,
           src.signal_count AS from_signal_count,
           src.is_priority AS from_is_priority,
           (SELECT COUNT(*) FROM tech_graph_relationships sr
            WHERE sr.from_entity = src.entity_id OR sr.to_entity = src.entity_id) AS from_direct_connection_count,
           dst.entity_key AS to_key,
           dst.display_name AS to_display,
           dst.entity_type AS to_type,
           ${entityLabelCase('dst')} AS to_label,
           dst.influence_score AS to_influence_score,
           dst.urgency_score AS to_urgency_score,
           dst.risk_level AS to_risk_level,
           dst.region AS to_region,
           dst.city AS to_city,
           dst.channel AS to_channel,
           dst.product_value AS to_product_value,
           dst.signal_count AS to_signal_count,
           dst.is_priority AS to_is_priority,
           (SELECT COUNT(*) FROM tech_graph_relationships dr
            WHERE dr.from_entity = dst.entity_id OR dr.to_entity = dst.entity_id) AS to_direct_connection_count
    FROM tech_graph_relationships r
    JOIN tech_graph_entities src ON src.entity_id = r.from_entity
    JOIN tech_graph_entities dst ON dst.entity_id = r.to_entity
    WHERE r.from_entity IN (${idList})
       OR r.to_entity IN (${idList})
    ORDER BY r.strength DESC, r.signal_count DESC, r.product_value DESC
    FETCH FIRST ${rowLimit} ROWS ONLY
  `, {}, demoUser);

  return result.rows || [];
}

async function listDedicatedEntities(req, res) {
  const { search } = req.query;
  const limit = toLimit(req.query.limit);
  const binds = { limit };
  let where = 'WHERE 1=1';
  if (search) {
    where += ` AND (UPPER(entity_key) LIKE UPPER(:search) OR UPPER(display_name) LIKE UPPER(:search) OR UPPER(entity_type) LIKE UPPER(:search))`;
    binds.search = `%${search}%`;
  }
  const result = await db.executeAsUser(`
    SELECT entity_id AS influencer_id,
           entity_key AS handle,
           display_name,
           channel AS platform,
           signal_count AS follower_count,
           ROUND(influence_score / 100, 3) AS engagement_rate,
           influence_score,
           ${entityLabelSql} AS niche,
           city,
           region,
           is_priority AS is_verified,
           urgency_score,
           risk_level,
           product_value,
           (SELECT COUNT(*) FROM tech_graph_relationships r
            WHERE r.from_entity = e.entity_id OR r.to_entity = e.entity_id) AS connection_count,
           signal_count AS recent_posts
    FROM tech_graph_entities e
    ${where}
    ORDER BY is_priority DESC, urgency_score DESC, influence_score DESC
    FETCH FIRST :limit ROWS ONLY
  `, binds, req.demoUser);
  res.json(result.rows);
}

async function listFallbackInfluencers(req, res) {
  const { platform, niche, search } = req.query;
  const limit = toLimit(req.query.limit);
  let where = 'WHERE 1=1';
  const binds = { limit };
  if (platform) { where += ' AND platform = :platform'; binds.platform = platform; }
  if (niche) { where += ' AND niche = :niche'; binds.niche = niche; }
  if (search) {
    where += ' AND (UPPER(handle) LIKE UPPER(:search) OR UPPER(display_name) LIKE UPPER(:search) OR UPPER(niche) LIKE UPPER(:search))';
    binds.search = `%${search}%`;
  }
  const result = await db.executeAsUser(`
    SELECT influencer_id, handle, display_name, platform,
           follower_count, engagement_rate, influence_score,
           niche, city, is_verified,
           (SELECT COUNT(*) FROM influencer_connections ic
            WHERE ic.from_influencer = i.influencer_id OR ic.to_influencer = i.influencer_id) AS connection_count,
           (SELECT COUNT(*) FROM social_posts sp
            WHERE sp.influencer_id = i.influencer_id) AS recent_posts
    FROM influencers i
    ${where}
    ORDER BY influence_score DESC
    FETCH FIRST :limit ROWS ONLY
  `, binds, req.demoUser);
  res.json(result.rows);
}

router.get('/influencers', async (req, res) => {
  try {
    if (await hasDedicatedGraph(req.demoUser)) return listDedicatedEntities(req, res);
    return listFallbackInfluencers(req, res);
  } catch (err) {
    console.error('Product Signal Graph list error:', err);
    res.status(500).json({ error: err.message });
  }
});

async function dedicatedNetwork(req, res) {
  const seedId = parseInt(req.params.id, 10);
  const depth = toGraphDepth(req.query.depth);
  const centerRes = await db.executeAsUser(`
    SELECT entity_id, entity_key, display_name, entity_type, ${entityLabelSql} AS entity_label,
           influence_score, urgency_score, risk_level, region, city, channel,
           product_value, signal_count, is_priority,
           (SELECT COUNT(*) FROM tech_graph_relationships r
            WHERE r.from_entity = e.entity_id OR r.to_entity = e.entity_id) AS direct_connection_count
    FROM tech_graph_entities
    e
    WHERE entity_id = :id
  `, { id: seedId }, req.demoUser);
  if (!centerRes.rows.length) return res.status(404).json({ error: 'Product Signal Graph entity not found' });

  const nodesMap = new Map();
  const edgeKeys = new Set();
  const edges = [];
  const visited = new Set([seedId]);
  let frontier = new Set([seedId]);

  const addNode = (node) => {
    const existing = nodesMap.get(node.INFLUENCER_ID);
    if (existing && Number(existing.hopLevel || 0) <= Number(node.hopLevel || 0)) return;
    nodesMap.set(node.INFLUENCER_ID, node);
  };

  const addEdge = (row, hopLevel) => {
    const key = String(row.RELATIONSHIP_ID || `${row.FROM_ENTITY}-${row.TO_ENTITY}-${row.RELATIONSHIP_TYPE}`);
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push(graphEdge(row, hopLevel));
  };

  addNode(graphNode(centerRes.rows[0], 'center', 0));

  for (let hop = 1; hop <= depth; hop += 1) {
    const frontierIds = [...frontier];
    if (!frontierIds.length) break;
    const hopLimit = hop === 1 ? 90 : hop === 2 ? 180 : hop === 3 ? 140 : hop === 4 ? 100 : 80;
    const edgeRows = await fetchDedicatedConnections(frontierIds, hopLimit, req.demoUser);
    const nextFrontier = new Set();

    for (const edge of edgeRows) {
      addEdge(edge, hop);

      const endpointIds = [edge.FROM_ENTITY, edge.TO_ENTITY];
      for (const endpointId of endpointIds) {
        const isCenter = endpointId === seedId;
        const isExisting = nodesMap.has(endpointId);
        if (!isExisting) {
          const side = endpointId === edge.FROM_ENTITY ? 'from' : 'to';
          addNode(graphNodeFromEdge(edge, side, isCenter ? 'center' : `hop${hop}`, isCenter ? 0 : hop));
        }
        if (!visited.has(endpointId)) nextFrontier.add(endpointId);
      }
    }

    nextFrontier.forEach((id) => visited.add(id));
    frontier = nextFrontier;
  }

  const nodes = [...nodesMap.values()];
  const entityIds = new Set(nodes.map((node) => node.INFLUENCER_ID));
  const idList = [...entityIds].map(Number).filter(Number.isFinite).join(',');

  const casesRes = await db.executeAsUser(`
    SELECT c.case_id, c.case_ref, c.case_type, c.status, c.urgency_score,
           c.product_value_at_risk, c.signal_count, c.executive_summary,
           LISTAGG(ce.entity_id, ',') WITHIN GROUP (ORDER BY ce.evidence_score DESC) AS supporting_node_ids,
           LISTAGG(ce.role, ',') WITHIN GROUP (ORDER BY ce.evidence_score DESC) AS supporting_edge_types
    FROM product_signal_cases c
    JOIN product_signal_case_entities ce ON ce.case_id = c.case_id
    WHERE ce.entity_id IN (${idList})
    GROUP BY c.case_id, c.case_ref, c.case_type, c.status, c.urgency_score,
             c.product_value_at_risk, c.signal_count, c.executive_summary
    ORDER BY c.urgency_score DESC
    FETCH FIRST 12 ROWS ONLY
  `, {}, req.demoUser);
  const cases = dedupeCases(casesRes.rows || []);
  const edgeMetadata = await fetchEdgeMetadata();
  const findings = buildPathwayFindings({ cases, edges, nodes, depth });
  const hopCounts = nodes.reduce((acc, node) => {
    const key = `hop${Number(node.hopLevel || node.HOP_LEVEL || 0)}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const brands = cases.map((caseRow) => ({
    BRAND_ID: caseRow.CASE_ID,
    BRAND_NAME: caseRow.CASE_TYPE,
    BRAND_CATEGORY: caseRow.CASE_TYPE,
    SOCIAL_TIER: caseRow.STATUS,
    REVENUE_ATTRIBUTED: caseRow.PRODUCT_VALUE_AT_RISK,
    POST_COUNT: caseRow.SIGNAL_COUNT,
    RELATIONSHIP_TYPE: 'product_signal_case',
  }));

  res.json({
    center: graphNode(centerRes.rows[0], 'center', 0),
    nodes,
    edges,
    edgeMetadata,
    findings,
    brands,
    cases,
    stats: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      brandCount: brands.length,
      caseCount: cases.length,
      depth,
      maxHop: Math.max(0, ...nodes.map((node) => Number(node.hopLevel || node.HOP_LEVEL || 0))),
      hopCounts,
      graphName: 'tech_product_signal_network',
    },
  });
}

async function fallbackNetwork(req, res) {
  const seedId = parseInt(req.params.id, 10);
  const depth = toGraphDepth(req.query.depth);
  const result = await db.executeAsUser(`
    SELECT i.influencer_id, i.handle, i.display_name, i.platform,
           i.follower_count, i.engagement_rate, i.influence_score,
           i.niche, i.city, i.is_verified
    FROM influencers i
    WHERE i.influencer_id = :id
  `, { id: seedId }, req.demoUser);
  if (!result.rows.length) return res.status(404).json({ error: 'Product signal entity not found' });
  const connections = await db.executeAsUser(`
    SELECT ic.connection_id, ic.from_influencer, ic.to_influencer,
           ic.connection_type, ic.strength, ic.interaction_count,
           i_f.handle AS from_handle, i_f.display_name AS from_display, i_f.platform AS from_platform,
           i_f.follower_count AS from_followers, i_f.influence_score AS from_score, i_f.niche AS from_niche,
           i_t.handle AS to_handle, i_t.display_name AS to_display, i_t.platform AS to_platform,
           i_t.follower_count AS to_followers, i_t.influence_score AS to_score, i_t.niche AS to_niche
    FROM influencer_connections ic
    JOIN influencers i_f ON ic.from_influencer = i_f.influencer_id
    JOIN influencers i_t ON ic.to_influencer = i_t.influencer_id
    WHERE ic.from_influencer = :id OR ic.to_influencer = :id
    ORDER BY ic.strength DESC
    FETCH FIRST 80 ROWS ONLY
  `, { id: seedId }, req.demoUser);
  const nodes = new Map([[seedId, { ...result.rows[0], type: 'center', hopLevel: 0 }]]);
  const edges = connections.rows.map((edge) => {
    nodes.set(edge.FROM_INFLUENCER, {
      INFLUENCER_ID: edge.FROM_INFLUENCER,
      HANDLE: edge.FROM_HANDLE,
      DISPLAY_NAME: edge.FROM_DISPLAY,
      PLATFORM: edge.FROM_PLATFORM,
      FOLLOWER_COUNT: edge.FROM_FOLLOWERS,
      INFLUENCE_SCORE: edge.FROM_SCORE,
      NICHE: edge.FROM_NICHE,
      type: edge.FROM_INFLUENCER === seedId ? 'center' : 'hop1',
      hopLevel: edge.FROM_INFLUENCER === seedId ? 0 : 1,
    });
    nodes.set(edge.TO_INFLUENCER, {
      INFLUENCER_ID: edge.TO_INFLUENCER,
      HANDLE: edge.TO_HANDLE,
      DISPLAY_NAME: edge.TO_DISPLAY,
      PLATFORM: edge.TO_PLATFORM,
      FOLLOWER_COUNT: edge.TO_FOLLOWERS,
      INFLUENCE_SCORE: edge.TO_SCORE,
      NICHE: edge.TO_NICHE,
      type: edge.TO_INFLUENCER === seedId ? 'center' : 'hop1',
      hopLevel: edge.TO_INFLUENCER === seedId ? 0 : 1,
    });
    return {
      source: edge.FROM_INFLUENCER,
      target: edge.TO_INFLUENCER,
      type: edge.CONNECTION_TYPE,
      strength: edge.STRENGTH,
      interactions: edge.INTERACTION_COUNT,
      hopLevel: 1,
    };
  });
  const edgeMetadata = await fetchEdgeMetadata();
  const findings = buildPathwayFindings({ cases: [], edges, depth });
  res.json({
    center: result.rows[0],
    nodes: [...nodes.values()],
    edges,
    edgeMetadata,
    findings,
    brands: [],
    cases: [],
    stats: { nodeCount: nodes.size, edgeCount: edges.length, brandCount: 0, caseCount: 0, depth },
  });
}

router.get('/network/:id', async (req, res) => {
  try {
    if (await hasDedicatedGraph(req.demoUser)) return dedicatedNetwork(req, res);
    return fallbackNetwork(req, res);
  } catch (err) {
    console.error('Product Signal Graph network error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/graph/edge-metadata - High Tech relationship labels for graph edges.
router.get('/edge-metadata', async (req, res) => {
  try {
    res.json(await fetchEdgeMetadata(req.demoUser));
  } catch (err) {
    console.error('Product Signal Graph edge metadata error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/propagation/:brandSlug', async (req, res) => {
  try {
    if (await hasDedicatedGraph(req.demoUser)) {
      const result = await db.executeAsUser(`
        SELECT src.display_name AS promoter_handle,
               src.influence_score AS promoter_score,
               r.relationship_type,
               dst.entity_id AS reached_id,
               dst.display_name AS reached_handle,
               dst.influence_score AS reached_score,
               dst.signal_count AS reached_followers,
               r.strength AS connection_strength
        FROM tech_graph_relationships r
        JOIN tech_graph_entities src ON src.entity_id = r.from_entity
        JOIN tech_graph_entities dst ON dst.entity_id = r.to_entity
        WHERE LOWER(dst.entity_key) LIKE '%' || LOWER(:slug) || '%'
           OR LOWER(dst.display_name) LIKE '%' || LOWER(:slug) || '%'
           OR LOWER(src.entity_key) LIKE '%' || LOWER(:slug) || '%'
        ORDER BY r.strength DESC
        FETCH FIRST 100 ROWS ONLY
      `, { slug: req.params.brandSlug }, req.demoUser);
      return res.json(result.rows);
    }
    return res.json([]);
  } catch (err) {
    console.error('Propagation error:', err);
    res.status(500).json({ error: err.message });
  }
});

const EXAMPLE_QUERIES = {
  bom_eco_commitment_path: {
    name: 'BOM and ECO Commitment Path',
    description: 'Trace a product portfolio through bill of materials and engineering change exposure to customer commitments.',
    params: [{ key: 'product_key', label: 'Product Portfolio Key', default: 'portfolio_lithography_ai' }],
    buildSql: (p) => ({
      sql: `SELECT product_portfolio, engineering_change, lifecycle_blocker,
       capacity_center, customer_commitment, value_at_risk
FROM GRAPH_TABLE (
  tech_product_signal_network
  MATCH
    (product IS entity)
    -[architecture_edge IS related_to]->
    (engineering IS entity)
    -[blocker_edge IS related_to]->
    (blocker IS entity)
    -[capacity_edge IS related_to]->
    (capacity IS entity)
    -[commitment_edge IS related_to]->
    (customer IS entity)
  WHERE product.entity_key = :product_key
    AND engineering.entity_type = 'architecture'
    AND blocker.entity_type = 'blocker'
    AND capacity.entity_type = 'capacity_center'
    AND customer.entity_type = 'buyer'
  COLUMNS (
    product.display_name AS product_portfolio,
    engineering.display_name AS engineering_change,
    blocker.display_name AS lifecycle_blocker,
    capacity.display_name AS capacity_center,
    customer.display_name AS customer_commitment,
    commitment_edge.product_value AS value_at_risk
  )
)
ORDER BY value_at_risk DESC
FETCH FIRST 25 ROWS ONLY`,
      binds: { product_key: p.product_key || 'portfolio_lithography_ai' },
    }),
  },

  supplier_shortage_npi_risk: {
    name: 'Supplier Shortage to NPI Risk',
    description: 'Find component shortage and supplier-risk paths that can block new product introduction or wafer-start plans.',
    params: [{ key: 'signal_key', label: 'Supplier Signal Key', default: 'signal_supplier_risk' }],
    buildSql: (p) => ({
      sql: `SELECT supplier_signal, shortage_or_blocker, impacted_product,
       blocker_strength, product_value_at_risk
FROM GRAPH_TABLE (
  tech_product_signal_network
  MATCH
    (signal IS entity)
    -[signal_edge IS related_to]->
    (blocker IS entity)
    -[product_edge IS related_to]->
    (product IS entity)
  WHERE signal.entity_key = :signal_key
    AND blocker.entity_type = 'blocker'
    AND product.entity_type = 'portfolio'
  COLUMNS (
    signal.display_name AS supplier_signal,
    blocker.display_name AS shortage_or_blocker,
    product.display_name AS impacted_product,
    signal_edge.strength AS blocker_strength,
    product_edge.product_value AS product_value_at_risk
  )
)
ORDER BY product_value_at_risk DESC, blocker_strength DESC
FETCH FIRST 25 ROWS ONLY`,
      binds: { signal_key: p.signal_key || 'signal_supplier_risk' },
    }),
  },

  field_quality_warranty_path: {
    name: 'Field Quality and Warranty Path',
    description: 'Connect field quality signals to warranty analytics, impacted products, and customer commitment exposure.',
    params: [{ key: 'quality_signal', label: 'Quality Signal Key', default: 'signal_field_quality' }],
    buildSql: (p) => ({
      sql: `SELECT quality_signal, impacted_product, customer_commitment,
       product_edge, customer_edge, commitment_value
FROM GRAPH_TABLE (
  tech_product_signal_network
  MATCH
    (quality IS entity)
    -[quality_edge IS related_to]->
    (product IS entity)
    -[commitment_edge IS related_to]->
    (customer IS entity)
  WHERE quality.entity_key = :quality_signal
    AND product.entity_type = 'portfolio'
    AND customer.entity_type = 'buyer'
  COLUMNS (
    quality.display_name AS quality_signal,
    product.display_name AS impacted_product,
    customer.display_name AS customer_commitment,
    quality_edge.relationship_type AS product_edge,
    commitment_edge.relationship_type AS customer_edge,
    commitment_edge.product_value AS commitment_value
  )
)
ORDER BY commitment_value DESC
FETCH FIRST 25 ROWS ONLY`,
      binds: { quality_signal: p.quality_signal || 'signal_field_quality' },
    }),
  },

  order_promising_capacity_path: {
    name: 'Order Promising Capacity Path',
    description: 'Trace order promising risk through product portfolios, fabs, contract manufacturing, and customer commitments.',
    params: [{ key: 'customer_key', label: 'Customer Commitment Key', default: 'buyer_nova_cloud' }],
    buildSql: (p) => ({
      sql: `SELECT customer_commitment, fab_or_capacity_center,
       product_portfolio, commitment_value, capacity_strength
FROM GRAPH_TABLE (
  tech_product_signal_network
  MATCH
    (product IS entity)
    -[capacity_edge IS related_to]->
    (capacity IS entity)
    -[commitment_edge IS related_to]->
    (customer IS entity)
  WHERE customer.entity_key = :customer_key
    AND capacity.entity_type = 'capacity_center'
    AND product.entity_type = 'portfolio'
  COLUMNS (
    customer.display_name AS customer_commitment,
    capacity.display_name AS fab_or_capacity_center,
    product.display_name AS product_portfolio,
    commitment_edge.product_value AS commitment_value,
    capacity_edge.strength AS capacity_strength
  )
)
ORDER BY commitment_value DESC, capacity_strength DESC
FETCH FIRST 25 ROWS ONLY`,
      binds: { customer_key: p.customer_key || 'buyer_nova_cloud' },
    }),
  },

  product_lifecycle_hubs: {
    name: 'Product Lifecycle Hubs',
    description: 'Rank the most connected product lifecycle entities by degree, risk score, and commitment value.',
    params: [{ key: 'entity_type', label: 'Entity Type (optional)', default: '' }],
    buildSql: (p) => {
      const typeClause = p.entity_type ? 'WHERE entity_type = :entity_type' : '';
      return {
        sql: `SELECT display_name, entity_type, risk_score, commitment_value,
       COUNT(*) AS degree, ROUND(AVG(edge_strength), 3) AS avg_strength
FROM GRAPH_TABLE (
  tech_product_signal_network
  MATCH
    (entity IS entity)
    -[relationship IS related_to]-
    (connected IS entity)
  COLUMNS (
    entity.display_name AS display_name,
    entity.entity_type AS entity_type,
    entity.urgency_score AS risk_score,
    entity.product_value AS commitment_value,
    relationship.strength AS edge_strength
  )
)
${typeClause}
GROUP BY display_name, entity_type, risk_score, commitment_value
ORDER BY degree DESC, risk_score DESC, commitment_value DESC
FETCH FIRST 25 ROWS ONLY`,
        binds: p.entity_type ? { entity_type: p.entity_type } : {},
      };
    },
  },
};

router.get('/example-queries', (req, res) => {
  res.json(Object.entries(EXAMPLE_QUERIES).map(([id, q]) => ({ id, name: q.name, description: q.description, params: q.params })));
});

router.post('/run-example', async (req, res) => {
  let executedSql = null;
  try {
    const { queryId, params = {} } = req.body;
    const queryDef = EXAMPLE_QUERIES[queryId];
    if (!queryDef) return res.status(400).json({ error: `Unknown query: ${queryId}` });
    await inspectNativeGraph(req.demoUser);
    const { sql, binds } = queryDef.buildSql(params);
    executedSql = sql;
    const startTime = Date.now();
    const result = await db.executeAsUser(sql, binds, req.demoUser);
    res.json({
      queryId,
      name: queryDef.name,
      executionSource: 'SQL_PGQ_GRAPH_TABLE',
      executedSql: sql,
      sql,
      binds,
      rows: result.rows,
      rowCount: result.rows.length,
      elapsed: Date.now() - startTime,
    });
  } catch (err) {
    console.error('Graph example query error:', err);
    const status = err.statusCode || 500;
    res.status(status).json({
      status: 'UNAVAILABLE',
      executionSource: 'SQL_PGQ_GRAPH_TABLE',
      executedSql,
      code: err.code || 'NATIVE_GRAPH_QUERY_FAILED',
      error: status === 503
        ? 'Native Oracle property graph is unavailable for the current VPD identity.'
        : 'Native SQL/PGQ execution failed.',
    });
  }
});

module.exports = router;
