import Container from '../components/ui/Container.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import { useI18n } from '../i18n/index.jsx';

/** Honest navigation placeholder for features that are not built yet. */
export default function ComingSoon({ page }) {
  const { t } = useI18n();
  const title = t(`soon.pages.${page}.title`);
  return (
    <>
      <PageHeader title={title} />
      <section className="section">
        <Container>
          <div className="card soon-card">
            <Badge tone="neutral">{t('soon.badge')}</Badge>
            <p>{t('soon.text', { stage: t(`soon.pages.${page}.stage`) })}</p>
            <Button to="/" variant="primary">{t('soon.back')}</Button>
          </div>
        </Container>
      </section>
    </>
  );
}
