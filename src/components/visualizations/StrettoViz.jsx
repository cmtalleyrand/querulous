/**
 * Stretto Visualization component
 * Shows overlapping subject entries with conflict markers
 */
export function StrettoViz({ subject, distance, issues, formatter, octaveDisp }) {
  if (!subject?.length) return null;

  const subEnd = subject[subject.length - 1].onset + subject[subject.length - 1].duration;
  const dux = subject;
  const comes = subject.map((n) => ({
    ...n,
    pitch: n.pitch + octaveDisp,
    onset: n.onset + distance,
  }));

  const all = [...dux, ...comes];
  const minP = Math.min(...all.map((n) => n.pitch)) - 2;
  const maxP = Math.max(...all.map((n) => n.pitch)) + 2;
  const pRange = maxP - minP;
  const nH = Math.max(7, Math.min(12, 140 / pRange));
  const h = pRange * nH + 40;
  const w = 480;
  const tScale = (w - 40) / (subEnd + distance);

  const pToY = (p) => h - 18 - (p - minP) * nH;
  const tToX = (t) => 36 + t * tScale;

  const hasIssues = issues.length > 0;

  return (
    <svg
      width={w}
      height={h}
      style={{
        backgroundColor: hasIssues ? '#fff8e1' : '#e8f5e9',
        borderRadius: '4px',
        border: `1px solid ${hasIssues ? '#ffe082' : '#a5d6a7'}`,
      }}
      role="img"
      aria-label={`Stretto visualization at ${formatter.formatDistance(distance)}`}
    >
      {/* Beat grid lines */}
      {Array.from({ length: Math.ceil(subEnd + distance) + 1 }, (_, i) => (
        <line
          key={i}
          x1={tToX(i)}
          y1={10}
          x2={tToX(i)}
          y2={h - 18}
          stroke={i % 4 === 0 ? '#bdbdbd' : '#e0e0e0'}
          strokeWidth={i % 4 === 0 ? 1 : 0.5}
        />
      ))}

      {/* Dux (original) notes */}
      {dux.map((n, i) => (
        <rect
          key={`d${i}`}
          x={tToX(n.onset)}
          y={pToY(n.pitch) - nH / 2 + 1}
          width={Math.max(2, n.duration * tScale - 1)}
          height={nH - 2}
          fill="#5c6bc0"
          rx={2}
        />
      ))}

      {/* Comes (delayed) notes */}
      {comes.map((n, i) => (
        <rect
          key={`c${i}`}
          x={tToX(n.onset)}
          y={pToY(n.pitch) - nH / 2 + 1}
          width={Math.max(2, n.duration * tScale - 1)}
          height={nH - 2}
          fill="#ef5350"
          rx={2}
          opacity={0.85}
        />
      ))}

      {/* Issue markers */}
      {issues.map((is, i) => (
        <g key={i}>
          <circle cx={tToX(is.onset || 0)} cy={7} r={5} fill="#ff5722" />
          <text x={tToX(is.onset || 0)} y={10} fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">
            !
          </text>
        </g>
      ))}

      {/* Labels */}
      <text x={tToX(0)} y={h - 5} fontSize="9" fill="#5c6bc0" fontWeight="500">
        Dux
      </text>
      <text x={tToX(distance)} y={h - 5} fontSize="9" fill="#ef5350" fontWeight="500">
        Comes (+{formatter.formatDistance(distance)})
      </text>
    </svg>
  );
}

export default StrettoViz;
