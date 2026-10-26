import { useId } from 'react';

function Wrap({ id, label, error, hint, className = '', children }) {
  return (
    <div className={`field ${className}`.trim()}>
      <label className="field-label" htmlFor={id}>{label}</label>
      {children}
      {hint && <span id={`${id}-hint`} className="field-hint">{hint}</span>}
      {error && <span id={`${id}-err`} className="field-error" role="alert">{error}</span>}
    </div>
  );
}
const described = (id, error, hint) => [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;

export function SelectField({ label, error, hint, options, placeholder, className, ...rest }) {
  const id = useId();
  return (
    <Wrap id={id} label={label} error={error} hint={hint} className={className}>
      <select id={id} className="select" aria-invalid={error ? 'true' : undefined} aria-describedby={described(id, error, hint)} {...rest}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Wrap>
  );
}

/** Radio group rendered as segmented choice cards. */
export function RadioGroup({ legend, name, value, onChange, options, error }) {
  const id = useId();
  return (
    <fieldset className="field radio-group" aria-describedby={error ? `${id}-err` : undefined}>
      <legend className="field-label">{legend}</legend>
      <div className="radio-row">
        {options.map((o) => (
          <label key={o.value} className={`radio-card${value === o.value ? ' is-checked' : ''}`}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {error && <span id={`${id}-err`} className="field-error" role="alert">{error}</span>}
    </fieldset>
  );
}

export function CheckboxField({ label, checked, onChange, error }) {
  const id = useId();
  return (
    <div className="field">
      <label className="check-row" htmlFor={id}>
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${id}-err` : undefined} />
        <span>{label}</span>
      </label>
      {error && <span id={`${id}-err`} className="field-error" role="alert">{error}</span>}
    </div>
  );
}
