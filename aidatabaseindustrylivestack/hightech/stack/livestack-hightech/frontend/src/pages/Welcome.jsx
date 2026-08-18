import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HighTechStoryRail } from '../components/HighTechStory';
import { JetButton } from '../components/JetControls';

const USE_CASES = [
  {
    label: 'High Tech Data Foundation',
    intro: 'Shows how Oracle AI Database 26ai provides:',
    bullets: [
      'A governed product lifecycle and manufacturing data layer',
      'Semiconductor manufacturing, fab operations, wafer starts, and yield records',
      'Product lifecycle management, BOM, engineering change order, and new product introduction data',
      'Supplier, contract manufacturing, quality, warranty, support, and customer-commitment records',
    ],
    tone: '#437C94',
  },
  {
    label: 'High Tech Operations Command Center',
    intro: 'Gives product, supply, and operations teams visibility into:',
    bullets: [
      'Fab bottlenecks and wafer-start exposure',
      'Component shortages and supplier risk',
      'Demand volatility and channel inventory pressure',
      'Customer commitments, order promising, and launch readiness',
    ],
    tone: '#C74634',
  },
  {
    label: 'Product, Supply & Quality Signals',
    intro: 'Uses vector-powered analysis across:',
    bullets: [
      'Design-to-manufacturing handoff and ECO signals',
      'BOM risk, supplier constraints, and contract manufacturing commits',
      'Connected-product telemetry and field quality trends',
      'Warranty analytics and support escalation signals',
    ],
    tone: '#4F7D7B',
  },
  {
    label: 'Product Lifecycle Event Graph',
    intro: 'Demonstrates graph analysis of relationships among:',
    bullets: [
      'Products, portfolios, NPI milestones, and PLM records',
      'Suppliers, components, BOM lines, and engineering change orders',
      'Launch blockers, contract manufacturers, and capacity centers',
      'Field quality cases, warranty exposure, and customer commitments',
    ],
    tone: '#796087',
  },
  {
    label: 'Supply Chain Resilience Map',
    intro: 'Applies spatial analysis to understand:',
    bullets: [
      'Fab sites, electronics manufacturing partners, and supplier lanes',
      'Availability centers and channel inventory pools',
      'Contract manufacturing capacity and allocation routes',
      'Order-promising regions and customer-commitment destinations',
    ],
    tone: '#5F7D4F',
  },
  {
    label: 'Customer Commitments',
    intro: 'Shows commitment workflows using:',
    bullets: [
      'Solution orders, allocations, and order-promising dates',
      'Connected-product entitlements and service records',
      'Field quality follow-ups and warranty analytics cases',
      'JSON Relational Duality over governed commitment records',
    ],
    tone: '#A36472',
  },
  {
    label: 'Yield, Capacity & Warranty Analytics',
    intro: 'Uses in-database analytics and ML for:',
    bullets: [
      'Wafer-start variance and yield improvement opportunity',
      'Fab capacity, supplier shortage, and channel inventory risk',
      'Demand volatility and customer-commitment exposure',
      'Field quality escapes, warranty analytics, and support load',
    ],
    tone: '#4C825C',
  },
  {
    label: 'Ask High Tech Data',
    intro: 'Lets users ask industry-specific questions over:',
    bullets: [
      'The live High Tech schema',
      'Semiconductor manufacturing, electronics manufacturing, PLM, supplier, and quality data',
      'Natural-language SQL workflows',
      'Governed query results',
    ],
    tone: '#697778',
  },
  {
    label: 'High Tech AI Agent Console',
    intro: 'Demonstrates AI-assisted workflows with:',
    bullets: [
      'Governed product, fab, supply, quality, warranty, and support data',
      'SQL and PL/SQL tools',
      'Specialist agents for fab operations, product engineering, supplier risk, quality, and customer commitments',
      'Auditable agent history',
    ],
    tone: '#6B7494',
  },
];

const USE_CASES_PER_PAGE = 3;

