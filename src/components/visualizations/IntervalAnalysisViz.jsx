import { useState, useMemo } from 'react';
import { pitchName, metricWeight } from '../../utils/formatter';
import { Simultaneity } from '../../types';
import { scoreDissonance } from '../../utils/dissonanceScoring';

/**
 * Unified Interval Analysis Visualization
 * Used for Subject+CS, Answer+CS, Stretto, and Invertibility comparisons
 */
export function IntervalAnalysisViz({
  voice1,           // { notes: [], color: string, label: string }
  voice2,           // { notes: [], color: string, label: string }
  title,
  formatter,
  issues = [],      // Pre-computed issues to highlight
  warnings = [],    // Pre-computed warnings
  showProblemsOnly = false, // Only show intervals with issues
}) {
  const [highlightedOnset, setHighlightedOnset] = useState(null);
  const [selectedInterval, setSelectedInterval] = useState(null);

  // Calculate simultaneities and interval data
  const { intervalPoints, allSims, maxTime, minPitch, maxPitch } = useMemo(() => {
    if (!voice1?.notes?.length || !voice2?.notes?.length) {
      return { intervalPoints: [], allSims: [], maxTime: 0, minPitch: 60, maxPitch: 72 };
    }

    const v1 = voice1.notes;
    const v2 = voice2.notes;

    // Find all simultaneities
    const sims = [];
    for (const n1 of v1) {
      const s1 = n1.onset;
      const e1 = n1.onset + n1.duration;
      for (const n2 of v2) {
        const s2 = n2.onset;
        const e2 = n2.onset + n2.duration;
        if (s1 < e2 && s2 < e1) {
          const start = Math.max(s1, s2);
          sims.push(new Simultaneity(start, n1, n2, metricWeight(start)));
        }
      }
    }
    sims.sort((a, b) => a.onset - b.onset);

    // Deduplicate and build interval points with scoring
    const beatSnapshots = new Map();
    const intervalHistory = []; // Track for repetition detection

    for (let i = 0; i < sims.length; i++) {
      const sim = sims[i];
      const snapBeat = Math.round(sim.onset * 4) / 4;
      if (!beatSnapshots.has(snapBeat)) {
        const scoring = scoreDissonance(sim, sims, i, intervalHistory);
        beatSnapshots.set(snapBeat, {
          onset: sim.onset,
          v1Pitch: sim.voice1Note.pitch,
          v2Pitch: sim.voice2Note.pitch,
          intervalClass: sim.interval.class,
          intervalName: sim.interval.toString(),
          isConsonant: scoring.isConsonant,
          isStrong: sim.metricWeight >= 0.75,
          dissonanceLabel: scoring.label,
          dissonanceType: scoring.type,
          category: scoring.category || 'consonant_normal',
          score: scoring.score,
          scoreDetails: scoring.details,
          patterns: scoring.patterns,
          entry: scoring.entry,
          exit: scoring.exit,
          resolvesDissonance: scoring.resolvesDissonance,
        });
        intervalHistory.push(sim.interval.class);
      }
    }

    const points = [...beatSnapshots.values()].sort((a, b) => a.onset - b.onset);

    // Calculate bounds
    const allNotes = [...v1, ...v2];
    const maxT = Math.max(...allNotes.map(n => n.onset + n.duration));
    const minP = Math.min(...allNotes.map(n => n.pitch)) - 2;
    const maxP = Math.max(...allNotes.map(n => n.pitch)) + 2;

    return {
      intervalPoints: showProblemsOnly ? points.filter(p => !p.isConsonant && p.score < 0) : points,
      allSims: sims,
      maxTime: maxT,
      minPitch: minP,
      maxPitch: maxP,
    };
  }, [voice1, voice2, showProblemsOnly]);

  if (!voice1?.notes?.length || !voice2?.notes?.length) return null;

  const pRange = maxPitch - minPitch;
  const noteHeight = Math.max(14, Math.min(20, 250 / pRange));
  const headerHeight = 36;
  const h = pRange * noteHeight + headerHeight + 24;

  const pixelsPerBeat = 60;
  const w = Math.max(500, maxTime * pixelsPerBeat + 100);

  const tScale = (w - 80) / maxTime;
  const pToY = (p) => h - 20 - (p - minPitch) * noteHeight;
  const tToX = (t) => 60 + t * tScale;

  const getOnsetKey = (onset) => Math.round(onset * 4) / 4;

  // Colors
  const hasIssues = issues.length > 0;
  const hasWarnings = warnings.length > 0;
  const bgColor = hasIssues ? '#fef2f2' : hasWarnings ? '#fffbeb' : '#f8fafc';
  const borderColor = hasIssues ? '#fca5a5' : hasWarnings ? '#fcd34d' : '#cbd5e1';

  // Check if a note is sounding at a given time
  const isNoteSoundingAt = (note, time) => note.onset <= time && time < note.onset + note.duration;

  // Handle clicks
  const handleIntervalClick = (pt) => {
    setSelectedInterval(selectedInterval?.onset === pt.onset ? null : pt);
    setHighlightedOnset(getOnsetKey(pt.onset));
  };

  const handleIssueClick = (issue) => {
    const key = getOnsetKey(issue.onset);
    setHighlightedOnset(highlightedOnset === key ? null : key);
    const pt = intervalPoints.find(p => getOnsetKey(p.onset) === key);
    if (pt) setSelectedInterval(pt);
  };

  // Semantic color scheme based on interval context
  // Good: bright green (good resolution), bright purple (good dissonance handling)
  // Meh: pale green (normal consonance), yellowish (repetitive)
  // Bad: orange (bad resolution), red-purple/red (bad dissonance)
  const getScoreStyle = (pt) => {
    const { category, score, isConsonant } = pt;

    // Consonances
    if (isConsonant) {
      switch (category) {
        case 'consonant_good_resolution':
          return { color: '#059669', bg: '#a7f3d0', label: 'Good resolution', lineColor: '#10b981' };
        case 'consonant_bad_resolution':
          return { color: '#ea580c', bg: '#fed7aa', label: 'Poor resolution', lineColor: '#f97316' };
        case 'consonant_repetitive':
          return { color: '#a16207', bg: '#fef08a', label: 'Repetitive', lineColor: '#ca8a04' };
        default: // consonant_normal
          return { color: '#4ade80', bg: '#dcfce7', label: 'Consonant', lineColor: '#86efac' };
      }
    }

    // Dissonances - purple spectrum for handled, red for bad
    switch (category) {
      case 'dissonant_good':
        // Bright purple for well-handled dissonances - brighter the better
        if (score >= 2.0) return { color: '#7c3aed', bg: '#ddd6fe', label: 'Excellent', lineColor: '#8b5cf6' };
        if (score >= 1.0) return { color: '#8b5cf6', bg: '#ede9fe', label: 'Good', lineColor: '#a78bfa' };
        return { color: '#a78bfa', bg: '#f3f0ff', label: 'Acceptable', lineColor: '#c4b5fd' };

      case 'dissonant_marginal':
        // Purple-red for marginal
        return { color: '#c026d3', bg: '#fae8ff', label: 'Marginal', lineColor: '#d946ef' };

      case 'dissonant_bad':
      default:
        // Red for problematic dissonances - darker = worse
        if (score <= -2.0) return { color: '#b91c1c', bg: '#fecaca', label: 'Severe', lineColor: '#dc2626' };
        if (score <= -1.0) return { color: '#dc2626', bg: '#fee2e2', label: 'Problematic', lineColor: '#ef4444' };
        return { color: '#ea580c', bg: '#ffedd5', label: 'Weak', lineColor: '#f97316' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Main visualization */}
      <div style={{
        border: `2px solid ${borderColor}`,
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: bgColor,
      }}>
        <div style={{ overflowX: 'auto' }}>
          <svg width={w} height={h} style={{ display: 'block' }}>
            {/* Header */}
            <rect x={0} y={0} width={w} height={headerHeight} fill="rgba(0,0,0,0.04)" />
            <text x={16} y={24} fontSize="14" fontWeight="600" fill="#1f2937">
              {title || 'Interval Analysis'}
            </text>
            {(hasIssues || hasWarnings) && (
              <text x={w - 16} y={24} fontSize="12" fill={hasIssues ? '#dc2626' : '#f59e0b'} textAnchor="end">
                {hasIssues ? `${issues.length} issue${issues.length !== 1 ? 's' : ''}` :
                  `${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`}
              </text>
            )}

            {/* Beat grid */}
            {Array.from({ length: Math.ceil(maxTime) + 1 }, (_, i) => {
              const x = tToX(i);
              const isDownbeat = i % 4 === 0;
              return (
                <g key={`grid-${i}`}>
                  <line
                    x1={x} y1={headerHeight} x2={x} y2={h - 12}
                    stroke={isDownbeat ? '#94a3b8' : '#e2e8f0'}
                    strokeWidth={isDownbeat ? 1 : 0.5}
                  />
                  <text x={x} y={h - 2} fontSize="10" fill="#94a3b8" textAnchor="middle">
                    {i + 1}
                  </text>
                </g>
              );
            })}

            {/* Voice labels */}
            <text x={12} y={pToY(voice1.notes[0].pitch) + 5} fontSize="11" fontWeight="600" fill={voice1.color}>
              {voice1.label}
            </text>
            <text x={12} y={pToY(voice2.notes[0].pitch) + 5} fontSize="11" fontWeight="600" fill={voice2.color}>
              {voice2.label}
            </text>

            {/* Voice 1 notes */}
            {voice1.notes.map((n, i) => {
              const x = tToX(n.onset);
              const y = pToY(n.pitch);
              const width = Math.max(8, n.duration * tScale - 3);
              const isHighlighted = highlightedOnset !== null &&
                intervalPoints.some(pt => getOnsetKey(pt.onset) === highlightedOnset && isNoteSoundingAt(n, pt.onset));

              return (
                <g key={`v1-${i}`}>
                  {isHighlighted && (
                    <rect x={x - 3} y={y - noteHeight/2 - 2} width={width + 6} height={noteHeight + 4}
                      fill="#fbbf24" rx={5} opacity={0.5} />
                  )}
                  <rect x={x} y={y - noteHeight/2 + 2} width={width} height={noteHeight - 4}
                    fill={voice1.color} rx={4} />
                  <text x={x + width/2} y={y + 4} fontSize="10" fill="white" textAnchor="middle" fontWeight="500">
                    {pitchName(n.pitch).replace(/\d/, '')}
                  </text>
                </g>
              );
            })}

            {/* Voice 2 notes */}
            {voice2.notes.map((n, i) => {
              const x = tToX(n.onset);
              const y = pToY(n.pitch);
              const width = Math.max(8, n.duration * tScale - 3);
              const isHighlighted = highlightedOnset !== null &&
                intervalPoints.some(pt => getOnsetKey(pt.onset) === highlightedOnset && isNoteSoundingAt(n, pt.onset));

              return (
                <g key={`v2-${i}`}>
                  {isHighlighted && (
                    <rect x={x - 3} y={y - noteHeight/2 - 2} width={width + 6} height={noteHeight + 4}
                      fill="#fbbf24" rx={5} opacity={0.5} />
                  )}
                  <rect x={x} y={y - noteHeight/2 + 2} width={width} height={noteHeight - 4}
                    fill={voice2.color} rx={4} opacity={0.9} />
                  <text x={x + width/2} y={y + 4} fontSize="10" fill="white" textAnchor="middle" fontWeight="500">
                    {pitchName(n.pitch).replace(/\d/, '')}
                  </text>
                </g>
              );
            })}

            {/* Interval connectors */}
            {intervalPoints.map((pt, i) => {
              const x = tToX(pt.onset);
              const y1 = pToY(pt.v1Pitch);
              const y2 = pToY(pt.v2Pitch);
              const midY = (y1 + y2) / 2;
              const isHighlighted = highlightedOnset === getOnsetKey(pt.onset);
              const isSelected = selectedInterval?.onset === pt.onset;
              const style = getScoreStyle(pt);

              const label = pt.isConsonant
                ? (pt.intervalClass === 1 ? 'U' : pt.intervalClass === 8 ? '8' : pt.intervalClass.toString())
                : (pt.dissonanceLabel || '!');

              // Line style varies by category
              const lineColor = style.lineColor || style.color;
              const lineWidth = isSelected ? 3 : (pt.isConsonant ? 2 : 2.5);
              const lineDash = pt.isConsonant ? 'none' : '5,3';

              return (
                <g key={`int-${i}`} style={{ cursor: 'pointer' }} onClick={() => handleIntervalClick(pt)}>
                  {/* Highlight */}
                  {(isHighlighted || isSelected) && (
                    <rect x={x - 22} y={Math.min(y1, y2) - noteHeight/2}
                      width={44} height={Math.abs(y2 - y1) + noteHeight}
                      fill="#fbbf24" opacity={0.25} rx={4} />
                  )}

                  {/* Connecting line */}
                  <line x1={x} y1={y1} x2={x} y2={y2}
                    stroke={lineColor} strokeWidth={lineWidth}
                    strokeDasharray={lineDash} />

                  {/* Label bubble */}
                  <rect x={x - 16} y={midY - 12} width={32} height={24}
                    fill={style.bg} stroke={style.color} strokeWidth={1.5} rx={4} />
                  <text x={x} y={midY + 2} fontSize="12" fontWeight="600" fill={style.color} textAnchor="middle">
                    {label}
                  </text>

                  {/* Score badge - show for all with non-zero scores */}
                  {(pt.score !== 0 || !pt.isConsonant) && (
                    <g transform={`translate(${x}, ${midY + 18})`}>
                      <text fontSize="10" fill={style.color} textAnchor="middle" fontWeight="500">
                        {pt.score >= 0 ? '+' : ''}{pt.score.toFixed(1)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Issues/Warnings list - Clickable */}
      {(issues.length > 0 || warnings.length > 0) && (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 14px',
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
            fontWeight: '600',
            fontSize: '13px',
            color: '#374151',
          }}>
            {issues.length > 0 ? 'Issues' : 'Warnings'} — Click to highlight
          </div>
          {issues.map((issue, i) => {
            const isActive = highlightedOnset === getOnsetKey(issue.onset);
            return (
              <div key={`issue-${i}`} onClick={() => handleIssueClick(issue)}
                style={{
                  padding: '10px 14px',
                  borderBottom: i < issues.length + warnings.length - 1 ? '1px solid #f3f4f6' : 'none',
                  cursor: 'pointer',
                  backgroundColor: isActive ? '#fef2f2' : 'white',
                  borderLeft: isActive ? '4px solid #dc2626' : '4px solid transparent',
                }}>
                <span style={{ color: '#dc2626', fontWeight: '600', marginRight: '8px' }}>●</span>
                <span style={{ fontSize: '13px', color: '#1f2937' }}>{issue.description}</span>
              </div>
            );
          })}
          {warnings.map((warn, i) => {
            const isActive = highlightedOnset === getOnsetKey(warn.onset);
            return (
              <div key={`warn-${i}`} onClick={() => handleIssueClick(warn)}
                style={{
                  padding: '10px 14px',
                  borderBottom: i < warnings.length - 1 ? '1px solid #f3f4f6' : 'none',
                  cursor: 'pointer',
                  backgroundColor: isActive ? '#fffbeb' : 'white',
                  borderLeft: isActive ? '4px solid #f59e0b' : '4px solid transparent',
                }}>
                <span style={{ color: '#f59e0b', fontWeight: '600', marginRight: '8px' }}>●</span>
                <span style={{ fontSize: '13px', color: '#1f2937' }}>{warn.description}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected interval detail panel */}
      {selectedInterval && (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontWeight: '600', fontSize: '15px', color: '#1f2937' }}>
              Interval Detail: {selectedInterval.intervalName}
            </span>
            <button onClick={() => { setSelectedInterval(null); setHighlightedOnset(null); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#9ca3af', lineHeight: 1 }}>
              ×
            </button>
          </div>

          {/* Basic info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '13px', marginBottom: '16px' }}>
            <div>
              <div style={{ color: '#6b7280', fontSize: '11px', marginBottom: '2px' }}>Position</div>
              <div style={{ fontWeight: '500' }}>{formatter?.formatBeat(selectedInterval.onset) || `Beat ${selectedInterval.onset + 1}`}</div>
            </div>
            <div>
              <div style={{ color: '#6b7280', fontSize: '11px', marginBottom: '2px' }}>{voice1.label}</div>
              <div style={{ fontWeight: '500', color: voice1.color }}>{pitchName(selectedInterval.v1Pitch)}</div>
            </div>
            <div>
              <div style={{ color: '#6b7280', fontSize: '11px', marginBottom: '2px' }}>{voice2.label}</div>
              <div style={{ fontWeight: '500', color: voice2.color }}>{pitchName(selectedInterval.v2Pitch)}</div>
            </div>
            <div>
              <div style={{ color: '#6b7280', fontSize: '11px', marginBottom: '2px' }}>Metric Position</div>
              <div style={{ fontWeight: '500' }}>{selectedInterval.isStrong ? 'Strong beat' : 'Weak beat'}</div>
            </div>
            <div>
              <div style={{ color: '#6b7280', fontSize: '11px', marginBottom: '2px' }}>Type</div>
              <div style={{ fontWeight: '500' }}>
                {selectedInterval.isConsonant ? 'Consonant' : (selectedInterval.dissonanceType || 'Dissonant')}
              </div>
            </div>
            <div>
              <div style={{ color: '#6b7280', fontSize: '11px', marginBottom: '2px' }}>Interval</div>
              <div style={{ fontWeight: '500' }}>{selectedInterval.intervalName}</div>
            </div>
          </div>

          {/* Score section */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
              <div style={{ color: '#6b7280', fontSize: '13px' }}>Score:</div>
              <div style={{
                padding: '6px 16px',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '18px',
                ...(() => {
                  const s = getScoreStyle(selectedInterval);
                  return { backgroundColor: s.bg, color: s.color };
                })(),
              }}>
                {selectedInterval.score >= 0 ? '+' : ''}{selectedInterval.score.toFixed(1)}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                {getScoreStyle(selectedInterval).label}
              </div>
            </div>

          {!selectedInterval.isConsonant && (
            <>

              {/* Motion description */}
              {selectedInterval.entry && (
                <div style={{
                  backgroundColor: '#f9fafb',
                  padding: '12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#4b5563',
                  marginBottom: '12px',
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '8px', color: '#374151' }}>Entry into dissonance:</div>
                  <div>Motion type: <strong>{selectedInterval.entry.motion?.type || 'unknown'}</strong></div>
                  {selectedInterval.entry.details?.map((d, i) => (
                    <div key={i} style={{ marginTop: '4px' }}>{d}</div>
                  ))}
                </div>
              )}

              {selectedInterval.exit && (
                <div style={{
                  backgroundColor: '#f9fafb',
                  padding: '12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#4b5563',
                  marginBottom: '12px',
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '8px', color: '#374151' }}>Exit from dissonance:</div>
                  <div>Motion type: <strong>{selectedInterval.exit.motion?.type || 'unknown'}</strong></div>
                  {selectedInterval.exit.details?.map((d, i) => (
                    <div key={i} style={{ marginTop: '4px' }}>{d}</div>
                  ))}
                </div>
              )}

              {/* Pattern match */}
              {selectedInterval.patterns && selectedInterval.patterns.length > 0 && (
                <div style={{
                  backgroundColor: '#ecfdf5',
                  padding: '12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#065f46',
                  border: '1px solid #a7f3d0',
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>Pattern recognized:</div>
                  {selectedInterval.patterns.map((p, i) => (
                    <div key={i}>{p.description} <span style={{ opacity: 0.7 }}>(+{p.bonus})</span></div>
                  ))}
                </div>
              )}

              {/* Full score breakdown */}
              {selectedInterval.scoreDetails && selectedInterval.scoreDetails.length > 0 && (
                <details style={{ marginTop: '12px' }}>
                  <summary style={{ cursor: 'pointer', fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                    Full score breakdown
                  </summary>
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#4b5563', paddingLeft: '12px' }}>
                    {selectedInterval.scoreDetails.map((d, i) => (
                      <div key={i} style={{ marginBottom: '4px' }}>{d}</div>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}

          {/* Consonance-specific info */}
          {selectedInterval.isConsonant && selectedInterval.resolvesDissonance && (
            <div style={{
              backgroundColor: selectedInterval.category === 'consonant_good_resolution' ? '#ecfdf5' : '#fff7ed',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '12px',
              color: selectedInterval.category === 'consonant_good_resolution' ? '#065f46' : '#9a3412',
              border: `1px solid ${selectedInterval.category === 'consonant_good_resolution' ? '#a7f3d0' : '#fed7aa'}`,
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                {selectedInterval.category === 'consonant_good_resolution' ? 'Good resolution' : 'Weak resolution'}
              </div>
              <div>This consonance resolves the preceding dissonance</div>
            </div>
          )}

          {selectedInterval.isConsonant && selectedInterval.category === 'consonant_repetitive' && (
            <div style={{
              backgroundColor: '#fefce8',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#854d0e',
              border: '1px solid #fef08a',
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>Repetitive interval</div>
              <div>This interval class has been used frequently in recent simultaneities</div>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
}

export default IntervalAnalysisViz;
