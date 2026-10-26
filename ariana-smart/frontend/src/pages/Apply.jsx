import { useEffect, useMemo, useRef, useState } from 'react';
import Container from '../components/ui/Container.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Button from '../components/ui/Button.jsx';
import FormField from '../components/ui/FormField.jsx';
import { CheckboxField, RadioGroup, SelectField } from '../components/ui/FormControls.jsx';
import Ltr from '../components/ui/Ltr.jsx';
import ConfigNotice from '../auth/ConfigNotice.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useI18n } from '../i18n/index.jsx';
import { submitApplication } from '../lib/api.js';
import { AIRPORTS, MAX_PASSENGERS, todayISO, validateApplication } from '../lib/applicationRules.js';

/** One unguessable key per form "session"; lets the server treat a retried/double submit as the same request. */
function newKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const b = new Uint8Array(16);
  globalThis.crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

const EMPTY = {
  fullName: '', dateOfBirth: '', nationality: '', email: '', phone: '', idDocumentNumber: '',
  origin: '', destination: '', tripType: 'one_way', departDate: '', returnDate: '', passengers: 1, consent: false
};
const ORDER = ['fullName', 'dateOfBirth', 'nationality', 'email', 'phone', 'idDocumentNumber', 'origin', 'destination', 'tripType', 'departDate', 'returnDate', 'passengers', 'consent'];

