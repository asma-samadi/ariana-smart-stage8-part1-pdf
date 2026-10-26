import { useMemo, useState } from 'react';
import Container from '../components/ui/Container.jsx';
import Section from '../components/ui/Section.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Accordion from '../components/ui/Accordion.jsx';
import Icon from '../components/ui/Icon.jsx';
import HeroArt from '../components/ui/HeroArt.jsx';
import RouteCard from '../components/ui/RouteCard.jsx';
import { sampleRoutes } from '../data/routes.js';
import { useI18n } from '../i18n/index.jsx';

export default function Home() {
  const { t, format } = useI18n();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const origins = useMemo(() => [...new Set(sampleRoutes.map((r) => r.from))], []);
  const destinations = useMemo(() => [...new Set(sampleRoutes.map((r) => r.to))], []);
  const filtered = useMemo(
    () => sampleRoutes.filter((r) => (!from || r.from === from) && (!to || r.to === to)),
    [from, to]
  );
  const airportLabel = (code) => `${code} · ${t(`airports.${code}.city`)}`;
  const steps = t('steps.items');
  const infoCards = t('info.cards');
  const infoIcons = [
    { icon: 'clipboard', to: '/travel#documents' },
    { icon: 'globe', to: '/travel#preparation' },
    { icon: 'info', to: '/travel#statuses' }
  ];

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <Container className="hero-grid">
          <div className="hero-copy">
            <span className="hero-eyebrow">{t('hero.eyebrow')}</span>
            <h1>{t('hero.title')}</h1>
            <p className="hero-lead">{t('hero.lead')}</p>
            <div className="hero-actions">
              <Button to="/apply" variant="accent" size="lg" iconEnd="arrow" iconFlip>
                {t('hero.ctaApply')}
              </Button>
              <Button to="/assistant" variant="outline-light" size="lg" icon="message">
                {t('hero.ctaAssistant')}
              </Button>
            </div>
            <ul className="hero-chips">
              {t('hero.chips').map((c) => (
                <li key={c}><Icon name="shield" size={16} /> {c}</li>
              ))}
            </ul>
          </div>
          <div className="hero-visual">
            <HeroArt alt={t('hero.artAlt')} />
          </div>
        </Container>
      </section>

      {/* ROUTE EXPLORER (client-side filter over fictional sample data) */}
      <Container>
        <div className="explorer card" role="search" aria-label={t('explorer.title')}>
          <div className="explorer-head">
            <h2 className="explorer-title"><Icon name="plane" size={22} /> {t('explorer.title')}</h2>
            <Badge tone="warn">{t('explorer.note')}</Badge>
          </div>
          <div className="explorer-fields">
            <label className="field">
              <span className="field-label">{t('explorer.from')}</span>
              <select className="select" value={from} onChange={(e) => setFrom(e.target.value)}>
                <option value="">{t('explorer.any')}</option>
                {origins.map((c) => <option key={c} value={c}>{airportLabel(c)}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="field-label">{t('explorer.to')}</span>
              <select className="select" value={to} onChange={(e) => setTo(e.target.value)}>
                <option value="">{t('explorer.any')}</option>
                {destinations.map((c) => <option key={c} value={c}>{airportLabel(c)}</option>)}
              </select>
            </label>
            <div className="explorer-actions">
              <Button variant="secondary" onClick={() => { setFrom(''); setTo(''); }} disabled={!from && !to}>
                {t('explorer.reset')}
              </Button>
            </div>
          </div>
          <p className="explorer-count" aria-live="polite">
            {t('explorer.count', { count: format.number(filtered.length), total: format.number(sampleRoutes.length) })}
          </p>
        </div>
      </Container>

      {/* FEATURED ROUTES */}
      <Section id="routes" eyebrow={t('common.fictional')} title={t('routes.title')} lead={t('routes.lead')}>
        {filtered.length === 0 ? (
          <p className="empty-state">{t('explorer.empty')}</p>
        ) : (
          <div className="grid grid-3">
            {filtered.map((r) => <RouteCard key={r.id} route={r} />)}
          </div>
        )}
        <div className="section-foot">
          <Button to="/travel" variant="ghost" iconEnd="arrow" iconFlip>{t('routes.viewAll')}</Button>
        </div>
      </Section>

      {/* APPLICATION PROCESS */}
      <Section id="process" tone="alt" eyebrow={t('steps.eyebrow')} title={t('steps.title')} lead={t('steps.lead')}>
        <ol className="steps">
          {steps.map((s, i) => (
            <li className="step card" key={s.title}>
              <span className="step-num" aria-hidden="true">{format.number(i + 1)}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* TRAVEL INFORMATION */}
      <Section id="travel-info" eyebrow={t('info.eyebrow')} title={t('info.title')} lead={t('info.lead')}>
        <div className="grid grid-3">
          {infoCards.map((c, i) => (
            <Card key={c.title} icon={infoIcons[i].icon} title={c.title} to={infoIcons[i].to} linkLabel={c.link}>
              {c.text}
            </Card>
          ))}
        </div>
      </Section>

      {/* PASSENGER SUPPORT */}
      <Section id="support" tone="alt" eyebrow={t('support.eyebrow')} title={t('support.title')} lead={t('support.lead')}>
        <div className="grid grid-4">
          <Card icon="help" title={t('support.cards.guidance.title')} to="/travel" linkLabel={t('common.learnMore')}>
            {t('support.cards.guidance.text')}
          </Card>
          <Card icon="message" title={t('support.cards.assistant.title')} to="/assistant"
            badge={<Badge tone="neutral">{t('common.comingSoon')}</Badge>}>
            {t('support.cards.assistant.text')}
          </Card>
          <Card icon="mail" title={t('support.cards.contact.title')} to="/contact"
            badge={<Badge tone="neutral">{t('common.comingSoon')}</Badge>}>
            {t('support.cards.contact.text')}
          </Card>
          <Card icon="globe" title={t('support.cards.languages.title')}
            badge={<Badge tone="ok">{t('common.available')}</Badge>}>
            {t('support.cards.languages.text')}
          </Card>
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" eyebrow={t('faq.eyebrow')} title={t('faq.title')} align="center">
        <Accordion items={t('faq.items')} />
      </Section>

      {/* CTA */}
      <section className="cta-band">
        <Container className="cta-inner">
          <div>
            <h2>{t('cta.title')}</h2>
            <p>{t('cta.text')}</p>
          </div>
          <div className="cta-actions">
            <Button to="/apply" variant="accent" size="lg" iconEnd="arrow" iconFlip>{t('cta.primary')}</Button>
            <Button to="/travel" variant="outline-light" size="lg">{t('cta.secondary')}</Button>
          </div>
        </Container>
      </section>
    </>
  );
}
