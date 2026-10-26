import Badge from './Badge.jsx';
import Icon from './Icon.jsx';
import Ltr from './Ltr.jsx';
import { useI18n } from '../../i18n/index.jsx';

/** A fictional sample route. Always shows the "Fictional sample" tag. */
export default function RouteCard({ route }) {
  const { t, format } = useI18n();
  return (
    <article className="card route-card">
      <div className="route-top">
        <Badge tone="warn">{t('common.fictional')}</Badge>
        <Ltr className="route-code">{route.code}</Ltr>
      </div>
      <div className="route-line">
        <div className="route-end">
          <Ltr className="route-iata">{route.from}</Ltr>
          <span className="route-city">{t(`airports.${route.from}.city`)}</span>
        </div>
        <div className="route-path" aria-hidden="true">
          <span className="route-dash" />
          <Icon name="plane" size={22} flip />
          <span className="route-dash" />
        </div>
        <div className="route-end route-end-to">
          <Ltr className="route-iata">{route.to}</Ltr>
          <span className="route-city">{t(`airports.${route.to}.city`)}</span>
        </div>
      </div>
      <dl className="route-meta">
        <div><dt><Icon name="clock" size={15} /> {t('routes.duration')}</dt><dd>{format.duration(route.minutes)}</dd></div>
        <div><dt><Icon name="pin" size={15} /> {t('routes.frequency')}</dt><dd>{t(`routes.freq.${route.frequency}`)}</dd></div>
      </dl>
    </article>
  );
}
