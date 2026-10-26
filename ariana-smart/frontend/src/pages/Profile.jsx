import { useEffect, useState } from 'react';
import Container from '../components/ui/Container.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Button from '../components/ui/Button.jsx';
import FormField from '../components/ui/FormField.jsx';
import ConfigNotice from '../auth/ConfigNotice.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useI18n } from '../i18n/index.jsx';
import { useTheme } from '../theme/ThemeProvider.jsx';
import { cleanFullName, validateConfirm, validateFullName, validatePassword } from '../lib/validation.js';

export default function Profile() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const { user, profile, updateProfile, updatePassword } = useAuth();
  const [name, setName] = useState('');
  const [nameErr, setNameErr] = useState(null);
  const [nameMsg, setNameMsg] = useState(null); // { ok, text }
  const [pw, setPw] = useState({ password: '', confirm: '' });
  const [pwErr, setPwErr] = useState({});
  const [pwMsg, setPwMsg] = useState(null);
  const [busy, setBusy] = useState('');

  useEffect(() => { setName(profile?.full_name || user?.user_metadata?.full_name || ''); }, [profile, user]);

  async function saveProfile(e) {
    e.preventDefault();
    const v = validateFullName(name);
    setNameErr(v); setNameMsg(null);
    if (v) return;
    setBusy('profile');
    const res = await updateProfile({ full_name: cleanFullName(name), theme });
    setBusy('');
    setNameMsg(res.ok ? { ok: true, text: t('profile.saved') } : { ok: false, text: t(`auth.errors.${res.error}`) });
  }

  async function savePassword(e) {
    e.preventDefault();
    const next = { password: validatePassword(pw.password), confirm: validateConfirm(pw.password, pw.confirm) };
    setPwErr(next); setPwMsg(null);
    if (next.password || next.confirm) return;
    setBusy('password');
    const res = await updatePassword(pw.password);
    setBusy('');
    if (res.ok) setPw({ password: '', confirm: '' });
    setPwMsg(res.ok ? { ok: true, text: t('profile.passwordChanged') } : { ok: false, text: t(`auth.errors.${res.error}`) });
  }
  const pe = (k) => (pwErr[k] ? t(`auth.errors.${pwErr[k]}`) : undefined);

  return (
    <>
      <PageHeader title={t('profile.title')} lead={t('profile.lead')} />
      <section className="section"><Container>
        <ConfigNotice />
        <div className="profile-grid">
          <form className="card form-stack" onSubmit={saveProfile} noValidate>
            <h2>{t('profile.details')}</h2>
            <FormField label={t('auth.fields.email')} type="email" value={user?.email || ''} readOnly hint={t('profile.emailHint')} />
            <FormField label={t('auth.fields.fullName')} dir="auto" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={nameErr ? t(`auth.errors.${nameErr}`) : undefined} />
            <p className="field-hint">{t('profile.themeNote', { theme: t(`profile.themes.${theme}`) })}</p>
            {nameMsg && <p className={`notice notice-${nameMsg.ok ? 'ok' : 'bad'}`} role={nameMsg.ok ? 'status' : 'alert'}>{nameMsg.text}</p>}
            <Button type="submit" disabled={busy === 'profile'}>{busy === 'profile' ? t('auth.working') : t('profile.save')}</Button>
          </form>
          <form className="card form-stack" onSubmit={savePassword} noValidate>
            <h2>{t('profile.passwordTitle')}</h2>
            <FormField label={t('auth.fields.newPassword')} type="password" autoComplete="new-password" value={pw.password} onChange={(e) => setPw((f) => ({ ...f, password: e.target.value }))} error={pe('password')} hint={t('auth.fields.passwordHint')} />
            <FormField label={t('auth.fields.confirm')} type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw((f) => ({ ...f, confirm: e.target.value }))} error={pe('confirm')} />
            {pwMsg && <p className={`notice notice-${pwMsg.ok ? 'ok' : 'bad'}`} role={pwMsg.ok ? 'status' : 'alert'}>{pwMsg.text}</p>}
            <Button type="submit" variant="secondary" disabled={busy === 'password'}>{busy === 'password' ? t('auth.working') : t('profile.passwordSave')}</Button>
          </form>
        </div>
      </Container></section>
    </>
  );
}
