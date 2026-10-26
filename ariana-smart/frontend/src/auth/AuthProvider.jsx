import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, authMode } from '../lib/supabase.js';
import { mapAuthError } from '../lib/authErrors.js';
import { cleanFullName, normalizeEmail } from '../lib/validation.js';

const AuthContext = createContext(null);
const NOT_CONFIGURED = { code: 'not_configured', message: 'Supabase is not configured' };

/** Every action resolves to { ok, error } where error is an i18n code (auth.errors.*). */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [recovery, setRecovery] = useState(false);

  const loadProfile = useCallback(async (user) => {
    if (!supabase || !user) { setProfile(null); return; }
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    setProfile(data || null); // null is handled: UI falls back to signup metadata
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      loadProfile(data.session?.user).finally(() => active && setLoading(false));
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') { setProfile(null); setRecovery(false); }
      // Defer: calling Supabase inside this callback can deadlock the client.
      if (next?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) setTimeout(() => loadProfile(next.user), 0);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [loadProfile]);

  const run = useCallback(async (fn) => {
    if (!supabase) return { ok: false, error: 'notConfigured' };
    try {
      const res = await fn();
      if (res.error) return { ok: false, error: mapAuthError(res.error) };
      return { ok: true, data: res.data };
    } catch (e) {
      return { ok: false, error: mapAuthError(e) };
    }
  }, []);

  const actions = useMemo(() => ({
    signUp: ({ email, password, fullName }) =>
      run(async () => {
        const res = await supabase.auth.signUp({
          email: normalizeEmail(email),
          password,
          options: { data: { full_name: cleanFullName(fullName) }, emailRedirectTo: `${window.location.origin}/login` }
        });
        if (!res.error) res.data = { needsConfirmation: !res.data?.session };
        return res;
      }),
    signIn: ({ email, password }) => run(() => supabase.auth.signInWithPassword({ email: normalizeEmail(email), password })),
    signOut: () => run(() => supabase.auth.signOut()),
    requestPasswordReset: (email) =>
      run(() => supabase.auth.resetPasswordForEmail(normalizeEmail(email), { redirectTo: `${window.location.origin}/reset-password` })),
    updatePassword: (password) => run(async () => {
      const res = await supabase.auth.updateUser({ password });
      if (!res.error) setRecovery(false);
      return res;
    }),
    updateProfile: (patch) => run(async () => {
      const res = await supabase.from('profiles').update(patch).eq('id', session.user.id).select().maybeSingle();
      if (!res.error && res.data) setProfile(res.data);
      if (!res.error && !res.data) return { data: null, error: { code: 'generic', message: 'Profile row not found' } };
      return res;
    })
  }), [run, session]);

  const value = useMemo(() => ({
    mode: authMode,
    configured: Boolean(supabase),
    session,
    user: session?.user ?? null,
    profile,
    loading,
    recovery,
    ...actions
  }), [session, profile, loading, recovery, actions]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
export { NOT_CONFIGURED };
