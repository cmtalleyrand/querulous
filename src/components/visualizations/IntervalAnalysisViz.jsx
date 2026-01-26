import { useState, useMemo } from 'react';
import { pitchName, metricWeight, metricPosition } from '../../utils/formatter';
import { Simultaneity } from '../../types';
import { scoreDissonance, getMeter } from '../../utils/dissonanceScoring';
import { getGridMetrics, generateGridLines } from '../../utils/vizConstants';

// Dissonance type definitions for tooltips
const DISSONANCE_DEFINITIONS = {
  passing: {
    name: 'Passing Tone (PT)',
    definition: 'Occurs on a weak beat, approached by step from one direction, left by step in the same direction. Connects two consonances.',
  },
  neighbor: {
    name: 'Neighbor Tone (N)',
    definition: 'Steps away from a consonance and returns to the same note. Also called auxiliary note. Usually on weak beats.',
  },
  suspension: {
    name: 'Suspension (Sus)',
    definition: 'Preparation: consonant note held into next beat. Dissonance: held note clashes with moving voice. Resolution: suspended note moves DOWN by step.',
  },
  appoggiatura: {
    name: 'Appoggiatura (App)',
    definition: 'Approached by leap to a strong beat dissonance, resolves by step (usually down). Creates expressive emphasis.',
  },
  anticipation: {
    name: 'Anticipation (Ant)',
    definition: 'Arrives early—the note of the next consonance sounds before its time. Usually short and on weak beats.',
  },
  cambiata: {
    name: 'Cambiata (Cam)',
    definition: 'Traditional nota cambiata: step down to dissonance, skip down a third, step up to fill in.',
  },
  cambiata_proper: {
    name: 'Cambiata (Cam)',
    definition: 'Traditional nota cambiata on weak beat: step down to dissonance, skip down a third.',
  },
  cambiata_inverted: {
    name: 'Inverted Cambiata (Cam↑)',
    definition: 'Ascending form: step up to dissonance, skip up a third.',
  },
  cambiata_strong: {
    name: 'Cambiata-like (Cam?)',
    definition: 'Cambiata figure occurring on a strong beat—non-traditional placement.',
  },
  cambiata_inverted_strong: {
    name: 'Inverted Cambiata (Cam↑?)',
    definition: 'Ascending cambiata on strong beat—non-traditional.',
  },
  escape_tone: {
    name: 'Escape Tone (Esc)',
    definition: 'Approached by step, left by leap in opposite direction. Creates a "leaving" gesture.',
  },
  unprepared: {
    name: 'Unprepared Dissonance',
    definition: 'Strong-beat dissonance not fitting standard ornamental patterns. Generally avoided in strict style.',
  },
};

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
  const [showTypeDefinition, setShowTypeDefinition] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState(null);

  // Calculate simultaneities and interval data
  const { intervalPoints, allSims, maxTime, minPitch, maxPitch } = useMemo(() => {
    if (!voice1?.notes?.length || !voice2?.notes?.length) {
      return { intervalPoints: [], allSims: [], maxTime: 0, minPitch: 60, maxPitch: 72 };
    }

    const v1 = voice1.notes;
    const v2 = voice2.notes;
    const meter = getMeter();

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
          sims.push(new Simultaneity(start, n1, n2, metricWeight(start, meter)));
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
  // Preparation: blue-green (consonance preparing dissonance)
  // Dissonance: purple spectrum (handled), red (bad)
  // Resolution: bright green (good), orange (poor)
  // Normal: pale green
  const getScoreStyle = (pt) => {
    const { category, score, isConsonant } = pt;

    // Consonances
    if (isConsonant) {
      switch (category) {
        case 'consonant_preparation':
          // Blue-green for preparation - distinct from normal consonance
          return { color: '#0891b2', bg: '#cffafe', label: 'Preparation', lineColor: '#06b6d4' };
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
        if (score >= 2.0) return { color: '#7c3aed', bg: '#ddd6fe', label: 'Strong', lineColor: '#8b5cf6' };
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

            {/* Beat grid - meter-aware */}
            {(() => {
              const meter = getMeter();
              const gridLines = generateGridLines(maxTime, meter, { showSubdivisions: false });

              return gridLines.map((line, i) => {
                const x = tToX(line.time);
                return (
                  <g key={`grid-${i}`}>
                    <line
                      x1={x} y1={headerHeight} x2={x} y2={h - 18}
                      stroke={line.isDownbeat ? '#64748b' : (line.isMainBeat ? '#94a3b8' : '#e2e8f0')}
                      strokeWidth={line.isDownbeat ? 1.5 : (line.isMainBeat ? 0.75 : 0.5)}
                    />
                    {/* Show measure.beat notation */}
                    {line.measureNum ? (
                      <text x={x} y={h - 4} fontSize="11" fill="#475569" textAnchor="middle" fontWeight="600">
                        m.{line.measureNum}
                      </text>
                    ) : line.beatNum ? (
                      <text x={x} y={h - 4} fontSize="9" fill="#94a3b8" textAnchor="middle">
                        {line.beatNum}
                      </text>
                    ) : null}
                  </g>
                );
              });
            })()}

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

            {/* Interval regions - semi-transparent filled areas between voices */}
            {(() => {
              return intervalPoints.map((pt, i) => {
                const x = tToX(pt.onset);
                const y1 = pToY(pt.v1Pitch);
                const y2 = pToY(pt.v2Pitch);
                const midY = (y1 + y2) / 2;
                const isHighlighted = highlightedOnset === getOnsetKey(pt.onset);
                const isSelected = selectedInterval?.onset === pt.onset;
                const style = getScoreStyle(pt);

                // Calculate region width (to next interval or end)
                const nextPt = intervalPoints[i + 1];
                const regionEnd = nextPt ? tToX(nextPt.onset) : x + 15;
                const regionWidth = Math.max(4, regionEnd - x - 1);

                // Region height - span between voices, minimum 6px
                const regionTop = Math.min(y1, y2);
                const regionHeight = Math.max(6, Math.abs(y2 - y1));

                const label = pt.isConsonant
                  ? pt.intervalClass.toString()
                  : (pt.dissonanceLabel || '!');

                return (
                  <g key={`int-${i}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleIntervalClick(pt)}
                    onMouseEnter={() => setHighlightedOnset(getOnsetKey(pt.onset))}
                    onMouseLeave={() => setHighlightedOnset(null)}
                  >
                    {/* Semi-transparent region between voices */}
                    <rect
                      x={x}
                      y={regionTop}
                      width={regionWidth}
                      height={regionHeight}
                      fill={style.bg}
                      opacity={isHighlighted || isSelected ? 0.85 : 0.5}
                      rx={2}
                    />

                    {/* Border line on left edge for clarity */}
                    <line
                      x1={x}
                      y1={regionTop}
                      x2={x}
                      y2={regionTop + regionHeight}
                      stroke={style.color}
                      strokeWidth={isHighlighted || isSelected ? 2.5 : 1.5}
                      opacity={0.8}
                    />

                    {/* Show label only on hover/select */}
                    {(isHighlighted || isSelected) && (
                      <g>
                        {/* Label background */}
                        <rect
                          x={x + 2}
                          y={midY - 10}
                          width={28}
                          height={20}
                          fill={style.bg}
                          stroke={style.color}
                          strokeWidth={1.5}
                          rx={3}
                        />
                        {/* Label text */}
                        <text
                          x={x + 16}
                          y={midY + 4}
                          fontSize="11"
                          fontWeight="600"
                          fill={style.color}
                          textAnchor="middle"
                        >
                          {label}
                        </text>
                        {/* Score if non-zero */}
                        {(pt.score !== 0 || !pt.isConsonant) && (
                          <text
                            x={x + 16}
                            y={midY + 18}
                            fontSize="9"
                            fill={style.color}
                            textAnchor="middle"
                          >
                            {pt.score >= 0 ? '+' : ''}{pt.score.toFixed(1)}
                          </text>
                        )}
                      </g>
                    )}

                    {/* Small dot indicator for dissonances when not hovered */}
                    {!pt.isConsonant && !isHighlighted && !isSelected && (
                      <circle
                        cx={x + regionWidth / 2}
                        cy={midY}
                        r={4}
                        fill={style.color}
                        opacity={0.9}
                      />
                    )}
                  </g>
                );
              });
            })()}
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

      {/* Pattern Summary - actively display all detected patterns */}
      {(() => {
        const patternsWithOnsets = intervalPoints
          .filter(pt => pt.patterns && pt.patterns.length > 0)
          .map(pt => ({
            onset: pt.onset,
            patterns: pt.patterns,
            label: pt.dissonanceLabel,
            interval: pt.intervalName,
          }));

        if (patternsWithOnsets.length === 0) return null;

        // Count pattern types
        const patternCounts = {};
        patternsWithOnsets.forEach(p => {
          p.patterns.forEach(pat => {
            const type = pat.type;
            patternCounts[type] = (patternCounts[type] || 0) + 1;
          });
        });

        return (
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #c4b5fd',
            borderRadius: '8px',
            overflow: 'hidden',
            marginTop: '12px',
          }}>
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#f5f3ff',
              borderBottom: '1px solid #e9d5ff',
              fontWeight: '600',
              fontSize: '13px',
              color: '#6b21a8',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>Detected Patterns ({patternsWithOnsets.length})</span>
              <span style={{ fontSize: '11px', fontWeight: '400', color: '#7c3aed' }}>
                {Object.entries(patternCounts).map(([type, count]) => {
                  const label = type === 'passing' ? 'PT' :
                               type === 'neighbor' ? 'N' :
                               type === 'suspension' ? 'Sus' :
                               type === 'appoggiatura' ? 'App' :
                               type === 'anticipation' ? 'Ant' :
                               type === 'escape_tone' ? 'Esc' :
                               type.startsWith('cambiata') ? 'Cam' : type;
                  return `${count} ${label}`;
                }).join(' | ')}
              </span>
            </div>
            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
              {patternsWithOnsets.map((item, i) => {
                const isActive = highlightedOnset === getOnsetKey(item.onset);
                return (
                  <div
                    key={`pattern-${i}`}
                    onClick={() => {
                      setHighlightedOnset(getOnsetKey(item.onset));
                      const pt = intervalPoints.find(p => getOnsetKey(p.onset) === getOnsetKey(item.onset));
                      if (pt) setSelectedInterval(pt);
                    }}
                    style={{
                      padding: '8px 14px',
                      borderBottom: i < patternsWithOnsets.length - 1 ? '1px solid #f3f4f6' : 'none',
                      cursor: 'pointer',
                      backgroundColor: isActive ? '#f5f3ff' : 'white',
                      borderLeft: isActive ? '4px solid #8b5cf6' : '4px solid transparent',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '13px', color: '#374151' }}>
                      <span style={{
                        display: 'inline-block',
                        backgroundColor: '#ddd6fe',
                        color: '#6b21a8',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: '600',
                        fontSize: '11px',
                        marginRight: '8px',
                      }}>
                        {item.label}
                      </span>
                      {item.patterns[0].description}
                    </span>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                      {formatter?.formatBeat(item.onset) || `Beat ${item.onset + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

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
              <div style={{ fontWeight: '500', textTransform: 'capitalize' }}>{metricPosition(selectedInterval.onset, getMeter()).label}</div>
            </div>
            <div>
              <div style={{ color: '#6b7280', fontSize: '11px', marginBottom: '2px' }}>Type</div>
              {selectedInterval.isConsonant ? (
                <div style={{ fontWeight: '500' }}>Consonant</div>
              ) : (
                <div>
                  <button
                    onClick={() => setShowTypeDefinition(!showTypeDefinition)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontWeight: '500',
                      color: '#4f46e5',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      textDecorationStyle: 'dotted',
                      fontSize: 'inherit',
                    }}
                    title="Click for definition"
                  >
                    {DISSONANCE_DEFINITIONS[selectedInterval.dissonanceType]?.name || selectedInterval.dissonanceType || 'Dissonant'}
                  </button>
                  {showTypeDefinition && DISSONANCE_DEFINITIONS[selectedInterval.dissonanceType] && (
                    <div style={{
                      marginTop: '6px',
                      padding: '8px 10px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#374151',
                      lineHeight: '1.4',
                    }}>
                      {DISSONANCE_DEFINITIONS[selectedInterval.dissonanceType].definition}
                    </div>
                  )}
                </div>
              )}
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

          {/* Score breakdown - color coded */}
          {selectedInterval.scoreDetails && selectedInterval.scoreDetails.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Score breakdown
              </div>
              {selectedInterval.scoreDetails.map((detail, i) => {
                // Handle both old string format and new object format
                const isObject = typeof detail === 'object';
                const text = isObject ? detail.text : detail;
                const subtext = isObject ? detail.subtext : null;
                const impact = isObject ? detail.impact : 0;
                const type = isObject ? detail.type : 'info';

                // Color code by type
                let bgColor, borderColor, textColor, impactColor;
                if (type === 'bonus' || impact > 0) {
                  bgColor = '#dcfce7';
                  borderColor = '#86efac';
                  textColor = '#166534';
                  impactColor = '#16a34a';
                } else if (type === 'penalty' || impact < 0) {
                  bgColor = '#fee2e2';
                  borderColor = '#fca5a5';
                  textColor = '#991b1b';
                  impactColor = '#dc2626';
                } else {
                  bgColor = '#f3f4f6';
                  borderColor = '#d1d5db';
                  textColor = '#4b5563';
                  impactColor = '#6b7280';
                }

                return (
                  <div
                    key={i}
                    style={{
                      padding: '10px 12px',
                      marginBottom: '6px',
                      backgroundColor: bgColor,
                      borderRadius: '6px',
                      borderLeft: `3px solid ${borderColor}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: textColor, fontWeight: '500' }}>{text}</div>
                        {subtext && (
                          <div style={{ fontSize: '11px', color: textColor, opacity: 0.8, marginTop: '4px' }}>{subtext}</div>
                        )}
                      </div>
                      {impact !== 0 && (
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '700',
                          color: impactColor,
                          marginLeft: '12px',
                        }}>
                          {impact > 0 ? '+' : ''}{typeof impact === 'number' ? impact.toFixed(1) : impact}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
}

export default IntervalAnalysisViz;
