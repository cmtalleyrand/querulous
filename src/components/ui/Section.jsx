/**
 * Collapsible section container component
 */
export function Section({ title, children, className = '' }) {
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
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: '600',
            color: '#37474f',
          }}
        >
          {title}
        </h3>
      </div>
      <div style={{ padding: '12px 14px' }}>{children}</div>
    </section>
  );
}

export default Section;
