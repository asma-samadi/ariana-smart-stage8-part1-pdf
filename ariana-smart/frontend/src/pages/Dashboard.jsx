import { useEffect, useState } from 'react';
import Container from '../components/ui/Container.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import Ltr from '../components/ui/Ltr.jsx';
import RoutePair from '../components/ui/RoutePair.jsx';
import ConfigNotice from '../auth/ConfigNotice.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { supabase } from '../lib/supabase.js';
import { useI18n } from '../i18n/index.jsx';
import { statusKeys } from '../data/routes.js';
import { downloadApplicationPdf } from '../lib/api.js';

export default function Dashboard() {
  const { t, format } = useI18n();
  const { user, profile } = useAuth();
  const [apps, setApps] = useState({ state: 'loading', rows: [] });
  const [pdfState, setPdfState] = useState({ id: null, error: '' });
  const name = profile?.full_name || user?.user_metadata?.full_name || user?.email;

  useEffect(() => {
    let active = true;
    // RLS guarantees this only ever returns the signed-in user's own rows.
    Promise.resolve(
      supabase.from('applications').select('id, reference, origin, destination, trip_type, depart_date, passengers, status, created_at').order('created_at', { ascending: false })
    ).then(({ data, error }) => {
      if (active) setApps(error ? { state: 'error', rows: [] } : { state: 'ready', rows: data || [] });
    });
    return () => { active = false; };
  }, []);

  async function handlePdfDownload(applicationId) {
    setPdfState({ id: applicationId, error: '' });
    const result = await downloadApplicationPdf(applicationId);
    setPdfState({ id: null, error: result.ok ? '' : t(`dashboard.pdfErrors.${result.code}`, { defaultValue: t('dashboard.pdfErrors.serverError') }) });
  }

  const counts = statusKeys.reduce((acc, k) => ({ ...acc, [k]: apps.rows.filter((r) => r.status === k).length }), {});

  return (
    <>
      <PageHeader title={t('dashboard.welcome', { name })} lead={t('dashboard.lead')} />
      <section className="section">
        <Container>
          <ConfigNotice />
          <div className="dash-grid">
            <Card icon="user" title={t('dashboard.account')}><Ltr>{user?.email}</Ltr></Card>
            <Card icon="clipboard" title={t('dashboard.total')} className="stat-card">{apps.state === 'ready' ? format.number(apps.rows.length) : '—'}</Card>
            <Card icon="shield" title={t('dashboard.privacyTitle')}>{t('dashboard.privacyText')}</Card>
          </div>

          <h2 className="dash-h">{t('dashboard.appsTitle')}</h2>
          {pdfState.error && <p className="notice notice-bad" role="alert">{pdfState.error}</p>}
          {apps.state === 'loading' && <p role="status">{t('auth.loading')}</p>}
          {apps.state === 'error' && <p className="notice notice-bad" role="alert">{t('dashboard.loadError')}</p>}
          {apps.state === 'ready' && apps.rows.length === 0 && (
            <div className="card empty-state">
              <p>{t('dashboard.empty')}</p>
              <Button to="/apply" variant="primary">{t('dashboard.applyCta')}</Button>
              <p className="field-hint">{t('dashboard.applyNote')}</p>
            </div>
          )}
          {apps.state === 'ready' && apps.rows.length > 0 && (
            <>
              <ul className="status-summary">
                {statusKeys.filter((k) => counts[k] > 0).map((k) => <li key={k}><StatusBadge status={k} /> <span>{format.number(counts[k])}</span></li>)}
              </ul>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>{t('dashboard.cols.ref')}</th><th>{t('dashboard.cols.route')}</th><th>{t('dashboard.cols.date')}</th><th>{t('dashboard.cols.passengers')}</th><th>{t('dashboard.cols.submitted')}</th><th>{t('dashboard.cols.status')}</th><th>{t('dashboard.cols.documents')}</th><th>{t('dashboard.cols.pdf')}</th></tr></thead>
                  <tbody>
                    {apps.rows.map((r) => (
                      <tr key={r.id}>
                        <td data-label={t('dashboard.cols.ref')}><Ltr>{r.reference}</Ltr></td>
                        <td data-label={t('dashboard.cols.route')}><RoutePair from={r.origin} to={r.destination} /> <span className="field-hint">({t(`dashboard.trip.${r.trip_type}`)})</span></td>
                        <td data-label={t('dashboard.cols.date')}>{format.date(r.depart_date)}</td>
                        <td data-label={t('dashboard.cols.passengers')}>{format.number(r.passengers)}</td>
                        <td data-label={t('dashboard.cols.submitted')}>{format.date(r.created_at)}</td>
                        <td data-label={t('dashboard.cols.status')}><StatusBadge status={r.status} /></td>
                        <td data-label={t('dashboard.cols.documents')}><Button to={`/applications/${r.id}/documents`} variant="secondary" size="sm">{t('dashboard.manageDocs')}</Button></td>
                        <td data-label={t('dashboard.cols.pdf')}><Button variant="secondary" size="sm" icon="file" disabled={pdfState.id === r.id} onClick={() => handlePdfDownload(r.id)}>{pdfState.id === r.id ? t('dashboard.pdfLoading') : t('dashboard.downloadPdf')}</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="dash-actions">
            <Button to="/apply" variant="primary">{t('dashboard.newApplication')}</Button>
            <Button to="/profile" variant="secondary" icon="user">{t('dashboard.editProfile')}</Button>
          </div>
        </Container>
      </section>
    </>
  );
}
