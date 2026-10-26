import { useId } from 'react';
import { useI18n } from '../../i18n/index.jsx';
import Icon from './Icon.jsx';

/**
 * Language selector (English / دری / پښتو).
 * A native <select> keeps it keyboard- and screen-reader-accessible and easy to use on mobile.
 * Choosing a language updates the interface immediately and is saved for the next visit.
 * Each option carries its own lang/dir so the native name is announced and drawn correctly.
 */
export default function LanguageSelector() {
  const { t, locale, setLocale, locales } = useI18n();
  const id = useId();
  return (
    <div className="lang-select">
      <label htmlFor={id} className="visually-hidden">{t('language.label')}</label>
      <Icon name="globe" size={18} />
      <select id={id} className="lang-select-input" value={locale} onChange={(e) => setLocale(e.target.value)}>
        {Object.entries(locales).map(([code, info]) => (
          <option key={code} value={code} lang={code} dir={info.dir}>{info.label}</option>
        ))}
      </select>
    </div>
  );
}
