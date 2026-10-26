import { useId, useState } from 'react';
import Icon from './Icon.jsx';

/** Accessible accordion: one panel open at a time, buttons control regions via aria-expanded/aria-controls. */
export default function Accordion({ items }) {
  const [open, setOpen] = useState(null);
  const baseId = useId();
  return (
    <div className="accordion">
      {items.map((item, i) => {
        const expanded = open === i;
        const btnId = `${baseId}-btn-${i}`;
        const panelId = `${baseId}-panel-${i}`;
        return (
          <div className="acc-item" key={item.q}>
            <h3 style={{ margin: 0 }}>
              <button
                id={btnId}
                type="button"
                className="acc-btn"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : i)}
              >
                <span>{item.q}</span>
                <Icon name="chevronDown" className="acc-chev" />
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={btnId} hidden={!expanded} className="acc-panel">
              <p>{item.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
