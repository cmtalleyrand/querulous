import { getMeter } from '../../utils/dissonanceScoring';
import { generateGridLines, VIZ_COLORS } from '../../utils/vizConstants';

/**
 * Interval Timeline visualization component
 * Shows consonant vs dissonant intervals over time
 */
export function IntervalTimeline({ sims, title, maxTime }) {
  if (!sims.length) return null;

  // Dynamic width based on duration - minimum 40 pixels per beat for readability
  const minPixelsPerBeat = 40;
  const minWidth = 300;
  const maxWidth = 800;
  const calculatedWidth = maxTime * minPixelsPerBeat + 60;
  const w = Math.max(minWidth, Math.min(maxWidth, calculatedWidth));
  const needsScroll = calculatedWidth > maxWidth;
  const scrollWidth = needsScroll ? calculatedWidth : w;

  const h = 50;
  const tScale = (scrollWidth - 50) / maxTime;
  const tToX = (t) => 45 + t * tScale;

  // Color code: green = consonant, red = dissonant, darker on strong beats
  const getColor = (sim) => {
    const isConsonant = sim.interval.isConsonant();
    const baseColor = isConsonant ? VIZ_COLORS.consonant : VIZ_COLORS.dissonantProblematic;
    // Reduce opacity on weak beats
    const opacity = sim.metricWeight >= 0.75 ? 1 : 0.7;
    return { color: baseColor, opacity };
  };

  return (
    <div style={{ marginTop: '8px' }}>
      {title && (
        <div style={{ fontSize: '11px', color: '#546e7a', marginBottom: '3px' }}>{title}</div>
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
          aria-label={title || 'Interval timeline'}
        >
        {/* Beat lines - meter-aware */}
        {(() => {
          const meter = getMeter();
          const gridLines = generateGridLines(maxTime, meter, { showSubdivisions: false });

          return gridLines.map((line, i) => (
            <line
              key={i}
              x1={tToX(line.time)}
              y1={5}
              x2={tToX(line.time)}
              y2={h - 5}
              stroke={line.isDownbeat ? '#9ca3af' : (line.isMainBeat ? '#bdbdbd' : '#eee')}
              strokeWidth={line.isDownbeat ? 1.5 : (line.isMainBeat ? 0.75 : 0.5)}
            />
          ));
        })()}

        {/* Interval blocks */}
        {sims.map((s, i) => {
          const x = tToX(s.onset);
          const nextOnset = i < sims.length - 1 ? sims[i + 1].onset : maxTime;
          const width = Math.max(4, (nextOnset - s.onset) * tScale - 1);
          const style = getColor(s);
          return (
            <g key={i}>
              <rect x={x} y={10} width={width} height={30} fill={style.color} rx={2} opacity={style.opacity * 0.8} />
              <text x={x + width / 2} y={29} fontSize="9" fill="white" textAnchor="middle" fontWeight="500">
                {s.interval.class === 1 ? 'U' : s.interval.class === 8 ? '8' : s.interval.class}
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <rect x={scrollWidth - 80} y={5} width={12} height={12} fill={VIZ_COLORS.consonant} rx={2} />
        <text x={scrollWidth - 65} y={14} fontSize="8" fill="#546e7a">
          cons.
        </text>
        <rect x={scrollWidth - 80} y={20} width={12} height={12} fill={VIZ_COLORS.dissonantProblematic} rx={2} />
        <text x={scrollWidth - 65} y={29} fontSize="8" fill="#546e7a">
          diss.
        </text>
      </svg>
      </div>
    </div>
  );
}

export default IntervalTimeline;
