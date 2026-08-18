const SCENE_STORIES = {
  datamodel: {
    eyebrow: 'Scene 1 - establish the governed record',
    title: 'Prepare one foundation for the logistics decision.',
    body: 'The story starts with the governed Seer Transport dataset behind a Northeast Corridor disruption. Transportation services, shippers, shipment orders, exception cases, disruption signals, terminal geography, similarity records, predictive outputs, and agent history become the shared evidence used in every downstream scene.',
    beats: [
      'Load or restore the bundled transportation dataset.',
      'Confirm the operational, spatial, graph, similarity, predictive, and audit records are ready.',
      'Carry the same governed Oracle AI Database 26ai evidence through every scene.',
    ],
  },
  dashboard: {
    eyebrow: 'Scene 2 - detect the operating event',
    title: 'See the disruption, capacity pressure, and value at risk.',
    body: 'The Fleet Risk & Operations Dashboard opens the Northeast Corridor story. A strategic dock-to-dock commitment, compressed terminal capacity, SLA exposure, freight value at risk, and related shipper activity appear together so operations leaders can frame the recovery decision.',
    beats: [
      'Start with the network, service, shipper, and value-at-risk indicators.',
      'Identify the constrained terminals and affected transportation services.',
      'Use the command-center view as the handoff into signals, network, capacity, and exceptions.',
    ],
  },
  social: {
    eyebrow: 'Scene 3 - explain the disruption signals',
    title: 'Find the evidence behind the demand and service pressure.',
    body: 'Disruption & Demand Signals connects shipper tenders, port alerts, weather notices, lane-pressure indicators, and related transportation-service evidence. Similarity search helps planners distinguish the strongest operational signals from general activity.',
    beats: [
      'Search for the Northeast Corridor disruption or a constrained transportation service.',
      'Compare urgency, SLA impact, freight value, and related service matches.',
      'Carry the strongest signal evidence into the risk network and recovery workflow.',
    ],
  },
  graph: {
    eyebrow: 'Scene 4 - trace the risk path',
    title: 'Connect shippers, partners, terminals, lanes, and exceptions.',
    body: 'The Transportation Risk Network shows how the disruption propagates across signal sources, strategic shippers, carriers, brokers, ports, terminals, service lines, equipment pools, routes, and exception cases. SQL/PGQ evidence keeps the network explanation tied to live Oracle records.',
    beats: [
      'Select a shipper, partner, terminal, route, or exception node.',
      'Follow multi-hop relationships to expose shared capacity and service dependencies.',
      'Use the connected exposure to decide which network constraint needs attention first.',
    ],
  },
  fulfillment: {
    eyebrow: 'Scene 5 - coordinate network capacity',
    title: 'Find where the network can absorb the reroute.',
    body: 'Network Capacity & Rerouting places terminals, service zones, shipper locations, demand regions, and available capacity on one operational map. Spatial proximity and coverage evidence support a practical dispatch and terminal-access decision.',
    beats: [
      'Review terminal capacity, pending movements, service zones, and demand regions.',
      'Compare proximity and coverage for the affected shipper and route.',
      'Use the Spatial evidence to support a reroute or capacity-allocation decision.',
    ],
  },
  orders: {
    eyebrow: 'Scene 6 - inspect the shipment exception',
    title: 'Open the execution record behind the service risk.',
    body: 'Shipment Orders & Exceptions brings the disruption down to one operational record. Planners can review the shipment, status, routing, partner, and line-item context, then compare the relational record with the native JSON Relational Duality document for the same request.',
    beats: [
      'Filter the governed shipment-order list by status and active user scope.',
      'Open the affected order and review its exception and movement context.',
      'Compare relational and Duality representations before handing the case to analytics or agents.',
    ],
  },
  oml: {
    eyebrow: 'Scene 7 - predict the next constraint',
    title: 'Forecast service demand, account risk, and capacity exposure.',
    body: 'Predictive Service Risk & Capacity turns the current disruption into forward-looking evidence. Persisted in-database models support demand forecasting, shipper health, service-risk cohorts, freight-value exposure, and capacity recommendations without replacing the operational story.',
    beats: [
      'Confirm the persisted Oracle Machine Learning models are ready.',
      'Review demand, shipper-health, service-risk, and capacity outputs.',
      'Carry the forecast into a trusted question or governed recovery action.',
    ],
  },
  askdata: {
    eyebrow: 'Scene 8 - ask the investigation questions',
    title: 'Interrogate the logistics story in plain language.',
    body: 'Ask Seer Transport Data lets planners ask which services, shippers, terminals, lanes, orders, or signals have the greatest exposure. Generated SQL remains visible and executes against the governed live transportation schema.',
    beats: [
      'Ask a Northeast Corridor disruption, capacity, service, or shipper question.',
      'Review the generated SQL before running the governed query.',
      'Use the returned evidence as context for specialist agent actions.',
    ],
  },
  agents: {
    eyebrow: 'Scene 9 - coordinate audited action',
    title: 'Turn the connected evidence into a recovery response.',
    body: 'The Operations Agent Console closes the loop. Signal, terminal-access, and shipment-operations specialists use approved Oracle SQL and PL/SQL tools to recommend capacity, routing, and service actions while Oracle records the decision history.',
    beats: [
      'Give the specialist teams the disruption, network, shipment, and forecast context.',
      'Review the proposed routing, capacity, or service response before execution.',
      'Inspect the durable action history so the recovery decision remains auditable.',
    ],
  },
};

export function TransportationStoryPanel({ scene }) {
  const story = SCENE_STORIES[scene];
  if (!story) return null;

  return (
    <section className="transport-story-panel" aria-label={`${story.title} story context`}>
      <div className="transport-story-panel__copy">
        <span className="transport-story-panel__eyebrow">{story.eyebrow}</span>
        <h3>{story.title}</h3>
        <p>{story.body}</p>
      </div>
      <ol className="transport-story-panel__beats">
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
