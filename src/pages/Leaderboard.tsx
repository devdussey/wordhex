import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

type LeaderboardEntry = {
  id: string;
  username: string;
  wins: number;
  losses: number;
  rating: number;
};

type LeaderboardProps = {
  session: Session;
};

export function Leaderboard({ session }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadLeaderboard = async () => {
      setLoading(true);
      setErrorMessage(null);
      const { data, error } = await supabase
        .from('leaderboard')
        .select('id, username, wins, losses, rating')
        .order('rating', { ascending: false })
        .limit(50);

      if (!isMounted) {
        return;
      }

      if (error) {
        console.info('[Leaderboard] Could not load leaderboard table:', error.message);
        setErrorMessage('Leaderboard data is not available yet. Set up your Supabase table to view player rankings.');
      } else if (data) {
        setEntries(data as LeaderboardEntry[]);
      }

      setLoading(false);
    };

    void loadLeaderboard();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-fuchsia-950 pb-16">
      <div className="mx-auto max-w-4xl px-6 py-12 text-purple-100">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-white">Global Leaderboard</h1>
          <p className="mt-3 text-purple-300">
            Track the best players across all WordHex sessions. Rankings are powered directly by your Supabase data.
          </p>
        </header>

        {loading ? (
          <div className="flex h-40 items-center justify-center rounded-3xl border border-purple-900/60 bg-purple-950/40">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-400 border-t-transparent" />
            <span className="ml-4 text-purple-200">Loading leaderboard…</span>
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-center text-amber-100">
            {errorMessage}
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-purple-900/60 bg-purple-950/40 p-6 text-center text-purple-200">
            No leaderboard entries yet. Once players start competing, rankings will appear automatically.
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-purple-900/60 bg-purple-950/60 shadow-lg">
            <table className="min-w-full divide-y divide-purple-900/60">
              <thead className="bg-purple-950/80 text-left text-xs uppercase tracking-[0.3em] text-purple-300">
                <tr>
                  <th className="px-6 py-4">Rank</th>
                  <th className="px-6 py-4">Player</th>
                  <th className="px-6 py-4 text-right">Wins</th>
                  <th className="px-6 py-4 text-right">Losses</th>
                  <th className="px-6 py-4 text-right">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/60 text-sm text-purple-100">
                {entries.map((entry, index) => {
                  const isCurrentUser = entry.id === session.user.id;
                  return (
                    <tr
                      key={entry.id}
                      className={isCurrentUser ? 'bg-purple-900/60 font-semibold text-white' : 'hover:bg-purple-900/30'}
                    >
                      <td className="px-6 py-4">#{index + 1}</td>
                      <td className="px-6 py-4">{entry.username}</td>
                      <td className="px-6 py-4 text-right">{entry.wins}</td>
                      <td className="px-6 py-4 text-right">{entry.losses}</td>
                      <td className="px-6 py-4 text-right">{Math.round(entry.rating)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
