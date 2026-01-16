import { getScoreColor, getScoreBgColor, getScoreRating, SCORE_CATEGORIES } from '../../utils/scoring';

/**
 * Horizontal score bar component
 */
export function ScoreBar({ categoryKey, score, showDetails = false, details = [] }) {
  const category = SCORE_CATEGORIES[categoryKey];
  const color = getScoreColor(score);
  const bgColor = getScoreBgColor(score);
  const rating = getScoreRating(score);

  return (
    <div
      style={{
        padding: '12px',
        backgroundColor: bgColor,
        borderRadius: '6px',
        marginBottom: '8px',
        border: `1px solid ${color}20`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#37474f' }}>
            {category?.name || categoryKey}
          </div>
          <div style={{ fontSize: '11px', color: '#757575' }}>{category?.description}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: color }}>{score}</div>
          <div style={{ fontSize: '10px', color: color, fontWeight: '500' }}>{rating}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: '8px',
          backgroundColor: '#e0e0e0',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${score}%`,
            backgroundColor: color,
            borderRadius: '4px',
            transition: 'width 0.5s ease-in-out',
          }}
        />
      </div>

      {/* Details breakdown */}
      {showDetails && details.length > 0 && (
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e0e0e0' }}>
          {details.map((d, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                padding: '2px 0',
              }}
            >
              <span style={{ color: '#546e7a' }}>{d.factor}</span>
              <span
                style={{
                  color: d.impact >= 0 ? '#2e7d32' : '#c62828',
                  fontWeight: '500',
                }}
              >
                {d.impact >= 0 ? '+' : ''}{d.impact}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ScoreBar;
