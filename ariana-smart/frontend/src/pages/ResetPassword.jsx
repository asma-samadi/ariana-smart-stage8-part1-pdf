import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '../components/ui/Container.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Button from '../components/ui/Button.jsx';
import FormField from '../components/ui/FormField.jsx';
import ConfigNotice from '../auth/ConfigNotice.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useI18n } from '../i18n/index.jsx';
import { validateConfirm, validatePassword } from '../lib/validation.js';

/** Reached from the emailed recovery link; Supabase turns the link into a session automatically. */
export default function ResetPassword() {
  const { t } = useI18n();
  const { user, loading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    const next = { password: validatePassword(form.password), confirm: validateConfirm(form.password, form.confirm) };
    setErrors(next);
    setFormError(null);
    if (next.password || next.confirm) return;
    setBusy(true);
    const res = await updatePassword(form.password);
    setBusy(false);
    if (!res.ok) return setFormError(res.error);
    setDone(true);
    setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
  }
  const err = (k) => (errors[k] ? t(`auth.errors.${errors[k]}`) : undefined);

  return (
    <>
      <PageHeader title={t('auth.reset.title')} lead={t('auth.reset.lead')} />
      <section className="section"><Container>
        <div className="card auth-card">
          <ConfigNotice />
          {loading ? (
            <p role="status">{t('auth.loading')}</p>
          ) : !user ? (
            <div role="alert"><p>{t('auth.reset.invalidLink')}</p><Button to="/forgot-password">{t('auth.reset.requestNew')}</Button></div>
          ) : done ? (
            <p role="status">{t('auth.reset.done')}</p>
          ) : (
            <form onSubmit={onSubmit} noValidate className="form-stack">
              <FormField label={t('auth.fields.newPassword')} type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} error={err('password')} hint={t('auth.fields.passwordHint')} />
              <FormField label={t('auth.fields.confirm')} type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} error={err('confirm')} />
              {formError && <p className="notice notice-bad" role="alert">{t(`auth.errors.${formError}`)}</p>}
              <Button type="submit" disabled={busy} className="btn-block">{busy ? t('auth.working') : t('auth.reset.submit')}</Button>
            </form>
          )}
        </div>
      </Container></section>
    </>
  );
}
