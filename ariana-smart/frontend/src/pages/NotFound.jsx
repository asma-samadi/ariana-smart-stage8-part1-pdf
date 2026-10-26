import Container from '../components/ui/Container.jsx';
import Button from '../components/ui/Button.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <>
      <PageHeader title={t('notFound.title')} />
      <section className="section">
        <Container>
          <p className="lead">{t('notFound.text')}</p>
          <Button to="/" variant="primary">{t('notFound.back')}</Button>
        </Container>
      </section>
    </>
  );
}
