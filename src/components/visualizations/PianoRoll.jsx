import { useState } from 'react';
import { generateGridLines } from '../../utils/vizConstants';

/**
 * Piano Roll visualization component
 * Displays notes as colored rectangles on a pitch/time grid
 * Interactive: hover for tooltips, click for detailed info
 * Uses hatching patterns to indicate sequences
 */
export function PianoRoll({ voices, title, sequenceRanges = [], activeSequenceRange = null, highlightedItem = null, meter = [4, 4] }) {
  const [hoveredNote, setHoveredNote] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const all = voices.flatMap((v, vi) => v.notes.map((n, ni) => ({ ...n, voiceIndex: vi, noteIndex: ni, voiceLabel: v.label, voiceColor: v.color })));
  if (!all.length) return null;

  const minP = Math.min(...all.map((n) => n.pitch)) - 2;
  const maxP = Math.max(...all.map((n) => n.pitch)) + 2;
  const maxT = Math.max(...all.map((n) => n.onset + n.duration));
  const pRange = maxP - minP;
  const nH = Math.max(8, Math.min(16, 200 / pRange));
  const h = pRange * nH + 44;

  const minPixelsPerBeat = 40;
  const minWidth = 300;
  const maxWidth = 800;
  const calculatedWidth = maxT * minPixelsPerBeat + 60;
  const w = Math.max(minWidth, Math.min(maxWidth, calculatedWidth));
  const needsScroll = calculatedWidth > maxWidth;
  const scrollWidth = needsScroll ? calculatedWidth : w;
  const tScale = (scrollWidth - 52) / maxT;

  const pToY = (p) => h - 20 - (p - minP) * nH;
  const tToX = (t) => 46 + t * tScale;

  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const pitchToName = (p) => `${noteNames[((p % 12) + 12) % 12]}${Math.floor(p / 12) - 1}`;

  const formatDuration = (dur) => {
    if (dur === 4) return 'whole';
    if (dur === 2) return 'half';
    if (dur === 1) return 'quarter';
    if (dur === 0.5) return '8th';
    if (dur === 0.25) return '16th';
    if (dur === 3) return 'dotted half';
    if (dur === 1.5) return 'dotted quarter';
    if (dur === 0.75) return 'dotted 8th';
    return `${dur} beats`;
  };

  const isNoteInSequence = (voiceIndex, noteIndex) => {
    if (voiceIndex !== 0 || !sequenceRanges || sequenceRanges.length === 0) return false;
    for (const range of sequenceRanges) {
      if (noteIndex >= range.start && noteIndex <= range.end) {
        return true;
      }
    }
    return false;
  };

  const isNoteInActiveSequence = (voiceIndex, noteIndex) => {
    if (voiceIndex !== 0 || !activeSequenceRange) return false;
    return noteIndex >= activeSequenceRange.start && noteIndex <= activeSequenceRange.end;
  };

  const isNoteHighlighted = (note) => {
    if (!highlightedItem) return false;
    const noteStart = note.onset;
    const noteEnd = note.onset + note.duration;
    const hlStart = highlightedItem.onset;
    const hlEnd = highlightedItem.endOnset !== undefined ? highlightedItem.endOnset : hlStart + 0.5;
    return noteStart < hlEnd && noteEnd > hlStart;
  };

  const labels = [];
  for (let p = minP; p <= maxP; p++) {
    if (p % 12 === 0 || p === minP || p === maxP) {
      labels.push({ p, l: pitchToName(p) });
    }
  }

  const handleMouseEnter = (note, event) => {
    setHoveredNote(note);
    const rect = event.target.getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
  };

  const handleMouseLeave = () => {
    setHoveredNote(null);
  };

  const handleClick = (note) => {
    setSelectedNote(selectedNote === note ? null : note);
  };

  return (
    <div style={{ marginTop: '8px', position: 'relative' }}>
      {title && (
        <div style={{ fontSize: '12px', color: '#546e7a', marginBottom: '4px' }}>{title}</div>
      )}
      <div style={{
        maxWidth: `${maxWidth}px`,
        overflowX: needsScroll ? 'auto' : 'visible',
        borderRadius: '4px',
        border: '1px solid #e0e0e0',
      }}>
        <svg
          width={scrollWidth}
          height={h}
          style={{
            backgroundColor: '#fafafa',
            display: 'block',
          }}
          role="img"
          aria-label={title || 'Piano roll visualization'}
        >
          {/* Define hatching patterns */}
          <defs>
            {/* Diagonal hatching for sequences */}
            <pattern id="seqHatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#64748b" strokeWidth="1.5" />
            </pattern>
            {/* Denser hatching for active sequences */}
            <pattern id="seqHatchActive" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="4" stroke="#374151" strokeWidth="2" />
            </pattern>
            {/* Cross-hatch for active sequences */}
            <pattern id="seqHatchCross" patternUnits="userSpaceOnUse" width="6" height="6">
              <line x1="0" y1="0" x2="6" y2="6" stroke="#374151" strokeWidth="1" />
              <line x1="6" y1="0" x2="0" y2="6" stroke="#374151" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Beat grid lines */}
          {(() => {
            const gridLines = generateGridLines(maxT, meter, { showSubdivisions: false });
            return gridLines.map((line, i) => (
              <line
                key={i}
                x1={tToX(line.time)}
                y1={14}
                x2={tToX(line.time)}
                y2={h - 20}
                stroke={line.isDownbeat ? '#9ca3af' : (line.isMainBeat ? '#bdbdbd' : '#eee')}
                strokeWidth={line.isDownbeat ? 1.5 : (line.isMainBeat ? 0.75 : 0.5)}
              />
            ));
          })()}

          {/* Pitch labels and lines */}
          {labels.map((l, i) => (
            <g key={i}>
              <line x1={46} y1={pToY(l.p)} x2={w - 6} y2={pToY(l.p)} stroke="#eee" strokeWidth={0.5} />
              <text x={42} y={pToY(l.p) + 3} fontSize="8" fill="#9e9e9e" textAnchor="end">
                {l.l}
              </text>
            </g>
          ))}

          {/* Note rectangles */}
          {voices.map((v, vi) =>
            v.notes.map((n, ni) => {
              const isHovered = hoveredNote && hoveredNote.voiceIndex === vi && hoveredNote.noteIndex === ni;
              const isSelected = selectedNote && selectedNote.voiceIndex === vi && selectedNote.noteIndex === ni;
              const inSequence = isNoteInSequence(vi, ni);
              const inActiveSequence = isNoteInActiveSequence(vi, ni);
              const isHighlit = isNoteHighlighted(n);
              const noteData = { ...n, voiceIndex: vi, noteIndex: ni, voiceLabel: v.label, voiceColor: v.color, inSequence };

              const noteX = tToX(n.onset);
              const noteY = pToY(n.pitch) - nH / 2 + 1;
              const noteWidth = Math.max(2, n.duration * tScale - 1);
              const noteHeight = nH - 2;

              return (
                <g key={`${vi}-${ni}`}>
                  {/* Highlight background for non-sequence highlights */}
                  {isHighlit && !inSequence && (
                    <rect
                      x={noteX - 3}
                      y={noteY - 3}
                      width={noteWidth + 6}
                      height={noteHeight + 6}
                      fill="#60a5fa"
                      rx={5}
                      opacity={0.5}
                    />
                  )}
                  {/* Hatching background for sequences */}
                  {inSequence && (
                    <rect
                      x={noteX - 4}
                      y={noteY - 4}
                      width={noteWidth + 8}
                      height={noteHeight + 8}
                      fill={inActiveSequence ? "url(#seqHatchCross)" : "url(#seqHatch)"}
                      rx={5}
                      opacity={inActiveSequence ? 0.9 : 0.6}
                    />
                  )}
                  {/* Active sequence border */}
                  {inActiveSequence && (
                    <rect
                      x={noteX - 5}
                      y={noteY - 5}
                      width={noteWidth + 10}
                      height={noteHeight + 10}
                      fill="none"
                      stroke="#1f2937"
                      strokeWidth={2}
                      rx={6}
                      strokeDasharray="4,2"
                    />
                  )}
                  {/* The actual note */}
                  <rect
                    x={noteX}
                    y={noteY}
                    width={noteWidth}
                    height={noteHeight}
                    fill={v.color}
                    rx={2}
                    opacity={v.opacity || 1}
                    stroke={
                      isSelected ? '#000' :
                      isHovered ? '#666' :
                      inActiveSequence ? '#1f2937' :
                      inSequence ? '#475569' :
                      isHighlit ? '#2563eb' :
                      'none'
                    }
                    strokeWidth={
                      isSelected ? 2 :
                      isHovered ? 1 :
                      inActiveSequence ? 2.5 :
                      inSequence ? 2 :
                      isHighlit ? 1.5 :
                      0
                    }
                    style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                    onMouseEnter={(e) => handleMouseEnter(noteData, e)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleClick(noteData)}
                  />
                </g>
              );
            })
          )}

          {/* Legend */}
          <g transform={`translate(${scrollWidth - 120}, 6)`}>
            {voices.map((v, i) => (
              <g key={i} transform={`translate(0, ${i * 14})`}>
                <rect x={0} y={0} width={10} height={10} fill={v.color} rx={2} opacity={v.opacity || 1} />
                <text x={14} y={8} fontSize="9" fill="#546e7a">
                  {v.label}
                </text>
              </g>
            ))}
            {/* Sequence legend with hatching */}
            {sequenceRanges && sequenceRanges.length > 0 && (
              <g transform={`translate(0, ${voices.length * 14})`}>
                <rect x={0} y={0} width={10} height={10} fill="url(#seqHatch)" rx={2} stroke="#475569" strokeWidth={1} />
                <text x={14} y={8} fontSize="9" fill="#475569">
                  Sequence
                </text>
              </g>
            )}
          </g>

          {/* Hover tooltip */}
          {hoveredNote && (
            <g transform={`translate(${tToX(hoveredNote.onset) + (hoveredNote.duration * tScale) / 2}, ${pToY(hoveredNote.pitch) - nH / 2 - 28})`}>
              <rect
                x={-45}
                y={0}
                width={90}
                height={24}
                fill="rgba(55, 71, 79, 0.95)"
                rx={4}
              />
              <text x={0} y={10} fontSize="10" fill="white" textAnchor="middle" fontWeight="500">
                {pitchToName(hoveredNote.pitch)}
              </text>
              <text x={0} y={20} fontSize="9" fill="#cfd8dc" textAnchor="middle">
                {hoveredNote.scaleDegree ? `^${hoveredNote.scaleDegree.degree}` : ''} · {formatDuration(hoveredNote.duration)}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Selected note detail panel */}
      {selectedNote && (
        <div
          style={{
            marginTop: '8px',
            padding: '10px 12px',
            backgroundColor: '#fff',
            border: `2px solid ${selectedNote.voiceColor}`,
            borderRadius: '6px',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <strong style={{ color: selectedNote.voiceColor }}>{selectedNote.voiceLabel}</strong>
            <button
              onClick={() => setSelectedNote(null)}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: '#9e9e9e',
                fontSize: '14px',
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', color: '#546e7a' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#9e9e9e' }}>Pitch</div>
              <div style={{ fontWeight: '500' }}>{pitchToName(selectedNote.pitch)}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#9e9e9e' }}>Scale Degree</div>
              <div style={{ fontWeight: '500' }}>
                {selectedNote.scaleDegree
                  ? `^${selectedNote.scaleDegree.degree}${selectedNote.scaleDegree.alteration > 0 ? '#' : selectedNote.scaleDegree.alteration < 0 ? 'b' : ''}`
                  : 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#9e9e9e' }}>Duration</div>
              <div style={{ fontWeight: '500' }}>{formatDuration(selectedNote.duration)}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#9e9e9e' }}>Onset</div>
              <div style={{ fontWeight: '500' }}>Beat {selectedNote.onset + 1}</div>
            </div>
          </div>
          {selectedNote.inSequence && (
            <div style={{
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <svg width="12" height="12">
                <rect width="12" height="12" fill="url(#seqHatch)" rx={2} stroke="#475569" strokeWidth={1} />
              </svg>
              <span style={{ fontSize: '11px', color: '#475569', fontWeight: '500' }}>
                Part of melodic sequence (reduced motion penalties)
              </span>
            </div>
          )}
          {selectedNote.abcNote && (
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #eee' }}>
              <span style={{ fontSize: '10px', color: '#9e9e9e' }}>ABC: </span>
              <code style={{ fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: '2px 4px', borderRadius: '2px' }}>
                {selectedNote.abcNote}
              </code>
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize: '10px', color: '#9e9e9e', marginTop: '4px' }}>
        Click a note for details
      </div>
    </div>
  );
}

export default PianoRoll;
