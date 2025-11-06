import { useEffect, useState } from 'react';
import { Trophy, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { useError } from '../contexts/ErrorContext';
import { ErrorSeverity, ErrorType } from '../types/errors';
import type { LeaderboardEntry as ApiLeaderboardEntry } from '../types/api';

interface LeaderboardEntry {
  userId: string;
  username: string;
  totalScore: number;
  totalMatches: number;
  totalWins: number;
}

interface LeaderboardProps {
  onBack: () => void;
}

export function Leaderboard({ onBack }: LeaderboardProps) {
  const { user } = useAuth();
  const { logError } = useError();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true);
      try {
        const data = await api.stats.leaderboard(20);
        setEntries(
          data.map((entry: ApiLeaderboardEntry) => ({
            userId: entry.userId,
            username: entry.username,
            totalScore: entry.totalScore,
            totalMatches: entry.totalMatches,
            totalWins: entry.totalWins,
          }))
        );
      } catch (error) {
        logError(error, ErrorType.NETWORK, ErrorSeverity.MEDIUM, 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };
    loadLeaderboard();
  }, [logError]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Menu
          </button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">Leaderboard</h1>
          <p className="text-slate-400 text-lg">Top Players by Total Score</p>
        </div>

        <div className="bg-slate-800/50 rounded-xl border-2 border-slate-700 overflow-hidden">
          <div className="bg-slate-900/70 px-6 py-4 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-white text-lg font-semibold">WordHex Champions</p>
              <p className="text-slate-400 text-sm">Climb the ranks by winning matches and scoring big.</p>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-white">Loading leaderboard...</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-slate-300">
              No entries yet. Play matches to compete for the top spot!
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-900/80 text-slate-300 text-sm uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-3">Rank</th>
                  <th className="px-6 py-3">Player</th>
                  <th className="px-6 py-3">Total Score</th>
                  <th className="px-6 py-3">Matches</th>
                  <th className="px-6 py-3">Wins</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr
                    key={entry.userId}
                    className={`border-t border-slate-800 ${
                      user?.id === entry.userId ? 'bg-slate-800/40' : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="px-6 py-4 text-white font-semibold">{index + 1}</td>
                    <td className="px-6 py-4 text-slate-200">{entry.username}</td>
                    <td className="px-6 py-4 text-white font-semibold">{entry.totalScore.toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-300">{entry.totalMatches}</td>
                    <td className="px-6 py-4 text-slate-300">{entry.totalWins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {user && (
          <div className="mt-8 bg-slate-800/50 rounded-xl p-6 shadow-lg border-2 border-slate-700">
            <h2 className="text-xl font-bold text-white mb-3">Your Stats</h2>
            <div className="text-slate-300 space-y-2">
              <p>Username: {user.username}</p>
              <p>Coins: {user.coins}</p>
              <p>Gems: {user.gems}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
