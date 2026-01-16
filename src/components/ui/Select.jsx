/**
 * Styled select dropdown component
 */
export function Select({ label, value, onChange, options, style = {} }) {
  return (
    <div style={style}>
      <label
        style={{
          display: 'block',
          fontSize: '11px',
          fontWeight: '600',
          color: '#546e7a',
          marginBottom: '5px',
        }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '13px',
          backgroundColor: '#fff',
        }}
      >
        {options.map((o) => (
          <option key={o.value || o.v} value={o.value || o.v}>
            {o.label || o.l}
          </option>
        ))}
      </select>
    </div>
  );
}

export default Select;
