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
