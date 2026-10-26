import Badge from './Badge.jsx';
import { useI18n } from '../../i18n/index.jsx';

const TONES = {
  draft: 'neutral',
  submitted: 'info',
  under_review: 'info',
  documents_required: 'warn',
  approved_demo: 'ok',
  rejected: 'bad',
  cancelled: 'neutral'
};

/** Renders an application status. Later stages pass the status value stored in the database. */
export default function StatusBadge({ status }) {
  const { t } = useI18n();
  return <Badge tone={TONES[status] ?? 'neutral'}>{t(`status.${status}.label`)}</Badge>;
}
