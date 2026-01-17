import { InfoButton } from './InfoButton';

/**
 * Collapsible section container component
 * @param {string} title - Section title
 * @param {string} helpKey - Key for help content (optional)
 * @param {React.ReactNode} children - Section content
 */
export function Section({ title, helpKey, children, className = '' }) {
  return (
    <section
      className={className}
      style={{
        marginBottom: '18px',
        backgroundColor: '#fff',
        borderRadius: '6px',
        border: '1px solid #e0e0e0',
      }}
    >
      <div
        style={{
          padding: '11px 14px',
          backgroundColor: '#f5f5f5',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: '600',
            color: '#37474f',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {title}
          {helpKey && <InfoButton helpKey={helpKey} />}
        </h3>
      </div>
      <div style={{ padding: '12px 14px' }}>{children}</div>
    </section>
  );
}

export default Section;
