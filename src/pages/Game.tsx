import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { GameGrid } from '../components/GameGrid';
import { generateGrid, isAdjacent } from '../utils/gridGenerator';
import { calculateScore, isValidWord } from '../utils/scoring';
import { Tile, SelectedTile, WordResult, GameState } from '../types/game';

type GameProps = {
  session: Session;
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
    gemsRemaining: 3,           // Start with 3 gems (SpellCast rule)
    timeLeft: GAME_DURATION,
    gameOver: false,
  }));

  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' }>({ text: '', type: 'success' });
  const [loading, setLoading] = useState(false);

  // Timer effect
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
      const isAlreadySelected = selectedTiles.some(t => t.row === tile.row && t.col === tile.col);

      if (isAlreadySelected) {
        // Remove tile if already selected
        return {
          ...prev,
          selectedTiles: selectedTiles.filter(t => !(t.row === tile.row && t.col === tile.col)),
          currentWord: selectedTiles
            .filter(t => !(t.row === tile.row && t.col === tile.col))
            .map(t => t.letter)
            .join('')
        };
      }

      // Check if tile is adjacent to the last selected tile
      if (selectedTiles.length > 0) {
        const lastTile = selectedTiles[selectedTiles.length - 1];
        if (!isAdjacent(lastTile, tile)) {
          setMessage({ text: 'Tiles must be adjacent!', type: 'error' });
          return prev;
        }
      }

      const newSelectedTiles: SelectedTile[] = [
        ...selectedTiles,
        { ...tile, index: selectedTiles.length }
      ];

      return {
        ...prev,
        selectedTiles: newSelectedTiles,
        currentWord: newSelectedTiles.map(t => t.letter).join('')
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
        // Check if any selected tiles are gems
        const hasGemTile = gameState.selectedTiles.some(t => t.isGem);
        const newGemsCollected = gameState.gemsCollected + (hasGemTile ? 1 : 0);
        // Max 10 gems, remaining gems = collected but not yet used
        const newGemsRemaining = Math.min(newGemsCollected, 10);

        setGameState((prev) => ({
          ...prev,
          score: prev.score + result.score,
          wordsFound: [result, ...prev.wordsFound],
          selectedTiles: [],
          currentWord: '',
          gemsCollected: newGemsCollected,
          gemsRemaining: newGemsRemaining
        }));
        const gemBonus = hasGemTile ? ' 💎' : '';
        setMessage({ text: `"${result.word}" +${result.score}pts!${gemBonus}`, type: 'success' });
      } else {
        setMessage({ text: 'Invalid word!', type: 'error' });
        setGameState((prev) => ({
          ...prev,
          selectedTiles: [],
          currentWord: ''
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
      currentWord: ''
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

  // Special Abilities (SpellCast mechanics)
  const handleShuffle = () => {
    if (gameState.gemsRemaining < 1) {
      setMessage({ text: 'Not enough gems! Need 1 gem.', type: 'error' });
      return;
    }
    setGameState((prev) => ({
      ...prev,
      grid: generateGrid(),
      gemsRemaining: prev.gemsRemaining - 1
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
      const newGrid = prev.grid.map(row => [...row]);
      const tileToSwap = prev.selectedTiles[0];
      // Use letter frequencies from Scrabble
      const letters = ['E', 'T', 'A', 'O', 'I', 'N', 'S', 'H', 'R', 'D', 'L', 'C', 'U', 'M', 'W', 'F', 'G', 'Y', 'P', 'B', 'V', 'K', 'J', 'X', 'Q', 'Z'];
      const randomLetter = letters[Math.floor(Math.random() * letters.length)];
      newGrid[tileToSwap.row][tileToSwap.col].letter = randomLetter;

      return {
        ...prev,
        grid: newGrid,
        selectedTiles: [],
        currentWord: '',
        gemsRemaining: prev.gemsRemaining - 3
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
      gemsRemaining: prev.gemsRemaining - 4
    }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-fuchsia-950 pb-16">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-6 text-center">
          <h1 className="text-5xl font-bold text-white">WordHex</h1>
          <p className="mt-2 text-purple-300">
            Select adjacent tiles to form words
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Main game area */}
          <div className="lg:col-span-2">
            <div className="flex flex-col items-center gap-8">
              {/* Game grid */}
              <GameGrid
                grid={gameState.grid}
                selectedTiles={gameState.selectedTiles}
                onTileSelect={handleTileSelect}
                gameOver={gameState.gameOver}
                inputMode="click"
              />

              {/* Current word display */}
              <div className="w-full rounded-2xl border border-purple-800/60 bg-purple-900/40 p-6 text-center">
                <p className="text-sm text-purple-400">Current Word</p>
                <p className="mt-2 text-3xl font-bold text-white">{gameState.currentWord || '-'}</p>
                <p className="mt-1 text-sm text-purple-300">
                  ({gameState.selectedTiles.length} tiles selected)
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex w-full gap-3">
                <button
                  onClick={handleSubmitWord}
                  disabled={loading || gameState.gameOver || gameState.selectedTiles.length < 3}
                  className="flex-1 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Word
                </button>
                <button
                  onClick={handleClearSelection}
                  disabled={gameState.gameOver}
                  className="flex-1 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-red-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              </div>

              {/* Special Abilities - SpellCast mechanics */}
              <div className="w-full rounded-2xl border border-amber-500/40 bg-amber-900/20 p-4">
                <p className="text-xs font-semibold text-amber-300 mb-3">SPECIAL ABILITIES (💎 {gameState.gemsRemaining})</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleShuffle}
                    disabled={gameState.gameOver || gameState.gemsRemaining < 1}
                    title="Cost: 1 gem"
                    className="rounded-lg bg-gradient-to-b from-orange-600 to-orange-700 px-3 py-2 text-xs font-bold text-white shadow transition hover:from-orange-500 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🔀 Shuffle<br />(1💎)
                  </button>
                  <button
                    onClick={handleSwapLetter}
                    disabled={gameState.gameOver || gameState.gemsRemaining < 3}
                    title="Cost: 3 gems"
                    className="rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 px-3 py-2 text-xs font-bold text-white shadow transition hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🔄 Swap<br />(3💎)
                  </button>
                  <button
                    onClick={handleHint}
                    disabled={gameState.gameOver || gameState.gemsRemaining < 4}
                    title="Cost: 4 gems"
                    className="rounded-lg bg-gradient-to-b from-purple-600 to-purple-700 px-3 py-2 text-xs font-bold text-white shadow transition hover:from-purple-500 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    💡 Hint<br />(4💎)
                  </button>
                </div>
              </div>

              {/* Message display */}
              {message.text && (
                <div
                  className={`w-full rounded-xl p-4 text-center font-semibold ${
                    message.type === 'success'
                      ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                      : 'bg-red-500/20 text-red-300 border border-red-500/50'
                  }`}
                >
                  {message.text}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-4">
            {/* Stats Panel */}
            <div className="rounded-3xl border-2 border-cyan-500/40 bg-gradient-to-br from-cyan-900/20 to-blue-900/20 p-6 backdrop-blur">
              <h3 className="text-2xl font-bold text-cyan-300">STATS</h3>
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-black/30 p-3">
                  <span className="text-cyan-300 font-semibold">SCORE</span>
                  <span className="text-4xl font-bold text-cyan-400">{gameState.score}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-black/30 p-3">
                  <span className="text-yellow-300 font-semibold">TIME</span>
                  <span className={`text-3xl font-bold font-mono ${gameState.timeLeft <= 30 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
                    {formatTime(gameState.timeLeft)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-black/30 p-3">
                  <span className="text-amber-300 font-semibold">GEMS</span>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-amber-400">💎 {gameState.gemsRemaining}</div>
                    <div className="text-xs text-amber-300">Earned: {gameState.gemsCollected}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-black/30 p-3">
                  <span className="text-blue-300 font-semibold">WORDS</span>
                  <span className="text-3xl font-bold text-blue-400">{gameState.wordsFound.length}</span>
                </div>
              </div>
            </div>

            {/* Game over overlay */}
            {gameState.gameOver && (
              <div className="rounded-2xl border-2 border-pink-500 bg-pink-500/20 p-6 text-center">
                <h3 className="text-2xl font-bold text-white">Game Over!</h3>
                <p className="mt-4 text-lg font-bold text-pink-300">Final Score: {gameState.score}</p>
                <button
                  onClick={handleNewGame}
                  className="mt-4 w-full rounded-xl bg-gradient-to-r from-pink-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-pink-700 hover:to-fuchsia-700"
                >
                  Play Again
                </button>
              </div>
            )}

            {/* Words found */}
            <div className="rounded-3xl border-2 border-pink-500/40 bg-gradient-to-br from-pink-900/20 to-purple-900/20 p-6 backdrop-blur">
              <h3 className="text-2xl font-bold text-pink-300">WORDS ({gameState.wordsFound.length})</h3>
              <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
                {gameState.wordsFound.length === 0 ? (
                  <div className="text-center text-purple-400 py-8">Select tiles and form words!</div>
                ) : (
                  gameState.wordsFound.map((result, idx) => (
                    <div key={idx} className="rounded-lg bg-black/30 p-3 border border-pink-500/20 hover:border-pink-500/60 transition">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-pink-300 text-lg">{result.word.toUpperCase()}</span>
                        <span className="text-green-400 font-bold text-xl">+{result.score}</span>
                      </div>
                      {result.multipliers.length > 0 && (
                        <div className="mt-1 text-xs text-blue-300 font-semibold">
                          {result.multipliers.join(' • ')}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
