import Icon from './Icon.jsx';
import { useTheme } from '../../theme/ThemeProvider.jsx';
import { useI18n } from '../../i18n/index.jsx';

/**
 * Light/dark toggle. A real <button> (keyboard + screen-reader friendly) whose accessible name says what
 * pressing it will do ("Switch to dark theme"); the icon shows the theme you would switch TO.
 */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const label = theme === 'dark' ? t('theme.toLight') : t('theme.toDark');
  return (
    <button type="button" className="icon-btn theme-toggle" onClick={toggleTheme} aria-label={label} title={label} data-theme-now={theme}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
    </button>
  );
}
