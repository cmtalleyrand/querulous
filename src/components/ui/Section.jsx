import { useState } from 'react';
import { InfoButton } from './InfoButton';

/**
 * Collapsible section container component
 * @param {string} title - Section title
 * @param {string} helpKey - Key for help content (optional)
 * @param {boolean} defaultCollapsed - Whether to start collapsed
 * @param {string} badge - Optional badge text (e.g., issue count)
 * @param {string} badgeColor - Badge color
 * @param {React.ReactNode} children - Section content
 */
export function Section({
  title,
  helpKey,
  children,
  className = '',
  defaultCollapsed = false,
  badge,
  badgeColor = '#6b7280',
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <section
      className={className}
      style={{
        marginBottom: '16px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
      }}
    >
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          padding: '12px 16px',
          backgroundColor: '#f9fafb',
          borderBottom: collapsed ? 'none' : '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: '600',
            color: '#1f2937',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{
            display: 'inline-block',
            width: '16px',
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: '12px',
            transition: 'transform 0.15s',
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          }}>
            ▼
          </span>
          {title}
          {badge && (
            <span style={{
              padding: '2px 8px',
              backgroundColor: badgeColor,
              color: 'white',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '500',
            }}>
              {badge}
            </span>
          )}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {helpKey && <InfoButton helpKey={helpKey} />}
        </div>
      </div>
      {!collapsed && (
        <div style={{ padding: '14px 16px' }}>{children}</div>
      )}
    </section>
  );
}

export default Section;
