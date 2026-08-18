const HIGH_TECH_STORY_STEPS = [
  {
    stage: '1',
    useCase: 'Data Foundation',
    summary: 'Load one governed baseline for wafer starts, NPI programs, BOM revisions, supplier risk, fab capacity, order promising, channel inventory, field quality, warranty analytics, and connected-product signals.',
  },
  {
    stage: '2',
    useCase: 'High Tech Operations Command Center',
    summary: 'See the design-to-manufacturing handoff risk before it becomes separate fab operations, electronics manufacturing, supplier, order, support, and quality escalations.',
  },
  {
    stage: '3',
    useCase: 'Product, Supply & Quality Signals',
    summary: 'Explain the evidence across component shortages, demand volatility, yield improvement, engineering change orders, customer commitments, and service and support operations.',
  },
  {
    stage: '4',
    useCase: 'Product Lifecycle Event Graph',
    summary: 'Trace how NPI milestones, product lifecycle management records, suppliers, contract manufacturing partners, BOM items, launch blockers, quality cases, and buyer commitments connect.',
  },
  {
    stage: '5',
    useCase: 'Supply Chain Resilience Map',
    summary: 'Prioritize fabs, contract manufacturing sites, supplier lanes, availability centers, channel inventory pools, and order-promising decisions with Oracle Spatial evidence.',
  },
  {
    stage: '6',
    useCase: 'Customer Commitments',
    summary: 'Open the order, allocation, connected-product, warranty, field-quality, and support records behind the launch and fulfillment commitment.',
  },
  {
    stage: '7',
    useCase: 'Yield, Capacity & Warranty Analytics',
    summary: 'Predict wafer yield exposure, fab bottlenecks, component shortages, allocation risk, warranty escape rates, field quality exposure, and NPI launch readiness.',
  },
  {
    stage: '8',
    useCase: 'Ask High Tech Data',
    summary: 'Ask the semiconductor manufacturing and electronics manufacturing story in plain language and let Oracle generate governed SQL over the live High Tech schema.',
  },
  {
    stage: '9',
    useCase: 'High Tech AI Agent Console',
    summary: 'Convert findings into auditable actions for fab operations, product engineering, supply planning, contract manufacturing, quality, warranty, support, sales, and customer-commitment teams.',
  },
];

