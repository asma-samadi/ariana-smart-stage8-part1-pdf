import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../ui/Logo.jsx';
import Icon from '../ui/Icon.jsx';
import Button from '../ui/Button.jsx';
import ThemeToggle from '../ui/ThemeToggle.jsx';
import LanguageSelector from '../ui/LanguageSelector.jsx';
import { useI18n } from '../../i18n/index.jsx';
import { useAuth } from '../../auth/AuthProvider.jsx';

const LINKS = [
  { to: '/', key: 'home', end: true },
  { to: '/about', key: 'about' },
  { to: '/travel', key: 'travel' },
  { to: '/apply', key: 'apply' },
  { to: '/assistant', key: 'assistant' },
  { to: '/contact', key: 'contact' }
];

/** At or below this viewport width the menu is always collapsed (phones, small tablets). */
const ALWAYS_COMPACT_BELOW = 1180;

export default function Navbar() {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(true); // true = hamburger menu; decided by measurement below
  const barRef = useRef(null);
  const panelRef = useRef(null);
  const neededRef = useRef(0); // bar width at which the full desktop layout last fit
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  async function onSignOut() {
    await signOut();
    navigate('/', { replace: true });
  }

  /*
   * Adaptive collapse. The full desktop bar (logo, six links, auth buttons, language + theme controls) needs
   * a different width in English, Dari and Pashto, signed in or out, with whatever font the visitor has, so a
   * fixed breakpoint cannot be right for all of them. Instead: show the desktop layout, measure whether the
   * link panel overflows, and fall back to the mobile menu only when it does. useLayoutEffect runs before the
   * browser paints, so there is no flash of a broken header.
   */
  const signedIn = Boolean(user);
  const compactRef = useRef(true);
  compactRef.current = compact;

  // Re-test the desktop layout whenever the content width can change (language, sign-in state), and on resize.
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return undefined;
    neededRef.current = 0; // forget the remembered width: the labels may now be shorter or longer
    const measure = () => {
      const panel = panelRef.current;
      if (!panel) return;
      if (window.innerWidth <= ALWAYS_COMPACT_BELOW) { setCompact(true); return; }
      if (!compactRef.current) {
        // Desktop layout is showing: does the link panel overflow its box?
        const overflow = panel.scrollWidth - panel.clientWidth;
        if (overflow > 1) { neededRef.current = bar.clientWidth + overflow; setCompact(true); }
        else neededRef.current = 0;
        return;
      }
      // Collapsed: stay collapsed only while the width that was missing is still missing; otherwise try desktop.
      if (neededRef.current > 0 && bar.clientWidth < neededRef.current + 4) return;
      setCompact(false); // the layout effect below verifies that it really fits, before anything is painted
    };
    measure();
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    ro?.observe(bar);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [locale, signedIn]);

  // Just switched to the desktop layout: confirm it fits; if not, go straight back (same frame, no flash).
  useLayoutEffect(() => {
    if (compact) return;
    const bar = barRef.current;
    const panel = panelRef.current;
    if (!bar || !panel) return;
    const overflow = panel.scrollWidth - panel.clientWidth;
    if (overflow > 1) {
      neededRef.current = bar.clientWidth + overflow;
      setCompact(true);
    } else {
      neededRef.current = 0;
    }
  }, [compact, locale, signedIn]);

  // Leaving compact mode closes the (now irrelevant) mobile panel.
  useEffect(() => { if (!compact) setOpen(false); }, [compact]);

  // Close the mobile menu after navigating.
  useEffect(() => setOpen(false), [pathname]);

  // Escape closes the menu.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="site-header" data-compact={compact}>
      <div className="container nav-bar" ref={barRef}>
        <Logo />
        <nav id="primary-nav" className="nav-panel" data-open={open} aria-label={t('nav.label')} ref={panelRef}>
          <ul className="nav-links">
            {LINKS.map((l) => (
              <li key={l.key}>
                <NavLink to={l.to} end={l.end} className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>
                  {t(`nav.${l.key}`)}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="nav-auth">
            {user ? (
              <>
                <Button to="/dashboard" variant="ghost" size="sm">{t('nav.dashboard')}</Button>
                <Button variant="primary" size="sm" onClick={onSignOut}>{t('nav.logout')}</Button>
              </>
            ) : (
              <>
                <Button to="/login" variant="ghost" size="sm">{t('nav.login')}</Button>
                <Button to="/register" variant="primary" size="sm">{t('nav.register')}</Button>
              </>
            )}
          </div>
        </nav>
        <div className="nav-tools">
          <LanguageSelector />
          <ThemeToggle />
          <button
            type="button"
            className="icon-btn nav-toggle"
            aria-expanded={open}
            aria-controls="primary-nav"
            aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? 'x' : 'menu'} size={22} />
          </button>
        </div>
      </div>
    </header>
  );
}
