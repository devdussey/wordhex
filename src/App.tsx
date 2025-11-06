import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";
import Dashboard from "./pages/Dashboard";
import Game from "./pages/Game";
import Leaderboard from "./pages/Leaderboard";
import Login from "./pages/Login";
import type { AuthSession, LocalSession, PlayerStats } from "./types";

const LOCAL_SESSION_KEY = "wordhex:local-session";
const STATS_STORAGE_KEY = "wordhex:stats";

const DEFAULT_STATS: PlayerStats = {
  gamesPlayed: 0,
  totalScore: 0,
  bestScore: 0,
  totalWordsFound: 0,
  recentWords: [],
};

function loadStats(): PlayerStats {
  if (typeof window === "undefined") {
    return DEFAULT_STATS;
  }

  try {
    const raw = window.localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_STATS;
    }
    const parsed = JSON.parse(raw) as PlayerStats;
    return {
      ...DEFAULT_STATS,
      ...parsed,
      recentWords: Array.isArray(parsed.recentWords) ? parsed.recentWords : [],
    };
  } catch (error) {
    console.error("Unable to parse stored stats", error);
    return DEFAULT_STATS;
  }
}

function loadLocalSession(): LocalSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_SESSION_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as LocalSession;
    return parsed;
  } catch (error) {
    console.error("Unable to parse stored session", error);
    return null;
  }
}

function randomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

function createDemoSession(): LocalSession {
  const demoNames = [
    "Hex Adventurer",
    "Puzzle Voyager",
    "Letter Whisperer",
    "Grid Master",
  ];
  const username = demoNames[Math.floor(Math.random() * demoNames.length)];
  return {
    id: randomId(),
    created_at: new Date().toISOString(),
    provider: "demo",
    user: {
      id: randomId(),
      username,
      email: undefined,
      avatar_url: `https://avatar.vercel.sh/${encodeURIComponent(username)}`,
    },
  };
}

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [stats, setStats] = useState<PlayerStats>(() => loadStats());
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (!supabase) {
      const local = loadLocalSession();
      if (isMounted) {
        setSession(local);
        setLoadingSession(false);
      }

      const sync = (event: StorageEvent) => {
        if (event.key === LOCAL_SESSION_KEY) {
          setSession(loadLocalSession());
        }
        if (event.key === STATS_STORAGE_KEY) {
          setStats(loadStats());
        }
      };

      window.addEventListener("storage", sync);
      return () => {
        isMounted = false;
        window.removeEventListener("storage", sync);
      };
    }

    supabase
      .auth.getSession()
      .then(({ data }) => {
        if (!isMounted) {
          return;
        }
        setSession(data.session);
        setLoadingSession(false);
      })
      .catch((error) => {
        console.error("Failed to fetch Supabase session", error);
        setLoadingSession(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  }, [stats]);

  const handleSignIn = useCallback(async () => {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
      return;
    }

    const demoSession = createDemoSession();
    window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(demoSession));
    setSession(demoSession);
  }, []);

  const handleSignOut = useCallback(async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Failed to sign out", error);
      }
    }

    window.localStorage.removeItem(LOCAL_SESSION_KEY);
    setSession(null);
  }, []);

  const handleStatsChange = useCallback((next: PlayerStats) => {
    setStats(next);
  }, []);

  const appShell = useMemo(
    () => (
      <Routes>
        <Route
          path="/login"
          element={
            <Login
              loading={loadingSession}
              session={session}
              supabaseReady={isSupabaseConfigured}
              onSignIn={handleSignIn}
            />
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute loading={loadingSession} session={session}>
              {session ? <Dashboard session={session} stats={stats} /> : null}
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute loading={loadingSession} session={session}>
              {session ? <Leaderboard session={session} stats={stats} /> : null}
            </ProtectedRoute>
          }
        />
        <Route
          path="/game"
          element={
            <ProtectedRoute loading={loadingSession} session={session}>
              {session ? (
                <Game session={session} stats={stats} onStatsChange={handleStatsChange} />
              ) : null}
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={<Navigate to={session ? "/dashboard" : "/login"} replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    ),
    [handleSignIn, handleStatsChange, loadingSession, session, stats],
  );

  return (
    <BrowserRouter>
      {session ? <Navbar session={session} onSignOut={handleSignOut} /> : null}
      {appShell}
    </BrowserRouter>
  );
}
