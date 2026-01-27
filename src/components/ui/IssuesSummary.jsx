import { useState } from 'react';

/**
 * IssuesSummary - Aggregates and displays all issues from various analyses
 * Shows problems prominently at the top of the results
 *
 * @param {Object} results - Analysis results
 * @param {Object} scoreResult - Score data
 * @param {Function} onHighlight - Callback when an issue is clicked: onHighlight({ onset, type, voice })
 * @param {Object} highlightedItem - Currently highlighted item for visual feedback
 */
export function IssuesSummary({ results, scoreResult, onHighlight, highlightedItem }) {
  const [expandedCategory, setExpandedCategory] = useState(null);

  if (!results) return null;

  // Helper to handle item clicks
  const handleItemClick = (item, categoryName) => {
    if (onHighlight && item.onset !== undefined) {
      onHighlight({
        onset: item.onset,
        type: categoryName,
        description: item.description,
      });
    }
  };

  // Check if an item is currently highlighted
  const isHighlighted = (item) => {
    if (!highlightedItem || item.onset === undefined) return false;
    return Math.abs(highlightedItem.onset - item.onset) < 0.01;
  };

  // Collect all issues from various analyses
  const categories = [];

  // Harmonic issues
  if (results.harmonicImplication?.observations) {
    const issues = results.harmonicImplication.observations.filter(o => o.type === 'issue');
    const warnings = results.harmonicImplication.observations.filter(o => o.type === 'consideration');
    if (issues.length > 0 || warnings.length > 0) {
      categories.push({
        name: 'Harmonic Implication',
        issues,
        warnings,
        icon: '🎹',
      });
    }
  }

  // Tonal answer issues
  if (results.tonalAnswer?.observations) {
    const issues = results.tonalAnswer.observations.filter(o => o.type === 'issue');
    const warnings = results.tonalAnswer.observations.filter(o => o.type === 'consideration');
    if (issues.length > 0 || warnings.length > 0) {
      categories.push({
        name: 'Tonal Answer',
        issues,
        warnings,
        icon: '↗️',
      });
    }
  }

  // Stretto issues - show each problematic stretto individually
  if (results.stretto?.problematicStrettos?.length > 0) {
    const issues = results.stretto.problematicStrettos.map(s => ({
      description: `Stretto at ${s.distance} beats: ${s.issues?.length || 0} issue${(s.issues?.length || 0) !== 1 ? 's' : ''} (${s.issues?.map(i => i.description || i.type || 'voice-leading').join(', ') || 'voice-leading issues'})`,
    }));
    categories.push({
      name: 'Stretto Viability',
      issues,
      warnings: [],
      icon: '🎼',
      detail: `${results.stretto.cleanStrettos?.length || 0} clean, ${(results.stretto.viableStrettos?.length || 0) - (results.stretto.cleanStrettos?.length || 0)} with warnings`,
    });
  }

  // Double counterpoint issues - show each issue individually, not as summary
  if (results.doubleCounterpoint) {
    const issues = [];
    const warnings = [];

    // Show each original position issue separately
    if (results.doubleCounterpoint.original?.issues?.length > 0) {
      for (const issue of results.doubleCounterpoint.original.issues) {
        issues.push({
          description: `Original: ${issue.description || issue}`,
          onset: issue.onset,
        });
      }
    }
    // Show each inverted position issue separately
    if (results.doubleCounterpoint.inverted?.issues?.length > 0) {
      for (const issue of results.doubleCounterpoint.inverted.issues) {
        issues.push({
          description: `Inverted: ${issue.description || issue}`,
          onset: issue.onset,
        });
      }
    }

    if (results.doubleCounterpoint.observations) {
      const obsIssues = results.doubleCounterpoint.observations.filter(o => o.type === 'issue');
      const obsWarnings = results.doubleCounterpoint.observations.filter(o => o.type === 'consideration');
      issues.push(...obsIssues);
      warnings.push(...obsWarnings);
    }

    if (issues.length > 0 || warnings.length > 0) {
      categories.push({
        name: 'Invertibility',
        issues,
        warnings,
        icon: '🔄',
      });
    }
  }

  // Contour independence issues
  if (results.contourIndependence?.details) {
    const warnings = results.contourIndependence.details.filter(d =>
      d.description?.toLowerCase().includes('parallel') ||
      d.description?.toLowerCase().includes('consecutive')
    );
    if (warnings.length > 0) {
      categories.push({
        name: 'Contour Independence',
        issues: [],
        warnings: warnings.map(w => ({ description: w.description })),
        icon: '📈',
      });
    }
  }

  // Rhythmic complementarity issues
  if (results.rhythmicComplementarity?.observations) {
    const issues = results.rhythmicComplementarity.observations.filter(o => o.type === 'issue');
    const warnings = results.rhythmicComplementarity.observations.filter(o => o.type === 'consideration');
    if (issues.length > 0 || warnings.length > 0) {
      categories.push({
        name: 'Rhythmic Complementarity',
        issues,
        warnings,
        icon: '🥁',
      });
    }
  }

  const totalIssues = categories.reduce((sum, c) => sum + c.issues.length, 0);
  const totalWarnings = categories.reduce((sum, c) => sum + c.warnings.length, 0);

  if (totalIssues === 0 && totalWarnings === 0) {
    return (
      <div style={{
        padding: '16px 20px',
        backgroundColor: '#ecfdf5',
        border: '1px solid #a7f3d0',
        borderRadius: '8px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span style={{ fontSize: '20px' }}>✓</span>
        <div>
          <div style={{ fontWeight: '600', color: '#065f46', fontSize: '14px' }}>
            No significant issues detected
          </div>
          <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
            Your fugue materials appear to be well-suited for contrapuntal development.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#fff',
      border: totalIssues > 0 ? '1px solid #fca5a5' : '1px solid #fcd34d',
      borderRadius: '8px',
      marginBottom: '16px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        backgroundColor: totalIssues > 0 ? '#fef2f2' : '#fffbeb',
        borderBottom: totalIssues > 0 ? '1px solid #fca5a5' : '1px solid #fcd34d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px' }}>{totalIssues > 0 ? '⚠️' : '💡'}</span>
          <div>
            <div style={{ fontWeight: '600', color: totalIssues > 0 ? '#991b1b' : '#92400e', fontSize: '14px' }}>
              {totalIssues > 0
                ? `${totalIssues} issue${totalIssues !== 1 ? 's' : ''} found`
                : `${totalWarnings} consideration${totalWarnings !== 1 ? 's' : ''} to review`
              }
            </div>
            <div style={{ fontSize: '12px', color: totalIssues > 0 ? '#dc2626' : '#b45309', marginTop: '2px' }}>
              {totalWarnings > 0 && totalIssues > 0 && `Plus ${totalWarnings} additional consideration${totalWarnings !== 1 ? 's' : ''}`}
            </div>
          </div>
        </div>

        {/* Overall score indicator */}
        {scoreResult && (
          <div style={{
            padding: '8px 16px',
            backgroundColor: scoreResult.overall >= 75 ? '#dcfce7' : scoreResult.overall >= 50 ? '#fef3c7' : '#fee2e2',
            borderRadius: '6px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: scoreResult.overall >= 75 ? '#166534' : scoreResult.overall >= 50 ? '#92400e' : '#dc2626' }}>
              {Math.round(scoreResult.overall)}
            </div>
            <div style={{ fontSize: '10px', color: '#6b7280' }}>overall</div>
          </div>
        )}
      </div>

      {/* Issue categories */}
      <div style={{ padding: '12px 16px' }}>
        {categories.map((cat, idx) => (
          <div key={idx} style={{
            borderBottom: idx < categories.length - 1 ? '1px solid #f3f4f6' : 'none',
            paddingBottom: idx < categories.length - 1 ? '10px' : '0',
            marginBottom: idx < categories.length - 1 ? '10px' : '0',
          }}>
            <button
              onClick={() => setExpandedCategory(expandedCategory === idx ? null : idx)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                padding: '6px 0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px' }}>{cat.icon}</span>
                <span style={{ fontWeight: '500', color: '#374151', fontSize: '13px' }}>{cat.name}</span>
                {cat.issues.length > 0 && (
                  <span style={{
                    padding: '2px 8px',
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: '600',
                  }}>
                    {cat.issues.length} issue{cat.issues.length !== 1 ? 's' : ''}
                  </span>
                )}
                {cat.warnings.length > 0 && (
                  <span style={{
                    padding: '2px 8px',
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: '500',
                  }}>
                    {cat.warnings.length}
                  </span>
                )}
              </div>
              <span style={{
                color: '#9ca3af',
                fontSize: '12px',
                transform: expandedCategory === idx ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s',
              }}>
                ▼
              </span>
            </button>

            {expandedCategory === idx && (
              <div style={{ paddingLeft: '34px', marginTop: '6px' }}>
                {cat.detail && (
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                    {cat.detail}
                  </div>
                )}
                {cat.issues.map((issue, i) => {
                  const hasOnset = issue.onset !== undefined;
                  const highlighted = isHighlighted(issue);
                  return (
                    <div
                      key={`issue-${i}`}
                      onClick={hasOnset ? () => handleItemClick(issue, cat.name) : undefined}
                      style={{
                        fontSize: '12px',
                        color: '#dc2626',
                        padding: '6px 10px',
                        borderLeft: highlighted ? '4px solid #dc2626' : '2px solid #fca5a5',
                        marginBottom: '4px',
                        borderRadius: '0 4px 4px 0',
                        backgroundColor: highlighted ? '#fef2f2' : hasOnset ? '#fff' : 'transparent',
                        cursor: hasOnset ? 'pointer' : 'default',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={hasOnset ? (e) => e.currentTarget.style.backgroundColor = '#fef2f2' : undefined}
                      onMouseLeave={hasOnset && !highlighted ? (e) => e.currentTarget.style.backgroundColor = '#fff' : undefined}
                    >
                      {hasOnset && (
                        <span style={{ marginRight: '6px', opacity: 0.6 }}>
                          ▸
                        </span>
                      )}
                      {issue.description}
                    </div>
                  );
                })}
                {cat.warnings.map((warning, i) => {
                  const hasOnset = warning.onset !== undefined;
                  const highlighted = isHighlighted(warning);
                  return (
                    <div
                      key={`warn-${i}`}
                      onClick={hasOnset ? () => handleItemClick(warning, cat.name) : undefined}
                      style={{
                        fontSize: '12px',
                        color: '#92400e',
                        padding: '6px 10px',
                        borderLeft: highlighted ? '4px solid #f59e0b' : '2px solid #fcd34d',
                        marginBottom: '4px',
                        borderRadius: '0 4px 4px 0',
                        backgroundColor: highlighted ? '#fffbeb' : hasOnset ? '#fff' : 'transparent',
                        cursor: hasOnset ? 'pointer' : 'default',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={hasOnset ? (e) => e.currentTarget.style.backgroundColor = '#fffbeb' : undefined}
                      onMouseLeave={hasOnset && !highlighted ? (e) => e.currentTarget.style.backgroundColor = '#fff' : undefined}
                    >
                      {hasOnset && (
                        <span style={{ marginRight: '6px', opacity: 0.6 }}>
                          ▸
                        </span>
                      )}
                      {warning.description}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default IssuesSummary;
