import React from "react";
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Navigate, Route, Router, Routes, supabase, discordLogger } from './lib';
import { Navbar, ProtectedRoute, ErrorBoundary } from './components';
import { Login, Dashboard, Leaderboard, Game, OAuthDebug } from './pages';

function OAuthCallback() {
  useEffect(() => {
    // Supabase automatically processes OAuth callback from URL
    // Just wait for auth state to update and redirect
    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        window.location.href = '/';
      } else {
        window.location.href = '/login';
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950">
      <div className="flex flex-col items-center gap-4 text-purple-100">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-400 border-t-transparent" />
        <p>Completing sign in...</p>
      </div>
    </main>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      discordLogger.info(`Auth event: ${event}`, {
        source: "Supabase",
        user: session?.user?.email ?? "guest",
      });
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
    } catch (error) {
      discordLogger.error('Sign out failed', error as Error, { context: 'App' });
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950">
        <div className="flex flex-col items-center gap-4 text-purple-100">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-400 border-t-transparent" />
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <ErrorBoundary context="App">
      <Router>
        {session && <Navbar user={session.user} onSignOut={() => void handleSignOut()} />}
        <Routes>
          <Route path="/callback" element={<OAuthCallback />} />
          <Route path="/login" element={<Login session={session} />} />
          <Route
            path="/"
            element={
              <ErrorBoundary context="Dashboard">
                <ProtectedRoute session={session}>{(activeSession: Session) => <Dashboard session={activeSession} />}</ProtectedRoute>
              </ErrorBoundary>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ErrorBoundary context="Leaderboard">
                <ProtectedRoute session={session}>{(activeSession: Session) => <Leaderboard session={activeSession} />}</ProtectedRoute>
              </ErrorBoundary>
            }
          />
          <Route
            path="/game"
            element={
              <ErrorBoundary context="Game">
                <ProtectedRoute session={session}>{(activeSession: Session) => <Game session={activeSession} />}</ProtectedRoute>
              </ErrorBoundary>
            }
          />
          <Route path="/debug" element={<OAuthDebug />} />
          <Route path="*" element={<Navigate to={session ? '/' : '/login'} replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
