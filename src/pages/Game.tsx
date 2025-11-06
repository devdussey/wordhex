import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { LucideIcon } from 'lucide-react';
import { Gem, Lightbulb, RefreshCcw, RotateCcw, Shuffle, Sparkles, Timer, Trophy } from 'lucide-react';
import { GameGrid } from '../components/GameGrid';
import { generateGrid, isAdjacent } from '../utils/gridGenerator';
import { calculateScore } from '../utils/scoring';
import { Tile, SelectedTile, WordResult, GameState } from '../types/game';

type GameProps = {
  session: Session;
};

type PrimaryAction = {
  key: string;
  label: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
  icon: LucideIcon;
  gradient: string;
};

type AbilityAction = {
  key: string;
  label: string;
  description: string;
  cost: number;
  disabled: boolean;
  onClick: () => void;
  icon: LucideIcon;
};

type StatCard = {
  key: string;
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
  accent: string;
};

const GAME_DURATION = 180; // 3 minutes

export function Game({ session }: GameProps) {
  const [gameState, setGameState] = useState<GameState>(() => ({
    grid: generateGrid(),
    selectedTiles: [],
    currentWord: '',
    score: 0,
    wordsFound: [],
    gemsCollected: 0,
    gemsRemaining: 3, // Start with 3 gems (SpellCast rule)
    timeLeft: GAME_DURATION,
    gameOver: false,
  }));

  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' }>({ text: '', type: 'success' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (gameState.gameOver) return;

    const timer = setInterval(() => {
      setGameState((prev) => {
        const newTimeLeft = prev.timeLeft - 1;
        if (newTimeLeft <= 0) {
          return { ...prev, timeLeft: 0, gameOver: true };
        }
        return { ...prev, timeLeft: newTimeLeft };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.gameOver]);

  const handleTileSelect = (tile: Tile) => {
    setGameState((prev) => {
      const { selectedTiles } = prev;
      const isAlreadySelected = selectedTiles.some((t) => t.row === tile.row && t.col === tile.col);

      if (isAlreadySelected) {
        return {
          ...prev,
          selectedTiles: selectedTiles.filter((t) => !(t.row === tile.row && t.col === tile.col)),
          currentWord: selectedTiles
            .filter((t) => !(t.row === tile.row && t.col === tile.col))
            .map((t) => t.letter)
            .join(''),
        };
      }

      if (selectedTiles.length > 0) {
        const lastTile = selectedTiles[selectedTiles.length - 1];
        if (!isAdjacent(lastTile, tile)) {
          setMessage({ text: 'Tiles must be adjacent!', type: 'error' });
          return prev;
        }
      }

      const newSelectedTiles: SelectedTile[] = [
        ...selectedTiles,
        { ...tile, index: selectedTiles.length },
      ];

      return {
        ...prev,
        selectedTiles: newSelectedTiles,
        currentWord: newSelectedTiles.map((t) => t.letter).join(''),
      };
    });
  };

  const handleSubmitWord = async () => {
    if (gameState.selectedTiles.length < 3) {
      setMessage({ text: 'Word must be at least 3 letters!', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const result = await calculateScore(gameState.selectedTiles);

      if (result) {
        const hasGemTile = gameState.selectedTiles.some((t) => t.isGem);
        const newGemsCollected = gameState.gemsCollected + (hasGemTile ? 1 : 0);
        const newGemsRemaining = Math.min(newGemsCollected, 10);

        setGameState((prev) => ({
          ...prev,
          score: prev.score + result.score,
          wordsFound: [result, ...prev.wordsFound],
          selectedTiles: [],
          currentWord: '',
          gemsCollected: newGemsCollected,
          gemsRemaining: newGemsRemaining,
        }));

        const gemBonus = hasGemTile ? ' [Gem bonus]' : '';
        setMessage({ text: `"${result.word}" +${result.score}pts${gemBonus}`, type: 'success' });
      } else {
        setMessage({ text: 'Invalid word!', type: 'error' });
        setGameState((prev) => ({
          ...prev,
          selectedTiles: [],
          currentWord: '',
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearSelection = () => {
    setGameState((prev) => ({
      ...prev,
      selectedTiles: [],
      currentWord: '',
    }));
    setMessage({ text: '', type: 'success' });
  };

  const handleNewGame = () => {
    setGameState({
      grid: generateGrid(),
      selectedTiles: [],
      currentWord: '',
      score: 0,
      wordsFound: [],
      gemsCollected: 0,
      gemsRemaining: 3,
      timeLeft: GAME_DURATION,
      gameOver: false,
    });
    setMessage({ text: '', type: 'success' });
  };

  const handleShuffle = () => {
    if (gameState.gemsRemaining < 1) {
      setMessage({ text: 'Not enough gems! Need 1 gem.', type: 'error' });
      return;
    }

    setGameState((prev) => ({
      ...prev,
      grid: generateGrid(),
      gemsRemaining: prev.gemsRemaining - 1,
    }));
    setMessage({ text: 'Grid shuffled! -1 gem', type: 'success' });
  };

  const handleSwapLetter = () => {
    if (gameState.gemsRemaining < 3) {
      setMessage({ text: 'Not enough gems! Need 3 gems.', type: 'error' });
      return;
    }
    if (gameState.selectedTiles.length === 0) {
      setMessage({ text: 'Select a tile to swap!', type: 'error' });
      return;
    }

    setGameState((prev) => {
      const newGrid = prev.grid.map((row) => [...row]);
      const tileToSwap = prev.selectedTiles[0];
      const letters = ['E', 'T', 'A', 'O', 'I', 'N', 'S', 'H', 'R', 'D', 'L', 'C', 'U', 'M', 'W', 'F', 'G', 'Y', 'P', 'B', 'V', 'K', 'J', 'X', 'Q', 'Z'];
      const randomLetter = letters[Math.floor(Math.random() * letters.length)];
      newGrid[tileToSwap.row][tileToSwap.col].letter = randomLetter;

      return {
        ...prev,
        grid: newGrid,
        selectedTiles: [],
        currentWord: '',
        gemsRemaining: prev.gemsRemaining - 3,
      };
    });
    setMessage({ text: 'Letter swapped! -3 gems', type: 'success' });
  };

  const handleHint = () => {
    if (gameState.gemsRemaining < 4) {
      setMessage({ text: 'Not enough gems! Need 4 gems.', type: 'error' });
      return;
    }

    setMessage({ text: 'Hint: Try longer words for more points!', type: 'success' });
    setGameState((prev) => ({
      ...prev,
      gemsRemaining: prev.gemsRemaining - 4,
    }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playerLabel =
    (session.user.user_metadata?.full_name as string | undefined) ??
    session.user.email ??
    'Player';

  const elapsedSeconds = Math.max(0, GAME_DURATION - gameState.timeLeft);
  const elapsedPercent = Math.min(100, Math.max(0, (elapsedSeconds / GAME_DURATION) * 100));

  const primaryActions: PrimaryAction[] = [
    {
      key: 'submit',
      label: loading ? 'Submitting...' : 'Submit Word',
      description: 'Lock in your current path for scoring.',
      disabled: loading || gameState.gameOver || gameState.selectedTiles.length < 3,
      onClick: handleSubmitWord,
      icon: Sparkles,
      gradient: 'from-emerald-500/80 via-teal-500 to-cyan-500/80',
    },
    {
      key: 'clear',
      label: 'Clear Selection',
      description: 'Reset your current word and start fresh.',
      disabled: gameState.gameOver || gameState.selectedTiles.length === 0,
      onClick: handleClearSelection,
      icon: RotateCcw,
      gradient: 'from-rose-500/80 via-pink-500 to-fuchsia-500/80',
    },
  ];

  const abilityActions: AbilityAction[] = [
    {
      key: 'shuffle',
      label: 'Shuffle Grid',
      description: 'Remix all letters instantly with a fresh draw.',
      cost: 1,
      disabled: gameState.gameOver || gameState.gemsRemaining < 1,
      onClick: handleShuffle,
      icon: Shuffle,
    },
    {
      key: 'swap',
      label: 'Morph Letter',
      description:
        gameState.selectedTiles.length === 0
          ? 'Select a tile to morph it into a fresh letter.'
          : 'Transform your first selected tile into something new.',
      cost: 3,
      disabled: gameState.gameOver || gameState.gemsRemaining < 3 || gameState.selectedTiles.length === 0,
      onClick: handleSwapLetter,
      icon: RefreshCcw,
    },
    {
      key: 'hint',
      label: 'Spark Hint',
      description: 'Get a strategic nudge toward a higher scoring play.',
      cost: 4,
      disabled: gameState.gameOver || gameState.gemsRemaining < 4,
      onClick: handleHint,
      icon: Lightbulb,
    },
  ];

  const quickStats: StatCard[] = [
    {
      key: 'score',
      label: 'Score',
      value: gameState.score.toLocaleString(),
      helper: 'Total points this round',
      icon: Trophy,
      accent: 'from-amber-300 via-orange-400 to-orange-500',
    },
    {
      key: 'words',
      label: 'Words Found',
      value: gameState.wordsFound.length.toString(),
      helper: 'Unique submissions',
      icon: Sparkles,
      accent: 'from-pink-300 via-fuchsia-400 to-indigo-400',
    },
    {
      key: 'gems',
      label: 'Gems Ready',
      value: gameState.gemsRemaining.toString(),
      helper: `Earned ${gameState.gemsCollected}`,
      icon: Gem,
      accent: 'from-cyan-300 via-sky-400 to-emerald-400',
    },
    {
      key: 'time',
      label: 'Time Left',
      value: formatTime(gameState.timeLeft),
      helper: `${gameState.timeLeft}s remaining`,
      icon: Timer,
      accent: 'from-indigo-300 via-blue-400 to-violet-400',
    },
  ];

  const topWord = gameState.wordsFound.reduce<WordResult | null>((best, current) => {
    if (!best || current.score > best.score) {
      return current;
    }
    return best;
  }, null);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-950 to-indigo-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute -bottom-28 -left-20 h-[22rem] w-[22rem] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-16 right-0 h-[20rem] w-[20rem] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-12">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-fuchsia-200/80">WordHex Arcade</p>
            <h1 className="mt-3 text-4xl font-black sm:text-5xl">Modern Match Experience</h1>
            <p className="mt-3 max-w-xl text-base text-slate-300">
              Link glowing tiles to craft high-scoring words before the neon timer fades out.
            </p>
          </div>
          <div className="mx-auto flex max-w-sm items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left shadow-xl backdrop-blur sm:mx-0">
            <div className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-200">
              Session
            </div>
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-300/70">Player</p>
              <p className="mt-1 truncate text-lg font-semibold text-white">{playerLabel}</p>
            </div>
          </div>
        </header>

        <div className="mt-12 grid gap-8 xl:grid-cols-[1.55fr_1fr]">
          <section className="space-y-6">
            <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_30px_90px_rgba(56,33,134,0.33)] backdrop-blur">
              <div className="grid gap-4 min-[560px]:grid-cols-2 lg:grid-cols-4">
                {quickStats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.key}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 transition hover:border-white/30"
                    >
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${stat.accent} text-slate-900`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.4em] text-slate-300/80">{stat.label}</p>
                        <p className="text-lg font-semibold text-white">{stat.value}</p>
                        {stat.helper ? <p className="text-[11px] text-slate-400">{stat.helper}</p> : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-center">
                <GameGrid
                  grid={gameState.grid}
                  selectedTiles={gameState.selectedTiles}
                  onTileSelect={handleTileSelect}
                  gameOver={gameState.gameOver}
                  inputMode="click"
                />
              </div>

              <div className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[24px] border border-white/10 bg-black/30 px-6 py-5 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-slate-300/70">Current Word</p>
                  <p className="mt-3 text-4xl font-bold tracking-widest text-white">
                    {gameState.currentWord || '---'}
                  </p>
                  <p className="mt-4 text-sm text-slate-300">
                    {gameState.selectedTiles.length} tile{gameState.selectedTiles.length === 1 ? '' : 's'} selected
                  </p>
                  {gameState.selectedTiles.length > 0 && (
                    <p className="mt-2 text-xs uppercase tracking-[0.6em] text-slate-400">
                      {gameState.selectedTiles.map((t) => t.letter).join(' ')}
                    </p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {primaryActions.map((action) => {
                    const Icon = action.icon;
                    const interactiveClass = action.disabled
                      ? 'cursor-not-allowed opacity-60'
                      : 'hover:-translate-y-1 hover:border-white/30 hover:bg-white/10 hover:shadow-lg';
                    return (
                      <button
                        key={action.key}
                        onClick={action.onClick}
                        disabled={action.disabled}
                        className={`group relative overflow-hidden rounded-[22px] border border-white/10 bg-white/5 px-5 py-4 text-left transition ${interactiveClass}`}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-r ${action.gradient} opacity-0 transition group-hover:opacity-20`} />
                        <div className="relative flex items-start gap-3">
                          <span className="rounded-xl border border-white/20 bg-black/30 p-2">
                            <Icon className="h-5 w-5 text-white" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-white">{action.label}</p>
                            <p className="mt-1 text-xs text-slate-200/80">{action.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 rounded-[24px] border border-amber-400/30 bg-amber-500/10 px-6 py-6 backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-amber-100">
                    <Sparkles className="h-5 w-5" />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.4em]">Gem Abilities</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-amber-200/20 bg-black/30 px-3 py-1 text-xs font-semibold text-amber-100">
                    <Gem className="h-4 w-4" />
                    <span>{gameState.gemsRemaining}</span>
                    <span className="text-amber-100/70">/ 10</span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {abilityActions.map((ability) => {
                    const Icon = ability.icon;
                    const abilityClass = ability.disabled
                      ? 'cursor-not-allowed opacity-50'
                      : 'hover:-translate-y-1 hover:border-amber-200/40 hover:bg-black/40';
                    return (
                      <button
                        key={ability.key}
                        onClick={ability.onClick}
                        disabled={ability.disabled}
                        className={`group relative flex flex-col rounded-2xl border border-amber-200/15 bg-black/30 px-4 py-4 text-left transition ${abilityClass}`}
                      >
                        <div className="flex items-center justify-between text-amber-100">
                          <span className="flex items-center gap-2 text-sm font-semibold">
                            <Icon className="h-4 w-4" />
                            {ability.label}
                          </span>
                          <span className="flex items-center gap-1 rounded-full border border-amber-200/30 bg-amber-400/15 px-2 py-[2px] text-[11px] font-bold">
                            <Gem className="h-3 w-3" />
                            {ability.cost}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-amber-100/75">{ability.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {message.text && (
                <div
                  className={`mt-6 rounded-2xl border px-5 py-4 text-sm font-semibold ${
                    message.type === 'success'
                      ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'
                      : 'border-rose-400/60 bg-rose-500/10 text-rose-200'
                  }`}
                >
                  {message.text}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.45)] backdrop-blur">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Round Status</h2>
                <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.35em] text-slate-200">
                  <Timer className="h-4 w-4 text-amber-200" />
                  <span>{formatTime(gameState.timeLeft)}</span>
                </div>
              </div>

              <div className="mt-4">
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-900/60">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-fuchsia-400 via-pink-400 to-amber-300 transition-[width] duration-500"
                    style={{ width: `${elapsedPercent}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-slate-400">
                  <span>{elapsedSeconds}s elapsed</span>
                  <span>{gameState.timeLeft}s remaining</span>
                </div>
              </div>

              {topWord ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 px-5 py-4">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-slate-300/70">Best Word</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-lg font-semibold tracking-wide text-white">{topWord.word.toUpperCase()}</span>
                    <span className="text-emerald-300 font-semibold">+{topWord.score}</span>
                  </div>
                  {topWord.multipliers.length > 0 && (
                    <p className="mt-2 text-xs text-slate-300/70">Boosts: {topWord.multipliers.join(' | ')}</p>
                  )}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-white/15 px-5 py-6 text-center text-sm text-slate-300/70">
                  Submit a word to unlock insights.
                </div>
              )}

              {gameState.gameOver ? (
                <div className="mt-6 rounded-2xl border border-fuchsia-400/50 bg-fuchsia-500/10 px-6 py-6 text-center">
                  <h3 className="text-lg font-semibold text-white">Time's up!</h3>
                  <p className="mt-2 text-sm text-fuchsia-100">
                    Final score {gameState.score.toLocaleString()}
                  </p>
                  <button
                    onClick={handleNewGame}
                    className="mt-4 w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-fuchsia-600 hover:to-indigo-600"
                  >
                    Start New Round
                  </button>
                </div>
              ) : (
                <p className="mt-6 text-sm text-slate-300/80">
                  Keep chaining tiles to climb the leaderboard and bank more gems.
                </p>
              )}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.4)] backdrop-blur">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Word Feed</h2>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-0.5 text-xs font-semibold text-slate-200">
                  {gameState.wordsFound.length}
                </span>
              </div>

              <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {gameState.wordsFound.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-slate-300/80">
                    Start linking letters to populate this feed.
                  </div>
                ) : (
                  gameState.wordsFound.map((result, idx) => (
                    <div
                      key={`${result.word}-${idx}`}
                      className="group rounded-2xl border border-white/10 bg-black/30 px-4 py-3 transition hover:border-fuchsia-400/50 hover:bg-black/40"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base font-semibold tracking-wide text-white">
                          {result.word.toUpperCase()}
                        </span>
                        <span className="text-emerald-300 font-semibold">+{result.score}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.35em] text-slate-400">
                        <span>{result.word.length} letters</span>
                        <span>Base {result.baseScore}</span>
                        {result.multipliers.length > 0 && (
                          <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-2 py-[2px] text-[10px] font-semibold text-fuchsia-100">
                            {result.multipliers.join(' | ')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
