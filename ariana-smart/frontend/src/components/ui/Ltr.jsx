/**
 * Isolates text that must always read left-to-right (e-mail addresses, application references, route and
 * airport codes, file names, ASCII identifiers) so that it keeps its own order and never scrambles the
 * surrounding Dari/Pashto sentence. Uses <bdi dir="ltr">: the browser treats it as an isolated LTR run.
 * In English (LTR) it changes nothing visible.
 */
export default function Ltr({ children, className = '', ...rest }) {
  return (
    <bdi dir="ltr" className={`ltr-isolate ${className}`.trim()} {...rest}>
      {children}
    </bdi>
  );
}
