import { useState } from 'react';

/**
 * Display beat-by-beat harmonic analysis results
 */
export function ChordAnalysisDisplay({ chordAnalysis, formatter }) {
  const [expanded, setExpanded] = useState(false);

  if (!chordAnalysis || !chordAnalysis.chords || chordAnalysis.chords.length === 0) {
    return null;
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

  // Color based on confidence
  const getConfidenceColor = (chord) => {
    if (!chord) return '#9ca3af';
    if (chord.confidence >= 0.8) return '#059669';
    if (chord.confidence >= 0.6) return '#0891b2';
    if (chord.confidence >= 0.4) return '#d97706';
    return '#9ca3af';
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
            {summary.analyzedBeats} beats analyzed, {summary.uniqueHarmonies} unique harmonies
            {summary.harmonicClarity !== undefined && ` (${Math.round(summary.harmonicClarity * 100)}% clarity)`}
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
            }}>
              <span>
                <strong>Starts on tonic:</strong> {summary.startsOnTonic ? 'Yes' : 'No'}
              </span>
              <span>
                <strong>Ends on tonic:</strong> {summary.endsOnTonic ? 'Yes' : 'No'}
              </span>
              <span>
                <strong>Dominant implied:</strong> {summary.impliesDominant ? 'Yes' : 'No'}
              </span>
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
                      title={c.chord ? `Confidence: ${Math.round(c.chord.confidence * 100)}%` : 'No chord detected'}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: c.chord ? '#f0f9ff' : '#f9fafb',
                        border: `1px solid ${c.chord ? getConfidenceColor(c.chord) : '#e5e7eb'}`,
                        fontSize: '12px',
                        fontWeight: c.chord ? '500' : '400',
                        color: c.chord ? getConfidenceColor(c.chord) : '#9ca3af',
                        minWidth: '40px',
                        textAlign: 'center',
                      }}
                    >
                      {formatChord(c.chord)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{
            marginTop: '12px',
            paddingTop: '8px',
            borderTop: '1px solid #e2e8f0',
            fontSize: '11px',
            color: '#6b7280',
            display: 'flex',
            gap: '16px',
          }}>
            <span>Confidence: </span>
            <span style={{ color: '#059669' }}>■ High (80%+)</span>
            <span style={{ color: '#0891b2' }}>■ Good (60%+)</span>
            <span style={{ color: '#d97706' }}>■ Fair (40%+)</span>
            <span style={{ color: '#9ca3af' }}>■ Low/None</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChordAnalysisDisplay;
