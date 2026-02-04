import { useState } from 'react';

/**
 * Display dissonance scoring breakdown for a counterpoint analysis
 * Shows: average score, good/bad counts, type breakdown, clickable issues
 */
export function CounterpointScoreDisplay({
  detailedScoring,
  formatter,
  title = "Dissonance Analysis",
  onIssueClick
}) {
  const [expanded, setExpanded] = useState(true);

  if (!detailedScoring || !detailedScoring.summary) {
    return null;
  }

  const { summary, dissonances } = detailedScoring;
  const avgScore = summary.averageScore || 0;

  // Determine score quality
  const getScoreColor = (score) => {
    if (score >= 0.5) return '#059669'; // green - good
    if (score >= 0) return '#0891b2';   // cyan - acceptable
    if (score >= -0.5) return '#d97706'; // orange - marginal
    return '#dc2626'; // red - poor
  };

  const getScoreLabel = (score) => {
    if (score >= 0.5) return 'Good';
    if (score >= 0) return 'Acceptable';
    if (score >= -0.5) return 'Marginal';
    return 'Poor';
  };

  // Get issues (poorly handled dissonances)
  const issues = dissonances?.filter(d => d.score < 0) || [];

  // Format type counts
  const typeEntries = Object.entries(summary.typeCounts || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{
      marginTop: '12px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      {/* Header with score */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: '#f8fafc',
          cursor: 'pointer',
          borderBottom: expanded ? '1px solid #e2e8f0' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            {expanded ? '▼' : '▶'}
          </span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
            {title}
          </span>
        </div>

        {/* Score badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{
            fontSize: '12px',
            color: '#6b7280',
          }}>
            {summary.totalDissonances} dissonances ({summary.goodCount} well-handled, {summary.badCount} problematic)
          </span>
          <span style={{
            padding: '4px 10px',
            borderRadius: '12px',
            backgroundColor: getScoreColor(avgScore),
            color: 'white',
            fontSize: '12px',
            fontWeight: '600',
          }}>
            {avgScore >= 0 ? '+' : ''}{avgScore.toFixed(2)} ({getScoreLabel(avgScore)})
          </span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '12px 16px' }}>
          {/* Score breakdown */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '12px',
          }}>
            <div style={{
              padding: '10px 12px',
              backgroundColor: '#f0fdf4',
              borderRadius: '6px',
              border: '1px solid #bbf7d0',
            }}>
              <div style={{ fontSize: '11px', color: '#166534', marginBottom: '2px' }}>Well-handled</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#15803d' }}>
                {summary.goodCount}
              </div>
              <div style={{ fontSize: '10px', color: '#166534' }}>
                Suspensions, passing tones, etc.
              </div>
            </div>

            <div style={{
              padding: '10px 12px',
              backgroundColor: summary.badCount > 0 ? '#fef2f2' : '#f0fdf4',
              borderRadius: '6px',
              border: `1px solid ${summary.badCount > 0 ? '#fecaca' : '#bbf7d0'}`,
            }}>
              <div style={{ fontSize: '11px', color: summary.badCount > 0 ? '#991b1b' : '#166534', marginBottom: '2px' }}>Problematic</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: summary.badCount > 0 ? '#dc2626' : '#15803d' }}>
                {summary.badCount}
              </div>
              <div style={{ fontSize: '10px', color: summary.badCount > 0 ? '#991b1b' : '#166534' }}>
                Unprepared, unresolved
              </div>
            </div>

            <div style={{
              padding: '10px 12px',
              backgroundColor: '#f1f5f9',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
            }}>
              <div style={{ fontSize: '11px', color: '#475569', marginBottom: '2px' }}>Consonances</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#334155' }}>
                {summary.totalConsonances}
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                {summary.repetitiveConsonances > 0 && `(${summary.repetitiveConsonances} repetitive)`}
              </div>
            </div>
          </div>

          {/* Type breakdown */}
          {typeEntries.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>
                Dissonance types detected:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {typeEntries.map(([type, count]) => (
                  <span
                    key={type}
                    style={{
                      padding: '3px 8px',
                      backgroundColor: '#f1f5f9',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: '#475569',
                    }}
                  >
                    {type}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Consecutive dissonance groups */}
          {summary.consecutiveDissonanceGroups?.length > 0 && (
            <div style={{
              marginBottom: '12px',
              padding: '8px 10px',
              backgroundColor: '#fef3c7',
              borderRadius: '6px',
              border: '1px solid #fcd34d',
            }}>
              <div style={{ fontSize: '11px', color: '#92400e', fontWeight: '500' }}>
                ⚠ {summary.consecutiveDissonanceGroups.length} consecutive dissonance group{summary.consecutiveDissonanceGroups.length !== 1 ? 's' : ''} (D→D sequences penalized)
              </div>
            </div>
          )}

          {/* Clickable issues */}
          {issues.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', color: '#dc2626', marginBottom: '6px', fontWeight: '500' }}>
                Issues to review ({issues.length}):
              </div>
              <div style={{
                maxHeight: '150px',
                overflowY: 'auto',
                border: '1px solid #fecaca',
                borderRadius: '6px',
              }}>
                {issues.slice(0, 10).map((issue, i) => (
                  <div
                    key={i}
                    onClick={() => onIssueClick?.(issue)}
                    style={{
                      padding: '8px 12px',
                      borderBottom: i < Math.min(issues.length, 10) - 1 ? '1px solid #fee2e2' : 'none',
                      cursor: onIssueClick ? 'pointer' : 'default',
                      fontSize: '12px',
                      color: '#991b1b',
                      backgroundColor: 'white',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <span style={{ fontWeight: '500' }}>
                      {formatter ? formatter.formatBeat(issue.onset) : `Beat ${issue.onset}`}
                    </span>
                    {': '}
                    {issue.interval?.toString() || 'dissonance'}
                    {issue.type && ` (${issue.type})`}
                    {' — score: '}{issue.score.toFixed(2)}
                    {issue.reason && ` — ${issue.reason}`}
                  </div>
                ))}
                {issues.length > 10 && (
                  <div style={{ padding: '8px 12px', fontSize: '11px', color: '#6b7280', backgroundColor: '#f9fafb' }}>
                    ...and {issues.length - 10} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CounterpointScoreDisplay;
