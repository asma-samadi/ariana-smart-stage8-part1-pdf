import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Container from '../components/ui/Container.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Button from '../components/ui/Button.jsx';
import FormField from '../components/ui/FormField.jsx';
import ConfigNotice from '../auth/ConfigNotice.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useI18n } from '../i18n/index.jsx';
import { validateEmail } from '../lib/validation.js';

export default function Login() {
  const { t } = useI18n();
  const { signIn, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const next = { email: validateEmail(form.email), password: form.password ? null : 'passwordRequired' };
    setErrors(next);
    setFormError(null);
    if (next.email || next.password) return;
    setBusy(true);
    const res = await signIn(form);
    setBusy(false);
    if (!res.ok) return setFormError(res.error);
    const from = location.state?.from;
    navigate(typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/dashboard', { replace: true });
  }

  const err = (k) => (errors[k] ? t(`auth.errors.${errors[k]}`) : undefined);
  return (
    <>
      <PageHeader title={t('auth.login.title')} lead={t('auth.login.lead')} />
      <section className="section">
        <Container>
          <div className="card auth-card">
            <ConfigNotice />
            <form onSubmit={onSubmit} noValidate className="form-stack">
              <FormField label={t('auth.fields.email')} type="email" autoComplete="email" value={form.email} onChange={set('email')} error={err('email')} />
              <FormField label={t('auth.fields.password')} type="password" autoComplete="current-password" value={form.password} onChange={set('password')} error={err('password')} />
              {formError && <p className="notice notice-bad" role="alert">{t(`auth.errors.${formError}`)}</p>}
              <Button type="submit" disabled={busy || !configured} className="btn-block">{busy ? t('auth.working') : t('auth.login.submit')}</Button>
            </form>
            <p className="auth-links">
              <Link to="/forgot-password">{t('auth.login.forgot')}</Link>
              <span>{t('auth.login.noAccount')} <Link to="/register">{t('nav.register')}</Link></span>
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
