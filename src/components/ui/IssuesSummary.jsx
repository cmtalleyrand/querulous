import { useState } from 'react';

/**
 * IssuesSummary - Aggregates and displays all issues from various analyses
 * Shows problems prominently at the top of the results
 *
 * @param {Object} results - Analysis results
 * @param {Function} onHighlight - Callback when an issue is clicked: onHighlight({ onset, type, voice })
 * @param {Object} highlightedItem - Currently highlighted item for visual feedback
 */
export function IssuesSummary({ results, onHighlight, highlightedItem }) {
  const [expandedCategory, setExpandedCategory] = useState(null);

  if (!results) return null;

  const withAnchors = (item, categoryName, rowType, fallbackIndex) => ({
    ...item,
    sourceCategory: item.sourceCategory ?? categoryName,
    sourceType: item.sourceType ?? rowType,
    sourceId: item.sourceId ?? item.id ?? null,
    sourceIndex: item.sourceIndex ?? item.index ?? fallbackIndex,
  });

  const getUndrillableReason = (item) => {
    if (item.onset === undefined) return 'missing onset';
    return null;
  };

  // Helper to handle item clicks
  const handleItemClick = (item, categoryName) => {
    const undrillableReason = getUndrillableReason(item);
    if (onHighlight && !undrillableReason) {
      onHighlight({
        onset: item.onset,
        type: categoryName,
        description: item.description,
        sourceCategory: item.sourceCategory,
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        sourceIndex: item.sourceIndex,
      });
    }
  };

  // Check if an item is currently highlighted
  const isHighlighted = (item) => {
    if (!highlightedItem || item.onset === undefined) return false;

    const onsetMatch = Math.abs(highlightedItem.onset - item.onset) < 0.01;
    const categoryMatch = !highlightedItem.sourceCategory || !item.sourceCategory || highlightedItem.sourceCategory === item.sourceCategory;
    const idMatch = highlightedItem.sourceId == null || item.sourceId == null || highlightedItem.sourceId === item.sourceId;
    const indexMatch = highlightedItem.sourceIndex == null || item.sourceIndex == null || highlightedItem.sourceIndex === item.sourceIndex;

    return onsetMatch && categoryMatch && idMatch && indexMatch;
  };

  // Collect all issues from various analyses
  const categories = [];

  // Harmonic issues
  if (results.harmonicImplication?.observations) {
    const issues = results.harmonicImplication.observations
      .filter(o => o.type === 'issue')
      .map((o, i) => withAnchors(o, 'Harmonic Implication', 'issue', i));
    const warnings = results.harmonicImplication.observations
      .filter(o => o.type === 'consideration')
      .map((o, i) => withAnchors(o, 'Harmonic Implication', 'warning', i));
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
    const issues = results.tonalAnswer.observations
      .filter(o => o.type === 'issue')
      .map((o, i) => withAnchors(o, 'Tonal Answer', 'issue', i));
    const warnings = results.tonalAnswer.observations
      .filter(o => o.type === 'consideration')
      .map((o, i) => withAnchors(o, 'Tonal Answer', 'warning', i));
    if (issues.length > 0 || warnings.length > 0) {
      categories.push({
        name: 'Tonal Answer',
        issues,
        warnings,
        icon: '↗️',
      });
    }
  }

  // Stretto: only show a summary warning if there are zero viable strettos at any transposition
  // Individual non-viable strettos are NOT issues - they're just distances that don't work
  if (results.stretto) {
    const viableCount = results.stretto.viableStrettos?.length || 0;
    if (viableCount === 0 && (results.stretto.allResults?.length || 0) > 0) {
      categories.push({
        name: 'Stretto Viability',
        issues: [],
        warnings: [withAnchors({ description: 'No viable stretto found at any transposition or distance' }, 'Stretto Viability', 'warning', 0)],
        icon: '🎼',
      });
    }
  }

  // Double counterpoint issues - show each issue individually, not as summary
  if (results.doubleCounterpoint) {
    const issues = [];
    const warnings = [];

    // Show each inverted position issue separately
    if (results.doubleCounterpoint.inverted?.issues?.length > 0) {
      for (const issue of results.doubleCounterpoint.inverted.issues) {
        issues.push(withAnchors({
          description: `Inverted: ${issue.description || issue}`,
          onset: issue.onset,
        }, 'Invertible Counterpoint', 'issue', issues.length));
      }
    }

    if (results.doubleCounterpoint.observations) {
      const obsIssues = results.doubleCounterpoint.observations.filter(o => o.type === 'issue');
      const obsWarnings = results.doubleCounterpoint.observations.filter(o => o.type === 'consideration');
      issues.push(...obsIssues.map((o, i) => withAnchors(o, 'Invertible Counterpoint', 'issue', i)));
      warnings.push(...obsWarnings.map((o, i) => withAnchors(o, 'Invertible Counterpoint', 'warning', i)));
    }

    if (issues.length > 0 || warnings.length > 0) {
      categories.push({
        name: 'Invertible Counterpoint',
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
        warnings: warnings.map((w, i) => withAnchors({ description: w.description, onset: w.onset }, 'Contour Independence', 'warning', i)),
        icon: '📈',
      });
    }
  }

  // Rhythmic complementarity issues
  if (results.rhythmicComplementarity?.observations) {
    const issues = results.rhythmicComplementarity.observations
      .filter(o => o.type === 'issue')
      .map((o, i) => withAnchors(o, 'Rhythmic Complementarity', 'issue', i));
    const warnings = results.rhythmicComplementarity.observations
      .filter(o => o.type === 'consideration')
      .map((o, i) => withAnchors(o, 'Rhythmic Complementarity', 'warning', i));
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
                  const undrillableReason = getUndrillableReason(issue);
                  const isDrillable = !undrillableReason;
                  const highlighted = isHighlighted(issue);
                  return (
                    <div
                      key={`issue-${i}`}
                      onClick={isDrillable ? () => handleItemClick(issue, cat.name) : undefined}
                      style={{
                        fontSize: '12px',
                        color: '#dc2626',
                        padding: '6px 10px',
                        borderLeft: highlighted ? '4px solid #dc2626' : '2px solid #fca5a5',
                        marginBottom: '4px',
                        borderRadius: '0 4px 4px 0',
                        backgroundColor: highlighted ? '#fef2f2' : isDrillable ? '#fff' : '#fff7f7',
                        cursor: isDrillable ? 'pointer' : 'default',
                        transition: 'all 0.15s',
                        opacity: isDrillable ? 1 : 0.9,
                      }}
                      onMouseEnter={isDrillable ? (e) => e.currentTarget.style.backgroundColor = '#fef2f2' : undefined}
                      onMouseLeave={isDrillable && !highlighted ? (e) => e.currentTarget.style.backgroundColor = '#fff' : undefined}
                    >
                      {isDrillable && (
                        <span style={{ marginRight: '6px', opacity: 0.6 }}>
                          ▸
                        </span>
                      )}
                      {issue.description}
                      {!isDrillable && (
                        <span style={{ marginLeft: '8px', fontSize: '11px', color: '#991b1b', opacity: 0.8 }}>
                          (not drillable: {undrillableReason})
                        </span>
                      )}
                    </div>
                  );
                })}
                {cat.warnings.map((warning, i) => {
                  const undrillableReason = getUndrillableReason(warning);
                  const isDrillable = !undrillableReason;
                  const highlighted = isHighlighted(warning);
                  return (
                    <div
                      key={`warn-${i}`}
                      onClick={isDrillable ? () => handleItemClick(warning, cat.name) : undefined}
                      style={{
                        fontSize: '12px',
                        color: '#92400e',
                        padding: '6px 10px',
                        borderLeft: highlighted ? '4px solid #f59e0b' : '2px solid #fcd34d',
                        marginBottom: '4px',
                        borderRadius: '0 4px 4px 0',
                        backgroundColor: highlighted ? '#fffbeb' : isDrillable ? '#fff' : '#fffcf2',
                        cursor: isDrillable ? 'pointer' : 'default',
                        transition: 'all 0.15s',
                        opacity: isDrillable ? 1 : 0.9,
                      }}
                      onMouseEnter={isDrillable ? (e) => e.currentTarget.style.backgroundColor = '#fffbeb' : undefined}
                      onMouseLeave={isDrillable && !highlighted ? (e) => e.currentTarget.style.backgroundColor = '#fff' : undefined}
                    >
                      {isDrillable && (
                        <span style={{ marginRight: '6px', opacity: 0.6 }}>
                          ▸
                        </span>
                      )}
                      {warning.description}
                      {!isDrillable && (
                        <span style={{ marginLeft: '8px', fontSize: '11px', color: '#92400e', opacity: 0.8 }}>
                          (not drillable: {undrillableReason})
                        </span>
                      )}
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
