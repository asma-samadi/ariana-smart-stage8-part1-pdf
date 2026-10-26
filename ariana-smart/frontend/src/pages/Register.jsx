import { useState } from 'react';
import { Link } from 'react-router-dom';
import Container from '../components/ui/Container.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Button from '../components/ui/Button.jsx';
import FormField from '../components/ui/FormField.jsx';
import ConfigNotice from '../auth/ConfigNotice.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useI18n } from '../i18n/index.jsx';
import { validateConfirm, validateEmail, validateFullName, validatePassword } from '../lib/validation.js';

export default function Register() {
  const { t } = useI18n();
  const { signUp, configured } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const next = {
      fullName: validateFullName(form.fullName),
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      confirm: validateConfirm(form.password, form.confirm)
    };
    setErrors(next);
    setFormError(null);
    if (Object.values(next).some(Boolean)) return;
    setBusy(true);
    const res = await signUp(form);
    setBusy(false);
    if (!res.ok) return setFormError(res.error);
    setDone(true);
  }

  const err = (k) => (errors[k] ? t(`auth.errors.${errors[k]}`) : undefined);

  if (done) {
    return (
      <>
        <PageHeader title={t('auth.register.title')} />
        <section className="section"><Container>
          <div className="card auth-card" role="status">
            <h2>{t('auth.register.doneTitle')}</h2>
            <p>{t('auth.register.doneText')}</p>
            <Button to="/login">{t('auth.register.goLogin')}</Button>
          </div>
        </Container></section>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t('auth.register.title')} lead={t('auth.register.lead')} />
      <section className="section">
        <Container>
          <div className="card auth-card">
            <ConfigNotice />
            <form onSubmit={onSubmit} noValidate className="form-stack">
              <FormField label={t('auth.fields.fullName')} dir="auto" autoComplete="name" value={form.fullName} onChange={set('fullName')} error={err('fullName')} />
              <FormField label={t('auth.fields.email')} type="email" autoComplete="email" value={form.email} onChange={set('email')} error={err('email')} />
              <FormField label={t('auth.fields.password')} type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={err('password')} hint={t('auth.fields.passwordHint')} />
              <FormField label={t('auth.fields.confirm')} type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={err('confirm')} />
              <p className="field-hint">{t('auth.register.privacy')}</p>
              {formError && <p className="notice notice-bad" role="alert">{t(`auth.errors.${formError}`)}</p>}
              <Button type="submit" disabled={busy || !configured} className="btn-block">{busy ? t('auth.working') : t('auth.register.submit')}</Button>
            </form>
            <p className="auth-links"><span>{t('auth.register.haveAccount')} <Link to="/login">{t('nav.login')}</Link></span></p>
          </div>
        </Container>
      </section>
    </>
  );
}
