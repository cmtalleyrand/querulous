/**
 * Observation display component
 * Color-coded feedback: strengths (green), considerations (orange), info (blue)
 */
const OBSERVATION_STYLES = {
  strength: {
    bg: '#e8f5e9',
    border: '#66bb6a',
    text: '#2e7d32',
    icon: '✓',
  },
  consideration: {
    bg: '#fff3e0',
    border: '#ffb74d',
    text: '#e65100',
    icon: '⚠',
  },
  info: {
    bg: '#e3f2fd',
    border: '#64b5f6',
    text: '#1565c0',
    icon: 'ℹ',
  },
};

export function Observation({ observation }) {
  const style = OBSERVATION_STYLES[observation.type] || OBSERVATION_STYLES.info;

  return (
    <div
      style={{
        padding: '8px 12px',
        backgroundColor: style.bg,
        borderLeft: `3px solid ${style.border}`,
        marginBottom: '6px',
        borderRadius: '0 4px 4px 0',
        display: 'flex',
        gap: '8px',
      }}
      role="listitem"
    >
      <span aria-hidden="true">{style.icon}</span>
      <span style={{ color: style.text, fontSize: '13px' }}>{observation.description}</span>
    </div>
  );
}

/**
 * Render a list of observations
 */
export function ObservationList({ observations }) {
  if (!observations?.length) return null;

  return (
    <div role="list" aria-label="Analysis observations">
      {observations.map((o, i) => (
        <Observation key={i} observation={o} />
      ))}
    </div>
  );
}

export default Observation;
