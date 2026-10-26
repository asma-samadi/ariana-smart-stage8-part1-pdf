import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import { useI18n } from '../../i18n/index.jsx';

/** Scroll to the top on navigation, or to the #anchor when the URL has one. */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function Layout({ children }) {
  const { t } = useI18n();
  return (
    <>
      <a className="skip-link" href="#main">{t('nav.skip')}</a>
      <div className="demo-banner" role="note">
        <div className="container">{t('demo.banner')}</div>
      </div>
      <Navbar />
      <ScrollManager />
      <main id="main" tabIndex={-1}>{children}</main>
      <Footer />
    </>
  );
}
