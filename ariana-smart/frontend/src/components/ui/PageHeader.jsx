import Container from './Container.jsx';

export default function PageHeader({ title, lead }) {
  return (
    <section className="page-header">
      <Container>
        <h1>{title}</h1>
        {lead && <p className="page-lead">{lead}</p>}
      </Container>
    </section>
  );
}
