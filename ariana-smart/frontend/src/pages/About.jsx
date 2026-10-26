import Container from '../components/ui/Container.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Icon from '../components/ui/Icon.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function About() {
  const { t } = useI18n();
  return (
    <>
      <PageHeader title={t('about.title')} lead={t('about.lead')} />
      <section className="section">
        <Container>
          <div className="grid grid-2">
            <Card icon="plane" title={t('about.purposeTitle')}>{t('about.purposeText')}</Card>
            <Card icon="message" title={t('about.aiTitle')}>{t('about.aiText')}</Card>
          </div>
          <div className="split">
            <div>
              <h2>{t('about.featuresTitle')}</h2>
              <ul className="checklist">
                {t('about.features').map((f) => (
                  <li key={f}><span className="tick"><Icon name="check" size={14} /></span><span>{f}</span></li>
                ))}
              </ul>
            </div>
            <div className="stack">
              <div id="disclaimer" className="card notice">
                <Badge tone="warn">{t('common.fictional')}</Badge>
                <h3>{t('about.disclaimerTitle')}</h3>
                <p>{t('about.disclaimerText')}</p>
              </div>
              <div className="card">
                <Badge tone="info">{t('common.planned')}</Badge>
                <h3>{t('about.statusTitle')}</h3>
                <p>{t('about.statusText')}</p>
              </div>
            </div>
          </div>
          <div className="section-foot">
            <Button to="/travel" variant="primary" iconEnd="arrow" iconFlip>{t('nav.travel')}</Button>
          </div>
        </Container>
      </section>
    </>
  );
}
