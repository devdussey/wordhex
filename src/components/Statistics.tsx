import { useEffect, useState } from 'react';
import { Trophy, Target, Zap, TrendingUp, ArrowLeft, Flame, Award, Percent } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { useError } from '../contexts/ErrorContext';
import { ErrorSeverity, ErrorType } from '../types/errors';

interface StatisticsProps {
  onBack: () => void;
}

interface PlayerStats {
  totalGames: number;
  highScore: number;
  totalWords: number;
  totalGems: number;
  averageScore: number;
  totalWins: number;
  winStreak: number;
  bestWinStreak: number;
  winRate: number;
}

export function Statistics({ onBack }: StatisticsProps) {
  const { user } = useAuth();
  const { logError } = useError();
  const [stats, setStats] = useState<PlayerStats>({
    totalGames: 0,
    highScore: 0,
    totalWords: 0,
    totalGems: 0,
    averageScore: 0,
    totalWins: 0,
    winStreak: 0,
    bestWinStreak: 0,
    winRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const response = await api.stats.player(user.id);
        const totalMatches = response.totalMatches;
        const totalWins = response.totalWins;
        const totalScore = response.totalScore;
        const totalWords = response.totalWords;
        const bestScore = response.bestScore;
        const winStreak = response.winStreak;
        const bestWinStreak = response.bestWinStreak;
        const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;

        setStats({
          totalGames: totalMatches,
          highScore: bestScore,
          totalWords,
          totalGems: response.gems,
          averageScore: totalMatches > 0 ? Math.round(totalScore / totalMatches) : 0,
          totalWins,
          winStreak,
          bestWinStreak,
          winRate,
        });
      } catch (error) {
        logError(error, ErrorType.NETWORK, ErrorSeverity.MEDIUM, 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [user, logError]);

  const statCards = [
    {
      label: 'High Score',
      value: stats.highScore.toLocaleString(),
      icon: Trophy,
      gradient: 'from-yellow-500 to-orange-600',
      ariaLabel: `High score: ${stats.highScore}`
    },
    {
      label: 'Total Games',
      value: stats.totalGames,
      icon: Target,
      gradient: 'from-blue-500 to-cyan-600',
      ariaLabel: `Total games played: ${stats.totalGames}`
    },
    {
      label: 'Total Wins',
      value: stats.totalWins,
      icon: Award,
      gradient: 'from-green-500 to-emerald-600',
      ariaLabel: `Total wins: ${stats.totalWins}`
    },
    {
      label: 'Win Rate',
      value: `${stats.winRate.toFixed(1)}%`,
      icon: Percent,
      gradient: 'from-teal-500 to-cyan-600',
      ariaLabel: `Win rate: ${stats.winRate.toFixed(1)} percent`
    },
    {
      label: 'Total Words',
      value: stats.totalWords.toLocaleString(),
      icon: Zap,
      gradient: 'from-pink-500 to-rose-600',
      ariaLabel: `Total words found: ${stats.totalWords}`
    },
    {
      label: 'Win Streak',
      value: stats.winStreak,
      icon: Flame,
      gradient: 'from-orange-500 to-red-600',
      ariaLabel: `Current win streak: ${stats.winStreak}`
    },
    {
      label: 'Best Streak',
      value: stats.bestWinStreak,
      icon: TrendingUp,
      gradient: 'from-violet-500 to-purple-600',
      ariaLabel: `Best win streak: ${stats.bestWinStreak}`
    },
    {
      label: 'Average Score',
      value: stats.averageScore.toLocaleString(),
      icon: Target,
      gradient: 'from-blue-500 to-indigo-600',
      ariaLabel: `Average score: ${stats.averageScore}`
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={onBack}
          className="mb-8 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg"
          aria-label="Go back to main menu"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          Back to Menu
        </button>

        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">Statistics</h1>
          <p className="text-slate-400 text-lg">Your Game Performance</p>
        </div>

        {loading ? (
          <div
            className="bg-slate-800/50 rounded-xl p-12 text-center"
            role="status"
            aria-live="polite"
          >
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4" aria-hidden="true"></div>
            <p className="text-white text-xl">Loading statistics...</p>
          </div>
        ) : (
          <>
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
              role="region"
              aria-label="Player statistics summary"
            >
              {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <article
                    key={stat.label}
                    className={`bg-gradient-to-br ${stat.gradient} rounded-xl p-6 shadow-lg text-white`}
                    aria-label={stat.ariaLabel}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-5 h-5" aria-hidden="true" />
                      <span className="text-sm font-semibold uppercase opacity-90">{stat.label}</span>
                    </div>
                    <div className="text-4xl font-bold" aria-hidden="true">{stat.value}</div>
                  </article>
                );
              })}
            </div>

            {stats.totalGames === 0 && (
              <div className="bg-slate-800/50 rounded-xl p-8 text-center border-2 border-slate-700">
                <p className="text-slate-300 text-lg mb-4">No statistics yet!</p>
                <p className="text-slate-400">Start playing matches to see your performance statistics here.</p>
              </div>
            )}

            {stats.totalGames > 0 && (
              <div className="bg-slate-800/50 rounded-xl p-6 shadow-lg border-2 border-slate-700">
                <h2 className="text-xl font-bold text-white mb-4">Performance Insights</h2>
                <div className="space-y-3 text-slate-300">
                  <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <span>Games per Win</span>
                    <span className="font-bold text-white">
                      {stats.totalWins > 0 ? (stats.totalGames / stats.totalWins).toFixed(1) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <span>Total Score</span>
                    <span className="font-bold text-white">
                      {(stats.averageScore * stats.totalGames).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <span>Words per Game</span>
                    <span className="font-bold text-white">
                      {(stats.totalWords / stats.totalGames).toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
