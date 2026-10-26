import { useState } from 'react';
import { Link } from 'react-router-dom';
import Container from '../components/ui/Container.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Button from '../components/ui/Button.jsx';
import FormField from '../components/ui/FormField.jsx';
import ConfigNotice from '../auth/ConfigNotice.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useI18n } from '../i18n/index.jsx';
import { validateEmail } from '../lib/validation.js';

export default function ForgotPassword() {
  const { t } = useI18n();
  const { requestPasswordReset, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    const v = validateEmail(email);
    setError(v);
    setFormError(null);
    if (v) return;
    setBusy(true);
    const res = await requestPasswordReset(email);
    setBusy(false);
    // Same message whether or not the account exists (no account enumeration).
    if (!res.ok && res.error !== 'generic') return setFormError(res.error);
    setSent(true);
  }

  return (
    <>
      <PageHeader title={t('auth.forgot.title')} lead={t('auth.forgot.lead')} />
      <section className="section"><Container>
        <div className="card auth-card">
          <ConfigNotice />
          {sent ? (
            <div role="status"><p>{t('auth.forgot.sent')}</p><Button to="/login" variant="secondary">{t('auth.backToLogin')}</Button></div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="form-stack">
              <FormField label={t('auth.fields.email')} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error ? t(`auth.errors.${error}`) : undefined} />
              {formError && <p className="notice notice-bad" role="alert">{t(`auth.errors.${formError}`)}</p>}
              <Button type="submit" disabled={busy || !configured} className="btn-block">{busy ? t('auth.working') : t('auth.forgot.submit')}</Button>
              <p className="auth-links"><Link to="/login">{t('auth.backToLogin')}</Link></p>
            </form>
          )}
        </div>
      </Container></section>
    </>
  );
}
