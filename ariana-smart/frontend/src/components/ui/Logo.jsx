import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/index.jsx';

/** Original Ariana Smart mark (not derived from any airline's logo). */
export function LogoMark() {
  return (
    <svg className="logo-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="as-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1d4ed8" />
          <stop offset="1" stopColor="#0b2a6f" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#as-logo-g)" />
      <path d="M14 38 50 16 38 50 31 37Z" fill="#fff" />
      <path d="M31 37 50 16" stroke="#f2b544" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ light = false }) {
  const { t } = useI18n();
  return (
    <Link to="/" className={`logo ${light ? 'logo-light' : ''}`.trim()} aria-label={`${t('brand.name')} — ${t('nav.home')}`}>
      <LogoMark />
      <span className="logo-text">
        <span className="logo-name">{t('brand.name')}</span>
        <span className="logo-tag">{t('brand.tagline')}</span>
      </span>
    </Link>
  );
}
