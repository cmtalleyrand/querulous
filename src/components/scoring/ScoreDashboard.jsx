import { useState } from 'react';
import { ScoreGauge } from './ScoreGauge';
import { ScoreBar } from './ScoreBar';
import { SCORE_CATEGORIES, getScoreSummary } from '../../utils/scoring';

/**
 * Main scoring dashboard component
 * Displays overall score and breakdown by category
 *
 * Categories are now organized by conceptual groups:
 * - MELODIC: Properties of the subject line itself
 * - FUGAL: How well it works as fugue material
 * - COMBINATION: How voices work together (with CS)
 */
export function ScoreDashboard({ scoreResult, hasCountersubject }) {
  const [showDetails, setShowDetails] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);

  if (!scoreResult) return null;

  const { strengths, improvements } = getScoreSummary(scoreResult);

  // Organize categories by conceptual group
  const categoryGroups = {
    melodic: {
      title: 'Melodic Quality',
      subtitle: 'Properties of the subject line',
      color: '#5c6bc0',
      categories: ['rhythmicCharacter'],
    },
    fugal: {
      title: 'Fugal Potential',
      subtitle: 'How well it works as fugue material',
      color: '#7e57c2',
      categories: ['strettoPotential'],
    },
    combination: {
      title: 'Voice Combination',
      subtitle: 'How voices work together',
      color: '#81c784',
      categories: hasCountersubject
        ? ['invertibility', 'rhythmicInterplay', 'voiceIndependence', 'transpositionStability']
        : [],
    },
    // Basic indicators - shown separately with reduced prominence
    basicIndicators: {
      title: 'Basic Indicators',
      subtitle: 'Simple tonal orientation checks',
      color: '#90a4ae',
      categories: ['tonalClarity'],
      isBasic: true,
    },
  };

  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        overflow: 'hidden',
        marginBottom: '20px',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #2c3e50, #34495e)',
          color: 'white',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Viability Score</h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.8 }}>
            Overall assessment of fugal viability
          </p>
        </div>
        <ScoreGauge score={scoreResult.overall} size={80} strokeWidth={8} />
      </div>

      {/* Rating banner */}
      <div
        style={{
          padding: '12px 20px',
          backgroundColor: scoreResult.bgColor,
          borderBottom: `2px solid ${scoreResult.color}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <span style={{ fontSize: '16px', fontWeight: '600', color: scoreResult.color }}>
            {scoreResult.rating}
          </span>
          <span style={{ marginLeft: '8px', fontSize: '13px', color: '#546e7a' }}>
            ({scoreResult.overall >= 0 ? '+' : ''}{scoreResult.overall})
          </span>
          <span style={{ marginLeft: '8px', fontSize: '11px', color: '#90a4ae' }}>
            0 = baseline
          </span>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            padding: '6px 12px',
            backgroundColor: showDetails ? '#37474f' : 'white',
            color: showDetails ? 'white' : '#37474f',
            border: '1px solid #37474f',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Main content */}
      <div style={{ padding: '16px 20px' }}>
        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          {/* Strengths */}
          <div
            style={{
              padding: '12px',
              backgroundColor: '#e8f5e9',
              borderRadius: '6px',
              border: '1px solid #a5d6a7',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#2e7d32', marginBottom: '8px' }}>
              Strengths ({strengths.length})
            </div>
            {strengths.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#37474f' }}>
                {strengths.slice(0, 3).map((s, i) => (
                  <li key={i}>{s.category}</li>
                ))}
                {strengths.length > 3 && <li>+{strengths.length - 3} more</li>}
              </ul>
            ) : (
              <div style={{ fontSize: '11px', color: '#757575', fontStyle: 'italic' }}>
                No strong categories yet
              </div>
            )}
          </div>

          {/* Areas for Improvement */}
          <div
            style={{
              padding: '12px',
              backgroundColor: '#fff3e0',
              borderRadius: '6px',
              border: '1px solid #ffcc80',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#e65100', marginBottom: '8px' }}>
              Areas to Improve ({improvements.length})
            </div>
            {improvements.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#37474f' }}>
                {improvements.slice(0, 3).map((s, i) => (
                  <li key={i}>{s.category}</li>
                ))}
                {improvements.length > 3 && <li>+{improvements.length - 3} more</li>}
              </ul>
            ) : (
              <div style={{ fontSize: '11px', color: '#757575', fontStyle: 'italic' }}>
                All categories are performing well!
              </div>
            )}
          </div>
        </div>

        {/* Category Groups */}
        {Object.entries(categoryGroups).map(([groupKey, group]) => {
          // Skip empty groups
          if (group.categories.length === 0) return null;

          // Basic indicators get reduced prominence
          if (group.isBasic) {
            return (
              <div key={groupKey} style={{ marginBottom: '16px', opacity: 0.8 }}>
                <h3
                  style={{
                    fontSize: '11px',
                    fontWeight: '500',
                    color: '#78909c',
                    marginBottom: '4px',
                    paddingBottom: '4px',
                    borderBottom: `1px solid ${group.color}`,
                  }}
                >
                  {group.title}
                </h3>
                <p style={{ fontSize: '10px', color: '#90a4ae', margin: '0 0 8px 0' }}>
                  {group.subtitle}
                </p>
                {group.categories.map((key) => {
                  const data = scoreResult.categories[key];
                  if (!data) return null;
                  return (
                    <div key={key} onClick={() => setExpandedCategory(expandedCategory === key ? null : key)}>
                      <ScoreBar
                        categoryKey={key}
                        score={data.internal}
                        internalScore={data.internal}
                        showDetails={showDetails || expandedCategory === key}
                        details={data.details}
                        compact={true}
                      />
                    </div>
                  );
                })}
              </div>
            );
          }

          return (
            <div key={groupKey} style={{ marginBottom: '16px' }}>
              <h3
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#37474f',
                  marginBottom: '4px',
                  paddingBottom: '6px',
                  borderBottom: `2px solid ${group.color}`,
                }}
              >
                {group.title}
              </h3>
              <p style={{ fontSize: '11px', color: '#78909c', margin: '0 0 10px 0' }}>
                {group.subtitle}
              </p>
              {group.categories.map((key) => {
                const data = scoreResult.categories[key];
                if (!data) return null;
                return (
                  <div key={key} onClick={() => setExpandedCategory(expandedCategory === key ? null : key)}>
                    <ScoreBar
                      categoryKey={key}
                      score={data.internal}
                      internalScore={data.internal}
                      showDetails={showDetails || expandedCategory === key}
                      details={data.details}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Improvement suggestions */}
        {improvements.length > 0 && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#fafafa',
              borderRadius: '6px',
              border: '1px solid #e0e0e0',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#37474f', marginBottom: '8px' }}>
              Suggestions for Improvement
            </div>
            {improvements.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: '8px',
                  marginBottom: '6px',
                  backgroundColor: '#fff',
                  borderRadius: '4px',
                  border: '1px solid #e0e0e0',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: '500', color: '#e65100' }}>{item.category}</div>
                <div style={{ fontSize: '11px', color: '#546e7a', marginTop: '2px' }}>{item.suggestion}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ScoreDashboard;
