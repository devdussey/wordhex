import { useState, useEffect, useCallback } from 'react';
import { GameGrid } from './GameGrid';
import { WordDisplay } from './WordDisplay';
import { ScoreBoard } from './ScoreBoard';
import { WordsList } from './WordsList';
import { Tile, GameState } from '../types/game';
import { generateGrid, isAdjacent } from '../utils/gridGenerator';
import { calculateScore } from '../utils/scoring';
import { RotateCcw, Send, Trash2, ArrowLeft } from 'lucide-react';
import { GameOverOverlay } from './GameOverOverlay';

const GAME_DURATION = 180;

interface GameProps {
  onBack: () => void;
  serverId?: string;
}

export function Game({ onBack, serverId = 'dev-server-123' }: GameProps) {
  const [gameState, setGameState] = useState<GameState>({
    grid: generateGrid(),
    selectedTiles: [],
    currentWord: '',
    score: 0,
    wordsFound: [],
    gemsCollected: 0,
    timeLeft: GAME_DURATION,
    gameOver: false
  });

  const [showValidation, setShowValidation] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [lastScore, setLastScore] = useState<number | undefined>(undefined);
  const [serverRecord, setServerRecord] = useState<number>(0);
  const [newRecord, setNewRecord] = useState(false);
  const [currentWordScore, setCurrentWordScore] = useState<number | null>(null);

  useEffect(() => {
    if (gameState.timeLeft > 0 && !gameState.gameOver) {
      const timer = setInterval(() => {
        setGameState(prev => {
          const newTimeLeft = prev.timeLeft - 1;
          if (newTimeLeft <= 0) {
            return { ...prev, timeLeft: 0, gameOver: true };
          }
          return { ...prev, timeLeft: newTimeLeft };
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [gameState.timeLeft, gameState.gameOver]);

  useEffect(() => {
    if (gameState.timeLeft === 0 && !gameState.gameOver) {
      setGameState(prev => ({ ...prev, gameOver: true }));
      const highScore = parseInt(localStorage.getItem('wordhex_high_score') || '0');
      if (gameState.score > highScore) {
        localStorage.setItem('wordhex_high_score', gameState.score.toString());
      }

      // Check for new server record
      if (gameState.score > serverRecord) {
        setNewRecord(true);
        setServerRecord(gameState.score);
        localStorage.setItem(`wordhex_server_record_${serverId}`, gameState.score.toString());
      }
    }
  }, [gameState.timeLeft, gameState.gameOver, gameState.score, serverRecord, serverId]);

  // Load server record on mount
  useEffect(() => {
    const savedRecord = localStorage.getItem(`wordhex_server_record_${serverId}`);
    if (savedRecord) {
      setServerRecord(parseInt(savedRecord));
    }
  }, [serverId]);

  // Calculate current word score in real-time
  useEffect(() => {
    const calculateCurrentScore = async () => {
      if (gameState.selectedTiles.length === 0) {
        setCurrentWordScore(null);
        return;
      }

      const wordResult = await calculateScore(gameState.selectedTiles);
      if (wordResult) {
        const gemCount = gameState.selectedTiles.filter((tile) => tile.isGem).length;
        const gemBonus = gemCount * 10;
        const totalScore = wordResult.score + gemBonus;
        setCurrentWordScore(totalScore);
      } else {
        setCurrentWordScore(null);
      }
    };

    calculateCurrentScore();
  }, [gameState.selectedTiles]);

  const handleTileSelect = useCallback((tile: Tile) => {
    setGameState(prev => {
      const alreadySelected = prev.selectedTiles.some(
        t => t.row === tile.row && t.col === tile.col
      );

      if (alreadySelected) {
        const lastTile = prev.selectedTiles[prev.selectedTiles.length - 1];
        if (lastTile.row === tile.row && lastTile.col === tile.col) {
          const newSelected = prev.selectedTiles.slice(0, -1);
          return {
            ...prev,
            selectedTiles: newSelected,
            currentWord: newSelected.map(t => t.letter).join('')
          };
        }
        return prev;
      }

      if (prev.selectedTiles.length > 0) {
        const lastTile = prev.selectedTiles[prev.selectedTiles.length - 1];
        if (!isAdjacent(lastTile, tile)) {
          return prev;
        }
      }

      const newSelected = [
        ...prev.selectedTiles,
        { ...tile, index: prev.selectedTiles.length }
      ];

      return {
        ...prev,
        selectedTiles: newSelected,
        currentWord: newSelected.map(t => t.letter).join('')
      };
    });

    setShowValidation(false);
    setIsValid(null);
  }, []);

  const handleSubmitWord = useCallback(async () => {
    const wordResult = await calculateScore(gameState.selectedTiles);

    if (wordResult) {
      const gemBonus = gameState.selectedTiles.filter(t => t.isGem).length * 10;
      const totalScore = wordResult.score + gemBonus;

      const newGrid = [...gameState.grid];
      gameState.selectedTiles.forEach(tile => {
        const randomLetter = ['E', 'T', 'A', 'O', 'I', 'N', 'S', 'R'][
          Math.floor(Math.random() * 8)
        ];
        newGrid[tile.row][tile.col] = {
          ...newGrid[tile.row][tile.col],
          letter: randomLetter
        };
      });

      const newWordsFound = [...gameState.wordsFound, { ...wordResult, score: totalScore }];
      const newScore = gameState.score + totalScore;
      const newGemsCollected = gameState.gemsCollected + gameState.selectedTiles.filter(t => t.isGem).length;

      setGameState(prev => ({
        ...prev,
        grid: newGrid,
        score: newScore,
        wordsFound: newWordsFound,
        gemsCollected: newGemsCollected,
        selectedTiles: [],
        currentWord: ''
      }));

      setIsValid(true);
      setLastScore(totalScore);
      setShowValidation(true);
      setTimeout(() => {
        setShowValidation(false);
        setLastScore(undefined);
      }, 1500);
    } else {
      setIsValid(false);
      setShowValidation(true);
      setTimeout(() => {
        setShowValidation(false);
        setGameState(prev => ({
          ...prev,
          selectedTiles: [],
          currentWord: ''
        }));
      }, 1000);
    }
  }, [gameState.selectedTiles, gameState.grid, gameState.score, gameState.wordsFound, gameState.gemsCollected]);

  const handleClearSelection = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      selectedTiles: [],
      currentWord: ''
    }));
    setShowValidation(false);
    setIsValid(null);
  }, []);

  const handleNewGame = () => {
    setGameState({
      grid: generateGrid(),
      selectedTiles: [],
      currentWord: '',
      score: 0,
      wordsFound: [],
      gemsCollected: 0,
      timeLeft: GAME_DURATION,
      gameOver: false
    });
    setShowValidation(false);
    setIsValid(null);
    setNewRecord(false);
  };

  const canSubmit = gameState.currentWord.length >= 3 && !gameState.gameOver;

  const gameOverPlayers = [
    {
      id: 'player-1',
      name: 'You',
      score: gameState.score,
    },
  ];

  const gameOverDetails = [
    { label: 'Final Score', value: gameState.score.toLocaleString() },
    { label: 'Words Found', value: gameState.wordsFound.length.toString() },
    { label: 'Gems Collected', value: gameState.gemsCollected.toString() },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 p-8">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={onBack}
          className="mb-4 px-6 py-3 bg-purple-800/50 hover:bg-purple-700/50 text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg border-2 border-purple-600/30"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Menu
        </button>

        <ScoreBoard
          score={gameState.score}
          timeLeft={gameState.timeLeft}
          gemsCollected={gameState.gemsCollected}
          wordsFound={gameState.wordsFound.length}
          serverRecord={serverRecord}
        />

        <div className="mt-8 grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <WordDisplay
              currentWord={gameState.currentWord}
              isValid={isValid}
              showValidation={showValidation}
              lastScore={lastScore}
              isMyTurn={true}
              currentPlayerName="Player"
              currentWordScore={currentWordScore}
            />

            <div className="flex items-center justify-center">
              <GameGrid
                grid={gameState.grid}
                selectedTiles={gameState.selectedTiles}
                onTileSelect={handleTileSelect}
                onDragComplete={handleSubmitWord}
                gameOver={gameState.gameOver}
              />
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={handleClearSelection}
                disabled={gameState.selectedTiles.length === 0 || gameState.gameOver}
                className="px-6 py-3 bg-purple-800/50 hover:bg-purple-700/50 disabled:bg-purple-950/30 disabled:opacity-50
                         text-white rounded-xl font-semibold transition-all flex items-center gap-2 border-2 border-purple-600/30
                         disabled:cursor-not-allowed shadow-lg"
              >
                <Trash2 className="w-5 h-5" />
                Clear
              </button>

              <button
                onClick={handleSubmitWord}
                disabled={!canSubmit}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600
                         hover:from-purple-700 hover:to-pink-700
                         disabled:from-purple-950/30 disabled:to-purple-950/30 disabled:opacity-50
                         text-white rounded-xl font-semibold transition-all flex items-center gap-2
                         disabled:cursor-not-allowed shadow-lg transform hover:scale-105 active:scale-95"
              >
                <Send className="w-5 h-5" />
                Submit Word
              </button>

              <button
                onClick={handleNewGame}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600
                         hover:from-blue-700 hover:to-purple-700
                         text-white rounded-xl font-semibold transition-all flex items-center gap-2
                         shadow-lg transform hover:scale-105 active:scale-95"
              >
                <RotateCcw className="w-5 h-5" />
                New Game
              </button>
            </div>
          </div>

          <div>
            <WordsList words={gameState.wordsFound} />
          </div>
        </div>

        <div className="mt-8 bg-purple-900/30 rounded-xl p-6 shadow-lg border-2 border-purple-700/50">
          <h3 className="text-xl font-bold text-white mb-3">How to Play</h3>
          <ul className="text-purple-200 space-y-2">
            <li>• Click adjacent tiles (including diagonals) to spell words, or enable drag mode in Options to click and drag</li>
            <li>• Words must be at least 3 letters long</li>
            <li>• Look for multiplier tiles: DL (2x letter), TL (3x letter), DW (2x word), TW (3x word)</li>
            <li>• Collect gem tiles for bonus points (+10 each)</li>
            <li>• Longer words earn bonus points</li>
            <li>• Score as many points as possible before time runs out!</li>
          </ul>
        </div>
      </div>

      <GameOverOverlay
        visible={gameState.gameOver}
        subtitle={
          newRecord
            ? '🎉 New server record set! 🎉'
            : undefined
        }
        players={gameOverPlayers}
        details={gameOverDetails}
        onExit={onBack}
        onPlayAgain={handleNewGame}
      />
    </div>
  );
}
