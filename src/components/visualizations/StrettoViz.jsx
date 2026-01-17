/**
 * Stretto Visualization component
 * Shows overlapping subject entries with conflict markers and interval labels
 */
export function StrettoViz({ subject, distance, issues, warnings = [], intervalPoints = [], formatter, octaveDisp }) {
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
  // Add extra height for interval labels
  const intervalLabelHeight = intervalPoints.length > 0 ? 24 : 0;
  const h = pRange * nH + 40 + intervalLabelHeight;
  const w = 560;
  const tScale = (w - 50) / (subEnd + distance);

  const pToY = (p) => h - 18 - intervalLabelHeight - (p - minP) * nH;
  const tToX = (t) => 42 + t * tScale;

  const hasIssues = issues.length > 0;
  const hasWarnings = warnings.length > 0;

  // Determine background color based on status
  let bgColor = '#e8f5e9';
  let borderColor = '#a5d6a7';
  if (hasIssues) {
    bgColor = '#ffebee';
    borderColor = '#ef9a9a';
  } else if (hasWarnings) {
    bgColor = '#fff8e1';
    borderColor = '#ffe082';
  }

  return (
    <svg
      width={w}
      height={h}
      style={{
        backgroundColor: bgColor,
        borderRadius: '4px',
        border: `1px solid ${borderColor}`,
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
          y2={h - 18 - intervalLabelHeight}
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
        <g key={`issue-${i}`}>
          <circle cx={tToX(is.onset || 0)} cy={7} r={5} fill="#d32f2f" />
          <text x={tToX(is.onset || 0)} y={10} fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">
            !
          </text>
        </g>
      ))}

      {/* Warning markers */}
      {warnings.map((w, i) => (
        <g key={`warn-${i}`}>
          <circle cx={tToX(w.onset || 0)} cy={7} r={4} fill="#ff9800" />
          <text x={tToX(w.onset || 0)} y={10} fontSize="7" fill="white" textAnchor="middle" fontWeight="bold">
            ?
          </text>
        </g>
      ))}

      {/* Interval labels at each simultaneity point */}
      {intervalPoints.length > 0 && (
        <g>
          {/* Background strip for intervals */}
          <rect
            x={0}
            y={h - intervalLabelHeight - 2}
            width={w}
            height={intervalLabelHeight}
            fill="rgba(255,255,255,0.7)"
          />
          {/* Interval markers */}
          {intervalPoints.map((pt, i) => {
            const x = tToX(pt.onset);
            const isDissonant = !pt.isConsonant;
            const isPerfect = [1, 5, 8].includes(pt.intervalClass);

            // Color coding based on dissonance type
            let fillColor = '#43a047'; // imperfect consonance (3rd, 6th)
            if (isDissonant) {
              // Color by dissonance type
              if (pt.dissonanceType === 'suspension') fillColor = '#7b1fa2'; // purple for suspensions
              else if (pt.dissonanceType === 'passing' || pt.dissonanceType === 'neighbor') fillColor = '#f57c00'; // orange for passing/neighbor
              else if (pt.dissonanceType === 'unprepared') fillColor = '#d32f2f'; // red for unprepared
              else fillColor = '#e53935'; // default red
            } else if (isPerfect) {
              fillColor = '#1e88e5';
            }

            // Highlight strong beats
            const isStrong = pt.isStrong;

            // Build label: interval class + dissonance type abbreviation
            let label = `${pt.intervalClass}`;
            if (pt.dissonanceLabel && pt.dissonanceLabel !== '!') {
              label = pt.dissonanceLabel;
            }

            return (
              <g key={`int-${i}`}>
                {/* Vertical line connecting to notes */}
                <line
                  x1={x}
                  y1={h - intervalLabelHeight - 2}
                  x2={x}
                  y2={h - intervalLabelHeight + 4}
                  stroke={fillColor}
                  strokeWidth={isStrong ? 2 : 1}
                  opacity={0.6}
                />
                {/* Interval label */}
                <text
                  x={x}
                  y={h - 6}
                  fontSize={isStrong ? '9' : '8'}
                  fill={fillColor}
                  textAnchor="middle"
                  fontWeight={isStrong ? '600' : '400'}
                  fontFamily="monospace"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </g>
      )}

      {/* Labels */}
      <text x={tToX(0)} y={h - intervalLabelHeight - 5} fontSize="9" fill="#5c6bc0" fontWeight="500">
        Dux
      </text>
      <text x={tToX(distance)} y={h - intervalLabelHeight - 5} fontSize="9" fill="#ef5350" fontWeight="500">
        Comes (+{formatter.formatDistance(distance)})
      </text>

      {/* Legend for interval colors */}
      {intervalPoints.length > 0 && (
        <g transform={`translate(${w - 200}, 5)`}>
          <rect x={0} y={0} width={8} height={8} fill="#43a047" rx={1} />
          <text x={11} y={7} fontSize="6" fill="#666">3rd/6th</text>
          <rect x={40} y={0} width={8} height={8} fill="#1e88e5" rx={1} />
          <text x={51} y={7} fontSize="6" fill="#666">P5/8</text>
          <rect x={72} y={0} width={8} height={8} fill="#7b1fa2" rx={1} />
          <text x={83} y={7} fontSize="6" fill="#666">sus</text>
          <rect x={100} y={0} width={8} height={8} fill="#f57c00" rx={1} />
          <text x={111} y={7} fontSize="6" fill="#666">PT/N</text>
          <rect x={133} y={0} width={8} height={8} fill="#d32f2f" rx={1} />
          <text x={144} y={7} fontSize="6" fill="#666">unprep</text>
        </g>
      )}
    </svg>
  );
}

export default StrettoViz;
