import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

type PlayerStats = {
  wins: number;
  losses: number;
  total_games: number;
  best_streak: number;
};

type RecentMatch = {
  id: string;
  created_at: string;
  opponent: string;
  result: 'win' | 'loss' | 'draw';
  score: number | null;
};

type DashboardProps = {
  session: Session;
};

export function Dashboard({ session }: DashboardProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      setLoading(true);
      setErrorMessage(null);

      const { data: statsData, error: statsError } = await supabase
        .from('player_stats')
        .select('wins, losses, total_games, best_streak')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (statsError) {
        console.info('[Dashboard] Could not load player_stats table:', statsError.message);
        setErrorMessage('We could not load your latest stats yet. Once your database tables are ready, they will appear here.');
      } else if (statsData) {
        setStats(statsData);
      } else {
        setStats(null);
      }

      const { data: matchData, error: matchError } = await supabase
        .from('match_history')
        .select('id, created_at, opponent, result, score')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!isMounted) {
        return;
      }

      if (matchError) {
        console.info('[Dashboard] Could not load match_history table:', matchError.message);
      } else if (matchData) {
        setRecentMatches(matchData as RecentMatch[]);
      }

      setLoading(false);
    };

    void loadStats();

    return () => {
      isMounted = false;
    };
  }, [session.user.id]);

  const displayName =
    session.user.user_metadata?.name ||
    session.user.user_metadata?.full_name ||
    session.user.user_metadata?.preferred_username ||
    session.user.email ||
    session.user.id;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-fuchsia-950 pb-16">
      <div className="mx-auto max-w-6xl px-6 py-12 text-purple-100">
        <header className="mb-10">
          <p className="text-sm uppercase tracking-[0.4em] text-purple-300">Welcome back</p>
          <h1 className="mt-2 text-4xl font-bold text-white">{displayName}</h1>
          <p className="mt-2 text-purple-200/80">
            Keep track of your latest progress, personal bests, and recent games.
          </p>
        </header>

        {loading ? (
          <div className="flex h-40 items-center justify-center rounded-3xl border border-purple-900/60 bg-purple-950/40">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-400 border-t-transparent" />
            <span className="ml-4 text-purple-200">Loading your player dashboard…</span>
          </div>
        ) : (
          <>
            {errorMessage && (
              <div className="mb-8 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-amber-100">
                {errorMessage}
              </div>
            )}

            <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <article className="rounded-2xl border border-purple-800/70 bg-purple-950/60 p-6 shadow-lg">
                <h2 className="text-sm uppercase tracking-widest text-purple-300">Wins</h2>
                <p className="mt-2 text-3xl font-semibold text-white">{stats?.wins ?? 0}</p>
              </article>
              <article className="rounded-2xl border border-purple-800/70 bg-purple-950/60 p-6 shadow-lg">
                <h2 className="text-sm uppercase tracking-widest text-purple-300">Losses</h2>
                <p className="mt-2 text-3xl font-semibold text-white">{stats?.losses ?? 0}</p>
              </article>
              <article className="rounded-2xl border border-purple-800/70 bg-purple-950/60 p-6 shadow-lg">
                <h2 className="text-sm uppercase tracking-widest text-purple-300">Total games</h2>
                <p className="mt-2 text-3xl font-semibold text-white">{stats?.total_games ?? 0}</p>
              </article>
              <article className="rounded-2xl border border-purple-800/70 bg-purple-950/60 p-6 shadow-lg">
                <h2 className="text-sm uppercase tracking-widest text-purple-300">Best streak</h2>
                <p className="mt-2 text-3xl font-semibold text-white">{stats?.best_streak ?? 0}</p>
              </article>
            </section>

            <section className="mt-12 rounded-3xl border border-purple-900/60 bg-purple-950/50 p-8 shadow-lg">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Recent games</h2>
                  <p className="text-sm text-purple-300">Your five latest matches pulled from Supabase.</p>
                </div>
              </div>

              {recentMatches.length === 0 ? (
                <p className="mt-6 text-purple-300">
                  No recent matches yet. Play a few games and your history will show up automatically.
                </p>
              ) : (
                <div className="mt-6 divide-y divide-purple-900/60">
                  {recentMatches.map((match) => (
                    <article key={match.id} className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-lg font-medium text-white">{match.opponent}</p>
                        <p className="text-sm text-purple-300">
                          {new Date(match.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-6">
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-semibold uppercase tracking-widest ${
                            match.result === 'win'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : match.result === 'loss'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-sky-500/20 text-sky-300'
                          }`}
                        >
                          {match.result}
                        </span>
                        <span className="text-sm text-purple-200">{match.score ?? '—'}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