export default function Welcome({ onNavigate }) {
  const [useCasePage, setUseCasePage] = useState(0);
  const pageCount = Math.ceil(USE_CASES.length / USE_CASES_PER_PAGE);
  const carouselStart = useCasePage * USE_CASES_PER_PAGE;
  const visibleUseCases = USE_CASES.slice(carouselStart, carouselStart + USE_CASES_PER_PAGE);
  const carouselEnd = Math.min(carouselStart + visibleUseCases.length, USE_CASES.length);
  const canGoPrevious = useCasePage > 0;
  const canGoNext = useCasePage < pageCount - 1;

  const goToPreviousUseCases = () => {
    setUseCasePage((page) => Math.max(0, page - 1));
  };

  const goToNextUseCases = () => {
    setUseCasePage((page) => Math.min(pageCount - 1, page + 1));
  };

  return (
    <div className="space-y-6 fade-in max-w-[1700px] mx-auto">
      <section className="glass-card p-7">
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight leading-tight">
            High Tech product and manufacturing intelligence on one governed Oracle data platform.
          </h1>
          <p className="w-full text-base text-[var(--color-text-dim)] leading-7">
            This LiveStack demonstrates Oracle AI Database 26ai for High Tech across semiconductor manufacturing,
            fab operations, product lifecycle management, design-to-manufacturing handoff, electronics manufacturing,
            supplier risk, contract manufacturing, connected products, field quality, warranty analytics, service and
            support operations, order promising, and AI-assisted customer-commitment decisions.
          </p>
          <HighTechStoryRail />
          <div className="flex flex-wrap gap-3 pt-1">
            <JetButton
              label="Start the demo"
              iconClass="oj-fwk-icon oj-fwk-icon-folderhierarchy"
              chroming="callToAction"
              className="welcome-jet-button welcome-start-demo-button"
              onAction={() => onNavigate('datamodel')}
            />
          </div>
        </div>
      </section>

      <section className="glass-card p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-semibold">Key High Tech Use Cases Featured</h2>
          <div className="flex items-center gap-2" aria-label="Use case carousel controls">
            <button
              type="button"
              aria-label="Show previous use cases"
              onClick={goToPreviousUseCases}
              disabled={!canGoPrevious}
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
              aria-label="Show next use cases"
              onClick={goToNextUseCases}
              disabled={!canGoNext}
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
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--color-text-dim)]">
            Showing {carouselStart + 1}-{carouselEnd} of {USE_CASES.length}
          </p>
          <div className="flex items-center gap-1.5" aria-label="Use case groups">
            {Array.from({ length: pageCount }).map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Show use case group ${index + 1}`}
                aria-current={useCasePage === index ? 'true' : undefined}
                onClick={() => setUseCasePage(index)}
                className="h-2.5 rounded-full transition-all"
                style={{
                  width: useCasePage === index ? '22px' : '10px',
                  background: useCasePage === index ? '#AA643B' : 'var(--color-border)',
                }}
              />
            ))}
          </div>
        </div>
        <div
          className="grid gap-3 mt-4 lg:grid-cols-3"
          aria-live="polite"
          aria-label={`Use cases ${carouselStart + 1} through ${carouselEnd}`}
        >
          {visibleUseCases.map((useCase) => (
            <div
              key={useCase.label}
              className="border p-3.5 flex flex-col gap-2.5"
              style={{
                borderColor: 'var(--color-border)',
                borderRadius: '6px',
                background: 'var(--color-surface-muted)',
                borderTopWidth: '3px',
                borderTopColor: useCase.tone,
              }}
            >
              <div className="text-[15px] font-semibold leading-snug">{useCase.label}</div>
              <p className="text-sm text-[var(--color-text-dim)] leading-5">{useCase.intro}</p>
              <ul className="list-disc pl-4 space-y-1 text-sm text-[var(--color-text-dim)] leading-5">
                {useCase.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
