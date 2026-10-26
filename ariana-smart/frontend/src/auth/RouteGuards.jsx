import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider.jsx';
import { useI18n } from '../i18n/index.jsx';

function Loading() {
  const { t } = useI18n();
  return (
    <div className="container auth-loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" /> {t('auth.loading')}
    </div>
  );
}

/** Client-side convenience only. Real protection is Supabase RLS + backend JWT checks. */
export function ProtectedRoute({ children }) {
  const { user, loading, configured } = useAuth();
  const location = useLocation();
  if (!configured) return <Navigate to="/login" replace />;
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

/** Login/Register: signed-in users go straight to the dashboard. */
export function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}
