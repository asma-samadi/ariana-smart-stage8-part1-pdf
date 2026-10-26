import { useEffect, useId, useRef } from 'react';
import Button from './Button.jsx';

/**
 * Accessible in-app confirmation dialog built on the native <dialog> element (modal: focus is trapped,
 * Escape closes it, the page behind is inert). It replaces window.confirm, which cannot follow the app's
 * theme, direction or language styling. Colours/spacing come from design tokens and logical CSS properties,
 * so it works in light/dark and LTR/RTL without a second implementation.
 *
 * Props: open, message (already translated), confirmLabel, cancelLabel, onConfirm(), onCancel().
 */
export default function ConfirmDialog({ open, message, confirmLabel, cancelLabel, onConfirm, onCancel }) {
  const ref = useRef(null);
  const msgId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      if (typeof el.showModal === 'function') el.showModal();
      else el.setAttribute('open', ''); // very old browsers: still visible, just not modal
      // Start on the safe choice (Cancel), not the destructive one. React's autoFocus does not fire for an
      // element mounted inside a closed <dialog>, so focus it explicitly once the dialog is open.
      el.querySelector('[data-cancel]')?.focus();
    } else if (!open && el.open) {
      el.close?.();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={msgId}
      onCancel={(e) => { e.preventDefault(); onCancel(); }} // Escape key
      onClick={(e) => { if (e.target === ref.current) onCancel(); }} // click on the backdrop
    >
      <div className="dialog-body">
        <p id={msgId} className="dialog-message">{message}</p>
        <div className="dialog-actions">
          <Button variant="primary" size="sm" onClick={onConfirm}>{confirmLabel}</Button>
          <Button variant="ghost" size="sm" onClick={onCancel} data-cancel>{cancelLabel}</Button>
        </div>
      </div>
    </dialog>
  );
}
