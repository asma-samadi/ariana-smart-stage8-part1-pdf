import { useId } from 'react';

/** Input types whose value is always Latin/LTR data (addresses, numbers, secrets), even on a Dari/Pashto page. */
const LTR_TYPES = new Set(['email', 'tel', 'url', 'password', 'number']);

/**
 * Accessible labelled input with inline error + hint. `error` is already-translated text.
 * Direction: e-mail/phone/password/number inputs are LTR (typing and caret behave correctly inside an RTL page;
 * CSS right-aligns them in RTL so the form still looks consistent). Pass `dir="auto"` for free-text names so a
 * Latin name aligns left and an Arabic-script name aligns right. An explicit `dir` prop always wins.
 */
export default function FormField({ label, error, hint, type = 'text', className = '', dir, ...rest }) {
  const id = useId();
  const inputDir = dir ?? (LTR_TYPES.has(type) ? 'ltr' : undefined);
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field ${className}`.trim()}>
      <label className="field-label" htmlFor={id}>{label}</label>
      <input id={id} type={type} dir={inputDir} className="input" aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy} {...rest} />
      {hint && <span id={`${id}-hint`} className="field-hint">{hint}</span>}
      {error && <span id={`${id}-err`} className="field-error" role="alert">{error}</span>}
    </div>
  );
}
