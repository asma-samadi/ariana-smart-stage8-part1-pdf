import Container from './Container.jsx';

export default function Section({ id, eyebrow, title, lead, align = 'start', tone = 'default', children }) {
  return (
    <section id={id} className={`section ${tone === 'alt' ? 'section-alt' : ''}`.trim()}>
      <Container>
        {(title || eyebrow) && (
          <header className={`section-head ${align === 'center' ? 'center' : ''}`.trim()}>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            {title && <h2>{title}</h2>}
            {lead && <p className="lead">{lead}</p>}
          </header>
        )}
        {children}
      </Container>
    </section>
  );
}
