import { useState } from 'react';

/**
 * IssuesSummary - Aggregates and displays all issues from various analyses
 * Shows problems prominently at the top of the results
 */
export function IssuesSummary({ results, scoreResult }) {
  const [expandedCategory, setExpandedCategory] = useState(null);

  if (!results) return null;

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

  // Stretto issues - summarize the problematic ones
  if (results.stretto?.problematicStrettos?.length > 0) {
    const issueCount = results.stretto.problematicStrettos.length;
    categories.push({
      name: 'Stretto Viability',
      issues: [{ description: `${issueCount} stretto distance${issueCount > 1 ? 's' : ''} have voice-leading issues` }],
      warnings: [],
      icon: '🎼',
      detail: `${results.stretto.cleanStrettos?.length || 0} clean, ${(results.stretto.viableStrettos?.length || 0) - (results.stretto.cleanStrettos?.length || 0)} with warnings`,
    });
  }

  // Double counterpoint issues
  if (results.doubleCounterpoint) {
    const issues = [];
    const warnings = [];

    if (results.doubleCounterpoint.original?.issues?.length > 0) {
      issues.push({ description: `Original position: ${results.doubleCounterpoint.original.issues.length} issue${results.doubleCounterpoint.original.issues.length > 1 ? 's' : ''}` });
    }
    if (results.doubleCounterpoint.inverted?.issues?.length > 0) {
      issues.push({ description: `Inverted position: ${results.doubleCounterpoint.inverted.issues.length} issue${results.doubleCounterpoint.inverted.issues.length > 1 ? 's' : ''}` });
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
                {cat.issues.map((issue, i) => (
                  <div key={`issue-${i}`} style={{
                    fontSize: '12px',
                    color: '#dc2626',
                    padding: '4px 0 4px 10px',
                    borderLeft: '2px solid #fca5a5',
                    marginBottom: '4px',
                  }}>
                    {issue.description}
                  </div>
                ))}
                {cat.warnings.map((warning, i) => (
                  <div key={`warn-${i}`} style={{
                    fontSize: '12px',
                    color: '#92400e',
                    padding: '4px 0 4px 10px',
                    borderLeft: '2px solid #fcd34d',
                    marginBottom: '4px',
                  }}>
                    {warning.description}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default IssuesSummary;
