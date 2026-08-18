export default function HelpTip({ label = 'More information', definition, className = '' }) {
  if (!definition) return null;

  return (
    <button
      type="button"
      className={`help-tip ${className}`.trim()}
      title={`${label}: ${definition}`}
      aria-label={`${label}: ${definition}`}
    >
      <span className="oj-fwk-icon oj-fwk-icon-info" aria-hidden="true" />
      <span className="help-tip__content" role="tooltip">
        <strong>{label}</strong>
        <span>{definition}</span>
      </span>
    </button>
  );
}
