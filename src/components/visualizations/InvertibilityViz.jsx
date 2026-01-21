import { useState, useMemo } from 'react';
import { pitchName, metricWeight } from '../../utils/formatter';
import { Simultaneity } from '../../types';

/**
 * Invertibility Visualization
 * Shows original and inverted positions overlaid, highlighting intervals that become problematic
 */
export function InvertibilityViz({
  subject,       // Subject notes
  cs,            // Countersubject notes
  formatter,
  originalIssues = [],
  invertedIssues = [],
}) {
  const [viewMode, setViewMode] = useState('overlay'); // 'overlay', 'original', 'inverted'
  const [selectedInterval, setSelectedInterval] = useState(null);

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
            sims.push(new Simultaneity(start, n1, n2, metricWeight(start)));
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
  }, [subject, cs]);

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

            {/* Beat grid */}
            {Array.from({ length: Math.ceil(maxTime) + 1 }, (_, i) => (
              <g key={`grid-${i}`}>
                <line x1={tToX(i)} y1={36} x2={tToX(i)} y2={h - 16}
                  stroke={i % 4 === 0 ? '#94a3b8' : '#e2e8f0'} strokeWidth={i % 4 === 0 ? 1 : 0.5} />
                <text x={tToX(i)} y={h - 4} fontSize="10" fill="#94a3b8" textAnchor="middle">{i + 1}</text>
              </g>
            ))}

            {/* Subject notes - always shown */}
            {analysis.subject.map((n, i) => {
              const x = tToX(n.onset);
              const y = pToY(n.pitch);
              const width = Math.max(6, n.duration * tScale - 2);
              return (
                <g key={`subj-${i}`}>
                  <rect x={x} y={y - noteHeight/2 + 1} width={width} height={noteHeight - 2}
                    fill="#6366f1" rx={3} />
                  <text x={x + width/2} y={y + 3} fontSize="9" fill="white" textAnchor="middle">
                    {pitchName(n.pitch).replace(/\d/, '')}
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
                    fill="#22c55e" rx={3} opacity={viewMode === 'overlay' ? 0.7 : 1} />
                  <text x={x + width/2} y={y + 3} fontSize="9" fill="white" textAnchor="middle">
                    {pitchName(n.pitch).replace(/\d/, '')}
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
                    fill="#f59e0b" rx={3} opacity={viewMode === 'overlay' ? 0.7 : 1}
                    strokeDasharray={viewMode === 'overlay' ? '3,2' : 'none'}
                    stroke={viewMode === 'overlay' ? '#f59e0b' : 'none'} />
                  <text x={x + width/2} y={y + 3} fontSize="9" fill={viewMode === 'overlay' ? '#92400e' : 'white'} textAnchor="middle">
                    {pitchName(n.pitch).replace(/\d/, '')}
                  </text>
                </g>
              );
            })}

            {/* Problem highlights */}
            {viewMode === 'overlay' && [...problemOnsets].map((beat, i) => {
              const entry = beatMap.get(beat);
              if (!entry) return null;
              const x = tToX(entry.orig.onset);
              const y1 = pToY(entry.orig.voice1Note.pitch);
              const y2orig = pToY(entry.orig.voice2Note.pitch);
              const y2inv = entry.inv ? pToY(entry.inv.voice2Note.pitch) : y2orig;

              return (
                <g key={`problem-${i}`}>
                  {/* Highlight box */}
                  <rect
                    x={x - 20}
                    y={Math.min(y1, y2orig, y2inv) - noteHeight}
                    width={40}
                    height={Math.abs(Math.max(y1, y2orig, y2inv) - Math.min(y1, y2orig, y2inv)) + noteHeight * 2}
                    fill="#dc2626"
                    opacity={0.15}
                    rx={4}
                  />
                  {/* Warning icon */}
                  <circle cx={x} cy={Math.min(y1, y2orig, y2inv) - noteHeight - 8} r={8} fill="#dc2626" />
                  <text x={x} y={Math.min(y1, y2orig, y2inv) - noteHeight - 4} fontSize="10" fill="white" textAnchor="middle" fontWeight="600">!</text>
                </g>
              );
            })}

            {/* Legend */}
            <g transform={`translate(${w - 180}, 8)`}>
              <rect x={0} y={0} width={8} height={8} fill="#6366f1" rx={2} />
              <text x={12} y={7} fontSize="10" fill="#4b5563">Subject</text>
              {showOriginal && (
                <>
                  <rect x={60} y={0} width={8} height={8} fill="#22c55e" rx={2} />
                  <text x={72} y={7} fontSize="10" fill="#4b5563">CS above</text>
                </>
              )}
              {showInverted && (
                <>
                  <rect x={120} y={0} width={8} height={8} fill="#f59e0b" rx={2} />
                  <text x={132} y={7} fontSize="10" fill="#4b5563">CS below</text>
                </>
              )}
            </g>
          </svg>
        </div>
      </div>

      {/* Problem list */}
      {problemOnsets.size > 0 && viewMode === 'overlay' && (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 14px',
            backgroundColor: '#fef2f2',
            borderBottom: '1px solid #fca5a5',
            fontWeight: '600',
            fontSize: '13px',
            color: '#991b1b',
          }}>
            Intervals that become problematic when inverted
          </div>
          {[...beatMap.entries()]
            .filter(([beat]) => problemOnsets.has(beat))
            .map(([beat, entry], i) => (
              <div key={i} style={{
                padding: '10px 14px',
                borderBottom: i < problemOnsets.size - 1 ? '1px solid #fee2e2' : 'none',
                fontSize: '13px',
              }}>
                <span style={{ color: '#dc2626', fontWeight: '600' }}>Beat {beat + 1}:</span>
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
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: '8px',
        }}>
          <div style={{ fontSize: '11px', color: '#065f46', marginBottom: '4px' }}>CS Above (Original)</div>
          <div style={{ fontSize: '13px', color: '#047857' }}>
            {originalIssues.length === 0 ? 'No issues' : `${originalIssues.length} issue${originalIssues.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        <div style={{
          padding: '12px 16px',
          backgroundColor: problemOnsets.size > 0 ? '#fef2f2' : '#ecfdf5',
          border: `1px solid ${problemOnsets.size > 0 ? '#fca5a5' : '#a7f3d0'}`,
          borderRadius: '8px',
        }}>
          <div style={{ fontSize: '11px', color: problemOnsets.size > 0 ? '#991b1b' : '#065f46', marginBottom: '4px' }}>CS Below (Inverted)</div>
          <div style={{ fontSize: '13px', color: problemOnsets.size > 0 ? '#dc2626' : '#047857' }}>
            {invertedIssues.length === 0 && problemOnsets.size === 0
              ? 'No issues'
              : `${invertedIssues.length + problemOnsets.size} issue${invertedIssues.length + problemOnsets.size !== 1 ? 's' : ''}`}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvertibilityViz;
