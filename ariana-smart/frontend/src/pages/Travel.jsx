import Container from '../components/ui/Container.jsx';
import Badge from '../components/ui/Badge.jsx';
import Icon from '../components/ui/Icon.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import { sampleRoutes, statusKeys } from '../data/routes.js';
import { useI18n } from '../i18n/index.jsx';
import Ltr from '../components/ui/Ltr.jsx';

export default function Travel() {
  const { t, format } = useI18n();
  const airport = (c) => `${t(`airports.${c}.city`)} (${c})`;
  return (
    <>
      <PageHeader title={t('travel.title')} lead={t('travel.lead')} />
      <section className="section" id="routes">
        <Container>
          <div className="card notice notice-row">
            <Badge tone="warn">{t('common.fictional')}</Badge>
            <p>{t('travel.demoNotice')}</p>
          </div>
          <h2 className="mt">{t('travel.routesTitle')}</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">{t('travel.cols.code')}</th>
                  <th scope="col">{t('travel.cols.from')}</th>
                  <th scope="col">{t('travel.cols.to')}</th>
                  <th scope="col">{t('travel.cols.duration')}</th>
                  <th scope="col">{t('travel.cols.frequency')}</th>
                </tr>
              </thead>
              <tbody>
                {sampleRoutes.map((r) => (
                  <tr key={r.id}>
                    <td data-label={t('travel.cols.code')}><strong><Ltr>{r.code}</Ltr></strong></td>
                    <td data-label={t('travel.cols.from')}>{airport(r.from)}</td>
                    <td data-label={t('travel.cols.to')}>{airport(r.to)}</td>
                    <td data-label={t('travel.cols.duration')}>{format.duration(r.minutes)}</td>
                    <td data-label={t('travel.cols.frequency')}>{t(`routes.freq.${r.frequency}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      <section className="section section-alt">
        <Container>
          <div className="split">
            <div id="documents">
              <h2>{t('travel.docsTitle')}</h2>
              <p className="lead">{t('travel.docsLead')}</p>
              <ul className="checklist">
                {t('travel.docs').map((d) => (
                  <li key={d}><span className="tick"><Icon name="file" size={13} /></span><span>{d}</span></li>
                ))}
              </ul>
            </div>
            <div id="preparation">
              <h2>{t('travel.prepTitle')}</h2>
              <ul className="checklist">
                {t('travel.prep').map((p) => (
                  <li key={p}><span className="tick"><Icon name="check" size={14} /></span><span>{p}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <section className="section" id="statuses">
        <Container>
          <h2>{t('travel.statusTitle')}</h2>
          <p className="lead">{t('travel.statusLead')}</p>
          <div className="grid grid-2 status-grid">
            {statusKeys.map((k) => (
              <div className="card status-card" key={k}>
                <StatusBadge status={k} />
                <p>{t(`status.${k}.desc`)}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
