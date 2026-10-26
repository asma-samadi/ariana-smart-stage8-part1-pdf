import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

/**
 * Button / link button.
 *  - `to`: internal navigation (renders a router <Link>)
 *  - otherwise a real <button>; `disabled` makes it inert (use for features that do not exist yet).
 */
export default function Button({
  to,
  variant = 'primary',
  size = 'md',
  icon,
  iconEnd,
  iconFlip = false,
  disabled = false,
  className = '',
  children,
  ...rest
}) {
  const cls = `btn btn-${variant} ${size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : ''} ${className}`.trim();
  const content = (
    <>
      {icon && <Icon name={icon} size={18} />}
      <span>{children}</span>
      {iconEnd && <Icon name={iconEnd} size={18} flip={iconFlip} />}
    </>
  );
  if (to && !disabled) {
    return (
      <Link to={to} className={cls} {...rest}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} disabled={disabled} {...rest}>
      {content}
    </button>
  );
}
