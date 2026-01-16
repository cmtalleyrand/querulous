/**
 * Piano Roll visualization component
 * Displays notes as colored rectangles on a pitch/time grid
 */
export function PianoRoll({ voices, title }) {
  const all = voices.flatMap((v) => v.notes);
  if (!all.length) return null;

  const minP = Math.min(...all.map((n) => n.pitch)) - 2;
  const maxP = Math.max(...all.map((n) => n.pitch)) + 2;
  const maxT = Math.max(...all.map((n) => n.onset + n.duration));
  const pRange = maxP - minP;
  const nH = Math.max(8, Math.min(16, 200 / pRange));
  const h = pRange * nH + 44;
  const w = 560;
  const tScale = (w - 52) / maxT;

  const pToY = (p) => h - 20 - (p - minP) * nH;
  const tToX = (t) => 46 + t * tScale;

  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const labels = [];

  for (let p = minP; p <= maxP; p++) {
    if (p % 12 === 0 || p === minP || p === maxP) {
      labels.push({
        p,
        l: `${noteNames[((p % 12) + 12) % 12]}${Math.floor(p / 12) - 1}`,
      });
    }
  }

  return (
    <div style={{ marginTop: '8px' }}>
      {title && (
        <div style={{ fontSize: '12px', color: '#546e7a', marginBottom: '4px' }}>{title}</div>
      )}
      <svg
        width={w}
        height={h}
        style={{
          backgroundColor: '#fafafa',
          borderRadius: '4px',
          border: '1px solid #e0e0e0',
        }}
        role="img"
        aria-label={title || 'Piano roll visualization'}
      >
        {/* Beat grid lines */}
        {Array.from({ length: Math.ceil(maxT) + 1 }, (_, i) => (
          <line
            key={i}
            x1={tToX(i)}
            y1={14}
            x2={tToX(i)}
            y2={h - 20}
            stroke={i % 4 === 0 ? '#bdbdbd' : '#eee'}
            strokeWidth={i % 4 === 0 ? 1 : 0.5}
          />
        ))}

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
          v.notes.map((n, ni) => (
            <rect
              key={`${vi}-${ni}`}
              x={tToX(n.onset)}
              y={pToY(n.pitch) - nH / 2 + 1}
              width={Math.max(2, n.duration * tScale - 1)}
              height={nH - 2}
              fill={v.color}
              rx={2}
              opacity={v.opacity || 1}
            />
          ))
        )}

        {/* Legend */}
        <g transform={`translate(${w - 120}, 6)`}>
          {voices.map((v, i) => (
            <g key={i} transform={`translate(0, ${i * 14})`}>
              <rect x={0} y={0} width={10} height={10} fill={v.color} rx={2} opacity={v.opacity || 1} />
              <text x={14} y={8} fontSize="9" fill="#546e7a">
                {v.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

export default PianoRoll;
