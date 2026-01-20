import { useState } from 'react';
import { pitchName } from '../../utils/formatter';

/**
 * Stretto Visualization component
 * Interactive display showing overlapping subject entries with clear interval/dissonance labeling
 */
export function StrettoViz({ subject, distance, issues, warnings = [], intervalPoints = [], formatter, octaveDisp }) {
  const [hoveredElement, setHoveredElement] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);

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

  // Sizing - ensure notes are readable
  const noteHeight = Math.max(10, Math.min(16, 180 / pRange));
  const intervalRowHeight = 36;
  const headerHeight = 28;
  const paddingBottom = 12;
  const h = pRange * noteHeight + headerHeight + intervalRowHeight + paddingBottom;

  // Dynamic width based on duration
  const minPixelsPerBeat = 50;
  const baseWidth = 600;
  const calculatedWidth = Math.max(baseWidth, totalDuration * minPixelsPerBeat + 80);
  const w = Math.min(calculatedWidth, 1400);
  const needsScroll = calculatedWidth > 1400;
  const actualWidth = needsScroll ? calculatedWidth : w;

  const tScale = (actualWidth - 60) / totalDuration;
  const pToY = (p) => h - paddingBottom - intervalRowHeight - (p - minP) * noteHeight;
  const tToX = (t) => 50 + t * tScale;

  const hasIssues = issues.length > 0;
  const hasWarnings = warnings.length > 0;

  // Color scheme
  const colors = {
    bg: hasIssues ? '#fff5f5' : hasWarnings ? '#fffbeb' : '#f0fdf4',
    border: hasIssues ? '#fca5a5' : hasWarnings ? '#fcd34d' : '#86efac',
    dux: '#4f46e5',
    comes: '#dc2626',
    consonant: '#16a34a',
    perfect: '#2563eb',
    suspension: '#7c3aed',
    passing: '#ea580c',
    neighbor: '#ca8a04',
    unprepared: '#dc2626',
    grid: '#e5e7eb',
    gridStrong: '#9ca3af',
  };

  // Build issue lookup by onset for highlighting
  const issueOnsets = new Set(issues.map(i => Math.round(i.onset * 4) / 4));

  // Font styles
  const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const monoFont = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

  const handleNoteHover = (note, voice, e) => {
    setHoveredElement({
      type: 'note',
      voice,
      pitch: note.pitch,
      pitchName: pitchName(note.pitch),
      onset: note.onset,
      duration: note.duration,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleIntervalHover = (pt, e) => {
    setHoveredElement({
      type: 'interval',
      ...pt,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleClick = (element) => {
    setSelectedElement(selectedElement === element ? null : element);
  };

  const svgContent = (
    <svg
      width={actualWidth}
      height={h}
      style={{ display: 'block' }}
      role="img"
      aria-label={`Stretto at ${formatter.formatDistance(distance)}`}
    >
      {/* Background */}
      <rect x={0} y={0} width={actualWidth} height={h} fill={colors.bg} />

      {/* Header bar */}
      <rect x={0} y={0} width={actualWidth} height={headerHeight} fill="rgba(0,0,0,0.03)" />
      <text x={12} y={18} fontSize="13" fontFamily={fontFamily} fontWeight="600" fill="#374151">
        Stretto at {formatter.formatDistance(distance)}
      </text>

      {/* Status indicator */}
      <circle
        cx={actualWidth - 20}
        cy={14}
        r={6}
        fill={hasIssues ? colors.unprepared : hasWarnings ? colors.passing : colors.consonant}
      />
      <text
        x={actualWidth - 35}
        y={18}
        fontSize="11"
        fontFamily={fontFamily}
        fill="#6b7280"
        textAnchor="end"
      >
        {hasIssues ? `${issues.length} issue${issues.length > 1 ? 's' : ''}` :
         hasWarnings ? `${warnings.length} warning${warnings.length > 1 ? 's' : ''}` : 'Clean'}
      </text>

      {/* Beat grid */}
      {Array.from({ length: Math.ceil(totalDuration) + 1 }, (_, i) => {
        const x = tToX(i);
        const isDownbeat = i % 4 === 0;
        const isSecondary = i % 2 === 0;
        return (
          <g key={`grid-${i}`}>
            <line
              x1={x}
              y1={headerHeight}
              x2={x}
              y2={h - intervalRowHeight}
              stroke={isDownbeat ? colors.gridStrong : colors.grid}
              strokeWidth={isDownbeat ? 1.5 : 0.5}
              strokeDasharray={isSecondary ? 'none' : '2,2'}
            />
            {isDownbeat && (
              <text
                x={x}
                y={headerHeight + 10}
                fontSize="9"
                fontFamily={monoFont}
                fill="#9ca3af"
                textAnchor="middle"
              >
                {i + 1}
              </text>
            )}
          </g>
        );
      })}

      {/* Voice labels */}
      <text x={8} y={pToY(dux[0].pitch) + 4} fontSize="10" fontFamily={fontFamily} fontWeight="500" fill={colors.dux}>
        Dux
      </text>
      <text x={8} y={pToY(comes[0].pitch) + 4} fontSize="10" fontFamily={fontFamily} fontWeight="500" fill={colors.comes}>
        Comes
      </text>

      {/* Dux notes */}
      {dux.map((n, i) => {
        const x = tToX(n.onset);
        const y = pToY(n.pitch);
        const width = Math.max(4, n.duration * tScale - 2);
        return (
          <g
            key={`dux-${i}`}
            style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => handleNoteHover(n, 'dux', e)}
            onMouseLeave={() => setHoveredElement(null)}
            onClick={() => handleClick({ type: 'note', voice: 'dux', note: n })}
          >
            <rect
              x={x}
              y={y - noteHeight / 2 + 1}
              width={width}
              height={noteHeight - 2}
              fill={colors.dux}
              rx={3}
              opacity={0.9}
            />
            {width > 20 && (
              <text
                x={x + width / 2}
                y={y + 3}
                fontSize="8"
                fontFamily={monoFont}
                fill="white"
                textAnchor="middle"
              >
                {pitchName(n.pitch).replace(/\d/, '')}
              </text>
            )}
          </g>
        );
      })}

      {/* Comes notes */}
      {comes.map((n, i) => {
        const x = tToX(n.onset);
        const y = pToY(n.pitch);
        const width = Math.max(4, n.duration * tScale - 2);
        return (
          <g
            key={`comes-${i}`}
            style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => handleNoteHover(n, 'comes', e)}
            onMouseLeave={() => setHoveredElement(null)}
            onClick={() => handleClick({ type: 'note', voice: 'comes', note: n })}
          >
            <rect
              x={x}
              y={y - noteHeight / 2 + 1}
              width={width}
              height={noteHeight - 2}
              fill={colors.comes}
              rx={3}
              opacity={0.85}
            />
            {width > 20 && (
              <text
                x={x + width / 2}
                y={y + 3}
                fontSize="8"
                fontFamily={monoFont}
                fill="white"
                textAnchor="middle"
              >
                {pitchName(n.pitch).replace(/\d/, '')}
              </text>
            )}
          </g>
        );
      })}

      {/* Issue markers on notes */}
      {issues.map((issue, i) => {
        const x = tToX(issue.onset);
        return (
          <g key={`issue-marker-${i}`}>
            <circle cx={x} cy={headerHeight + 4} r={8} fill={colors.unprepared} />
            <text x={x} y={headerHeight + 8} fontSize="10" fontFamily={fontFamily} fontWeight="bold" fill="white" textAnchor="middle">
              !
            </text>
          </g>
        );
      })}

      {/* Warning markers */}
      {warnings.map((warn, i) => {
        const x = tToX(warn.onset);
        return (
          <g key={`warn-marker-${i}`}>
            <circle cx={x} cy={headerHeight + 4} r={6} fill={colors.passing} />
            <text x={x} y={headerHeight + 7} fontSize="8" fontFamily={fontFamily} fontWeight="bold" fill="white" textAnchor="middle">
              ?
            </text>
          </g>
        );
      })}

      {/* Interval row background */}
      <rect
        x={0}
        y={h - intervalRowHeight}
        width={actualWidth}
        height={intervalRowHeight}
        fill="rgba(255,255,255,0.8)"
      />
      <line x1={0} y1={h - intervalRowHeight} x2={actualWidth} y2={h - intervalRowHeight} stroke={colors.grid} />

      {/* Interval labels */}
      {intervalPoints.map((pt, i) => {
        const x = tToX(pt.onset);
        const isIssue = issueOnsets.has(Math.round(pt.onset * 4) / 4);
        const score = pt.score || 0;

        // Determine color based on score (if dissonance) or interval type (if consonant)
        let fillColor = colors.consonant;
        let bgColor = 'transparent';

        if (!pt.isConsonant) {
          // Color based on score: green (positive) -> yellow (neutral) -> red (negative)
          if (score >= 1.5) {
            fillColor = '#15803d'; // dark green - excellent
            bgColor = 'rgba(34, 197, 94, 0.15)';
          } else if (score >= 0.5) {
            fillColor = '#16a34a'; // green - good
            bgColor = 'rgba(34, 197, 94, 0.1)';
          } else if (score >= 0) {
            fillColor = '#ca8a04'; // yellow - acceptable
            bgColor = 'rgba(234, 179, 8, 0.1)';
          } else if (score >= -1.0) {
            fillColor = '#ea580c'; // orange - marginal
            bgColor = 'rgba(234, 88, 12, 0.15)';
          } else {
            fillColor = '#dc2626'; // red - poor
            bgColor = 'rgba(220, 38, 38, 0.2)';
          }
        } else if ([1, 5, 8].includes(pt.intervalClass)) {
          fillColor = colors.perfect;
        }

        // Build label - show type abbreviation and score for dissonances
        let label = pt.intervalClass.toString();
        if (!pt.isConsonant && pt.dissonanceLabel) {
          label = pt.dissonanceLabel;
        }

        const isStrong = pt.isStrong;

        return (
          <g
            key={`int-${i}`}
            style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => handleIntervalHover(pt, e)}
            onMouseLeave={() => setHoveredElement(null)}
            onClick={() => handleClick({ type: 'interval', pt })}
          >
            {/* Connection line to notes */}
            <line
              x1={x}
              y1={h - intervalRowHeight}
              x2={x}
              y2={h - intervalRowHeight + 6}
              stroke={fillColor}
              strokeWidth={isStrong ? 2 : 1}
            />

            {/* Background for dissonances - always show to indicate score */}
            {(!pt.isConsonant || isIssue) && (
              <rect
                x={x - 16}
                y={h - intervalRowHeight + 2}
                width={32}
                height={intervalRowHeight - 6}
                fill={isIssue ? 'rgba(220, 38, 38, 0.25)' : bgColor}
                rx={4}
                stroke={isIssue ? '#dc2626' : 'transparent'}
                strokeWidth={isIssue ? 1 : 0}
              />
            )}

            {/* Interval label */}
            <text
              x={x}
              y={h - intervalRowHeight + 16}
              fontSize={isStrong ? '11' : '9'}
              fontFamily={monoFont}
              fontWeight={isStrong ? '600' : '400'}
              fill={fillColor}
              textAnchor="middle"
            >
              {label}
            </text>

            {/* Score below label for dissonances */}
            {!pt.isConsonant && (
              <text
                x={x}
                y={h - intervalRowHeight + 26}
                fontSize="7"
                fontFamily={monoFont}
                fill={fillColor}
                textAnchor="middle"
                opacity={0.8}
              >
                {score >= 0 ? '+' : ''}{score.toFixed(1)}
              </text>
            )}

            {/* Pitch names below */}
            <text
              x={x}
              y={h - 2}
              fontSize="7"
              fontFamily={monoFont}
              fill="#6b7280"
              textAnchor="middle"
            >
              {pitchName(pt.duxPitch).replace(/\d/, '')}-{pitchName(pt.comesPitch).replace(/\d/, '')}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${actualWidth - 280}, ${h - intervalRowHeight + 6})`}>
        <text x={0} y={8} fontSize="8" fontFamily={fontFamily} fill="#9ca3af">Legend:</text>

        <rect x={40} y={0} width={10} height={10} fill={colors.consonant} rx={2} />
        <text x={52} y={8} fontSize="8" fontFamily={fontFamily} fill="#6b7280">3/6</text>

        <rect x={70} y={0} width={10} height={10} fill={colors.perfect} rx={2} />
        <text x={82} y={8} fontSize="8" fontFamily={fontFamily} fill="#6b7280">P5/8</text>

        <rect x={105} y={0} width={10} height={10} fill={colors.suspension} rx={2} />
        <text x={117} y={8} fontSize="8" fontFamily={fontFamily} fill="#6b7280">sus</text>

        <rect x={138} y={0} width={10} height={10} fill={colors.passing} rx={2} />
        <text x={150} y={8} fontSize="8" fontFamily={fontFamily} fill="#6b7280">PT</text>

        <rect x={168} y={0} width={10} height={10} fill={colors.neighbor} rx={2} />
        <text x={180} y={8} fontSize="8" fontFamily={fontFamily} fill="#6b7280">N</text>

        <rect x={192} y={0} width={10} height={10} fill={colors.unprepared} rx={2} />
        <text x={204} y={8} fontSize="8" fontFamily={fontFamily} fill="#6b7280">unprep!</text>
      </g>
    </svg>
  );

  // Tooltip component
  const tooltip = hoveredElement && (
    <div
      style={{
        position: 'fixed',
        left: hoveredElement.x + 12,
        top: hoveredElement.y - 10,
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontFamily,
        zIndex: 1000,
        pointerEvents: 'none',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        maxWidth: '280px',
      }}
    >
      {hoveredElement.type === 'note' ? (
        <>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            {hoveredElement.voice === 'dux' ? 'Dux' : 'Comes'}: {hoveredElement.pitchName}
          </div>
          <div style={{ color: '#9ca3af', fontSize: '11px' }}>
            {formatter.formatBeat(hoveredElement.onset)} | {formatter.formatDuration(hoveredElement.duration)}
          </div>
        </>
      ) : (
        <>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            {hoveredElement.intervalName}
            {hoveredElement.dissonanceType && hoveredElement.dissonanceType !== 'consonant' && (
              <span style={{
                marginLeft: '8px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: (hoveredElement.score || 0) >= 0 ? '#16a34a' :
                                 (hoveredElement.score || 0) >= -1 ? '#ea580c' : '#dc2626',
                fontSize: '10px',
              }}>
                {hoveredElement.dissonanceType}
              </span>
            )}
            {!hoveredElement.isConsonant && (
              <span style={{
                marginLeft: '6px',
                fontSize: '11px',
                color: (hoveredElement.score || 0) >= 0 ? '#4ade80' : '#f87171',
              }}>
                ({(hoveredElement.score || 0) >= 0 ? '+' : ''}{(hoveredElement.score || 0).toFixed(1)})
              </span>
            )}
          </div>
          <div style={{ color: '#d1d5db', fontSize: '11px' }}>
            {pitchName(hoveredElement.duxPitch)} (Dux) vs {pitchName(hoveredElement.comesPitch)} (Comes)
          </div>
          <div style={{ color: '#9ca3af', fontSize: '11px' }}>
            {formatter.formatBeat(hoveredElement.onset)} | {hoveredElement.isStrong ? 'Strong beat' : 'Weak beat'}
          </div>
          {hoveredElement.scoreDetails && hoveredElement.scoreDetails.length > 0 && (
            <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #374151', fontSize: '10px', color: '#9ca3af' }}>
              {hoveredElement.scoreDetails.slice(0, 3).map((d, i) => (
                <div key={i}>{d}</div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  // Selected element detail panel
  const detailPanel = selectedElement && (
    <div
      style={{
        marginTop: '8px',
        padding: '12px',
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        fontSize: '13px',
        fontFamily,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontWeight: 600 }}>
          {selectedElement.type === 'note'
            ? `${selectedElement.voice === 'dux' ? 'Dux' : 'Comes'} Note Details`
            : 'Interval Details'}
        </span>
        <button
          onClick={() => setSelectedElement(null)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#6b7280',
            fontSize: '16px',
          }}
        >
          x
        </button>
      </div>
      {selectedElement.type === 'note' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div><strong>Pitch:</strong> {pitchName(selectedElement.note.pitch)}</div>
          <div><strong>Position:</strong> {formatter.formatBeat(selectedElement.note.onset)}</div>
          <div><strong>Duration:</strong> {formatter.formatDuration(selectedElement.note.duration)}</div>
          <div><strong>Voice:</strong> {selectedElement.voice === 'dux' ? 'Dux (Leader)' : 'Comes (Follower)'}</div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <div><strong>Interval:</strong> {selectedElement.pt.intervalName}</div>
            <div><strong>Position:</strong> {formatter.formatBeat(selectedElement.pt.onset)}</div>
            <div><strong>Dux pitch:</strong> {pitchName(selectedElement.pt.duxPitch)}</div>
            <div><strong>Comes pitch:</strong> {pitchName(selectedElement.pt.comesPitch)}</div>
            <div><strong>Metric position:</strong> {selectedElement.pt.isStrong ? 'Strong beat' : 'Weak/off-beat'}</div>
            <div>
              <strong>Type:</strong>{' '}
              {selectedElement.pt.isConsonant ? 'Consonant' : selectedElement.pt.dissonanceType || 'Unknown'}
            </div>
          </div>

          {!selectedElement.pt.isConsonant && (
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <strong>Score:</strong>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '4px',
                  fontWeight: '600',
                  fontSize: '14px',
                  backgroundColor: (selectedElement.pt.score || 0) >= 1.5 ? '#dcfce7' :
                                   (selectedElement.pt.score || 0) >= 0 ? '#fef9c3' :
                                   (selectedElement.pt.score || 0) >= -1 ? '#ffedd5' : '#fee2e2',
                  color: (selectedElement.pt.score || 0) >= 1.5 ? '#166534' :
                         (selectedElement.pt.score || 0) >= 0 ? '#854d0e' :
                         (selectedElement.pt.score || 0) >= -1 ? '#c2410c' : '#dc2626',
                }}>
                  {(selectedElement.pt.score || 0) >= 0 ? '+' : ''}{(selectedElement.pt.score || 0).toFixed(1)}
                </span>
                <span style={{ fontSize: '11px', color: '#6b7280' }}>
                  {(selectedElement.pt.score || 0) >= 1.5 ? 'Excellent' :
                   (selectedElement.pt.score || 0) >= 0.5 ? 'Good' :
                   (selectedElement.pt.score || 0) >= 0 ? 'Acceptable' :
                   (selectedElement.pt.score || 0) >= -1 ? 'Marginal' : 'Problematic'}
                </span>
              </div>

              {selectedElement.pt.scoreDetails && selectedElement.pt.scoreDetails.length > 0 && (
                <div style={{ fontSize: '11px', color: '#4b5563', backgroundColor: '#f3f4f6', padding: '8px', borderRadius: '4px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>Scoring breakdown:</div>
                  {selectedElement.pt.scoreDetails.map((detail, i) => (
                    <div key={i} style={{ marginBottom: '2px' }}>{detail}</div>
                  ))}
                </div>
              )}

              {selectedElement.pt.patterns && selectedElement.pt.patterns.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '11px' }}>
                  <strong>Pattern matched:</strong> {selectedElement.pt.patterns.map(p => p.description).join('; ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const content = (
    <div style={{ position: 'relative' }}>
      {svgContent}
      {tooltip}
      {detailPanel}
    </div>
  );

  if (needsScroll) {
    return (
      <div
        style={{
          overflowX: 'auto',
          maxWidth: '100%',
          border: `2px solid ${colors.border}`,
          borderRadius: '8px',
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <div style={{ border: `2px solid ${colors.border}`, borderRadius: '8px', overflow: 'hidden' }}>
      {content}
    </div>
  );
}

export default StrettoViz;
