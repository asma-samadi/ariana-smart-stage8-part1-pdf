import Icon from './Icon.jsx';
import Ltr from './Ltr.jsx';
import { useI18n } from '../../i18n/index.jsx';

/**
 * "KBL → DXB" that stays correct in both directions. The old text arrow (U+2192) never mirrors, so in an
 * RTL row it pointed from the destination back to the origin. Here each airport code is an isolated LTR
 * run and the arrow is an icon that mirrors with the page direction (origin on the reading-start side,
 * arrow pointing toward the destination). Screen readers hear "KBL <to> DXB".
 */
export default function RoutePair({ from, to, className = '' }) {
  const { t } = useI18n();
  return (
    <span className={`route-pair ${className}`.trim()}>
      <Ltr>{from}</Ltr>
      <Icon name="arrow" size={14} flip />
      <span className="visually-hidden">{t('explorer.to')}</span>
      <Ltr>{to}</Ltr>
    </span>
  );
}
