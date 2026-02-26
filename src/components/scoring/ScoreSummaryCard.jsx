import { getScoreColor, SCORE_CATEGORIES } from '../../utils/scoring';

/**
 * Compact score summary card for quick overview
 */
export function ScoreSummaryCard({ scoreResult, onClick }) {
  if (!scoreResult) return null;

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '12px 16px',
        backgroundColor: scoreResult.bgColor,
        border: `2px solid ${scoreResult.color}`,
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'transform 0.2s, box-shadow 0.2s',
        fontFamily: 'inherit',
      }}
      aria-label={`Overall score: ${scoreResult.overall} - ${scoreResult.rating}. Click for details.`}
    >
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#37474f' }}>Viability Score</div>
        <div style={{ fontSize: '12px', color: scoreResult.color, fontWeight: '500' }}>
          {scoreResult.rating}
        </div>
      </div>
      <div
        style={{
          fontSize: '32px',
          fontWeight: '700',
          color: scoreResult.color,
        }}
      >
        {scoreResult.overall}
      </div>
    </button>
  );
}

/**
 * Mini score badges for category overview
 */
export function ScoreBadges({ scoreResult }) {
  if (!scoreResult?.categories) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
      {Object.entries(scoreResult.categories).map(([key, data]) => {
        const category = SCORE_CATEGORIES[key];
        const color = getScoreColor(data.score);

        return (
          <div
            key={key}
            style={{
              padding: '4px 8px',
              backgroundColor: '#fff',
              border: `1px solid ${color}`,
              borderRadius: '12px',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title={`${category?.name}: ${data.score}/100`}
          >
            <span style={{ color: '#546e7a' }}>{category?.name?.split(' ')[0]}</span>
            <span style={{ fontWeight: '600', color }}>{data.score}</span>
          </div>
        );
      })}
    </div>
  );
}

export default ScoreSummaryCard;
