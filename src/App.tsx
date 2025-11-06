import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Navigate, Route, Router, Routes } from './lib/router';
import { supabase } from './lib/supabaseClient';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Leaderboard } from './pages/Leaderboard';
import { Game } from './pages/Game';

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
      setLoading(false);
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950">
        <div className="flex flex-col items-center gap-4 text-purple-100">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-400 border-t-transparent" />
          <p>Connecting to Supabase…</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      {session && <Navbar user={session.user} onSignOut={() => void handleSignOut()} />}
      <Routes>
        <Route path="/login" element={<Login session={session} />} />
        <Route
          path="/"
          element={
            <ProtectedRoute session={session}>{(activeSession) => <Dashboard session={activeSession} />}</ProtectedRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute session={session}>{(activeSession) => <Leaderboard session={activeSession} />}</ProtectedRoute>
          }
        />
        <Route
          path="/game"
          element={<ProtectedRoute session={session}>{(activeSession) => <Game session={activeSession} />}</ProtectedRoute>}
        />
        <Route path="*" element={<Navigate to={session ? '/' : '/login'} replace />} />
      </Routes>
    </Router>
  );
}
