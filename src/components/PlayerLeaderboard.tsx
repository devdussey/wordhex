import { Trophy, UserX } from 'lucide-react';

interface Player {
  id: string;
  username: string;
  avatar?: string;
  score: number;
}

interface PlayerLeaderboardProps {
  players: Player[];
  isHost?: boolean;
  localUserId?: string;
  onRemovePlayer?: (playerId: string) => void;
  removingPlayerId?: string | null;
}

export function PlayerLeaderboard({
  players,
  isHost = false,
  localUserId,
  onRemovePlayer,
  removingPlayerId,
}: PlayerLeaderboardProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="bg-purple-900/30 rounded-xl p-6 shadow-lg border-2 border-purple-700/50">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-6 h-6 text-yellow-400" />
        <h3 className="text-xl font-bold text-white">Wordhexers</h3>
      </div>

      <div className="space-y-3">
        {sortedPlayers.map((player, index) => (
          <div
            key={player.id}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all justify-between ${
              index === 0
                ? 'bg-gradient-to-r from-yellow-600/30 to-yellow-700/30 border-2 border-yellow-500/50'
                : 'bg-purple-800/30 border-2 border-purple-600/30'
            }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {player.avatar ? (
                <img
                  src={player.avatar}
                  alt={player.username}
                  className="w-10 h-10 rounded-full border-2 border-purple-400"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold border-2 border-purple-400">
                  {player.username[0].toUpperCase()}
                </div>
              )}
              <span className="text-white font-semibold truncate flex-1">
                {player.username}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className={`text-2xl font-bold ${
                  index === 0 ? 'text-yellow-400' : 'text-purple-300'
                }`}>
                  {player.score}
                </span>
                <span className="text-purple-400 text-sm ml-1">pts</span>
              </div>
              {isHost && onRemovePlayer && player.id !== localUserId && (
                <button
                  type="button"
                  onClick={() => onRemovePlayer(player.id)}
                  disabled={removingPlayerId === player.id}
                  className="p-2 rounded-lg bg-red-900/40 hover:bg-red-800/60 text-red-200 border border-red-500/40 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label={`Remove ${player.username}`}
                  title={`Remove ${player.username}`}
                >
                  <UserX className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
