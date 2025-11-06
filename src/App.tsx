import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Analytics } from '@vercel/analytics/react';
import { Router, Routes, Route, Navigate, useNavigate } from './lib/router';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Leaderboard } from './pages/Leaderboard';
import { Game } from './pages/Game';
import { PracticeArena } from './pages/Practice';
import { supabase } from './lib/supabaseClient';
import { ErrorNotification, OfflineBanner } from './components/ErrorNotification';
import { useError } from './contexts/ErrorContext';
import { useNetworkStatus } from './hooks/useNetworkStatus';

function PracticeRoute() {
  const navigate = useNavigate();
  return <PracticeArena onExit={() => navigate('/game')} />;
}

function useSupabaseSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (isMounted) {
        setSession(data.session ?? null);
        setLoading(false);
      }
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return useMemo(() => ({ session, loading }), [session, loading]);
}

function App() {
  const { currentError, clearError } = useError();
  const networkStatus = useNetworkStatus();
  const { session, loading } = useSupabaseSession();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login session={session} />} />
        <Route
          path="/"
          element={
            <ProtectedRoute session={session} loading={loading}>
              {(activeSession) => (
                <>
                  <Navbar user={activeSession.user} onSignOut={handleSignOut} />
                  <Dashboard session={activeSession} />
                </>
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute session={session} loading={loading}>
              {(activeSession) => (
                <>
                  <Navbar user={activeSession.user} onSignOut={handleSignOut} />
                  <Leaderboard session={activeSession} />
                </>
              )}
            </ProtectedRoute>
          }
        />
        <Route path="/practice" element={<PracticeRoute />} />
        <Route path="/game" element={<Game />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ErrorNotification error={currentError} onDismiss={clearError} />
      <OfflineBanner show={!networkStatus.online} />
      <Analytics />
    </Router>
  );
}

export default App;

