import { useState, useMemo } from 'react';
import { pitchName, metricWeight } from '../../utils/formatter';
import { Simultaneity } from '../../types';
import { generateGridLines, VIZ_COLORS } from '../../utils/vizConstants';

/**
 * Invertibility Visualization
 * Shows original and inverted positions overlaid, highlighting intervals that become problematic
 */
export function InvertibilityViz({
  subject,       // Subject notes
  cs,            // Countersubject notes
  originalIssues = [],
  invertedIssues = [],
  meter = [4, 4],
}) {
  const [viewMode, setViewMode] = useState('overlay'); // 'overlay', 'original', 'inverted'
  const [selectedBeat, setSelectedBeat] = useState(null);
  const [highlightedBeat, setHighlightedBeat] = useState(null);

  // Calculate simultaneities for both configurations
  const analysis = useMemo(() => {
    if (!subject?.length || !cs?.length) return null;

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

    // Original: CS above
    const origSims = findSims(subject, cs);

    // Inverted: CS shifted down 12 semitones (below subject)
    const csInverted = cs.map(n => ({ ...n, pitch: n.pitch - 12 }));
    const invSims = findSims(subject, csInverted);

    // Find intervals that change problematically
    const problemOnsets = new Set();
    const beatMap = new Map();

    // Map original intervals by beat
    for (const s of origSims) {
      const beat = Math.round(s.onset * 4) / 4;
      if (!beatMap.has(beat)) {
        beatMap.set(beat, { orig: s });
      }
    }

    // Match with inverted intervals
    for (const s of invSims) {
      const beat = Math.round(s.onset * 4) / 4;
      const entry = beatMap.get(beat);
      if (entry) {
        entry.inv = s;
        // Check if interval became problematic
        // 5th → 4th against bass is the classic problem
        if (entry.orig.interval.class === 5 && s.interval.class === 4) {
          problemOnsets.add(beat);
          entry.problem = '5th becomes 4th against bass';
        }
        // Consonant → Dissonant
        if (entry.orig.interval.isConsonant() && !s.interval.isConsonant()) {
          problemOnsets.add(beat);
          entry.problem = `${entry.orig.interval} becomes ${s.interval}`;
        }
      }
    }

    // Calculate pitch ranges
    const allPitches = [
      ...subject.map(n => n.pitch),
      ...cs.map(n => n.pitch),
      ...csInverted.map(n => n.pitch),
    ];
    const maxTime = Math.max(...[...subject, ...cs].map(n => n.onset + n.duration));

    return {
      subject,
      cs,
      csInverted,
      origSims,
      invSims,
      beatMap,
      problemOnsets,
      minPitch: Math.min(...allPitches) - 2,
      maxPitch: Math.max(...allPitches) + 2,
      maxTime,
    };
  }, [subject, cs, meter]);

  if (!analysis) return null;

  const { minPitch, maxPitch, maxTime, problemOnsets, beatMap } = analysis;
  const pRange = maxPitch - minPitch;
  const noteHeight = Math.max(12, Math.min(18, 300 / pRange));
  const h = pRange * noteHeight + 80;
  const pixelsPerBeat = 55;
  const w = Math.max(500, maxTime * pixelsPerBeat + 100);

  const tScale = (w - 80) / maxTime;
  const pToY = (p) => h - 24 - (p - minPitch) * noteHeight;
  const tToX = (t) => 60 + t * tScale;

  const showOriginal = viewMode === 'original' || viewMode === 'overlay';
  const showInverted = viewMode === 'inverted' || viewMode === 'overlay';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* View mode toggle */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>View:</span>
        {['overlay', 'original', 'inverted'].map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              border: '1px solid',
              borderColor: viewMode === mode ? '#6366f1' : '#d1d5db',
              backgroundColor: viewMode === mode ? '#eef2ff' : 'white',
              color: viewMode === mode ? '#4338ca' : '#374151',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: viewMode === mode ? '600' : '400',
            }}
          >
            {mode === 'overlay' ? 'Both (overlay)' : mode === 'original' ? 'CS Above' : 'CS Below'}
          </button>
        ))}
        {problemOnsets.size > 0 && (
          <span style={{
            marginLeft: '12px',
            padding: '4px 10px',
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500',
          }}>
            {problemOnsets.size} interval{problemOnsets.size !== 1 ? 's' : ''} become problematic
          </span>
        )}
      </div>

      {/* Main visualization */}
      <div style={{
        border: '2px solid #cbd5e1',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#f8fafc',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <svg width={w} height={h} style={{ display: 'block' }}>
            {/* Header */}
            <rect x={0} y={0} width={w} height={36} fill="rgba(0,0,0,0.03)" />
            <text x={16} y={24} fontSize="14" fontWeight="600" fill="#1f2937">
              Double Counterpoint at the Octave
            </text>

            {/* Beat grid - meter-aware */}
            {(() => {
              const gridLines = generateGridLines(maxTime, meter, { showSubdivisions: false });

              return gridLines.map((line, i) => (
                <g key={`grid-${i}`}>
                  <line x1={tToX(line.time)} y1={36} x2={tToX(line.time)} y2={h - 18}
                    stroke={line.isDownbeat ? '#64748b' : (line.isMainBeat ? '#94a3b8' : '#e2e8f0')}
                    strokeWidth={line.isDownbeat ? 1.5 : (line.isMainBeat ? 0.75 : 0.5)} />
                  {line.measureNum ? (
                    <text x={tToX(line.time)} y={h - 4} fontSize="11" fill="#475569" textAnchor="middle" fontWeight="600">
                      m.{line.measureNum}
                    </text>
                  ) : line.beatNum ? (
                    <text x={tToX(line.time)} y={h - 4} fontSize="9" fill="#94a3b8" textAnchor="middle">
                      {line.beatNum}
                    </text>
                  ) : null}
                </g>
              ));
            })()}

            {/* Subject notes - always shown */}
            {analysis.subject.map((n, i) => {
              const x = tToX(n.onset);
              const y = pToY(n.pitch);
              const width = Math.max(6, n.duration * tScale - 2);
              return (
                <g key={`subj-${i}`}>
                  <rect x={x} y={y - noteHeight/2 + 1} width={width} height={noteHeight - 2}
                    fill={VIZ_COLORS.voiceDux} rx={3} />
                  <text x={x + width/2} y={y + 3} fontSize="9" fill="white" textAnchor="middle">
                    {pitchName(n.pitch, n.preferFlats).replace(/\d/, '')}
                  </text>
                </g>
              );
            })}

            {/* Original CS (above) */}
            {showOriginal && analysis.cs.map((n, i) => {
              const x = tToX(n.onset);
              const y = pToY(n.pitch);
              const width = Math.max(6, n.duration * tScale - 2);
              return (
                <g key={`cs-orig-${i}`}>
                  <rect x={x} y={y - noteHeight/2 + 1} width={width} height={noteHeight - 2}
                    fill={VIZ_COLORS.voiceCSAbove} rx={3} opacity={viewMode === 'overlay' ? 0.7 : 1} />
                  <text x={x + width/2} y={y + 3} fontSize="9" fill="white" textAnchor="middle">
                    {pitchName(n.pitch, n.preferFlats).replace(/\d/, '')}
                  </text>
                </g>
              );
            })}

            {/* Inverted CS (below) */}
            {showInverted && analysis.csInverted.map((n, i) => {
              const x = tToX(n.onset);
              const y = pToY(n.pitch);
              const width = Math.max(6, n.duration * tScale - 2);
              return (
                <g key={`cs-inv-${i}`}>
                  <rect x={x} y={y - noteHeight/2 + 1} width={width} height={noteHeight - 2}
                    fill={VIZ_COLORS.voiceCSBelow} rx={3} opacity={viewMode === 'overlay' ? 0.7 : 1}
                    strokeDasharray={viewMode === 'overlay' ? '3,2' : 'none'}
                    stroke={viewMode === 'overlay' ? VIZ_COLORS.voiceCSBelow : 'none'} />
                  <text x={x + width/2} y={y + 3} fontSize="9" fill={viewMode === 'overlay' ? '#92400e' : 'white'} textAnchor="middle">
                    {pitchName(n.pitch, n.preferFlats).replace(/\d/, '')}
                  </text>
                </g>
              );
            })}

            {/* Clickable interval regions */}
            {[...beatMap.entries()].map(([beat, entry], i) => {
              if (!entry.orig) return null;
              const x = tToX(entry.orig.onset);
              const y1 = pToY(entry.orig.voice1Note.pitch);
              const y2 = pToY(entry.orig.voice2Note.pitch);
              const isSelected = selectedBeat === beat;
              const isHighlighted = highlightedBeat === beat;
              const isProblem = problemOnsets.has(beat);

              // Calculate next beat for width
              const beatEntries = [...beatMap.entries()];
              const nextEntry = beatEntries[i + 1];
              const regionWidth = nextEntry
                ? Math.max(20, tToX(nextEntry[1].orig.onset) - x - 2)
                : 30;

              return (
                <g
                  key={`int-${i}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedBeat(isSelected ? null : beat)}
                  onMouseEnter={() => setHighlightedBeat(beat)}
                  onMouseLeave={() => setHighlightedBeat(null)}
                >
                  {/* Clickable region */}
                  <rect
                    x={x - 2}
                    y={Math.min(y1, y2) - noteHeight/2}
                    width={regionWidth}
                    height={Math.abs(y2 - y1) + noteHeight}
                    fill={isProblem ? 'rgba(220, 38, 38, 0.15)' : 'rgba(99, 102, 241, 0.1)'}
                    opacity={isSelected || isHighlighted ? 1 : 0}
                    rx={3}
                  />
                  {/* Show interval label on hover/select */}
                  {(isSelected || isHighlighted) && (
                    <g>
                      <rect
                        x={x + regionWidth/2 - 20}
                        y={(y1 + y2) / 2 - 10}
                        width={40}
                        height={20}
                        fill={isProblem ? '#fef2f2' : '#f0fdf4'}
                        stroke={isProblem ? '#dc2626' : '#22c55e'}
                        strokeWidth={1}
                        rx={4}
                      />
                      <text
                        x={x + regionWidth/2}
                        y={(y1 + y2) / 2 + 4}
                        fontSize="11"
                        fontWeight="600"
                        fill={isProblem ? '#dc2626' : '#166534'}
                        textAnchor="middle"
                      >
                        {entry.orig.interval.toString()}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Problem warning icons */}
            {viewMode === 'overlay' && [...problemOnsets].map((beat, i) => {
              const entry = beatMap.get(beat);
              if (!entry) return null;
              const x = tToX(entry.orig.onset);
              const y1 = pToY(entry.orig.voice1Note.pitch);
              const y2orig = pToY(entry.orig.voice2Note.pitch);
              const y2inv = entry.inv ? pToY(entry.inv.voice2Note.pitch) : y2orig;

              return (
                <g key={`problem-${i}`}>
                  {/* Warning icon */}
                  <circle cx={x} cy={Math.min(y1, y2orig, y2inv) - noteHeight - 8} r={8} fill={VIZ_COLORS.dissonantProblematic} />
                  <text x={x} y={Math.min(y1, y2orig, y2inv) - noteHeight - 4} fontSize="10" fill="white" textAnchor="middle" fontWeight="600">!</text>
                </g>
              );
            })}

            {/* Legend */}
            <g transform={`translate(${w - 180}, 8)`}>
              <rect x={0} y={0} width={8} height={8} fill={VIZ_COLORS.voiceDux} rx={2} />
              <text x={12} y={7} fontSize="10" fill="#4b5563">Subject</text>
              {showOriginal && (
                <>
                  <rect x={60} y={0} width={8} height={8} fill={VIZ_COLORS.voiceCSAbove} rx={2} />
                  <text x={72} y={7} fontSize="10" fill="#4b5563">CS above</text>
                </>
              )}
              {showInverted && (
                <>
                  <rect x={120} y={0} width={8} height={8} fill={VIZ_COLORS.voiceCSBelow} rx={2} />
                  <text x={132} y={7} fontSize="10" fill="#4b5563">CS below</text>
                </>
              )}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontWeight: '600', color: '#1f2937' }}>
              Beat {selectedBeat + 1}
            </span>
            <button
              onClick={() => setSelectedBeat(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#9ca3af' }}
            >×</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div style={{ padding: '10px', backgroundColor: '#f0fdf4', borderRadius: '6px' }}>
              <div style={{ fontSize: '11px', color: '#166534', marginBottom: '4px' }}>Original (CS Above)</div>
              <div style={{ fontWeight: '600', color: '#166534' }}>
                {pitchName(beatMap.get(selectedBeat).orig.voice1Note.pitch)} &amp; {pitchName(beatMap.get(selectedBeat).orig.voice2Note.pitch)}
              </div>
              <div style={{ fontSize: '13px', color: '#166534' }}>
                = {beatMap.get(selectedBeat).orig.interval.toString()}
              </div>
            </div>
            {beatMap.get(selectedBeat).inv && (
              <div style={{
                padding: '10px',
                backgroundColor: problemOnsets.has(selectedBeat) ? '#fef2f2' : '#fffbeb',
                borderRadius: '6px'
              }}>
                <div style={{ fontSize: '11px', color: problemOnsets.has(selectedBeat) ? '#991b1b' : '#92400e', marginBottom: '4px' }}>Inverted (CS Below)</div>
                <div style={{ fontWeight: '600', color: problemOnsets.has(selectedBeat) ? '#991b1b' : '#92400e' }}>
                  {pitchName(beatMap.get(selectedBeat).inv.voice1Note.pitch)} &amp; {pitchName(beatMap.get(selectedBeat).inv.voice2Note.pitch)}
                </div>
                <div style={{ fontSize: '13px', color: problemOnsets.has(selectedBeat) ? '#dc2626' : '#92400e' }}>
                  = {beatMap.get(selectedBeat).inv.interval.toString()}
                </div>
              </div>
            )}
          </div>
          {beatMap.get(selectedBeat).problem && (
            <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#fef2f2', borderRadius: '4px', color: '#991b1b', fontSize: '12px' }}>
              ⚠ {beatMap.get(selectedBeat).problem}
            </div>
          )}
        </div>
      )}

      {/* Problem list */}
      {problemOnsets.size > 0 && viewMode === 'overlay' && (
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
            Intervals that become problematic when inverted
          </div>
          {[...beatMap.entries()]
            .filter(([beat]) => problemOnsets.has(beat))
            .map(([beat, entry], i) => (
              <div key={i} style={{
                padding: '10px 14px',
                borderBottom: i < problemOnsets.size - 1 ? `1px solid ${VIZ_COLORS.issueBackground}` : 'none',
                fontSize: '13px',
              }}>
                <span style={{ color: VIZ_COLORS.dissonantProblematic, fontWeight: '600' }}>Beat {beat + 1}:</span>
                <span style={{ marginLeft: '8px' }}>
                  {entry.orig.interval.toString()} → {entry.inv?.interval.toString() || '?'}
                </span>
                {entry.problem && (
                  <span style={{ marginLeft: '8px', color: '#6b7280', fontSize: '12px' }}>
                    ({entry.problem})
                  </span>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Summary stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
      }}>
        <div style={{
          padding: '12px 16px',
          backgroundColor: VIZ_COLORS.cleanBackground,
          border: `1px solid ${VIZ_COLORS.cleanBorder}`,
          borderRadius: '8px',
        }}>
          <div style={{ fontSize: '11px', color: VIZ_COLORS.cleanText, marginBottom: '4px' }}>CS Above (Original)</div>
          <div style={{ fontSize: '13px', color: '#047857' }}>
            {originalIssues.length === 0 ? 'No issues' : `${originalIssues.length} issue${originalIssues.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        <div style={{
          padding: '12px 16px',
          backgroundColor: problemOnsets.size > 0 ? VIZ_COLORS.issueBackground : VIZ_COLORS.cleanBackground,
          border: `1px solid ${problemOnsets.size > 0 ? VIZ_COLORS.issueBorder : VIZ_COLORS.cleanBorder}`,
          borderRadius: '8px',
        }}>
          <div style={{ fontSize: '11px', color: problemOnsets.size > 0 ? VIZ_COLORS.issueText : VIZ_COLORS.cleanText, marginBottom: '4px' }}>CS Below (Inverted)</div>
          <div style={{ fontSize: '13px', color: problemOnsets.size > 0 ? VIZ_COLORS.dissonantProblematic : '#047857' }}>
            {invertedIssues.length === 0 && problemOnsets.size === 0
              ? 'No issues'
              : `${invertedIssues.length + problemOnsets.size} issue${invertedIssues.length + problemOnsets.size !== 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {/* Clickable issue list */}
      {(originalIssues.length > 0 || invertedIssues.length > 0) && (
        <div style={{
          marginTop: '12px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '8px 12px',
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
            fontSize: '12px',
            fontWeight: '600',
            color: '#374151',
          }}>
            Issues (click to highlight):
          </div>

          {originalIssues.map((issue, i) => (
            <div
              key={`orig-${i}`}
              onClick={() => setSelectedBeat(selectedBeat === issue.onset ? null : issue.onset)}
              onTouchStart={(e) => { e.preventDefault(); setSelectedBeat(selectedBeat === issue.onset ? null : issue.onset); }}
              style={{
                padding: '8px 12px',
                borderBottom: (i < originalIssues.length - 1 || invertedIssues.length > 0) ? '1px solid #f3f4f6' : 'none',
                cursor: 'pointer',
                backgroundColor: selectedBeat === issue.onset ? '#dbeafe' : 'white',
                fontSize: '12px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = selectedBeat === issue.onset ? '#dbeafe' : '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedBeat === issue.onset ? '#dbeafe' : 'white'}
            >
              <span style={{
                padding: '2px 6px',
                backgroundColor: '#dbeafe',
                borderRadius: '3px',
                fontSize: '10px',
                marginRight: '8px',
              }}>Original</span>
              {issue.description}
            </div>
          ))}

          {invertedIssues.map((issue, i) => (
            <div
              key={`inv-${i}`}
              onClick={() => setSelectedBeat(selectedBeat === issue.onset ? null : issue.onset)}
              onTouchStart={(e) => { e.preventDefault(); setSelectedBeat(selectedBeat === issue.onset ? null : issue.onset); }}
              style={{
                padding: '8px 12px',
                borderBottom: i < invertedIssues.length - 1 ? '1px solid #f3f4f6' : 'none',
                cursor: 'pointer',
                backgroundColor: selectedBeat === issue.onset ? '#fef2f2' : 'white',
                fontSize: '12px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = selectedBeat === issue.onset ? '#fef2f2' : '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedBeat === issue.onset ? '#fef2f2' : 'white'}
            >
              <span style={{
                padding: '2px 6px',
                backgroundColor: '#fecaca',
                borderRadius: '3px',
                fontSize: '10px',
                marginRight: '8px',
              }}>Inverted</span>
              {issue.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default InvertibilityViz;
