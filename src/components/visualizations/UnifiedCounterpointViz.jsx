import { useState, useMemo, useEffect } from 'react';
import { pitchName, metricWeight } from '../../utils/formatter';
import { Simultaneity } from '../../types';
import { scoreDissonance } from '../../utils/dissonanceScoring';
import { generateGridLines, VIZ_COLORS, getIntervalStyle } from '../../utils/vizConstants';

// Transposition options - includes octaves, fifths, fourths, sixths, and thirds
const TRANSPOSITION_OPTIONS = [
  { value: 12, label: '+P8 (up octave)', shortLabel: '+8ve' },
  { value: 9, label: '+M6 (up major 6th)', shortLabel: '+M6' },
  { value: 8, label: '+m6 (up minor 6th)', shortLabel: '+m6' },
  { value: 7, label: '+P5 (up fifth)', shortLabel: '+5th' },
  { value: 5, label: '+P4 (up fourth)', shortLabel: '+4th' },
  { value: 4, label: '+M3 (up major 3rd)', shortLabel: '+M3' },
  { value: 3, label: '+m3 (up minor 3rd)', shortLabel: '+m3' },
  { value: 0, label: 'Original', shortLabel: 'orig' },
  { value: -3, label: '-m3 (down minor 3rd)', shortLabel: '-m3' },
  { value: -4, label: '-M3 (down major 3rd)', shortLabel: '-M3' },
  { value: -5, label: '-P4 (down fourth)', shortLabel: '-4th' },
  { value: -7, label: '-P5 (down fifth)', shortLabel: '-5th' },
  { value: -8, label: '-m6 (down minor 6th)', shortLabel: '-m6' },
  { value: -9, label: '-M6 (down major 6th)', shortLabel: '-M6' },
  { value: -12, label: '-P8 (down octave)', shortLabel: '-8ve' },
  { value: -19, label: '-P12 (down 12th)', shortLabel: '-12th' },
  { value: -24, label: '-P15 (down 2 octaves)', shortLabel: '-15th' },
];

/**
 * Unified Counterpoint Visualization
 * Clean design matching StrettoViz - notes as colored rectangles,
 * interval labels only on hover, minimal visual clutter.
 */
