import { Trophy, Medal, Award } from 'lucide-react';

interface GameOverPlayer {
  id: string;
  name: string;
  score: number;
}

interface DetailItem {
  label: string;
  value: string;
}

interface GameOverOverlayProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  players: GameOverPlayer[];
  details?: DetailItem[];
  onExit: () => void;
  onPlayAgain?: () => void;
}

function getOrdinal(position: number): string {
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
  const modTen = position % 10;
  const modHundred = position % 100;

  if (modTen in suffixes && !(modHundred >= 11 && modHundred <= 13)) {
    return `${position}${suffixes[modTen]}`;
  }

  return `${position}th`;
}

export function GameOverOverlay({
  visible,
  title = 'Game Over',
  subtitle,
  players,
  details,
  onExit,
  onPlayAgain,
}: GameOverOverlayProps) {
  if (!visible) {
    return null;
  }

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="relative overflow-hidden rounded-3xl border-4 border-purple-400/60 bg-gradient-to-br from-indigo-900 via-purple-900 to-fuchsia-900 p-8 shadow-2xl">
          <div className="absolute -top-16 right-6 h-36 w-36 rounded-full bg-purple-500/30 blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-20 left-4 h-44 w-44 rounded-full bg-pink-500/20 blur-3xl" aria-hidden="true" />

          <div className="relative text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-4xl font-extrabold uppercase tracking-widest text-white drop-shadow-lg">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-lg font-semibold text-purple-100">
                {subtitle}
              </p>
            )}
          </div>

          <div className="relative mt-8 space-y-3">
            {sortedPlayers.map((player, index) => {
              const placement = index + 1;
              const isFirst = placement === 1;

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between rounded-2xl border-2 p-4 transition-all ${
                    isFirst
                      ? 'border-yellow-400/80 bg-gradient-to-r from-yellow-500/40 via-amber-500/20 to-yellow-500/40 shadow-xl'
                      : 'border-purple-500/40 bg-purple-800/40'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-xl font-bold ${
                        isFirst
                          ? 'border-yellow-300 bg-yellow-500/90 text-purple-900'
                          : 'border-purple-400 bg-purple-800/80 text-purple-100'
                      }`}
                    >
                      {getOrdinal(placement)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-lg font-semibold text-white">
                        {isFirst ? <Medal className="h-5 w-5 text-yellow-300" /> : <Award className="h-5 w-5 text-purple-200" />}
                        <span className={isFirst ? 'text-white' : 'text-purple-100'}>{player.name}</span>
                      </div>
                      <div className="text-sm text-purple-200/80">{isFirst ? 'Champion' : 'Great effort!'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-extrabold ${isFirst ? 'text-yellow-200' : 'text-purple-100'}`}>
                      {player.score.toLocaleString()} pts
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {details && details.length > 0 && (
            <div className="relative mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {details.map((detail, index) => (
                <div
                  key={`${detail.label}-${index}`}
                  className="rounded-2xl border border-purple-500/40 bg-purple-900/40 p-4 text-center"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-purple-200/80">
                    {detail.label}
                  </div>
                  <div className="mt-1 text-2xl font-bold text-white">{detail.value}</div>
                </div>
              ))}
            </div>
          )}

          <div className="relative mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={onExit}
              className="w-full rounded-2xl border-2 border-purple-500/60 bg-purple-800/80 px-6 py-3 text-lg font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-purple-700/80 sm:w-auto"
            >
              Exit to Main Menu
            </button>
            {onPlayAgain && (
              <button
                onClick={onPlayAgain}
                className="w-full rounded-2xl border-2 border-pink-500/70 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 px-6 py-3 text-lg font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 hover:from-pink-500 hover:via-fuchsia-500 hover:to-purple-600 sm:w-auto"
              >
                Play Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
