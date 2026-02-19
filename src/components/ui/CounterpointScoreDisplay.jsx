import { useState } from 'react';

/**
 * Display dissonance scoring breakdown for a counterpoint analysis.
 * Shows ALL dissonances in a table with entry/exit breakdown — all rows clickable.
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

  const scoreColor = (score) => {
    if (score >= 1.0) return '#059669';
    if (score >= 0)   return '#0891b2';
    if (score >= -0.5) return '#d97706';
    return '#dc2626';
  };

  const scoreBg = (score) => {
    if (score >= 1.0) return '#f0fdf4';
    if (score >= 0)   return '#e0f2fe';
    if (score >= -0.5) return '#fffbeb';
    return '#fef2f2';
  };

  const typeEntries = Object.entries(summary.typeCounts || {}).sort((a, b) => b[1] - a[1]);

  // Sort dissonances by onset for the table
  const sortedDissonances = [...(dissonances || [])].sort((a, b) => a.onset - b.onset);

  return (
    <div style={{ marginTop: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>

      {/* Collapsible header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', backgroundColor: '#f8fafc', cursor: 'pointer',
          borderBottom: expanded ? '1px solid #e2e8f0' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>{expanded ? '▼' : '▶'}</span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>
            {summary.totalDissonances} dissonances · {summary.goodCount} well-handled · {summary.badCount} problematic
          </span>
          <span style={{
            padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600',
            backgroundColor: scoreColor(avgScore), color: 'white',
          }}>
            avg {avgScore >= 0 ? '+' : ''}{avgScore.toFixed(2)}
          </span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '10px 14px' }}>

          {/* Summary stat tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
            <div style={{ padding: '8px 10px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '10px', color: '#166534' }}>Well-handled</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#15803d' }}>{summary.goodCount}</div>
            </div>
            <div style={{ padding: '8px 10px', backgroundColor: summary.badCount > 0 ? '#fef2f2' : '#f0fdf4', borderRadius: '6px', border: `1px solid ${summary.badCount > 0 ? '#fecaca' : '#bbf7d0'}` }}>
              <div style={{ fontSize: '10px', color: summary.badCount > 0 ? '#991b1b' : '#166534' }}>Problematic</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: summary.badCount > 0 ? '#dc2626' : '#15803d' }}>{summary.badCount}</div>
            </div>
            <div style={{ padding: '8px 10px', backgroundColor: '#f1f5f9', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <div style={{ fontSize: '10px', color: '#475569' }}>Consonances</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#334155' }}>{summary.totalConsonances}</div>
              {summary.repetitiveConsonances > 0 && (
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>{summary.repetitiveConsonances} repetitive</div>
              )}
            </div>
          </div>

          {/* Type pills */}
          {typeEntries.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
              {typeEntries.map(([type, count]) => (
                <span key={type} style={{ padding: '2px 8px', backgroundColor: '#f1f5f9', borderRadius: '4px', fontSize: '11px', color: '#475569' }}>
                  {type.replace(/_/g, ' ')}: {count}
                </span>
              ))}
            </div>
          )}

          {/* D→D chain warning */}
          {summary.consecutiveDissonanceGroups?.length > 0 && (
            <div style={{ marginBottom: '10px', padding: '7px 10px', backgroundColor: '#fef3c7', borderRadius: '6px', border: '1px solid #fcd34d' }}>
              <span style={{ fontSize: '11px', color: '#92400e', fontWeight: '500' }}>
                ⚠ {summary.consecutiveDissonanceGroups.length} consecutive D→D group{summary.consecutiveDissonanceGroups.length !== 1 ? 's' : ''} — passing motion may mitigate
              </span>
            </div>
          )}

          {/* Full dissonance table */}
          {sortedDissonances.length > 0 && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', fontSize: '12px' }}>
              {/* Table header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '80px 50px 1fr 50px 50px 56px',
                padding: '6px 10px', backgroundColor: '#f1f5f9',
                borderBottom: '1px solid #e2e8f0', fontSize: '10px', fontWeight: '600',
                color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                <span>Beat</span>
                <span>Interval</span>
                <span>Type</span>
                <span style={{ textAlign: 'right' }}>Entry</span>
                <span style={{ textAlign: 'right' }}>Exit</span>
                <span style={{ textAlign: 'right' }}>Total</span>
              </div>

              {/* Rows */}
              {sortedDissonances.map((d, i) => {
                const isChainNonEntry = d.isConsecutiveDissonance;
                const rowBg = i % 2 === 0 ? 'white' : '#fafafa';
                const totalColor = scoreColor(d.score);
                const totalBg = scoreBg(d.score);
                const patternLabel = d.patterns?.length > 0 ? d.patterns[0].label || d.type?.slice(0, 3) : null;

                return (
                  <div
                    key={i}
                    onClick={() => onIssueClick?.(d)}
                    style={{
                      display: 'grid', gridTemplateColumns: '80px 50px 1fr 50px 50px 56px',
                      padding: '7px 10px', alignItems: 'center',
                      backgroundColor: rowBg,
                      borderBottom: i < sortedDissonances.length - 1 ? '1px solid #f1f5f9' : 'none',
                      cursor: onIssueClick ? 'pointer' : 'default',
                      borderLeft: `3px solid ${totalColor}`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = totalBg}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = rowBg}
                  >
                    {/* Beat */}
                    <span style={{ color: '#374151', fontWeight: '500', fontSize: '11px' }}>
                      {formatter ? formatter.formatBeat(d.onset) : `${d.onset.toFixed(1)}`}
                    </span>

                    {/* Interval */}
                    <span style={{ color: '#374151', fontSize: '11px', fontFamily: 'monospace' }}>
                      {d.interval || d.intervalName || '?'}
                    </span>

                    {/* Type + chain/pattern badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                      {isChainNonEntry && (
                        <span style={{ padding: '1px 4px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '3px', fontSize: '10px', fontWeight: '600' }}>D→D</span>
                      )}
                      {d.isPassing && (
                        <span style={{ padding: '1px 4px', backgroundColor: '#dbeafe', color: '#1d4ed8', borderRadius: '3px', fontSize: '10px', fontWeight: '600' }}>~</span>
                      )}
                      {patternLabel ? (
                        <span style={{ padding: '1px 5px', backgroundColor: '#ede9fe', color: '#7c3aed', borderRadius: '3px', fontSize: '10px', fontWeight: '600' }}>
                          {patternLabel}
                        </span>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '11px' }}>
                          {d.type?.replace(/_/g, ' ') || '—'}
                        </span>
                      )}
                    </div>

                    {/* Entry score */}
                    <span style={{ textAlign: 'right', fontSize: '11px', fontFamily: 'monospace', color: (d.entryScore ?? 0) >= 0 ? '#6366f1' : '#dc2626' }}>
                      {d.entryScore !== undefined ? `${d.entryScore >= 0 ? '+' : ''}${d.entryScore.toFixed(1)}` : '—'}
                    </span>

                    {/* Exit score */}
                    <span style={{ textAlign: 'right', fontSize: '11px', fontFamily: 'monospace', color: (d.exitScore ?? 0) >= 0 ? '#059669' : '#ea580c' }}>
                      {d.exitScore !== undefined ? `${d.exitScore >= 0 ? '+' : ''}${d.exitScore.toFixed(1)}` : '—'}
                    </span>

                    {/* Total score badge */}
                    <span style={{
                      textAlign: 'right', fontSize: '11px', fontFamily: 'monospace', fontWeight: '700',
                      color: totalColor,
                    }}>
                      {d.score >= 0 ? '+' : ''}{d.score.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {sortedDissonances.length === 0 && (
            <div style={{ padding: '12px', color: '#6b7280', fontStyle: 'italic', fontSize: '12px', textAlign: 'center' }}>
              No dissonances detected.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CounterpointScoreDisplay;
