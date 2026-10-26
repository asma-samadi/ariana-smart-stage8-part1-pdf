import { useAuth } from './AuthProvider.jsx';
import { useI18n } from '../i18n/index.jsx';

/** Explains the auth mode honestly: not configured, unsafe key, or development mock. */
export default function ConfigNotice() {
  const { mode } = useAuth();
  const { t } = useI18n();
  if (mode === 'real') return null;
  const tone = mode === 'mock' ? 'warn' : 'bad';
  return (
    <div className={`notice notice-${tone}`} role="alert">
      <strong>{t(`auth.config.${mode}.title`)}</strong>
      <p>{t(`auth.config.${mode}.text`)}</p>
    </div>
  );
}
