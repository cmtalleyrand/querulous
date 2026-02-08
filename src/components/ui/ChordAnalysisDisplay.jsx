import { useState } from 'react';

/**
 * Display beat-by-beat harmonic analysis results
 * Shows which chords are implied by the melody's pitch content on each beat
 */
export function ChordAnalysisDisplay({ chordAnalysis, formatter }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedBeat, setSelectedBeat] = useState(null);

  // If no data, show a placeholder
  if (!chordAnalysis || !chordAnalysis.chords || chordAnalysis.chords.length === 0) {
    return (
      <div style={{ marginTop: '12px', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
        <span style={{ fontSize: '12px', color: '#64748b' }}>No beat-by-beat chord analysis available</span>
      </div>
    );
  }

  const { chords, summary } = chordAnalysis;

  // Group chords by measure
  const measureLength = formatter?.meter ? (formatter.meter[0] * 4) / formatter.meter[1] : 4;
  const measures = [];
  let currentMeasure = [];
  let currentMeasureNum = 1;

  for (const c of chords) {
    const measureNum = Math.floor(c.beat / measureLength) + 1;
    if (measureNum !== currentMeasureNum) {
      if (currentMeasure.length > 0) {
        measures.push({ num: currentMeasureNum, chords: currentMeasure });
      }
      currentMeasure = [];
      currentMeasureNum = measureNum;
    }
    currentMeasure.push(c);
  }
  if (currentMeasure.length > 0) {
    measures.push({ num: currentMeasureNum, chords: currentMeasure });
  }

  // Format chord name nicely
  const formatChord = (chord) => {
    if (!chord) return '—';
    return chord.name.trim();
  };

  // Color based on score (salience-weighted match quality)
  const getFitColor = (chord) => {
    if (!chord) return '#9ca3af';
    const score = chord.score || 0;
    if (score >= 1.5) return '#059669';
    if (score >= 0.8) return '#0891b2';
    if (score >= 0.3) return '#d97706';
    return '#9ca3af';
  };

  // Format pitch class as note name
  const pitchName = (midi) => {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return names[((midi % 12) + 12) % 12];
  };

  return (
    <div style={{ marginTop: '12px' }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          padding: '8px 12px',
          backgroundColor: '#f8fafc',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
        }}
      >
        <span style={{ fontSize: '12px', color: '#6b7280' }}>
          {expanded ? '▼' : '▶'}
        </span>
        <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
          Beat-by-Beat Chord Analysis
        </span>
        {summary && (
          <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: 'auto' }}>
            {summary.analyzedBeats}/{summary.totalBeats} beats, {summary.uniqueHarmonies} chord{summary.uniqueHarmonies !== 1 ? 's' : ''}
            {summary.firstChord && ` • opens ${summary.firstChord}`}
            {summary.lastChord && ` • closes ${summary.lastChord}`}
          </span>
        )}
      </div>

      {expanded && (
        <div style={{
          marginTop: '8px',
          padding: '12px',
          backgroundColor: '#fff',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
        }}>
          {/* Summary stats */}
          {summary && (
            <div style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '12px',
              padding: '8px 12px',
              backgroundColor: '#f1f5f9',
              borderRadius: '4px',
              fontSize: '12px',
              flexWrap: 'wrap',
            }}>
              <span>
                <strong>Coverage:</strong> {Math.round((summary.coverage || 0) * 100)}%
              </span>
              <span>
                <strong>Avg fit:</strong> {(summary.avgFitScore || 0).toFixed(2)}
              </span>
              <span>
                <strong>Dominant implied:</strong> {summary.impliesDominant ? 'Yes' : 'No'}
              </span>
              {summary.firstChord && (
                <span>
                  <strong>Opens:</strong> {summary.firstChord}
                </span>
              )}
              {summary.lastChord && (
                <span>
                  <strong>Closes:</strong> {summary.lastChord}
                </span>
              )}
            </div>
          )}

          {/* Chord progression by measure */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {measures.map((m) => (
              <div key={m.num} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{
                  fontSize: '11px',
                  color: '#6b7280',
                  minWidth: '32px',
                  fontWeight: '600',
                }}>
                  m.{m.num}
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {m.chords.map((c, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedBeat(selectedBeat === c ? null : c)}
                      title={c.chord ? `Click for details - Score: ${c.chord.score?.toFixed(2) || 'N/A'}` : 'No chord detected'}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: selectedBeat === c ? '#dbeafe' : (c.chord ? '#f0f9ff' : '#f9fafb'),
                        border: `2px solid ${selectedBeat === c ? '#3b82f6' : (c.chord ? getFitColor(c.chord) : '#e5e7eb')}`,
                        fontSize: '12px',
                        fontWeight: c.chord ? '500' : '400',
                        color: c.chord ? getFitColor(c.chord) : '#9ca3af',
                        minWidth: '40px',
                        textAlign: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      {formatChord(c.chord)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Selected beat detail */}
          {selectedBeat && selectedBeat.chord && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              backgroundColor: '#f0f9ff',
              borderRadius: '6px',
              border: '1px solid #93c5fd',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e40af' }}>
                    {selectedBeat.chord.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#3b82f6' }}>
                    Beat {selectedBeat.beat + 1} — Score: {selectedBeat.chord.score?.toFixed(2) || 'N/A'}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBeat(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '16px' }}
                >×</button>
              </div>

              {/* Matched notes */}
              {selectedBeat.chord.matches && selectedBeat.chord.matches.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#1e40af', marginBottom: '4px', fontWeight: '500' }}>
                    Notes matching chord:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {selectedBeat.chord.matches.map((m, i) => (
                      <span key={i} style={{
                        padding: '2px 6px',
                        backgroundColor: '#dbeafe',
                        borderRadius: '3px',
                        fontSize: '11px',
                        color: '#1e40af',
                      }}>
                        {pitchName(m.pitch)} (salience: {m.salience?.toFixed(2)})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Non-chord tone info */}
              {selectedBeat.chord.nonChordTones && selectedBeat.chord.nonChordTones.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#d97706', marginBottom: '4px', fontWeight: '500' }}>
                    Non-chord tones (penalty: {selectedBeat.audit?.nonChordPenalty?.toFixed(2) || '0'}):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {selectedBeat.chord.nonChordTones.map((n, i) => (
                      <span key={i} style={{
                        padding: '2px 6px',
                        backgroundColor: '#fef3c7',
                        borderRadius: '3px',
                        fontSize: '11px',
                        color: '#d97706',
                      }}>
                        {pitchName(n.pitch)} (salience: {n.salience?.toFixed(2)}, penalty: {n.penalty?.toFixed(2)})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes on beat */}
              {selectedBeat.notes && selectedBeat.notes.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#6b7280' }}>
                  All notes on beat: {selectedBeat.notes.map(n => pitchName(n.pitch)).join(', ')}
                </div>
              )}

              {/* Audit: Why this chord was chosen */}
              {selectedBeat.audit && (
                <div style={{
                  marginTop: '12px',
                  padding: '8px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                    Audit: Why {selectedBeat.chord.name}?
                  </div>
                  <div style={{ color: '#6b7280', lineHeight: '1.6' }}>
                    <div>Σ(salience × weight): +{selectedBeat.audit.matchedSalience?.toFixed(3)}</div>
                    <div>Σ non-chord penalty: −{selectedBeat.audit.nonChordPenalty?.toFixed(3)}</div>
                    <div>= pre-bass score: {selectedBeat.audit.preBasScore?.toFixed(3)}</div>
                    <div>Bass position: ×{selectedBeat.audit.bassMultiplier?.toFixed(2)} ({selectedBeat.audit.bassReason || 'n/a'})</div>
                    <div>= base score: {selectedBeat.audit.baseScore?.toFixed(3)}</div>
                    <div>Complexity (level {selectedBeat.audit.complexityLevel || '?'}): −{selectedBeat.audit.complexityPenalty?.toFixed(3)}</div>
                    <div>Inherited from prev{selectedBeat.audit.prevChord ? ` (${selectedBeat.audit.prevChord})` : ''}: +{selectedBeat.audit.inheritedScore?.toFixed(3) || '0'}</div>
                    {selectedBeat.audit.chainContinued && <div>Chain continued from previous beat</div>}
                    <div style={{ fontWeight: '600', color: '#374151', borderTop: '1px solid #e2e8f0', paddingTop: '4px', marginTop: '4px' }}>
                      Final DP score: {selectedBeat.audit.finalScore?.toFixed(3)}
                    </div>
                  </div>

                  {/* Per-note breakdown */}
                  {selectedBeat.audit.matches && selectedBeat.audit.matches.length > 0 && (
                    <div style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '4px' }}>
                      <div style={{ fontWeight: '500', color: '#374151', marginBottom: '2px' }}>Matched notes:</div>
                      {selectedBeat.audit.matches.map((m, i) => (
                        <div key={i} style={{ color: '#6b7280', paddingLeft: '8px' }}>
                          {pitchName(m.pitch)}: salience {m.salience?.toFixed(3)} × weight {m.weight?.toFixed(1)} = {m.contribution?.toFixed(3)}
                          {m.beatDistance > 0 ? ` (${m.beatDistance}b ago, decay ${m.decay?.toFixed(2)})` : ' (current beat)'}
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedBeat.audit.nonChordTones && selectedBeat.audit.nonChordTones.length > 0 && (
                    <div style={{ marginTop: '4px' }}>
                      <div style={{ fontWeight: '500', color: '#d97706', marginBottom: '2px' }}>Non-chord tones:</div>
                      {selectedBeat.audit.nonChordTones.map((n, i) => (
                        <div key={i} style={{ color: '#d97706', paddingLeft: '8px' }}>
                          {pitchName(n.pitch)}: salience {n.salience?.toFixed(3)}, penalty {n.penalty?.toFixed(3)}
                          {n.beatDistance > 0 ? ` (${n.beatDistance}b ago, decay ${n.decay?.toFixed(2)})` : ' (current beat)'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Alternative candidates */}
              {selectedBeat.allCandidates && selectedBeat.allCandidates.length > 1 && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '11px',
                  color: '#6b7280',
                }}>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>Other candidates considered:</div>
                  {selectedBeat.allCandidates.slice(1, 4).map((c, i) => (
                    <div key={i}>
                      {c.name}: score {c.score?.toFixed(2)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Legend and explanation */}
          <div style={{
            marginTop: '12px',
            paddingTop: '8px',
            borderTop: '1px solid #e2e8f0',
            fontSize: '11px',
            color: '#6b7280',
          }}>
            <div style={{ marginBottom: '6px' }}>
              <strong>How it works:</strong> Each note's "salience" = duration × metric weight × approach (leaps weight more than steps).
              The "fit score" = sum of (salience × chord-role weight) for matching notes. Higher = stronger chord implication.
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <span style={{ color: '#059669' }}>■ Strong fit</span>
              <span style={{ color: '#0891b2' }}>■ Moderate fit</span>
              <span style={{ color: '#d97706' }}>■ Weak fit</span>
              <span style={{ color: '#9ca3af' }}>■ No chord</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChordAnalysisDisplay;
