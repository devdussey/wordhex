import { useEffect, useState, useCallback } from 'react';
import { History, ArrowLeft, RefreshCw, Users, Clock, Trophy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { useError } from '../contexts/ErrorContext';
import { ErrorSeverity, ErrorType } from '../types/errors';
import { DataTable, Column } from './DataTable';
import type { MatchHistoryEntry } from '../types/api';

interface MatchHistoryProps {
  onBack: () => void;
}

interface MatchRecord {
  matchId: string;
  date: string;
  score: number;
  wordsFound: number;
  rank: number;
  totalPlayers: number;
  status: string;
}

export function MatchHistory({ onBack }: MatchHistoryProps) {
  const { user } = useAuth();
  const { logError } = useError();
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMatchHistory = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await api.stats.matches(user.id, 50);
      const records: MatchRecord[] = response.map((match: MatchHistoryEntry) => {
        const players = match.players ?? [];
        const me = players.find((player) => player.userId === user.id);
        const completedAt = match.completedAt ?? match.updatedAt ?? match.createdAt;
        return {
          matchId:
            match.id ??
            match.matchId ??
            `match-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          date: new Date(completedAt ?? Date.now()).toLocaleString(),
          score: me?.score ?? 0,
          wordsFound: Array.isArray(match.wordsFound)
            ? match.wordsFound.length
            : me?.wordsFound.length ?? 0,
          rank: me?.rank ?? 0,
          totalPlayers: players.length || 1,
          status: match.status ?? 'completed',
        };
      });

      setMatches(records);
    } catch (err) {
      logError(err, ErrorType.NETWORK, ErrorSeverity.MEDIUM, 'Failed to load match history');
      setError('Failed to load match history');
    } finally {
      setLoading(false);
    }
  }, [user, logError]);

  useEffect(() => {
    loadMatchHistory();
  }, [loadMatchHistory]);

  const getRankDisplay = (rank: number, totalPlayers: number) => {
    if (rank === 0) return '-';

    let suffix = 'th';
    if (rank === 1) suffix = 'st';
    else if (rank === 2) suffix = 'nd';
    else if (rank === 3) suffix = 'rd';

    return (
      <span className={rank === 1 ? 'text-yellow-400 font-bold' : ''}>
        {rank}{suffix} / {totalPlayers}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      completed: 'bg-green-600/30 text-green-300 border-green-500',
      active: 'bg-blue-600/30 text-blue-300 border-blue-500',
      waiting: 'bg-yellow-600/30 text-yellow-300 border-yellow-500',
      unknown: 'bg-slate-600/30 text-slate-300 border-slate-500'
    };

    const colorClass = statusColors[status] || statusColors.unknown;

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold border ${colorClass}`}
        aria-label={`Match status: ${status}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const columns: Column<MatchRecord>[] = [
    {
      key: 'date',
      header: 'Date',
      accessor: (row) => row.date,
      sortable: true,
      ariaLabel: 'Match date and time'
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => getStatusBadge(row.status),
      ariaLabel: 'Match status'
    },
    {
      key: 'score',
      header: 'Score',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" aria-hidden="true" />
          <span>{row.score.toLocaleString()}</span>
        </div>
      ),
      sortable: true,
      ariaLabel: 'Player score in match'
    },
    {
      key: 'wordsFound',
      header: 'Words',
      accessor: (row) => row.wordsFound,
      sortable: true,
      ariaLabel: 'Number of words found'
    },
    {
      key: 'rank',
      header: 'Placement',
      accessor: (row) => getRankDisplay(row.rank, row.totalPlayers),
      sortable: true,
      ariaLabel: 'Player placement in match'
    },
    {
      key: 'players',
      header: 'Players',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" aria-hidden="true" />
          <span>{row.totalPlayers}</span>
        </div>
      ),
      sortable: true,
      ariaLabel: 'Total players in match'
    }
  ];

  const getStats = () => {
    const totalMatches = matches.length;
    const wins = matches.filter(m => m.rank === 1).length;
    const avgScore = totalMatches > 0
      ? Math.round(matches.reduce((sum, m) => sum + m.score, 0) / totalMatches)
      : 0;
    const bestScore = totalMatches > 0
      ? Math.max(...matches.map(m => m.score))
      : 0;

    return { totalMatches, wins, avgScore, bestScore };
  };

  const stats = getStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg"
            aria-label="Go back to main menu"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            Back to Menu
          </button>

          <button
            onClick={loadMatchHistory}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg"
            aria-label="Refresh match history"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <History className="w-12 h-12" aria-hidden="true" />
            Match History
          </h1>
          <p className="text-slate-400 text-lg">Your Recent Games</p>
        </div>

        {matches.length > 0 && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl p-6 shadow-lg text-white">
              <div className="flex items-center gap-2 mb-2">
                <History className="w-5 h-5" aria-hidden="true" />
                <span className="text-sm font-semibold uppercase opacity-90">Total Matches</span>
              </div>
              <div className="text-4xl font-bold" aria-label={`${stats.totalMatches} total matches played`}>
                {stats.totalMatches}
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl p-6 shadow-lg text-white">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5" aria-hidden="true" />
                <span className="text-sm font-semibold uppercase opacity-90">Wins</span>
              </div>
              <div className="text-4xl font-bold" aria-label={`${stats.wins} total wins`}>
                {stats.wins}
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 shadow-lg text-white">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5" aria-hidden="true" />
                <span className="text-sm font-semibold uppercase opacity-90">Avg Score</span>
              </div>
              <div className="text-4xl font-bold" aria-label={`${stats.avgScore} average score`}>
                {stats.avgScore.toLocaleString()}
              </div>
            </div>

            <div className="bg-gradient-to-br from-pink-500 to-red-600 rounded-xl p-6 shadow-lg text-white">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5" aria-hidden="true" />
                <span className="text-sm font-semibold uppercase opacity-90">Best Score</span>
              </div>
              <div className="text-4xl font-bold" aria-label={`${stats.bestScore} best score`}>
                {stats.bestScore.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div
            className="bg-red-900/50 border-2 border-red-500 rounded-xl p-4 mb-8 text-red-200"
            role="alert"
            aria-live="polite"
          >
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div
            className="bg-slate-800/50 rounded-xl p-12 text-center"
            role="status"
            aria-live="polite"
          >
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4" aria-hidden="true"></div>
            <p className="text-white text-xl">Loading match history...</p>
          </div>
        ) : (
          <div className="bg-slate-800/50 rounded-xl shadow-2xl overflow-hidden border-2 border-slate-700">
            <DataTable
              data={matches}
              columns={columns}
              caption="Match history showing recent games with scores, placements, and statistics"
              ariaLabel="Player match history"
              ariaDescription="Table displays your recent matches with columns for date, status, score, words found, placement rank, and number of players. Click column headers to sort."
              emptyMessage="No match history available. Start playing to see your matches here!"
              rowKey={(row) => row.matchId}
            />
          </div>
        )}

        {!loading && matches.length > 0 && (
          <div className="mt-8 bg-slate-800/50 rounded-xl p-6 shadow-lg border-2 border-slate-700">
            <h2 className="text-xl font-bold text-white mb-3">Match History Tips</h2>
            <ul className="text-slate-300 space-y-2">
              <li>• Click column headers to sort matches by different criteria</li>
              <li>• First place finishes are highlighted in gold</li>
              <li>• Track your progress over time to identify improvements</li>
              <li>• Recent matches appear at the top by default</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
