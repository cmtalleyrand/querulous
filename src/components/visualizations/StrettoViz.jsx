import { useState } from 'react';
import { pitchName } from '../../utils/formatter';
import { getMeter } from '../../utils/dissonanceScoring';
import { generateGridLines, VIZ_COLORS, getIntervalStyle } from '../../utils/vizConstants';

/**
 * Stretto Visualization component
 * Clear, interactive display of overlapping subject entries
 */
export function StrettoViz({ subject, distance, issues, warnings = [], intervalPoints = [], formatter, octaveDisp }) {
  const [highlightedOnset, setHighlightedOnset] = useState(null);
  const [selectedInterval, setSelectedInterval] = useState(null);

  if (!subject?.length) return null;

  const subEnd = subject[subject.length - 1].onset + subject[subject.length - 1].duration;
  const totalDuration = subEnd + distance;
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

  // Generous sizing for readability
  const noteHeight = 18;
  const headerHeight = 32;
  const h = pRange * noteHeight + headerHeight + 20;

  // Width calculation
  const pixelsPerBeat = 70;
  const w = Math.max(500, totalDuration * pixelsPerBeat + 100);

  const tScale = (w - 80) / totalDuration;
  const pToY = (p) => h - 20 - (p - minP) * noteHeight;
  const tToX = (t) => 60 + t * tScale;

  const hasIssues = issues.length > 0;
  const hasWarnings = warnings.length > 0;

  // Colors - using unified semantics
  const colors = {
    bg: hasIssues ? VIZ_COLORS.issueBackground : hasWarnings ? VIZ_COLORS.warningBackground : VIZ_COLORS.cleanBackground,
    border: hasIssues ? VIZ_COLORS.issueBorder : hasWarnings ? VIZ_COLORS.warningBorder : VIZ_COLORS.cleanBorder,
    dux: VIZ_COLORS.voiceDux,
    comes: VIZ_COLORS.voiceComes,
    highlight: VIZ_COLORS.highlight,
  };

  // Build onset lookup for highlighting
  const getOnsetKey = (onset) => Math.round(onset * 4) / 4;

  // Find interval point for a given onset
  const getIntervalAt = (onset) => {
    const key = getOnsetKey(onset);
    return intervalPoints.find(pt => getOnsetKey(pt.onset) === key);
  };

  // Handle issue click - highlight the interval
  const handleIssueClick = (issue) => {
    const key = getOnsetKey(issue.onset);
    setHighlightedOnset(highlightedOnset === key ? null : key);
    const pt = getIntervalAt(issue.onset);
    if (pt) setSelectedInterval(pt);
  };

  // Handle interval click in SVG
  const handleIntervalClick = (pt) => {
    setSelectedInterval(selectedInterval?.onset === pt.onset ? null : pt);
    setHighlightedOnset(getOnsetKey(pt.onset));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Main visualization */}
      <div style={{
        border: `2px solid ${colors.border}`,
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: colors.bg,
      }}>
        <div style={{ overflowX: 'auto' }}>
          <svg width={w} height={h} style={{ display: 'block' }}>
            {/* Header */}
            <rect x={0} y={0} width={w} height={headerHeight} fill="rgba(0,0,0,0.04)" />
            <text x={16} y={22} fontSize="14" fontWeight="600" fill="#374151">
              Stretto at {formatter.formatDistance(distance)}
            </text>
            <text x={w - 16} y={22} fontSize="12" fill="#6b7280" textAnchor="end">
              {hasIssues ? `${issues.length} issue${issues.length !== 1 ? 's' : ''}` :
               hasWarnings ? `${warnings.length} warning${warnings.length !== 1 ? 's' : ''}` : 'Clean'}
            </text>

            {/* Beat grid - meter-aware */}
            {(() => {
              const meter = getMeter();
              const gridLines = generateGridLines(totalDuration, meter, { showSubdivisions: false });

              return gridLines.map((line, i) => {
                const x = tToX(line.time);
                return (
                  <g key={`grid-${i}`}>
                    <line
                      x1={x} y1={headerHeight} x2={x} y2={h - 18}
                      stroke={line.isDownbeat ? '#64748b' : (line.isMainBeat ? '#9ca3af' : '#e5e7eb')}
                      strokeWidth={line.isDownbeat ? 1.5 : (line.isMainBeat ? 0.75 : 0.5)}
                    />
                    {line.measureNum ? (
                      <text x={x} y={h - 4} fontSize="11" fill="#475569" textAnchor="middle" fontWeight="600">
                        m.{line.measureNum}
                      </text>
                    ) : line.beatNum ? (
                      <text x={x} y={h - 4} fontSize="9" fill="#9ca3af" textAnchor="middle">
                        {line.beatNum}
                      </text>
                    ) : null}
                  </g>
                );
              });
            })()}

            {/* Voice labels - indicate upper/lower based on actual pitch */}
            {(() => {
              const duxIsHigher = octaveDisp < 0; // If octaveDisp is negative, comes is lower, so dux is higher
              return (
                <>
                  <text x={12} y={pToY(maxP - 1) + 5} fontSize="11" fontWeight="600" fill={duxIsHigher ? colors.dux : colors.comes}>
                    {duxIsHigher ? 'Dux' : 'Comes'} (upper)
                  </text>
                  <text x={12} y={pToY(minP + 1) + 5} fontSize="11" fontWeight="600" fill={duxIsHigher ? colors.comes : colors.dux}>
                    {duxIsHigher ? 'Comes' : 'Dux'} (lower)
                  </text>
                </>
              );
            })()}

            {/* Dux notes */}
            {dux.map((n, i) => {
              const x = tToX(n.onset);
              const y = pToY(n.pitch);
              const width = Math.max(8, n.duration * tScale - 3);
              // Highlight if this note is SOUNDING at the highlighted time (not just starting)
              const isHighlighted = highlightedOnset !== null &&
                intervalPoints.some(pt => getOnsetKey(pt.onset) === highlightedOnset &&
                  n.onset <= pt.onset && pt.onset < n.onset + n.duration);

              return (
                <g key={`dux-${i}`}>
                  {isHighlighted && (
                    <rect
                      x={x - 4} y={y - noteHeight/2 - 3}
                      width={width + 8} height={noteHeight + 6}
                      fill={colors.highlight} rx={5} opacity={0.5}
                    />
                  )}
                  <rect
                    x={x} y={y - noteHeight/2 + 2}
                    width={width} height={noteHeight - 4}
                    fill={colors.dux} rx={4}
                  />
                  <text x={x + width/2} y={y + 4} fontSize="10" fill="white" textAnchor="middle" fontWeight="500">
                    {pitchName(n.pitch).replace(/\d/, '')}
                  </text>
                </g>
              );
            })}

            {/* Comes notes */}
            {comes.map((n, i) => {
              const x = tToX(n.onset);
              const y = pToY(n.pitch);
              const width = Math.max(8, n.duration * tScale - 3);
              // Highlight if this note is SOUNDING at the highlighted time (not just starting)
              const isHighlighted = highlightedOnset !== null &&
                intervalPoints.some(pt => getOnsetKey(pt.onset) === highlightedOnset &&
                  n.onset <= pt.onset && pt.onset < n.onset + n.duration);

              return (
                <g key={`comes-${i}`}>
                  {isHighlighted && (
                    <rect
                      x={x - 4} y={y - noteHeight/2 - 3}
                      width={width + 8} height={noteHeight + 6}
                      fill={colors.highlight} rx={5} opacity={0.5}
                    />
                  )}
                  <rect
                    x={x} y={y - noteHeight/2 + 2}
                    width={width} height={noteHeight - 4}
                    fill={colors.comes} rx={4}
                  />
                  <text x={x + width/2} y={y + 4} fontSize="10" fill="white" textAnchor="middle" fontWeight="500">
                    {pitchName(n.pitch).replace(/\d/, '')}
                  </text>
                </g>
              );
            })}

            {/* Interval regions - semi-transparent filled areas between voices */}
            {intervalPoints.map((pt, i) => {
              const x = tToX(pt.onset);
              const isHighlighted = highlightedOnset === getOnsetKey(pt.onset);
              const isSelected = selectedInterval?.onset === pt.onset;

              // Use pitches from the interval point data (which correctly captures held notes)
              const y1 = pToY(pt.duxPitch);
              const y2 = pToY(pt.comesPitch);
              const regionTop = Math.min(y1, y2) - noteHeight / 2;
              const regionHeight = Math.abs(y2 - y1) + noteHeight;
              const midY = (y1 + y2) / 2;

              // Calculate region width (extend to next interval or use default)
              const nextPt = intervalPoints[i + 1];
              const regionWidth = nextPt
                ? Math.max(4, (nextPt.onset - pt.onset) * tScale - 2)
                : Math.max(20, tScale * 0.5);

              // Determine fill color based on consonance/score using unified style
              const isPerfect = [1, 5, 8].includes(pt.intervalClass);
              const style = getIntervalStyle({
                isConsonant: pt.isConsonant,
                isPerfect,
                score: pt.score || 0,
              });
              const fillColor = style.fill;
              const labelBg = style.bg;
              const labelColor = style.color;

              const label = pt.isConsonant
                ? (pt.intervalClass === 1 ? 'U' : pt.intervalClass === 8 ? '8' : pt.intervalClass.toString())
                : (pt.dissonanceLabel || '!');

              return (
                <g
                  key={`int-${i}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleIntervalClick(pt)}
                  onMouseEnter={() => setHighlightedOnset(getOnsetKey(pt.onset))}
                  onMouseLeave={() => !isSelected && setHighlightedOnset(null)}
                >
                  {/* Semi-transparent region between voices */}
                  <rect
                    x={x}
                    y={regionTop}
                    width={regionWidth}
                    height={regionHeight}
                    fill={fillColor}
                    opacity={isHighlighted || isSelected ? 0.9 : 0.5}
                    rx={3}
                  />

                  {/* Show label only on hover/select */}
                  {(isHighlighted || isSelected) && (
                    <g>
                      {/* Label background */}
                      <rect
                        x={x + regionWidth / 2 - 16}
                        y={midY - 12}
                        width={32}
                        height={24}
                        fill={labelBg}
                        stroke={labelColor}
                        strokeWidth={1}
                        rx={4}
                        opacity={0.95}
                      />
                      {/* Interval label */}
                      <text
                        x={x + regionWidth / 2}
                        y={midY + 4}
                        fontSize="12"
                        fontWeight="600"
                        fill={labelColor}
                        textAnchor="middle"
                      >
                        {label}
                      </text>
                      {/* Score indicator for dissonances */}
                      {!pt.isConsonant && (
                        <text
                          x={x + regionWidth / 2}
                          y={midY + 20}
                          fontSize="9"
                          fill={labelColor}
                          textAnchor="middle"
                        >
                          {(pt.score || 0) >= 0 ? '+' : ''}{(pt.score || 0).toFixed(1)}
                        </text>
                      )}
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Issues list - CLICKABLE */}
      {(issues.length > 0 || warnings.length > 0) && (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '8px 12px',
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
            fontWeight: '600',
            fontSize: '13px',
            color: '#374151',
          }}>
            Click to highlight in visualization:
          </div>

          {issues.map((issue, i) => {
            const isActive = highlightedOnset === getOnsetKey(issue.onset);
            return (
              <div
                key={`issue-${i}`}
                onClick={() => handleIssueClick(issue)}
                style={{
                  padding: '10px 12px',
                  borderBottom: i < issues.length - 1 || warnings.length > 0 ? '1px solid #f3f4f6' : 'none',
                  cursor: 'pointer',
                  backgroundColor: isActive ? '#fef2f2' : 'white',
                  borderLeft: isActive ? '4px solid #dc2626' : '4px solid transparent',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isActive ? '#fef2f2' : '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isActive ? '#fef2f2' : 'white'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: '600',
                  }}>!</span>
                  <span style={{ fontSize: '13px', color: '#1f2937' }}>
                    {issue.description}
                  </span>
                </div>
              </div>
            );
          })}

          {warnings.map((warn, i) => {
            const isActive = highlightedOnset === getOnsetKey(warn.onset);
            return (
              <div
                key={`warn-${i}`}
                onClick={() => handleIssueClick(warn)}
                style={{
                  padding: '10px 12px',
                  borderBottom: i < warnings.length - 1 ? '1px solid #f3f4f6' : 'none',
                  cursor: 'pointer',
                  backgroundColor: isActive ? '#fffbeb' : 'white',
                  borderLeft: isActive ? '4px solid #f59e0b' : '4px solid transparent',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isActive ? '#fffbeb' : '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isActive ? '#fffbeb' : 'white'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: '600',
                  }}>?</span>
                  <span style={{ fontSize: '13px', color: '#1f2937' }}>
                    {warn.description}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected interval detail panel */}
      {selectedInterval && (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}>
            <span style={{ fontWeight: '600', fontSize: '14px', color: '#1f2937' }}>
              Interval Detail
            </span>
            <button
              onClick={() => { setSelectedInterval(null); setHighlightedOnset(null); }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#9ca3af',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13px' }}>
            <div>
              <span style={{ color: '#6b7280' }}>Interval: </span>
              <strong>{selectedInterval.intervalName}</strong>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>Position: </span>
              <strong>{formatter.formatBeat(selectedInterval.onset)}</strong>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>Dux: </span>
              <strong style={{ color: colors.dux }}>{pitchName(selectedInterval.duxPitch)}</strong>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>Comes: </span>
              <strong style={{ color: colors.comes }}>{pitchName(selectedInterval.comesPitch)}</strong>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>Beat: </span>
              <strong>{selectedInterval.isStrong ? 'Strong' : 'Weak'}</strong>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>Type: </span>
              <strong>{selectedInterval.isConsonant ? 'Consonant' : (selectedInterval.dissonanceType || 'Dissonant')}</strong>
            </div>
          </div>

          {!selectedInterval.isConsonant && (
            <div style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px',
              }}>
                <span style={{ color: '#6b7280', fontSize: '13px' }}>Score:</span>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '16px',
                  backgroundColor: (selectedInterval.score || 0) >= 1 ? '#dcfce7' :
                                   (selectedInterval.score || 0) >= 0 ? '#fef9c3' :
                                   (selectedInterval.score || 0) >= -1 ? '#ffedd5' : '#fee2e2',
                  color: (selectedInterval.score || 0) >= 1 ? '#166534' :
                         (selectedInterval.score || 0) >= 0 ? '#854d0e' :
                         (selectedInterval.score || 0) >= -1 ? '#c2410c' : '#991b1b',
                }}>
                  {(selectedInterval.score || 0) >= 0 ? '+' : ''}{(selectedInterval.score || 0).toFixed(1)}
                </span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  {(selectedInterval.score || 0) >= 1.5 ? '(Excellent handling)' :
                   (selectedInterval.score || 0) >= 0.5 ? '(Good)' :
                   (selectedInterval.score || 0) >= 0 ? '(Acceptable)' :
                   (selectedInterval.score || 0) >= -1 ? '(Marginal)' : '(Problematic)'}
                </span>
              </div>

              {selectedInterval.scoreDetails && selectedInterval.scoreDetails.length > 0 && (
                <div style={{
                  backgroundColor: '#f9fafb',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#4b5563',
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '6px' }}>Score breakdown:</div>
                  {selectedInterval.scoreDetails.map((detail, i) => (
                    <div key={i} style={{ marginBottom: '3px' }}>{detail}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StrettoViz;
