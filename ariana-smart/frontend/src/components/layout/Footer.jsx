import { Link } from 'react-router-dom';
import Container from '../ui/Container.jsx';
import Logo from '../ui/Logo.jsx';
import { useI18n } from '../../i18n/index.jsx';

export default function Footer() {
  const { t, format } = useI18n();
  const year = format.year(new Date().getFullYear());
  return (
    <footer className="site-footer">
      <Container>
        <div className="footer-grid">
          <div className="footer-brand">
            <Logo light />
            <p>{t('footer.about')}</p>
          </div>
          <nav aria-label={t('footer.explore')}>
            <h2 className="footer-h">{t('footer.explore')}</h2>
            <ul>
              <li><Link to="/">{t('nav.home')}</Link></li>
              <li><Link to="/about">{t('nav.about')}</Link></li>
              <li><Link to="/travel">{t('nav.travel')}</Link></li>
            </ul>
          </nav>
          <nav aria-label={t('footer.passenger')}>
            <h2 className="footer-h">{t('footer.passenger')}</h2>
            <ul>
              <li><Link to="/apply">{t('nav.apply')}</Link></li>
              <li><Link to="/assistant">{t('nav.assistant')}</Link></li>
              <li><Link to="/contact">{t('nav.contact')}</Link></li>
            </ul>
          </nav>
          <nav aria-label={t('footer.project')}>
            <h2 className="footer-h">{t('footer.project')}</h2>
            <ul>
              <li><Link to="/#faq">{t('footer.faq')}</Link></li>
              <li><Link to="/about">{t('footer.disclaimerTitle')}</Link></li>
            </ul>
          </nav>
        </div>
        <div className="footer-disclaimer">
          <strong>{t('footer.disclaimerTitle')}.</strong> {t('footer.disclaimer')}
        </div>
        <p className="footer-copy">{t('footer.rights', { year })}</p>
      </Container>
    </footer>
  );
}
