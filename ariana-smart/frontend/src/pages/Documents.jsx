import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Container from '../components/ui/Container.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Button from '../components/ui/Button.jsx';
import { SelectField } from '../components/ui/FormControls.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import ConfigNotice from '../auth/ConfigNotice.jsx';
import { useI18n } from '../i18n/index.jsx';
import { deleteDocument, getDocumentUrl, listDocuments, uploadDocument } from '../lib/api.js';
import { DOC_TYPES, MAX_DOCS_PER_APPLICATION, MAX_FILE_BYTES, validateFileMeta } from '../lib/documentRules.js';

/** Private document upload for ONE of the signed-in user's applications. All checks here are convenience; the server re-checks everything. */
export default function Documents() {
  const { id } = useParams();
  const { t, format } = useI18n();
  const [pendingDelete, setPendingDelete] = useState(null); // document id awaiting confirmation
  const [state, setState] = useState({ status: 'loading', docs: [] }); // loading | ready | error | notFound
  const [docType, setDocType] = useState('');
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState(null); // { tone: 'ok'|'bad', key }
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    const r = await listDocuments(id);
    if (r.ok) setState({ status: 'ready', docs: r.documents });
    else setState({ status: r.code === 'notFound' ? 'notFound' : 'error', docs: [] });
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const err = (code) => {
    const text = t(`documents.errors.${code}`);
    return text.startsWith('documents.errors.') ? t('documents.errors.serverError') : text; // t() echoes the key when missing
  };

  async function onUpload(e) {
    e.preventDefault();
    if (busyRef.current) return;
    setMsg(null);
    if (!docType) return setMsg({ tone: 'bad', text: err('docTypeInvalid') });
    if (!file) return setMsg({ tone: 'bad', text: err('fileMissing') });
    const bad = validateFileMeta({ size: file.size, type: file.type, docType });
    if (bad) return setMsg({ tone: 'bad', text: err(bad) });
    busyRef.current = true; setBusy(true);
    const r = await uploadDocument(id, docType, file);
    busyRef.current = false; setBusy(false);
    if (!r.ok) return setMsg({ tone: 'bad', text: err(r.code) });
    setFile(null); setDocType('');
    if (inputRef.current) inputRef.current.value = '';
    setMsg({ tone: 'ok', text: t('documents.uploaded') });
    load();
  }

  async function onView(docId) {
    setMsg(null);
    const r = await getDocumentUrl(docId);
    if (!r.ok) return setMsg({ tone: 'bad', text: err(r.code) });
    window.open(r.url, '_blank', 'noopener,noreferrer'); // signed link, valid ~60 s
  }

  // Deleting asks first, in an in-app dialog (themed, direction-aware, translated), not a browser alert.
  async function onDeleteConfirmed() {
    const docId = pendingDelete;
    setPendingDelete(null);
    if (!docId) return;
    setMsg(null);
    const r = await deleteDocument(docId);
    if (!r.ok) return setMsg({ tone: 'bad', text: err(r.code) });
    setMsg({ tone: 'ok', text: t('documents.deleted') });
    load();
  }

  const typeOptions = DOC_TYPES.map((k) => ({ value: k, label: t(`documents.types.${k}`) }));
  const full = state.docs.length >= MAX_DOCS_PER_APPLICATION;

  return (
    <>
      <PageHeader title={t('documents.title')} lead={t('documents.lead')} />
      <section className="section"><Container>
        <ConfigNotice />
        <div className="notice notice-warn apply-demo" role="note">{t('documents.demoNotice')}</div>

        {state.status === 'loading' && <p role="status">{t('auth.loading')}</p>}
        {state.status === 'notFound' && <p className="notice notice-bad" role="alert">{t('documents.notFound')}</p>}
        {state.status === 'error' && <p className="notice notice-bad" role="alert">{t('documents.loadError')}</p>}

        {state.status === 'ready' && (
          <div className="docs-grid">
            <form className="card docs-form" onSubmit={onUpload} noValidate>
              <h2>{t('documents.addTitle')}</h2>
              <SelectField name="docType" label={t('documents.docType')} placeholder={t('apply.select')} options={typeOptions} value={docType} onChange={(e) => setDocType(e.target.value)} />
              <div className="field">
                <label className="field-label" htmlFor="doc-file">{t('documents.file')}</label>
                <input id="doc-file" ref={inputRef} className="input" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFile(e.target.files?.[0] || null)} aria-describedby="doc-file-hint" />
                <span id="doc-file-hint" className="field-hint">{t('documents.fileHint', { mb: format.number(MAX_FILE_BYTES / 1048576), max: format.number(MAX_DOCS_PER_APPLICATION) })}</span>
              </div>
              {msg && <p className={`notice ${msg.tone === 'ok' ? 'notice-ok' : 'notice-bad'}`} role={msg.tone === 'ok' ? 'status' : 'alert'}>{msg.text}</p>}
              <Button type="submit" disabled={busy || full} aria-busy={busy}>{busy ? t('auth.working') : t('documents.upload')}</Button>
              {full && <p className="field-hint">{t('documents.errors.tooMany')}</p>}
            </form>

            <div className="card docs-list">
              <h2>{t('documents.listTitle')}</h2>
              {state.docs.length === 0 ? <p>{t('documents.none')}</p> : (
                <ul className="doc-items">
                  {state.docs.map((d) => (
                    <li key={d.id} className="doc-item">
                      <div className="doc-info">
                        <strong>{t(`documents.types.${d.doc_type}`)}</strong>
                        <span className="field-hint doc-meta">
                          <span>{t(`documents.mime.${d.mime_type}`)}</span>
                          <span>{format.fileSize(d.size_bytes)}</span>
                          <span>{format.date(d.created_at)}</span>
                        </span>
                      </div>
                      <div className="doc-actions">
                        <Button variant="secondary" size="sm" onClick={() => onView(d.id)}>{t('documents.view')}</Button>
                        <Button variant="ghost" size="sm" onClick={() => setPendingDelete(d.id)}>{t('documents.delete')}</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        <div className="dash-actions"><Button to="/dashboard" variant="ghost">{t('documents.back')}</Button></div>
        <ConfirmDialog
          open={pendingDelete !== null}
          message={t('documents.confirmDelete')}
          confirmLabel={t('documents.delete')}
          cancelLabel={t('apply.cancel')}
          onConfirm={onDeleteConfirmed}
          onCancel={() => setPendingDelete(null)}
        />
      </Container></section>
    </>
  );
}
