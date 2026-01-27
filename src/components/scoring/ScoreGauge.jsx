import { getScoreColor, getScoreRating } from '../../utils/scoring';

/**
 * Circular score gauge component for base-zero scores
 * Shows score with +/- prefix and visual indicator
 */
export function ScoreGauge({ score, size = 120, strokeWidth = 10, label }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Map base-zero score (-30 to +30) to progress (0 to 1)
  // 0 baseline = 50%, -30 = 0%, +30 = 100%
  const normalizedProgress = Math.max(0, Math.min(1, (score + 30) / 60));
  const progress = normalizedProgress * circumference;
  const color = getScoreColor(score);
  const rating = getScoreRating(score);

  // Format score with sign
  const formatScore = (s) => {
    const rounded = Math.round(s * 10) / 10;
    return rounded >= 0 ? `+${rounded}` : `${rounded}`;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e0e0e0"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
        />
        {/* Score text */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize={size / 5}
          fontWeight="600"
          style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
        >
          {formatScore(score)}
        </text>
      </svg>
      {label && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#37474f' }}>{label}</div>
          <div style={{ fontSize: '11px', color: color }}>{rating}</div>
        </div>
      )}
    </div>
  );
}

export default ScoreGauge;