export function UnifiedCounterpointViz({
  voices,
  formatter,
  meter = [4, 4],
  defaultVoice1 = 'answer',
  defaultVoice2 = 'cs1',
  defaultTransposition = 0,
}) {
  const [voice1Key, setVoice1Key] = useState(defaultVoice1);
  const [voice2Key, setVoice2Key] = useState(defaultVoice2);
  const [transposition, setTransposition] = useState(defaultTransposition);
  const [selectedInterval, setSelectedInterval] = useState(null);
  const [highlightedOnset, setHighlightedOnset] = useState(null);

  // Available voices for selection
  const availableVoices = useMemo(() => {
    const available = [];
    if (voices.subject?.length) available.push({ key: 'subject', label: 'Subject', color: VIZ_COLORS.voiceDux });
    if (voices.answer?.length) available.push({ key: 'answer', label: 'Answer', color: '#f59e0b' });
    if (voices.cs1?.length) available.push({ key: 'cs1', label: 'Countersubject', color: VIZ_COLORS.voiceCSAbove });
    if (voices.cs2?.length) available.push({ key: 'cs2', label: 'Countersubject 2', color: '#ec4899' });
    return available;
  }, [voices]);

  // Reset voice selection if current selection becomes invalid
  useEffect(() => {
    const availableKeys = availableVoices.map(v => v.key);
    if (availableKeys.length >= 2) {
      // If voice1Key is not available, pick first available
      if (!availableKeys.includes(voice1Key)) {
        setVoice1Key(availableKeys[0]);
      }
      // If voice2Key is not available or same as voice1Key, pick different one
      if (!availableKeys.includes(voice2Key) || voice2Key === voice1Key) {
        const otherKey = availableKeys.find(k => k !== voice1Key);
        if (otherKey) setVoice2Key(otherKey);
      }
    }
  }, [availableVoices, voice1Key, voice2Key]);

  // Reset selectedInterval when analysis inputs change
  useEffect(() => {
    setSelectedInterval(null);
    setHighlightedOnset(null);
  }, [voice1Key, voice2Key, transposition]);

  const voice1 = voices[voice1Key];
  const voice2 = voices[voice2Key];
  const voice1Info = availableVoices.find(v => v.key === voice1Key);
  const voice2Info = availableVoices.find(v => v.key === voice2Key);

  // Analysis with transposition
  const analysis = useMemo(() => {
    if (!voice1?.length || !voice2?.length) return null;

    const transposedVoice2 = voice2.map(n => ({
      ...n,
      pitch: n.pitch + transposition,
    }));

    const findSims = (v1, v2) => {
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
      return sims.sort((a, b) => a.onset - b.onset);
    };

    const sims = findSims(voice1, transposedVoice2);

    const intervalHistory = [];
    const intervalPoints = [];
    const beatMap = new Map();

    for (let i = 0; i < sims.length; i++) {
      const sim = sims[i];
      const snapBeat = Math.round(sim.onset * 4) / 4;

      if (!beatMap.has(snapBeat)) {
        const scoring = scoreDissonance(sim, sims, i, intervalHistory);
        const point = {
          onset: sim.onset,
          v1Pitch: sim.voice1Note.pitch,
          v2Pitch: sim.voice2Note.pitch,
          intervalClass: sim.interval.class,
          intervalName: sim.interval.toString(),
          isConsonant: scoring.isConsonant,
          isStrong: sim.metricWeight >= 0.75,
          category: scoring.category || 'consonant_normal',
          score: scoring.score,
          entryScore: scoring.entryScore,  // NEW: for dissonance coloring
          exitScore: scoring.exitScore,    // NEW: for resolution coloring
          scoreDetails: scoring.details,
          type: scoring.type,
          // Full scoring breakdown for detailed display
          entry: scoring.entry,            // Entry motion details
          exit: scoring.exit,              // Exit/resolution details
          patterns: scoring.patterns,      // Pattern information
        };
        beatMap.set(snapBeat, point);
        intervalPoints.push(point);
        intervalHistory.push(sim.interval.class);
      }
    }

    const allPitches = [
      ...voice1.map(n => n.pitch),
      ...transposedVoice2.map(n => n.pitch),
    ];
    const maxTime = Math.max(
      ...voice1.map(n => n.onset + n.duration),
      ...transposedVoice2.map(n => n.onset + n.duration)
    );

    const issues = intervalPoints.filter(p => !p.isConsonant && p.score < 0 && p.isStrong);
    const warnings = intervalPoints.filter(p => !p.isConsonant && p.score < 0 && !p.isStrong);

    const dissonances = intervalPoints.filter(p => !p.isConsonant);
    const avgScore = dissonances.length > 0
      ? dissonances.reduce((sum, p) => sum + p.score, 0) / dissonances.length
      : 0;

    return {
      voice1,
      transposedVoice2,
      intervalPoints,
      beatMap,
      issues,
      warnings,
      avgScore,
      minPitch: Math.min(...allPitches) - 2,
      maxPitch: Math.max(...allPitches) + 2,
      maxTime,
    };
  }, [voice1, voice2, transposition, meter]);

  if (!analysis || !voice1Info || !voice2Info) {
    return (
      <div style={{ padding: '16px', color: '#6b7280', fontStyle: 'italic' }}>
        Select two voices to compare
      </div>
    );
  }

  const { minPitch, maxPitch, maxTime, intervalPoints, issues, warnings, avgScore } = analysis;
  const pRange = maxPitch - minPitch;
  const noteHeight = 18;
  const headerHeight = 32;
  const h = pRange * noteHeight + headerHeight + 20;
  const pixelsPerBeat = 70;
  const w = Math.max(500, maxTime * pixelsPerBeat + 100);

  const tScale = (w - 80) / maxTime;
  const pToY = (p) => h - 20 - (p - minPitch) * noteHeight;
  const tToX = (t) => 60 + t * tScale;

  const hasIssues = issues.length > 0;
  const hasWarnings = warnings.length > 0;

  const colors = {
    bg: hasIssues ? VIZ_COLORS.issueBackground : hasWarnings ? VIZ_COLORS.warningBackground : VIZ_COLORS.cleanBackground,
    border: hasIssues ? VIZ_COLORS.issueBorder : hasWarnings ? VIZ_COLORS.warningBorder : VIZ_COLORS.cleanBorder,
    highlight: VIZ_COLORS.highlight,
  };

  const getOnsetKey = (onset) => Math.round(onset * 4) / 4;

  const handleIntervalClick = (pt, event) => {
    if (event) event.preventDefault(); // Prevent double-firing on touch devices
    setSelectedInterval(selectedInterval?.onset === pt.onset ? null : pt);
    setHighlightedOnset(getOnsetKey(pt.onset));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        padding: '12px 16px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
      }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Voice 1</label>
          <select
            value={voice1Key}
            onChange={(e) => setVoice1Key(e.target.value)}
            style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
          >
            {availableVoices.map(v => (
              <option key={v.key} value={v.key}>{v.label}</option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '16px', color: '#94a3b8', paddingBottom: '8px' }}>vs</div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Voice 2</label>
          <select
            value={voice2Key}
            onChange={(e) => setVoice2Key(e.target.value)}
            style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
          >
            {availableVoices.filter(v => v.key !== voice1Key).map(v => (
              <option key={v.key} value={v.key}>{v.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Transpose Voice 2</label>
          <select
            value={transposition}
            onChange={(e) => setTransposition(parseInt(e.target.value))}
            style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
          >
            {TRANSPOSITION_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div style={{
          marginLeft: 'auto',
          padding: '8px 16px',
          borderRadius: '8px',
          backgroundColor: avgScore >= 0.5 ? '#dcfce7' : avgScore >= 0 ? '#fef9c3' : '#fee2e2',
          border: `1px solid ${avgScore >= 0.5 ? '#86efac' : avgScore >= 0 ? '#fde047' : '#fca5a5'}`,
        }}>
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Avg Score</div>
          <div style={{
            fontSize: '18px',
            fontWeight: '700',
            color: avgScore >= 0.5 ? '#16a34a' : avgScore >= 0 ? '#ca8a04' : '#dc2626',
          }}>
            {avgScore >= 0 ? '+' : ''}{avgScore.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Main visualization */}
      <div style={{
        border: `2px solid ${colors.border}`,
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: colors.bg,
      }}>
        <div style={{ overflowX: 'auto' }}>
          <svg width={w} height={h} style={{ display: 'block' }}>
            {/* Header */}
            <rect x={0} y={0} width={w} height={headerHeight} fill="rgba(0,0,0,0.04)" />
            <text x={16} y={22} fontSize="14" fontWeight="600" fill="#374151">
              {voice1Info.label} vs {voice2Info.label}
              {transposition !== 0 && ` (${TRANSPOSITION_OPTIONS.find(o => o.value === transposition)?.shortLabel})`}
            </text>
            <text x={w - 16} y={22} fontSize="12" fill="#6b7280" textAnchor="end">
              {hasIssues ? `${issues.length} issue${issues.length !== 1 ? 's' : ''}` :
               hasWarnings ? `${warnings.length} warning${warnings.length !== 1 ? 's' : ''}` : 'Clean'}
            </text>

            {/* Beat grid */}
            {(() => {
              const gridLines = generateGridLines(maxTime, meter, { showSubdivisions: false });
              return gridLines.map((line, i) => {
                const x = tToX(line.time);
                return (
                  <g key={`grid-${i}`}>
                    <line
                      x1={x} y1={headerHeight} x2={x} y2={h - 18}
                      stroke={line.isDownbeat ? '#64748b' : (line.isMainBeat ? '#9ca3af' : '#e5e7eb')}
                      strokeWidth={line.isDownbeat ? 1.5 : (line.isMainBeat ? 0.75 : 0.5)}
                    />
                    {line.measureNum ? (
                      <text x={x} y={h - 4} fontSize="11" fill="#475569" textAnchor="middle" fontWeight="600">
                        m.{line.measureNum}
                      </text>
                    ) : line.beatNum ? (
                      <text x={x} y={h - 4} fontSize="9" fill="#9ca3af" textAnchor="middle">
                        {line.beatNum}
                      </text>
                    ) : null}
                  </g>
                );
              });
            })()}

            {/* Voice labels */}
            {(() => {
              const v1AvgPitch = analysis.voice1.reduce((s, n) => s + n.pitch, 0) / analysis.voice1.length;
              const v2AvgPitch = analysis.transposedVoice2.reduce((s, n) => s + n.pitch, 0) / analysis.transposedVoice2.length;
              const v1Higher = v1AvgPitch > v2AvgPitch;
              return (
                <>
                  <text x={12} y={pToY(maxPitch - 1) + 5} fontSize="11" fontWeight="600" fill={v1Higher ? voice1Info.color : voice2Info.color}>
                    {v1Higher ? voice1Info.label : voice2Info.label} (upper)
                  </text>
                  <text x={12} y={pToY(minPitch + 1) + 5} fontSize="11" fontWeight="600" fill={v1Higher ? voice2Info.color : voice1Info.color}>
                    {v1Higher ? voice2Info.label : voice1Info.label} (lower)
                  </text>
                </>
              );
            })()}

            {/* Voice 1 notes */}
            {analysis.voice1.map((n, i) => {
              const x = tToX(n.onset);
              const y = pToY(n.pitch);
              const width = Math.max(8, n.duration * tScale - 3);
              const isHighlighted = highlightedOnset !== null &&
                intervalPoints.some(pt => getOnsetKey(pt.onset) === highlightedOnset &&
                  n.onset <= pt.onset && pt.onset < n.onset + n.duration);

              return (
                <g key={`v1-${i}`}>
                  {isHighlighted && (
                    <rect
                      x={x - 4} y={y - noteHeight/2 - 3}
                      width={width + 8} height={noteHeight + 6}
                      fill={colors.highlight} rx={5} opacity={0.5}
                    />
                  )}
                  <rect
                    x={x} y={y - noteHeight/2 + 2}
                    width={width} height={noteHeight - 4}
                    fill={voice1Info.color} rx={4}
                  />
                  <text x={x + width/2} y={y + 4} fontSize="10" fill="white" textAnchor="middle" fontWeight="500">
                    {pitchName(n.pitch, n.preferFlats).replace(/\d/, '')}
                  </text>
                </g>
              );
            })}

            {/* Voice 2 notes (transposed) */}
            {analysis.transposedVoice2.map((n, i) => {
              const x = tToX(n.onset);
              const y = pToY(n.pitch);
              const width = Math.max(8, n.duration * tScale - 3);
              const isHighlighted = highlightedOnset !== null &&
                intervalPoints.some(pt => getOnsetKey(pt.onset) === highlightedOnset &&
                  n.onset <= pt.onset && pt.onset < n.onset + n.duration);

              return (
                <g key={`v2-${i}`}>
                  {isHighlighted && (
                    <rect
                      x={x - 4} y={y - noteHeight/2 - 3}
                      width={width + 8} height={noteHeight + 6}
                      fill={colors.highlight} rx={5} opacity={0.5}
                    />
                  )}
                  <rect
                    x={x} y={y - noteHeight/2 + 2}
                    width={width} height={noteHeight - 4}
                    fill={voice2Info.color} rx={4}
                  />
                  <text x={x + width/2} y={y + 4} fontSize="10" fill="white" textAnchor="middle" fontWeight="500">
                    {pitchName(n.pitch, n.preferFlats).replace(/\d/, '')}
                  </text>
                </g>
              );
            })}

            {/* Dissonance-resolution grouping backgrounds */}
            {intervalPoints.map((pt, i) => {
              // If this is a dissonance followed by a resolution, draw a subtle grouping background
              if (!pt.isConsonant) {
                const nextPt = intervalPoints[i + 1];
                if (nextPt && nextPt.category === 'consonant_resolution') {
                  const x = tToX(pt.onset);
                  const groupWidth = (nextPt.onset - pt.onset + (intervalPoints[i + 2] ? (intervalPoints[i + 2].onset - nextPt.onset) : 0.5)) * tScale;
                  return (
                    <rect
                      key={`group-${i}`}
                      x={x - 2}
                      y={headerHeight}
                      width={groupWidth + 4}
                      height={h - headerHeight - 18}
                      fill="rgba(139, 92, 246, 0.08)"
                      stroke="rgba(139, 92, 246, 0.15)"
                      strokeWidth={1}
                      strokeDasharray="3,3"
                      rx={4}
                      pointerEvents="none"
                    />
                  );
                }
              }
              return null;
            })}

            {/* Interval regions - subtle, only show label on hover */}
            {intervalPoints.map((pt, i) => {
              const x = tToX(pt.onset);
              const isHighlighted = highlightedOnset === getOnsetKey(pt.onset);
              const isSelected = selectedInterval?.onset === pt.onset;

              const y1 = pToY(pt.v1Pitch);
              const y2 = pToY(pt.v2Pitch);
              const midY = (y1 + y2) / 2;

              const nextPt = intervalPoints[i + 1];
              const regionWidth = nextPt
                ? Math.max(4, (nextPt.onset - pt.onset) * tScale - 2)
                : Math.max(20, tScale * 0.5);

              const isPerfect = [1, 5, 8].includes(pt.intervalClass);
              const style = getIntervalStyle({
                isConsonant: pt.isConsonant,
                isPerfect,
                score: pt.score || 0,
                entryScore: pt.entryScore,  // NEW: for purple-red dissonance coloring
                exitScore: pt.exitScore,    // NEW: for emerald-amber resolution coloring
                category: pt.category,
              });

              const label = pt.isConsonant
                ? pt.intervalClass.toString()
                : (pt.dissonanceLabel || '!');

              return (
                <g
                  key={`int-${i}`}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => handleIntervalClick(pt, e)}
                  onTouchStart={(e) => handleIntervalClick(pt, e)}
                  onMouseEnter={() => setHighlightedOnset(getOnsetKey(pt.onset))}
                  onMouseLeave={() => !isSelected && setHighlightedOnset(null)}
                >
                  {/* Subtle region - only visible on hover/select for dissonances, or very faint for consonances */}
                  {(isHighlighted || isSelected || !pt.isConsonant) && (
                    <rect
                      x={x}
                      y={headerHeight}
                      width={regionWidth}
                      height={h - headerHeight - 18}
                      fill={style.fill}
                      opacity={isHighlighted || isSelected ? 0.7 : 0.15}
                      rx={3}
                    />
                  )}

                  {/* Show label only on hover/select */}
                  {(isHighlighted || isSelected) && (
                    <g>
                      <rect
                        x={x + regionWidth / 2 - 16}
                        y={midY - 12}
                        width={32}
                        height={24}
                        fill={style.bg}
                        stroke={style.color}
                        strokeWidth={1}
                        rx={4}
                        opacity={0.95}
                      />
                      <text
                        x={x + regionWidth / 2}
                        y={midY + 4}
                        fontSize="12"
                        fontWeight="600"
                        fill={style.color}
                        textAnchor="middle"
                      >
                        {label}
                      </text>
                      {/* Score indicator - show entry for dissonances, exit for resolutions */}
                      {!pt.isConsonant && pt.entryScore !== undefined && (
                        <text
                          x={x + regionWidth / 2}
                          y={midY + 20}
                          fontSize="9"
                          fontWeight="600"
                          fill={style.color}
                          textAnchor="middle"
                        >
                          Entry: {pt.entryScore >= 0 ? '+' : ''}{pt.entryScore.toFixed(1)}
                        </text>
                      )}
                      {pt.category === 'consonant_resolution' && pt.exitScore !== undefined && (
                        <text
                          x={x + regionWidth / 2}
                          y={midY + 20}
                          fontSize="9"
                          fontWeight="600"
                          fill={style.color}
                          textAnchor="middle"
                        >
                          Exit: {pt.exitScore >= 0 ? '+' : ''}{pt.exitScore.toFixed(1)}
                        </text>
                      )}
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Selected interval detail panel */}
      {selectedInterval && voice1Info && voice2Info && (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #6366f1',
          borderRadius: '8px',
          padding: '14px',
        }}>
          {(() => {
            const pt = selectedInterval;
            if (!pt || pt.score === undefined) return null;
            const style = getIntervalStyle({
              isConsonant: pt.isConsonant,
              isPerfect: [1, 5, 8].includes(pt.intervalClass),
              entryScore: pt.entryScore,  // NEW
              exitScore: pt.exitScore,    // NEW
              score: pt.score,
              category: pt.category,
            });
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontWeight: '600', color: '#1f2937' }}>
                    {formatter?.formatBeat(pt.onset) || `Beat ${pt.onset + 1}`}
                  </span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{
                      padding: '4px 10px',
                      backgroundColor: style.bg,
                      color: style.color,
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                    }}>
                      {pt.intervalName} — {style.label}
                    </span>
                    {!pt.isConsonant && pt.entryScore !== undefined && (
                      <span style={{
                        padding: '4px 10px',
                        backgroundColor: pt.entryScore >= 0 ? '#e0e7ff' : '#fee2e2',
                        color: pt.entryScore >= 0 ? '#4f46e5' : '#dc2626',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                      }}>
                        Entry: {pt.entryScore >= 0 ? '+' : ''}{pt.entryScore.toFixed(1)}
                      </span>
                    )}
                    {pt.category === 'consonant_resolution' && pt.exitScore !== undefined && (
                      <span style={{
                        padding: '4px 10px',
                        backgroundColor: pt.exitScore >= 0 ? '#d1fae5' : '#fed7aa',
                        color: pt.exitScore >= 0 ? '#059669' : '#ea580c',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                      }}>
                        Exit: {pt.exitScore >= 0 ? '+' : ''}{pt.exitScore.toFixed(1)}
                      </span>
                    )}
                    <button
                      onClick={() => { setSelectedInterval(null); setHighlightedOnset(null); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#9ca3af' }}
                    >×</button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ padding: '8px 12px', backgroundColor: `${voice1Info.color}15`, borderRadius: '6px', borderLeft: `3px solid ${voice1Info.color}` }}>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{voice1Info.label}</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: voice1Info.color }}>{pitchName(pt.v1Pitch)}</div>
                  </div>
                  <div style={{ padding: '8px 12px', backgroundColor: `${voice2Info.color}15`, borderRadius: '6px', borderLeft: `3px solid ${voice2Info.color}` }}>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{voice2Info.label}</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: voice2Info.color }}>{pitchName(pt.v2Pitch)}</div>
                  </div>
                </div>

                {/* Detailed Score Breakdown */}
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '14px', fontSize: '12px' }}>
                  <div style={{ fontWeight: '700', marginBottom: '12px', color: '#1e293b', fontSize: '14px', borderBottom: '2px solid #cbd5e1', paddingBottom: '6px' }}>
                    Score Breakdown
                  </div>

                  {/* For Dissonances: Show complete Entry, Patterns, Exit breakdown */}
                  {!pt.isConsonant && pt.entry && pt.exit && (
                    <>
                      {/* ENTRY SECTION */}
                      <div style={{ marginBottom: '12px', backgroundColor: '#ede9fe', borderLeft: '3px solid #6366f1', borderRadius: '4px', padding: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: '700', color: '#6366f1', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Entry Motion
                          </span>
                          <span style={{
                            fontWeight: '700',
                            color: '#1e293b',
                            backgroundColor: '#f1f5f9',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px'
                          }}>
                            Base: {pt.entry.score >= 0 ? '+' : ''}{pt.entry.score.toFixed(2)}
                          </span>
                        </div>
                        {pt.entry.details && pt.entry.details.map((detail, i) => (
                          <div key={i} style={{
                            fontSize: '11px',
                            color: '#475569',
                            marginBottom: '2px',
                            paddingLeft: '8px',
                            display: 'flex',
                            alignItems: 'flex-start'
                          }}>
                            <span style={{ color: '#6366f1', marginRight: '6px', fontWeight: '600' }}>•</span>
                            <span>{detail}</span>
                          </div>
                        ))}
                      </div>

                      {/* PATTERN SECTION */}
                      {pt.patterns && pt.patterns.length > 0 && (
                        <div style={{ marginBottom: '12px', backgroundColor: '#f3e8ff', borderLeft: '3px solid #a855f7', borderRadius: '4px', padding: '10px' }}>
                          <div style={{ fontWeight: '700', color: '#a855f7', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                            Recognized Patterns
                          </div>
                          {pt.patterns.map((pattern, i) => (
                            <div key={i} style={{ marginBottom: '8px', backgroundColor: 'white', borderRadius: '4px', padding: '8px' }}>
                              <div style={{ fontWeight: '600', color: '#7c3aed', fontSize: '11px', marginBottom: '4px' }}>
                                {pattern.type.replace(/_/g, ' ').toUpperCase()}
                              </div>
                              <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontStyle: 'italic' }}>
                                {pattern.description}
                              </div>
                              <div style={{ display: 'flex', gap: '8px', fontSize: '10px' }}>
                                <span style={{
                                  backgroundColor: '#ddd6fe',
                                  color: '#6366f1',
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  fontWeight: '600'
                                }}>
                                  Entry: +{(pattern.entryBonus || 0).toFixed(2)}
                                </span>
                                <span style={{
                                  backgroundColor: '#d1fae5',
                                  color: '#059669',
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  fontWeight: '600'
                                }}>
                                  Exit: +{(pattern.exitBonus || 0).toFixed(2)}
                                </span>
                                <span style={{
                                  backgroundColor: '#fef3c7',
                                  color: '#b45309',
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  fontWeight: '600'
                                }}>
                                  Total: +{pattern.bonus.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* EXIT SECTION */}
                      <div style={{ marginBottom: '12px', backgroundColor: '#d1fae5', borderLeft: '3px solid #059669', borderRadius: '4px', padding: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: '700', color: '#059669', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Exit/Resolution
                          </span>
                          <span style={{
                            fontWeight: '700',
                            color: '#1e293b',
                            backgroundColor: '#f1f5f9',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px'
                          }}>
                            Base: {pt.exit.score >= 0 ? '+' : ''}{pt.exit.score.toFixed(2)}
                          </span>
                        </div>
                        {pt.exit.details && pt.exit.details.map((detail, i) => (
                          <div key={i} style={{
                            fontSize: '11px',
                            color: '#475569',
                            marginBottom: '2px',
                            paddingLeft: '8px',
                            display: 'flex',
                            alignItems: 'flex-start'
                          }}>
                            <span style={{ color: '#059669', marginRight: '6px', fontWeight: '600' }}>•</span>
                            <span>{detail}</span>
                          </div>
                        ))}
                      </div>

                      {/* SCORE SUMMARY */}
                      <div style={{ backgroundColor: '#ffffff', border: '2px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: '600', color: '#64748b', fontSize: '11px' }}>Entry Score</span>
                          <span style={{
                            fontWeight: '700',
                            color: pt.entryScore >= 0 ? '#4f46e5' : '#dc2626',
                            fontSize: '12px'
                          }}>
                            {pt.entryScore >= 0 ? '+' : ''}{pt.entryScore.toFixed(2)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: '600', color: '#64748b', fontSize: '11px' }}>Exit Score</span>
                          <span style={{
                            fontWeight: '700',
                            color: pt.exitScore >= 0 ? '#059669' : '#ea580c',
                            fontSize: '12px'
                          }}>
                            {pt.exitScore >= 0 ? '+' : ''}{pt.exitScore.toFixed(2)}
                          </span>
                        </div>
                        <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '6px', marginTop: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '13px' }}>TOTAL</span>
                            <span style={{
                              fontWeight: '800',
                              color: pt.score >= 0 ? '#16a34a' : '#dc2626',
                              fontSize: '16px'
                            }}>
                              {pt.score >= 0 ? '+' : ''}{pt.score.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* For Consonant Resolutions: Show resolution details */}
                  {pt.isConsonant && pt.category === 'consonant_resolution' && (
                    <>
                      <div style={{ backgroundColor: '#d1fae5', borderLeft: '3px solid #059669', borderRadius: '4px', padding: '10px', marginBottom: '12px' }}>
                        <div style={{ fontWeight: '700', color: '#059669', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                          Resolution Quality
                        </div>
                        {pt.scoreDetails && pt.scoreDetails.map((detail, i) => (
                          <div key={i} style={{ fontSize: '11px', color: '#475569', marginBottom: '4px', paddingLeft: '8px' }}>
                            {typeof detail === 'object' ? (
                              <>
                                <div style={{ fontWeight: '600', marginBottom: '2px', display: 'flex', alignItems: 'flex-start' }}>
                                  <span style={{ color: '#059669', marginRight: '6px' }}>•</span>
                                  <span>{detail.text}</span>
                                </div>
                                {detail.subtext && (
                                  <div style={{ paddingLeft: '20px', fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>
                                    {detail.subtext}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                                <span style={{ color: '#059669', marginRight: '6px', fontWeight: '600' }}>•</span>
                                <span>{detail}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div style={{ backgroundColor: '#ffffff', border: '2px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '700', color: '#059669', fontSize: '12px', textTransform: 'uppercase' }}>Exit Score</span>
                          <span style={{
                            fontWeight: '800',
                            color: pt.exitScore >= 0 ? '#059669' : '#ea580c',
                            fontSize: '16px'
                          }}>
                            {pt.exitScore >= 0 ? '+' : ''}{pt.exitScore.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* For regular consonances */}
                  {pt.isConsonant && pt.category !== 'consonant_resolution' && pt.scoreDetails && (
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {pt.scoreDetails.map((detail, i) => (
                        <div key={i} style={{ marginBottom: '4px', paddingLeft: '8px', display: 'flex', alignItems: 'flex-start' }}>
                          {typeof detail === 'object' ? (
                            <>
                              <span style={{ color: '#0891b2', marginRight: '6px', fontWeight: '600' }}>•</span>
                              <div>
                                <div style={{ fontWeight: '600', color: '#475569' }}>{detail.text}</div>
                                {detail.subtext && (
                                  <div style={{ paddingLeft: '0px', fontSize: '10px', color: '#94a3b8', marginTop: '2px', fontStyle: 'italic' }}>
                                    {detail.subtext}
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <span style={{ color: '#0891b2', marginRight: '6px', fontWeight: '600' }}>•</span>
                              <span>{detail}</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Issues list */}
      {issues.length > 0 && (
        <div style={{
          backgroundColor: '#fff',
          border: `1px solid ${VIZ_COLORS.issueBorder}`,
          borderRadius: '8px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 14px',
            backgroundColor: VIZ_COLORS.issueBackground,
            borderBottom: `1px solid ${VIZ_COLORS.issueBorder}`,
            fontWeight: '600',
            fontSize: '13px',
            color: VIZ_COLORS.issueText,
          }}>
            Strong-beat dissonance issues ({issues.length})
          </div>
          {issues.map((issue, i) => (
            <div
              key={i}
              onClick={(e) => handleIntervalClick(issue, e)}
              onTouchStart={(e) => handleIntervalClick(issue, e)}
              style={{
                padding: '10px 14px',
                borderBottom: i < issues.length - 1 ? `1px solid ${VIZ_COLORS.issueBackground}` : 'none',
                fontSize: '13px',
                cursor: 'pointer',
                backgroundColor: selectedInterval?.onset === issue.onset ? '#fef2f2' : 'transparent',
              }}
            >
              <span style={{ color: VIZ_COLORS.dissonantProblematic, fontWeight: '600' }}>
                {formatter?.formatBeat(issue.onset) || `Beat ${issue.onset + 1}`}:
              </span>
              <span style={{ marginLeft: '8px' }}>{issue.intervalName}</span>
              <span style={{ marginLeft: '8px', color: '#dc2626', fontWeight: '600' }}>
                ({issue.score.toFixed(2)})
              </span>
              {issue.type && (
                <span style={{ marginLeft: '8px', color: '#6b7280', fontSize: '12px' }}>
                  — {issue.type}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default UnifiedCounterpointViz;
