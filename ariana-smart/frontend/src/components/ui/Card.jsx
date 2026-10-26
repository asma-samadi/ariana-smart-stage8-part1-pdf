import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

export default function Card({ icon, title, to, badge, linkLabel, className = '', children }) {
  const body = (
    <>
      {icon && (
        <span className="icon-chip">
          <Icon name={icon} size={22} />
        </span>
      )}
      <h3>
        {title} {badge}
      </h3>
      {children && <p>{children}</p>}
      {to && linkLabel && (
        <span className="card-more">
          {linkLabel} <Icon name="arrow" size={16} flip />
        </span>
      )}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={`card card-link ${className}`.trim()}>
        {body}
      </Link>
    );
  }
  return <div className={`card ${className}`.trim()}>{body}</div>;
}