export default function Apply() {
  const { t, format } = useI18n();
  const { user, profile } = useAuth();
  const keyRef = useRef(null);
  if (!keyRef.current) keyRef.current = newKey();
  const busyRef = useRef(false); // synchronous guard: state updates are async, a double-click is not
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null); // { code, reference? }
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const formRef = useRef(null);

  // Pre-fill from the account, once, without overwriting what the user has typed.
  useEffect(() => {
    setForm((f) => ({
      ...f,
      fullName: f.fullName || profile?.full_name || user?.user_metadata?.full_name || '',
      email: f.email || user?.email || ''
    }));
  }, [profile, user]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const err = (k) => (errors[k] ? t(`apply.errors.${errors[k]}`) : undefined);
  const today = useMemo(() => todayISO(), []);
  const airportOptions = AIRPORTS.map((c) => ({ value: c, label: `${t(`airports.${c}.city`)} (${c})` }));

  function focusFirst(errs) {
    const first = ORDER.find((k) => errs[k]);
    if (!first) return;
    const el = formRef.current?.querySelector(`[name="${first}"]`);
    el?.focus();
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (busyRef.current) return; // duplicate click / Enter key
    setFormError(null);
    const payload = { ...form, passengers: Number(form.passengers), idempotencyKey: keyRef.current };
    const { errors: local } = validateApplication(payload);
    delete local.idempotencyKey;
    setErrors(local);
    if (Object.keys(local).length) return focusFirst(local);

    busyRef.current = true;
    setBusy(true);
    // NOTE: no user id and no status are sent. The server derives the user from the login token and sets the status.
    const res = await submitApplication(payload);
    busyRef.current = false;
    setBusy(false);
    if (res.ok) return setResult(res);
    if (res.code === 'validation') { setErrors(res.fields); return focusFirst(res.fields); }
    setFormError({ code: res.code, reference: res.reference });
  }

  function startNew() {
    keyRef.current = newKey();
    setForm({ ...EMPTY, fullName: form.fullName, email: form.email });
    setErrors({}); setFormError(null); setResult(null);
  }

  if (result) {
    const a = result.application;
    return (
      <>
        <PageHeader title={t('apply.title')} />
        <section className="section"><Container>
          <div className="card confirm-card" role="status">
            <span className="badge badge-ok">{result.duplicate ? t('apply.success.already') : t('apply.success.badge')}</span>
            <h2>{t('apply.success.title')}</h2>
            <p>{t('apply.success.refLabel')}</p>
            <p className="ref-number" data-testid="reference"><Ltr>{a.reference}</Ltr></p>
            <p>{t('apply.success.note')}</p>
            <div className="confirm-actions">
              <Button to={`/applications/${a.id}/documents`}>{t('apply.success.documents')}</Button>
              <Button to="/dashboard" variant="secondary">{t('apply.success.dashboard')}</Button>
              <Button variant="secondary" onClick={startNew}>{t('apply.success.another')}</Button>
            </div>
          </div>
        </Container></section>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t('apply.title')} lead={t('apply.lead')} />
      <section className="section"><Container>
        <ConfigNotice />
        <div className="notice notice-warn apply-demo" role="note">{t('apply.demoNotice')}</div>
        <form ref={formRef} onSubmit={onSubmit} noValidate className="apply-form">
          <fieldset className="card apply-section">
            <legend><span className="step-num">{format.number(1)}</span>{t('apply.sections.passenger')}</legend>
            <div className="grid-2">
              <FormField name="fullName" dir="auto" label={t('apply.fields.fullName')} autoComplete="name" value={form.fullName} onChange={set('fullName')} error={err('fullName')} hint={t('apply.hints.fullName')} />
              <FormField name="dateOfBirth" label={t('apply.fields.dateOfBirth')} type="date" max={today} value={form.dateOfBirth} onChange={set('dateOfBirth')} error={err('dateOfBirth')} />
              <FormField name="nationality" dir="auto" label={t('apply.fields.nationality')} autoComplete="country-name" value={form.nationality} onChange={set('nationality')} error={err('nationality')} />
              <FormField name="email" label={t('apply.fields.email')} type="email" autoComplete="email" value={form.email} onChange={set('email')} error={err('email')} />
              <FormField name="phone" label={t('apply.fields.phone')} type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} error={err('phone')} hint={t('apply.hints.optional')} />
              <FormField name="idDocumentNumber" dir="ltr" label={t('apply.fields.idDocumentNumber')} autoComplete="off" value={form.idDocumentNumber} onChange={set('idDocumentNumber')} error={err('idDocumentNumber')} hint={t('apply.hints.idDoc')} />
            </div>
          </fieldset>

          <fieldset className="card apply-section">
            <legend><span className="step-num">{format.number(2)}</span>{t('apply.sections.journey')}</legend>
            <RadioGroup
              legend={t('apply.fields.tripType')} name="tripType" value={form.tripType} error={err('tripType')}
              onChange={(v) => setForm((f) => ({ ...f, tripType: v, returnDate: v === 'one_way' ? '' : f.returnDate }))}
              options={[{ value: 'one_way', label: t('apply.trip.one_way') }, { value: 'return', label: t('apply.trip.return') }]}
            />
            <div className="grid-2">
              <SelectField name="origin" label={t('apply.fields.origin')} placeholder={t('apply.select')} options={airportOptions} value={form.origin} onChange={set('origin')} error={err('origin')} />
              <SelectField name="destination" label={t('apply.fields.destination')} placeholder={t('apply.select')} options={airportOptions.filter((o) => o.value !== form.origin)} value={form.destination} onChange={set('destination')} error={err('destination')} />
              <FormField name="departDate" label={t('apply.fields.departDate')} type="date" min={today} value={form.departDate} onChange={set('departDate')} error={err('departDate')} />
              {form.tripType === 'return' && (
                <FormField name="returnDate" label={t('apply.fields.returnDate')} type="date" min={form.departDate || today} value={form.returnDate} onChange={set('returnDate')} error={err('returnDate')} />
              )}
              <FormField name="passengers" label={t('apply.fields.passengers')} type="number" inputMode="numeric" min="1" max={MAX_PASSENGERS} value={form.passengers} onChange={set('passengers')} error={err('passengers')} />
            </div>
            <p className="field-hint">{t('apply.hints.routes')}</p>
          </fieldset>

          <fieldset className="card apply-section">
            <legend><span className="step-num">{format.number(3)}</span>{t('apply.sections.consent')}</legend>
            <p className="consent-text">{t('apply.consentText')}</p>
            <CheckboxField label={t('apply.fields.consent')} checked={form.consent} onChange={(v) => setForm((f) => ({ ...f, consent: v }))} error={err('consent')} />
          </fieldset>

          {formError && (
            <p className="notice notice-bad" role="alert">
              {t(`apply.formErrors.${formError.code}`)}{formError.reference ? <> <Ltr>{formError.reference}</Ltr></> : null}
            </p>
          )}
          <div className="apply-submit">
            <Button type="submit" size="lg" disabled={busy} aria-busy={busy}>{busy ? t('auth.working') : t('apply.submit')}</Button>
            <Button to="/dashboard" variant="ghost" size="lg">{t('apply.cancel')}</Button>
          </div>
        </form>
      </Container></section>
    </>
  );
}
