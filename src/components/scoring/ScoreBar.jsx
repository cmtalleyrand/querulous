import { getScoreColor, getScoreBgColor, getScoreRating, SCORE_CATEGORIES, LEGACY_KEY_MAP } from '../../utils/scoring';

/**
 * Horizontal score bar component with clear +/- signposting
 * Displays base-zero scores (positive = good, negative = bad, 0 = baseline)
 */
export function ScoreBar({ categoryKey, score, internalScore, showDetails = false, details = [], compact = false }) {
  // Support both new and legacy category keys
  const resolvedKey = LEGACY_KEY_MAP[categoryKey] || categoryKey;
  const category = SCORE_CATEGORIES[resolvedKey] || SCORE_CATEGORIES[categoryKey];
  // Use internal score for colors since we're now base-zero
  const displayScore = typeof internalScore === 'number' ? internalScore : score;
  const color = getScoreColor(displayScore);
  const bgColor = getScoreBgColor(displayScore);
  const rating = getScoreRating(displayScore);

  // Summarize positives and negatives
  const positives = details.filter(d => d.impact > 0);
  const negatives = details.filter(d => d.impact < 0);
  const neutrals = details.filter(d => d.impact === 0);

  // Format score with sign
  const formatScore = (s) => {
    const rounded = Math.round(s * 10) / 10;
    return rounded >= 0 ? `+${rounded}` : `${rounded}`;
  };

  return (
    <div
      style={{
        padding: compact ? '8px 12px' : '12px 14px',
        backgroundColor: bgColor,
        borderRadius: '8px',
        marginBottom: '8px',
        border: `1px solid ${color}30`,
        cursor: 'pointer',
        transition: 'transform 0.1s, box-shadow 0.1s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: compact ? '4px' : '8px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: compact ? '12px' : '13px', fontWeight: '600', color: '#37474f', marginBottom: '2px' }}>
            {category?.name || categoryKey}
          </div>
          {!compact && <div style={{ fontSize: '11px', color: '#757575' }}>{category?.description}</div>}

          {/* Quick +/- summary when collapsed */}
          {!showDetails && details.length > 0 && (
            <div style={{ display: 'flex', gap: '12px', marginTop: compact ? '4px' : '6px', fontSize: '11px' }}>
              {positives.length > 0 && (
                <span style={{ color: '#16a34a', fontWeight: '500' }}>
                  +{positives.length} strength{positives.length !== 1 ? 's' : ''}
                </span>
              )}
              {negatives.length > 0 && (
                <span style={{ color: '#dc2626', fontWeight: '500' }}>
                  -{negatives.length} issue{negatives.length !== 1 ? 's' : ''}
                </span>
              )}
              <span style={{ color: '#9ca3af', fontSize: '10px' }}>
                click for details
              </span>
            </div>
          )}
        </div>

        {/* Score display - base-zero with +/- */}
        <div style={{ textAlign: 'right', marginLeft: '12px' }}>
          <div style={{
            fontSize: compact ? '18px' : '22px',
            fontWeight: '700',
            color: color,
            lineHeight: 1,
          }}>
            {formatScore(displayScore)}
          </div>
          <div style={{
            fontSize: compact ? '9px' : '10px',
            color: color,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {rating}
          </div>
        </div>
      </div>

      {/* Details breakdown with clear +/- indicators */}
      {showDetails && details.length > 0 && (
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          {/* Positives section */}
          {positives.length > 0 && (
            <div style={{ marginBottom: negatives.length > 0 ? '10px' : '0' }}>
              <div style={{
                fontSize: '10px',
                fontWeight: '600',
                color: '#16a34a',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '4px',
              }}>
                Strengths
              </div>
              {positives.map((d, i) => (
                <div
                  key={`pos-${i}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    padding: '4px 8px',
                    marginBottom: '2px',
                    backgroundColor: '#dcfce7',
                    borderRadius: '4px',
                    borderLeft: '3px solid #16a34a',
                  }}
                >
                  <span style={{ color: '#166534' }}>{d.factor}</span>
                  <span style={{
                    fontWeight: '700',
                    color: '#16a34a',
                    fontSize: '13px',
                  }}>
                    +{d.impact}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Negatives section */}
          {negatives.length > 0 && (
            <div>
              <div style={{
                fontSize: '10px',
                fontWeight: '600',
                color: '#dc2626',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '4px',
              }}>
                Issues
              </div>
              {negatives.map((d, i) => (
                <div
                  key={`neg-${i}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    padding: '4px 8px',
                    marginBottom: '2px',
                    backgroundColor: '#fee2e2',
                    borderRadius: '4px',
                    borderLeft: '3px solid #dc2626',
                  }}
                >
                  <span style={{ color: '#991b1b' }}>{d.factor}</span>
                  <span style={{
                    fontWeight: '700',
                    color: '#dc2626',
                    fontSize: '13px',
                  }}>
                    {d.impact}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Neutrals section (if any) */}
          {neutrals.length > 0 && (
            <div style={{ marginTop: positives.length > 0 || negatives.length > 0 ? '10px' : '0' }}>
              <div style={{
                fontSize: '10px',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '4px',
              }}>
                Neutral
              </div>
              {neutrals.map((d, i) => (
                <div
                  key={`neu-${i}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    padding: '4px 8px',
                    marginBottom: '2px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px',
                    borderLeft: '3px solid #9ca3af',
                  }}
                >
                  <span style={{ color: '#4b5563' }}>{d.factor}</span>
                  <span style={{
                    fontWeight: '600',
                    color: '#6b7280',
                    fontSize: '12px',
                  }}>
                    0
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ScoreBar;