const SCENE_STORIES = {
  datamodel: {
    eyebrow: 'Scene 1 - establish the shared product record',
    title: 'Build the governed High Tech operating baseline.',
    body: 'The demo starts by loading one High Tech foundation for a launch-at-risk scenario. Semiconductor manufacturing plans, fab operations capacity, wafer starts, yield improvement targets, product lifecycle management milestones, new product introduction programs, design-to-manufacturing handoff records, electronics manufacturing partners, engineering change orders, bill of materials revisions, component shortages, supplier risk, demand volatility, channel inventory, connected products, field quality, warranty analytics, customer commitments, order promising, and service and support operations become the common records used downstream.',
    beats: [
      'Restore the governed High Tech demo foundation.',
      'Confirm fab, supplier, BOM, NPI, quality, warranty, support, channel, and customer-commitment records are present.',
      'Use the same Oracle AI Database 26ai records in every scene.',
    ],
  },
  dashboard: {
    eyebrow: 'Scene 2 - detect the launch constraint',
    title: 'Spot the product-launch risk before it fragments across teams.',
    body: 'The command center turns a constrained AI accelerator launch into one operating view: fab utilization, wafer-start plans, yield risk, supplier shortage exposure, design-to-manufacturing handoff readiness, channel inventory, contract manufacturing capacity, customer commitments, order-promising pressure, connected-product signals, field quality, warranty exposure, and support backlog surface together.',
    beats: [
      'Start with cross-functional status cards and exception lists.',
      'Look for linked fab, supplier, quality, warranty, support, and customer pressure.',
      'Use the dashboard as the handoff into signals, graph, map, analytics, Ask Data, and agents.',
    ],
  },
  social: {
    eyebrow: 'Scene 3 - explain the product signals',
    title: 'Find the supply, demand, and quality evidence.',
    body: 'The signal scene explains why the event matters. Vector search links component shortages, supplier risk, demand volatility, wafer-start deviations, fab queue pressure, product lifecycle management milestones, engineering change orders, BOM mismatches, contract manufacturing commits, channel inventory, field quality reports, warranty analytics, connected-product telemetry, support case trends, and customer-commitment exposure.',
    beats: [
      'Search for supplier risk, yield improvement, BOM changes, field quality, or order promising.',
      'Use semantic matches to connect signals to products, portfolios, suppliers, and launch cases.',
      'Carry the strongest signal evidence into the graph and agent workflows.',
    ],
  },
  graph: {
    eyebrow: 'Scene 4 - trace the product lifecycle path',
    title: 'Connect products, suppliers, BOMs, launch blockers, and commitments.',
    body: 'The graph scene shows how NPI records, product portfolios, developer and ecosystem signals, supplier constraints, component shortages, engineering change orders, bill of materials dependencies, contract manufacturing partners, capacity centers, field quality cases, warranty analytics, service operations, and customer commitments interact as one product lifecycle event graph.',
    beats: [
      'Select a product, supplier, blocker, buyer, architecture, quality case, or commitment node.',
      'Increase graph depth to expose multi-hop supplier, BOM, and mitigation relationships.',
      'Use pathway findings to decide which launch or customer milestone needs attention first.',
    ],
  },
  fulfillment: {
    eyebrow: 'Scene 5 - coordinate supply chain resilience',
    title: 'Prioritize fabs, suppliers, partners, lanes, and availability centers.',
    body: 'The map turns the event into execution. Fab operations sites, electronics manufacturing partners, contract manufacturing capacity, supplier lanes, component shortage zones, regional channel inventory pools, availability centers, customer commitment destinations, connected-product service regions, and support coverage areas are compared spatially.',
    beats: [
      'Review active availability centers, supplier lanes, capacity, and pending allocation routes.',
      'Toggle spatial layers for demand regions, product availability, and order-promising zones.',
      'Use proximity and capacity evidence to support allocation and commitment priorities.',
    ],
  },
  orders: {
    eyebrow: 'Scene 6 - inspect customer commitments',
    title: 'Open the commitment record behind the launch risk.',
    body: 'Customer Commitments shows how commercial operations fit the event. Operators can inspect solution orders, allocation status, customer commitments, order-promising dates, channel inventory constraints, connected-product entitlements, field quality follow-ups, warranty analytics cases, support escalations, and service and support operations handoffs.',
    beats: [
      'Filter commitments by status and active VPD context.',
      'Compare relational rows with JSON duality documents for the same commitment.',
      'Use the record as the customer handoff into analytics or agent action.',
    ],
  },
  oml: {
    eyebrow: 'Scene 7 - predict the next constraint',
    title: 'Score yield, capacity, allocation, and warranty exposure.',
    body: 'Analytics turns the event into forward-looking decisions. In-database models score wafer-start variance, fab bottlenecks, yield improvement opportunity, supplier shortage exposure, demand volatility, channel inventory risk, order-promising feasibility, contract manufacturing readiness, field quality escapes, warranty analytics exposure, connected-product support load, and NPI launch readiness.',
    beats: [
      'Review active DBMS_DATA_MINING models and SQL fallback status.',
      'Use forecast, cluster, capacity, and risk views to prioritize exposed products.',
      'Carry predictions into Ask Data or the agent console for auditable action.',
    ],
  },
  askdata: {
    eyebrow: 'Scene 8 - ask the investigation questions',
    title: 'Interrogate the High Tech story in plain language.',
    body: 'Ask High Tech Data lets teams ask which products are constrained by component shortages, which fab operations show wafer-start risk, which suppliers threaten customer commitments, which engineering change orders affect the bill of materials, which channel inventory pools need allocation, which connected products show field quality signals, and which warranty analytics cases need support action.',
    beats: [
      'Use explain, chat, show SQL, or run SQL mode for story-specific questions.',
      'Review generated SQL before executing governed live-schema queries.',
      'Use the answer as context for specialist agent actions.',
    ],
  },
  agents: {
    eyebrow: 'Scene 9 - coordinate audited action',
    title: 'Turn product, supply, quality, and support findings into action.',
    body: 'The agent console closes the loop. Fab Operations, Product Engineering, PLM, Supplier Risk, Contract Manufacturing, Supply Planning, Order Promising, Channel Inventory, Field Quality, Warranty Analytics, Connected Products, Customer Commitments, and Service and Support Operations agents summarize events, assess risk, recommend mitigation, and prepare auditable follow-up.',
    beats: [
      'Ask agents to summarize supplier risk, assess wafer starts, explain a BOM change, or prepare a warranty follow-up.',
      'Let specialist teams call approved Oracle SQL and PL/SQL tools.',
      'Review recent actions so product and customer decisions remain auditable.',
    ],
  },
};

export function HighTechStoryRail() {
  return (
    <div className="industry-story-rail" aria-label="One High Tech product lifecycle story across use cases">
      <div className="industry-story-rail__intro">
        <span className="industry-story-rail__kicker">Nine use cases, one High Tech product lifecycle story</span>
        <p>
          The demo follows a launch-at-risk scenario across semiconductor manufacturing, fab operations, product
          lifecycle management, design-to-manufacturing handoff, electronics manufacturing, supplier risk, demand
          volatility, channel inventory, customer commitments, field quality, warranty analytics, connected products,
          and service and support operations. Each scene uses the same governed Oracle AI Database 26ai foundation
          so the story stays connected from data load through AI-assisted action.
        </p>
      </div>
      <ol className="industry-story-rail__steps">
        {HIGH_TECH_STORY_STEPS.map((step) => (
          <li key={step.useCase} className="industry-story-step">
            <span className="industry-story-step__stage">{step.stage}</span>
            <span className="industry-story-step__use-case">{step.useCase}</span>
            <span className="industry-story-step__summary">{step.summary}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function SceneStoryPanel({ scene }) {
  const story = SCENE_STORIES[scene];
  if (!story) return null;

  return (
    <section className="industry-story-panel" aria-label={`${story.title} story context`}>
      <div className="industry-story-panel__copy">
        <span className="industry-story-panel__eyebrow">{story.eyebrow}</span>
        <h3>{story.title}</h3>
        <p>{story.body}</p>
      </div>
      <ol className="industry-story-panel__beats">
        {story.beats.map((beat, index) => (
          <li key={beat}>
            <span>{index + 1}</span>
            <p>{beat}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
