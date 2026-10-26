export default function Badge({ tone = 'info', children, className = '' }) {
  return <span className={`badge badge-${tone} ${className}`.trim()}>{children}</span>;
}
