import { useState, useMemo } from 'react';
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
 * Combines voice comparison, invertibility analysis, and transposition testing
 * in a single flexible view using the stretto-style color scheme.
 */
export function UnifiedCounterpointViz({
  voices,           // { subject: [], answer: [], cs1: [], cs2: [] }
  formatter,
  meter = [4, 4],
  defaultVoice1 = 'answer',
  defaultVoice2 = 'cs1',
  defaultTransposition = 0,
  title = 'Counterpoint Analysis',
}) {
  const [voice1Key, setVoice1Key] = useState(defaultVoice1);
  const [voice2Key, setVoice2Key] = useState(defaultVoice2);
  const [transposition, setTransposition] = useState(defaultTransposition);
  const [selectedBeat, setSelectedBeat] = useState(null);
  const [highlightedOnset, setHighlightedOnset] = useState(null);
  const [showDetails, setShowDetails] = useState(true);

  // Available voices for selection
  const availableVoices = useMemo(() => {
    const available = [];
    if (voices.subject?.length) available.push({ key: 'subject', label: 'Subject', color: VIZ_COLORS.voiceDux });
    if (voices.answer?.length) available.push({ key: 'answer', label: 'Answer', color: '#f59e0b' });
    if (voices.cs1?.length) available.push({ key: 'cs1', label: 'Countersubject', color: VIZ_COLORS.voiceCSAbove });
    if (voices.cs2?.length) available.push({ key: 'cs2', label: 'Countersubject 2', color: '#ec4899' });
    return available;
  }, [voices]);

  // Get selected voices
  const voice1 = voices[voice1Key];
  const voice2 = voices[voice2Key];
  const voice1Info = availableVoices.find(v => v.key === voice1Key);
  const voice2Info = availableVoices.find(v => v.key === voice2Key);

  // Analysis with transposition
  const analysis = useMemo(() => {
    if (!voice1?.length || !voice2?.length) return null;

    // Apply transposition to voice 2
    const transposedVoice2 = voice2.map(n => ({
      ...n,
      pitch: n.pitch + transposition,
    }));

    // Find all simultaneities
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

    // Score each simultaneity
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
          scoreDetails: scoring.details,
          type: scoring.type,
          patterns: scoring.patterns,
        };
        beatMap.set(snapBeat, point);
        intervalPoints.push(point);
        intervalHistory.push(sim.interval.class);
      }
    }

    // Calculate pitch ranges
    const allPitches = [
      ...voice1.map(n => n.pitch),
      ...transposedVoice2.map(n => n.pitch),
    ];
    const maxTime = Math.max(
      ...voice1.map(n => n.onset + n.duration),
      ...transposedVoice2.map(n => n.onset + n.duration)
    );

    // Identify issues (negative scores on strong beats)
    const issues = intervalPoints.filter(p => !p.isConsonant && p.score < 0 && p.isStrong);
    const warnings = intervalPoints.filter(p => !p.isConsonant && p.score < 0 && !p.isStrong);

    // Calculate aggregate score
    const dissonances = intervalPoints.filter(p => !p.isConsonant);
    const avgScore = dissonances.length > 0
      ? dissonances.reduce((sum, p) => sum + p.score, 0) / dissonances.length
      : 0;

    return {
      voice1,
      transposedVoice2,
      sims,
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

  const { minPitch, maxPitch, maxTime, intervalPoints, beatMap, issues, warnings, avgScore } = analysis;
  const pRange = maxPitch - minPitch;
  const noteHeight = Math.max(14, Math.min(18, 300 / pRange));
  const headerHeight = 36;
  const h = pRange * noteHeight + headerHeight + 30;
  const pixelsPerBeat = 60;
  const w = Math.max(600, maxTime * pixelsPerBeat + 120);

  const tScale = (w - 100) / maxTime;
  const pToY = (p) => h - 24 - (p - minPitch) * noteHeight;
  const tToX = (t) => 70 + t * tScale;

  const hasIssues = issues.length > 0;
  const hasWarnings = warnings.length > 0;

  // Colors from stretto viz
  const colors = {
    bg: hasIssues ? VIZ_COLORS.issueBackground : hasWarnings ? VIZ_COLORS.warningBackground : VIZ_COLORS.cleanBackground,
    border: hasIssues ? VIZ_COLORS.issueBorder : hasWarnings ? VIZ_COLORS.warningBorder : VIZ_COLORS.cleanBorder,
  };

  const getOnsetKey = (onset) => Math.round(onset * 4) / 4;

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
        {/* Voice 1 selector */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
            Voice 1
          </label>
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

        {/* Voice 2 selector */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
            Voice 2
          </label>
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

        {/* Transposition */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
            Transpose Voice 2
          </label>
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

        {/* Score display */}
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
            <text x={16} y={24} fontSize="14" fontWeight="600" fill="#374151">
              {voice1Info.label} vs {voice2Info.label}
              {transposition !== 0 && ` (${TRANSPOSITION_OPTIONS.find(o => o.value === transposition)?.shortLabel})`}
            </text>
            <text x={w - 16} y={24} fontSize="12" fill="#6b7280" textAnchor="end">
              {hasIssues ? `${issues.length} issue${issues.length !== 1 ? 's' : ''}` :
               hasWarnings ? `${warnings.length} warning${warnings.length !== 1 ? 's' : ''}` : 'Clean'}
            </text>

            {/* Beat grid */}
            {(() => {
              const gridLines = generateGridLines(maxTime, meter, { showSubdivisions: false });
              return gridLines.map((line, i) => (
                <g key={`grid-${i}`}>
                  <line
                    x1={tToX(line.time)} y1={headerHeight}
                    x2={tToX(line.time)} y2={h - 20}
                    stroke={line.isDownbeat ? VIZ_COLORS.gridDownbeat : (line.isMainBeat ? VIZ_COLORS.gridMainBeat : VIZ_COLORS.gridSubdivision)}
                    strokeWidth={line.isDownbeat ? 1.5 : (line.isMainBeat ? 0.75 : 0.5)}
                  />
                  {line.measureNum && (
                    <text x={tToX(line.time)} y={h - 6} fontSize="11" fill="#475569" textAnchor="middle" fontWeight="600">
                      m.{line.measureNum}
                    </text>
                  )}
                </g>
              ));
            })()}

            {/* Voice 1 notes */}
            {analysis.voice1.map((n, i) => {
              const x = tToX(n.onset);
              const y = pToY(n.pitch);
              const noteWidth = Math.max(8, n.duration * tScale - 2);
              return (
                <g key={`v1-${i}`}>
                  <rect
                    x={x} y={y - noteHeight/2 + 1}
                    width={noteWidth} height={noteHeight - 2}
                    fill={voice1Info.color}
                    rx={4}
                  />
                  <text x={x + noteWidth/2} y={y + 4} fontSize="10" fill="white" textAnchor="middle" fontWeight="500">
                    {pitchName(n.pitch, n.preferFlats).replace(/\d/, '')}
                  </text>
                </g>
              );
            })}

            {/* Voice 2 notes (transposed) */}
            {analysis.transposedVoice2.map((n, i) => {
              const x = tToX(n.onset);
              const y = pToY(n.pitch);
              const noteWidth = Math.max(8, n.duration * tScale - 2);
              return (
                <g key={`v2-${i}`}>
                  <rect
                    x={x} y={y - noteHeight/2 + 1}
                    width={noteWidth} height={noteHeight - 2}
                    fill={voice2Info.color}
                    rx={4}
                    opacity={0.85}
                  />
                  <text x={x + noteWidth/2} y={y + 4} fontSize="10" fill="white" textAnchor="middle" fontWeight="500">
                    {pitchName(n.pitch, n.preferFlats).replace(/\d/, '')}
                  </text>
                </g>
              );
            })}

            {/* Interval markers and regions */}
            {intervalPoints.map((pt, i) => {
              const x = tToX(pt.onset);
              const y1 = pToY(pt.v1Pitch);
              const y2 = pToY(pt.v2Pitch);
              const isHighlighted = highlightedOnset === getOnsetKey(pt.onset);
              const isSelected = selectedBeat === getOnsetKey(pt.onset);
              const style = getIntervalStyle({
                isConsonant: pt.isConsonant,
                isPerfect: [1, 5, 8].includes(pt.intervalClass),
                score: pt.score,
                category: pt.category,
              });

              // Calculate region width
              const nextPt = intervalPoints[i + 1];
              const regionWidth = nextPt
                ? Math.max(20, tToX(nextPt.onset) - x - 4)
                : 30;

              return (
                <g
                  key={`int-${i}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedBeat(isSelected ? null : getOnsetKey(pt.onset));
                  }}
                  onMouseEnter={() => setHighlightedOnset(getOnsetKey(pt.onset))}
                  onMouseLeave={() => setHighlightedOnset(null)}
                >
                  {/* Full-height vertical bar */}
                  <rect
                    x={x - 2}
                    y={headerHeight}
                    width={regionWidth}
                    height={h - headerHeight - 25}
                    fill={style.fill}
                    opacity={isSelected || isHighlighted ? 0.9 : 0.5}
                    rx={4}
                  />

                  {/* Interval label on hover/select */}
                  {(isSelected || isHighlighted) && (
                    <g>
                      <rect
                        x={x + regionWidth/2 - 24}
                        y={(y1 + y2) / 2 - 12}
                        width={48}
                        height={24}
                        fill={style.bg}
                        stroke={style.color}
                        strokeWidth={1.5}
                        rx={4}
                      />
                      <text
                        x={x + regionWidth/2}
                        y={(y1 + y2) / 2 + 4}
                        fontSize="11"
                        fontWeight="600"
                        fill={style.color}
                        textAnchor="middle"
                      >
                        {pt.intervalName}
                      </text>
                    </g>
                  )}

                  {/* Score badge for dissonances */}
                  {!pt.isConsonant && (
                    <g>
                      <circle
                        cx={x + 8}
                        cy={Math.min(y1, y2) - noteHeight/2 - 8}
                        r={10}
                        fill={style.color}
                      />
                      <text
                        x={x + 8}
                        y={Math.min(y1, y2) - noteHeight/2 - 4}
                        fontSize="9"
                        fill="white"
                        textAnchor="middle"
                        fontWeight="600"
                      >
                        {pt.score >= 0 ? '+' : ''}{pt.score.toFixed(1)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Legend */}
            <g transform={`translate(${w - 200}, ${headerHeight + 8})`}>
              <rect x={0} y={0} width={10} height={10} fill={voice1Info.color} rx={2} />
              <text x={14} y={8} fontSize="10" fill="#4b5563">{voice1Info.label}</text>
              <rect x={80} y={0} width={10} height={10} fill={voice2Info.color} rx={2} />
              <text x={94} y={8} fontSize="10" fill="#4b5563">{voice2Info.label}</text>
            </g>
          </svg>
        </div>
      </div>

      {/* Selected interval detail */}
      {selectedBeat !== null && beatMap.get(selectedBeat) && (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #6366f1',
          borderRadius: '8px',
          padding: '14px',
        }}>
          {(() => {
            const pt = beatMap.get(selectedBeat);
            const style = getIntervalStyle({
              isConsonant: pt.isConsonant,
              isPerfect: [1, 5, 8].includes(pt.intervalClass),
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
                    {!pt.isConsonant && (
                      <span style={{
                        padding: '4px 10px',
                        backgroundColor: pt.score >= 0 ? '#dcfce7' : '#fee2e2',
                        color: pt.score >= 0 ? '#16a34a' : '#dc2626',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '700',
                      }}>
                        {pt.score >= 0 ? '+' : ''}{pt.score.toFixed(2)}
                      </span>
                    )}
                    <button
                      onClick={() => setSelectedBeat(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#9ca3af' }}
                    >×</button>
                  </div>
                </div>

                {/* Pitch info */}
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

                {/* Score details */}
                {pt.scoreDetails && pt.scoreDetails.length > 0 && showDetails && (
                  <div style={{ backgroundColor: '#f8fafc', borderRadius: '6px', padding: '10px', fontSize: '12px' }}>
                    <div style={{ fontWeight: '600', marginBottom: '6px', color: '#475569' }}>Scoring Details:</div>
                    {pt.scoreDetails.map((detail, i) => (
                      <div key={i} style={{ color: '#64748b', marginBottom: '2px' }}>
                        {typeof detail === 'object' ? detail.text : detail}
                      </div>
                    ))}
                  </div>
                )}
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
              onClick={() => {
                setSelectedBeat(getOnsetKey(issue.onset));
                setHighlightedOnset(getOnsetKey(issue.onset));
              }}
              style={{
                padding: '10px 14px',
                borderBottom: i < issues.length - 1 ? `1px solid ${VIZ_COLORS.issueBackground}` : 'none',
                fontSize: '13px',
                cursor: 'pointer',
                backgroundColor: selectedBeat === getOnsetKey(issue.onset) ? '#fef2f2' : 'transparent',
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
