import { getMeter } from '../../utils/dissonanceScoring';

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
    const base = sim.interval.isConsonant() ? [100, 180, 100] : [200, 80, 80];
    const factor = sim.metricWeight >= 0.75 ? 1 : 0.6;
    return `rgb(${base.map((c) => Math.round(c * factor)).join(',')})`;
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
          const beatsPerMeasure = meter[0];
          const isCompound = (meter[0] % 3 === 0 && meter[1] === 8 && meter[0] >= 3);

          return Array.from({ length: Math.ceil(maxTime) + 1 }, (_, i) => {
            const posInMeasure = i % beatsPerMeasure;
            const isDownbeat = posInMeasure === 0;
            const isMainBeat = isCompound ? (posInMeasure % 3 === 0) : true;

            return (
              <line
                key={i}
                x1={tToX(i)}
                y1={5}
                x2={tToX(i)}
                y2={h - 5}
                stroke={isDownbeat ? '#9ca3af' : (isMainBeat ? '#bdbdbd' : '#eee')}
                strokeWidth={isDownbeat ? 1.5 : (isMainBeat ? 0.75 : 0.5)}
              />
            );
          });
        })()}

        {/* Interval blocks */}
        {sims.map((s, i) => {
          const x = tToX(s.onset);
          const nextOnset = i < sims.length - 1 ? sims[i + 1].onset : maxTime;
          const width = Math.max(4, (nextOnset - s.onset) * tScale - 1);
          return (
            <g key={i}>
              <rect x={x} y={10} width={width} height={30} fill={getColor(s)} rx={2} opacity={0.8} />
              <text x={x + width / 2} y={29} fontSize="9" fill="white" textAnchor="middle" fontWeight="500">
                {s.interval.class === 1 ? 'U' : s.interval.class === 8 ? '8' : s.interval.class}
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <rect x={scrollWidth - 80} y={5} width={12} height={12} fill="rgb(100,180,100)" rx={2} />
        <text x={scrollWidth - 65} y={14} fontSize="8" fill="#546e7a">
          cons.
        </text>
        <rect x={scrollWidth - 80} y={20} width={12} height={12} fill="rgb(200,80,80)" rx={2} />
        <text x={scrollWidth - 65} y={29} fontSize="8" fill="#546e7a">
          diss.
        </text>
      </svg>
      </div>
    </div>
  );
}

export default IntervalTimeline;
