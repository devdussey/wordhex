import { useState, useEffect, useCallback, useMemo } from 'react';
import { GameGrid } from './GameGrid';
import { WordDisplay } from './WordDisplay';
import { WordsList } from './WordsList';
import { PlayerLeaderboard } from './PlayerLeaderboard';
import { SettingsMenu } from './SettingsMenu';
import { GameOverOverlay } from './GameOverOverlay';
import { Tile, GameState } from '../types/game';
import { generateGrid, isAdjacent } from '../utils/gridGenerator';
import { calculateScore } from '../utils/scoring';
import { Send, Trash2, ArrowLeft, Settings, Shuffle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useError } from '../contexts/ErrorContext';
import { audioManager } from '../utils/audioManager';
import { saveMatchResults } from '../utils/gameStats';
import { api, realtime, MatchProgressPayload } from '../services/api';
import type {
  MatchSummary,
  MatchPlayerSummary,
  LobbySummary,
  RealtimeMessage,
  PlayerAction,
} from '../types/api';
import { ErrorType, ErrorSeverity } from '../types/errors';

const MAX_ROUNDS_PER_PLAYER = 4;

interface Player {
  id: string;
  username: string;
  avatar?: string;
  score: number;
  roundsPlayed: number;
}

interface TurnBasedGameProps {
  onBack: () => void;
  serverId?: string;
  channelId?: string;
  isHost?: boolean;
  match?: MatchSummary | null;
  onPlayAgain?: () => void;
}

export function TurnBasedGame({
  onBack,
  serverId = 'dev-server-123',
  channelId,
  isHost: _isHost = true,
  match = null,
  onPlayAgain,
}: TurnBasedGameProps) {
  const { getUsername, user } = useAuth();
  const { showError, logError } = useError();
  const playerName = getUsername();
  const localUserId = user?.id || 'guest';
  const isHost = _isHost;
  const [gameState, setGameState] = useState<GameState>(() => {
    const initialGrid = (match?.gridData as Tile[][] | null) ?? generateGrid();
    return {
      grid: initialGrid,
      selectedTiles: [],
      currentWord: '',
      score: 0,
      wordsFound: [],
      gemsCollected: 0,
      timeLeft: 0,
      gameOver: false,
    };
  });

  const [players, setPlayers] = useState<Player[]>(() => {
    if (match?.players?.length) {
      return match.players.map((player) => ({
        id: player.userId,
        username: player.username,
        score: player.score ?? 0,
        roundsPlayed: player.roundsPlayed ?? 0,
      }));
    }

    return [
      {
        id: localUserId,
        username: playerName,
        score: 0,
        roundsPlayed: 0,
      },
    ];
  });

  const [currentPlayerId, setCurrentPlayerId] = useState<string>(() => {
    if (match?.currentPlayerId) {
      return match.currentPlayerId;
    }
    if (match?.players?.length) {
      return match.players[0].userId;
    }
    return localUserId;
  });
  const [showValidation, setShowValidation] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [lastScore, setLastScore] = useState<number | undefined>(undefined);
  const [showSettings, setShowSettings] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hasShuffledThisTurn, setHasShuffledThisTurn] = useState(false);
  const [removingPlayerId, setRemovingPlayerId] = useState<string | null>(null);
  const [playerActions, setPlayerActions] = useState<Map<string, PlayerAction>>(new Map());
  const [currentWordScore, setCurrentWordScore] = useState<number | null>(null);

  const currentPlayer = useMemo(() => {
    if (!players.length) {
      return {
        id: localUserId,
        username: playerName,
        score: 0,
        roundsPlayed: 0,
      };
    }
    return players.find((player) => player.id === currentPlayerId) ?? players[0];
  }, [players, currentPlayerId, localUserId, playerName]);
  const matchPlayers: MatchPlayerSummary[] = useMemo(() => match?.players ?? [], [match?.players]);
  const localPlayer = useMemo(
    () => players.find((player) => player.id === localUserId) ?? null,
    [players, localUserId],
  );
  const gameOverPlayers = useMemo(
    () =>
      players.map((player) => ({
        id: player.id,
        name: player.username,
        score: player.score,
      })),
    [players],
  );
  const gameOverDetails = useMemo(() => {
    if (!localPlayer) {
      return undefined;
    }

    const details = [
      { label: 'Your Score', value: localPlayer.score.toLocaleString() },
      { label: 'Rounds Played', value: localPlayer.roundsPlayed.toString() },
    ];

    if (gameState.wordsFound.length > 0) {
      details.push({ label: 'Words Found', value: gameState.wordsFound.length.toString() });
    }

    return details;
  }, [localPlayer, gameState.wordsFound.length]);
  const lobbyId = match?.lobbyId ?? null;
  const currentRound = Math.min((currentPlayer?.roundsPlayed ?? 0) + 1, MAX_ROUNDS_PER_PLAYER);

  useEffect(() => {
    if (!matchPlayers.length) {
      return;
    }
    setPlayers((prev) =>
      matchPlayers.map((player) => {
        const existing = prev.find((p) => p.id === player.userId);
        return {
          id: player.userId,
          username: player.username,
          score: player.score ?? existing?.score ?? 0,
          roundsPlayed: player.roundsPlayed ?? existing?.roundsPlayed ?? 0,
        };
      })
    );
  }, [matchPlayers]);

  // REMOVED: This useEffect was causing turn switching bugs by resetting currentPlayerId
  // to the stale match.currentPlayerId value. The realtime handler already updates
  // currentPlayerId correctly based on server state.

  useEffect(() => {
    if (matchPlayers.length || !lobbyId) {
      return;
    }
    let cancelled = false;

    const loadLobbyPlayers = async () => {
      try {
        const response = await api.lobby.get(lobbyId);
        const lobbyPlayers = response?.players ?? [];
        if (!cancelled && lobbyPlayers.length) {
          setPlayers(
            lobbyPlayers.map((player: LobbySummary['players'][number]) => ({
              id: player.userId,
              username: player.username,
              score: 0,
              roundsPlayed: 0,
            }))
          );
          setCurrentPlayerId(lobbyPlayers[0]?.userId ?? localUserId);
        }
      } catch (error) {
        console.error('Failed to load lobby players:', error);
      }
    };

    loadLobbyPlayers();
    return () => {
      cancelled = true;
    };
  }, [matchPlayers, lobbyId, localUserId]);

  useEffect(() => {
    if (matchPlayers.length) {
      return;
    }
    setPlayers((prev) => {
      if (prev.length === 1 && prev[0].id === localUserId) {
        if (prev[0].username === playerName) {
          return prev;
        }
        return [
          {
            ...prev[0],
            username: playerName,
          },
        ];
      }
      return [
        {
          id: localUserId,
          username: playerName,
          score: 0,
          roundsPlayed: 0,
        },
      ];
    });
    setCurrentPlayerId((prev) => prev ?? localUserId);
  }, [matchPlayers, localUserId, playerName]);

  const isMyTurn = currentPlayer.id === localUserId;

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

  useEffect(() => {
    setHasShuffledThisTurn(false);
  }, [currentPlayerId]);

  // Create game session on mount
  useEffect(() => {
    let cancelled = false;
    const createSession = async () => {
      try {
        const response = await api.game.createSession({
          userId: localUserId,
          playerName,
          serverId,
          channelId,
        });
        if (!cancelled) {
          setSessionId(response?.session?.id ?? null);
        }
      } catch (error) {
        console.error('Failed to create session:', error);
      }
    };

    createSession();
    return () => {
      cancelled = true;
    };
  }, [localUserId, serverId, channelId, playerName]);

  // Update session status when game ends and save match results
  useEffect(() => {
    if (!gameState.gameOver || !isHost) {
      return;
    }
    const finalizeGame = async () => {
      try {
        if (sessionId) {
          await api.game.completeSession(sessionId, { score: gameState.score });
        }
        await saveMatchResults({
          matchId: match?.id,
          lobbyId: match?.lobbyId ?? undefined,
          players: players.map((p) => ({
            id: p.id,
            username: p.username,
            score: p.score,
            roundsPlayed: p.roundsPlayed,
          })),
          gridData: gameState.grid,
          wordsFound: gameState.wordsFound.map((w) => w.word),
        });
      } catch (error) {
        console.error('Failed to finalize game:', error);
      }
    };

    finalizeGame();
  }, [gameState.gameOver, isHost, sessionId, gameState.score, players, gameState.grid, gameState.wordsFound, match]);

  useEffect(() => {
    return () => {
      if (sessionId) {
        api.game
          .completeSession(sessionId, { score: gameState.score })
          .catch((error) => console.error('Failed to cleanup session:', error));
      }
    };
  }, [sessionId, gameState.score]);

  useEffect(() => {
    if (!match?.id) {
      return;
    }
    const channel = `match:${match.id}`;

    const handler = (message: RealtimeMessage) => {
      // Handle player action events
      if (message.type === 'player:action' && message.playerId && message.action) {
        // Ignore actions from ourselves
        if (message.playerId === localUserId) {
          return;
        }

        // Play sound for letter selections (for everyone in the lobby)
        if (message.action.type === 'letter_select' && message.action.selectedLetters) {
          const letterCount = message.action.selectedLetters.length;
          audioManager.playLetterClick(letterCount);
        }

        // Update player actions map
        setPlayerActions(prev => {
          const newMap = new Map(prev);
          newMap.set(message.playerId!, message.action!);

          // Clear action after 3 seconds for letter selects, 2 seconds for word attempts
          const clearDelay = message.action!.type === 'word_attempt' ? 2000 : 3000;
          setTimeout(() => {
            setPlayerActions(current => {
              const updated = new Map(current);
              // Only clear if this is still the same action
              if (updated.get(message.playerId!)?.timestamp === message.action!.timestamp) {
                updated.delete(message.playerId!);
              }
              return updated;
            });
          }, clearDelay);

          return newMap;
        });
        return;
      }

      if (message.type !== 'match:update') {
        return;
      }
      const updated = message.match as MatchSummary | undefined;
      if (!updated) {
        return;
      }

      console.log('[REALTIME] Received match update:', {
        currentPlayerId: updated.currentPlayerId,
        players: updated.players.map(p => ({
          name: p.username,
          score: p.score,
          roundsPlayed: p.roundsPlayed
        }))
      });

      const stillInMatch = updated.players.some((player) => player.userId === localUserId);
      if (!stillInMatch) {
        showError({
          message: 'You have been removed from the match by the host.',
          userMessage: 'You have been removed from the match by the host.',
          severity: ErrorSeverity.MEDIUM,
          type: ErrorType.GAMEPLAY,
          timestamp: Date.now(),
          retryable: false,
        });
        onBack();
        return;
      }

      // Update players state from server
      setPlayers(
        updated.players.map((player) => ({
          id: player.userId,
          username: player.username,
          score: player.score ?? 0,
          roundsPlayed: player.roundsPlayed ?? 0,
        }))
      );

      // Update current player ID
      if (typeof updated.currentPlayerId !== 'undefined') {
        console.log('[REALTIME] Setting currentPlayerId to:', updated.currentPlayerId);
        if (updated.currentPlayerId) {
          setCurrentPlayerId(updated.currentPlayerId);
        } else if (updated.players.length) {
          setCurrentPlayerId(updated.players[0].userId);
        }
      }

      // Update game state
      setGameState((prev) => {
        const me = updated.players.find((player) => player.userId === localUserId);
        return {
          ...prev,
          grid: (updated.gridData as Tile[][]) ?? prev.grid,
          wordsFound: (updated.wordsFound as unknown as GameState['wordsFound']) ?? prev.wordsFound,
          score: me?.score ?? prev.score,
          gameOver: updated.status === 'completed' ? true : prev.gameOver,
          selectedTiles: [],
          currentWord: '',
        };
      });
    };

    realtime.subscribe(channel, handler);
    return () => {
      realtime.unsubscribe(channel, handler);
    };
  }, [match?.id, localUserId, onBack, showError]);

  const handleRemovePlayer = useCallback(
    async (targetUserId: string) => {
      if (!isHost || !lobbyId || targetUserId === localUserId) {
        return;
      }

      setRemovingPlayerId(targetUserId);
      try {
        const response = await api.lobby.removePlayer({
          lobbyId,
          targetUserId,
          requestedBy: localUserId,
        });

        if (response.match) {
          const updatedMatch = response.match;
          const updatedPlayers = (updatedMatch.players ?? []).map((player) => ({
            id: player.userId,
            username: player.username,
            score: player.score ?? 0,
            roundsPlayed: player.roundsPlayed ?? 0,
          }));
          setPlayers(updatedPlayers);

          if (typeof updatedMatch.currentPlayerId !== 'undefined') {
            if (updatedMatch.currentPlayerId) {
              setCurrentPlayerId(updatedMatch.currentPlayerId);
            } else if (updatedPlayers.length) {
              setCurrentPlayerId(updatedPlayers[0].id);
            }
          }

          setGameState((prev) => {
            const me = updatedMatch.players?.find((player) => player.userId === localUserId);
            return {
              ...prev,
              grid: (updatedMatch.gridData as Tile[][]) ?? prev.grid,
              wordsFound: (updatedMatch.wordsFound as unknown as GameState['wordsFound']) ?? prev.wordsFound,
              score: me?.score ?? prev.score,
              selectedTiles: [],
              currentWord: '',
            };
          });
        }
      } catch (error) {
        logError(error, ErrorType.NETWORK, ErrorSeverity.MEDIUM, 'Failed to remove player from match');
        showError({
          message: error instanceof Error ? error.message : 'Failed to remove player from match',
          userMessage: 'Failed to remove player from match',
          severity: ErrorSeverity.MEDIUM,
          type: ErrorType.NETWORK,
          timestamp: Date.now(),
          retryable: true,
        });
      } finally {
        setRemovingPlayerId(null);
      }
    },
    [isHost, lobbyId, localUserId, logError, showError]
  );

  const handleTileSelect = useCallback((tile: Tile) => {
    if (!isMyTurn || gameState.gameOver) return;

    setGameState(prev => {
      const alreadySelected = prev.selectedTiles.some(
        t => t.row === tile.row && t.col === tile.col
      );

      if (alreadySelected) {
        const lastTile = prev.selectedTiles[prev.selectedTiles.length - 1];
        if (lastTile.row === tile.row && lastTile.col === tile.col) {
          const newSelected = prev.selectedTiles.slice(0, -1);
          const selectedLetters = newSelected.map(t => t.letter).join('');

          // Broadcast player action
          if (match?.id) {
            realtime.sendPlayerAction(match.id, localUserId, playerName, {
              type: 'letter_select',
              selectedLetters,
              timestamp: new Date().toISOString(),
            });
          }

          return {
            ...prev,
            selectedTiles: newSelected,
            currentWord: selectedLetters
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
      const selectedLetters = newSelected.map(t => t.letter).join('');

      // Broadcast player action
      if (match?.id) {
        realtime.sendPlayerAction(match.id, localUserId, playerName, {
          type: 'letter_select',
          selectedLetters,
          timestamp: new Date().toISOString(),
        });
      }

      return {
        ...prev,
        selectedTiles: newSelected,
        currentWord: selectedLetters
      };
    });

    setShowValidation(false);
    setIsValid(null);
  }, [isMyTurn, gameState.gameOver, match?.id, localUserId, playerName]);

  const finalizeTurn = useCallback(
    async ({
      valid,
      scoreDelta,
      gridData,
      wordsList,
      word,
      gemCount,
      scoreAlreadyApplied,
      playersSnapshot,
    }: {
      valid: boolean;
      scoreDelta: number;
      gridData: Tile[][];
      wordsList: GameState['wordsFound'];
      word?: string;
      gemCount: number;
      scoreAlreadyApplied: boolean;
      playersSnapshot: Player[];
    }) => {
      if (!currentPlayer) {
        return;
      }

      const playerIndex = playersSnapshot.findIndex((p) => p.id === currentPlayer.id);
      if (playerIndex === -1) {
        return;
      }

      const updatedPlayers = playersSnapshot.map((player, index) => {
        if (index !== playerIndex) {
          return player;
        }
        const newScore =
          scoreAlreadyApplied || !valid ? player.score : player.score + scoreDelta;
        return {
          ...player,
          score: newScore,
          roundsPlayed: player.roundsPlayed + 1,
        };
      });

      const allPlayersFinished = updatedPlayers.every(
        (player) => player.roundsPlayed >= MAX_ROUNDS_PER_PLAYER
      );
      const nextIndex = allPlayersFinished
        ? playerIndex
        : (playerIndex + 1) % updatedPlayers.length;
      const nextPlayer = allPlayersFinished ? null : updatedPlayers[nextIndex];

      console.log('[TURN] Switching turns:', {
        currentPlayer: currentPlayer.username,
        playerIndex,
        nextIndex,
        nextPlayer: nextPlayer?.username,
        allPlayersFinished,
        updatedPlayers: updatedPlayers.map(p => ({ name: p.username, roundsPlayed: p.roundsPlayed }))
      });

      setPlayers(updatedPlayers);
      setCurrentPlayerId(nextPlayer ? nextPlayer.id : updatedPlayers[playerIndex].id);

      setGameState((prev) => {
        const me = updatedPlayers.find((player) => player.id === localUserId);
        return {
          ...prev,
          grid: gridData ?? prev.grid,
          wordsFound: wordsList ?? prev.wordsFound,
          score: me?.score ?? prev.score,
          gameOver: allPlayersFinished ? true : prev.gameOver,
          selectedTiles: [],
          currentWord: '',
        };
      });

      setShowValidation(false);
      setLastScore(undefined);
      setIsValid(null);

      if (match?.id) {
        const roundNumber = updatedPlayers.reduce(
          (max, player) => Math.max(max, player.roundsPlayed),
          1
        );
        const payload: MatchProgressPayload = {
          players: updatedPlayers.map((player) => ({
            userId: player.id,
            username: player.username,
            score: player.score,
            roundsPlayed: player.roundsPlayed,
          })),
          currentPlayerId: nextPlayer ? nextPlayer.id : null,
          gridData,
          wordsFound: wordsList,
          roundNumber,
          gameOver: allPlayersFinished,
          lastTurn: {
            playerId: currentPlayer.id,
            username: currentPlayer.username,
            word,
            scoreDelta: valid ? scoreDelta : 0,
            gems: gemCount,
            completedAt: new Date().toISOString(),
          } as unknown as Record<string, unknown>,
        };
        console.log('[API] Sending match progress update:', {
          matchId: match.id,
          currentPlayerId: payload.currentPlayerId,
          nextPlayerName: nextPlayer?.username
        });
        try {
          await api.game.updateMatchProgress(match.id, payload);
          console.log('[API] Match progress updated successfully');
        } catch (error) {
          console.error('Failed to update match progress:', error);
        }
      }
    },
    [currentPlayer, localUserId, match?.id]
  );

  const handleSubmitWord = useCallback(async () => {
    if (!isMyTurn || !currentPlayer) return;

    const activeTiles = gameState.selectedTiles;
    if (!activeTiles.length) return;

    const baseGrid = gameState.grid;
    const baseWords = gameState.wordsFound;
    const attemptedWord = activeTiles.map(t => t.letter).join('');

    // Broadcast word attempt
    if (match?.id) {
      realtime.sendPlayerAction(match.id, localUserId, playerName, {
        type: 'word_attempt',
        word: attemptedWord,
        timestamp: new Date().toISOString(),
      });
    }

    const wordResult = await calculateScore(activeTiles);
    const gemCount = activeTiles.filter((tile) => tile.isGem).length;

    if (wordResult) {
      const gemBonus = gemCount * 10;
      const totalScore = wordResult.score + gemBonus;

      const newGrid = [...baseGrid];
      activeTiles.forEach((tile) => {
        const randomLetter = ['E', 'T', 'A', 'O', 'I', 'N', 'S', 'R'][
          Math.floor(Math.random() * 8)
        ];
        newGrid[tile.row][tile.col] = {
          ...newGrid[tile.row][tile.col],
          letter: randomLetter,
        };
      });

      const newWordsFound = [...baseWords, { ...wordResult, score: totalScore }];
      const playersSnapshot = players.map((player) => ({ ...player }));

      setGameState((prev) => ({
        ...prev,
        grid: newGrid,
        score: prev.score + totalScore,
        wordsFound: newWordsFound,
        gemsCollected: prev.gemsCollected + gemCount,
        selectedTiles: [],
        currentWord: '',
      }));

      setIsValid(true);
      setLastScore(totalScore);
      setShowValidation(true);
      audioManager.playWordSubmit(true);

      setTimeout(() => {
        void finalizeTurn({
          valid: true,
          scoreDelta: totalScore,
          gridData: newGrid,
          wordsList: newWordsFound,
          word: wordResult.word,
          gemCount,
          scoreAlreadyApplied: false,
          playersSnapshot,
        });
      }, 1500);
    } else {
      setIsValid(false);
      setShowValidation(true);
      audioManager.playWordSubmit(false);

      setTimeout(() => {
        setGameState((prev) => ({
          ...prev,
          selectedTiles: [],
          currentWord: '',
        }));
        setShowValidation(false);
        setIsValid(null);
        setLastScore(undefined);
      }, 1000);
    }
  }, [
    isMyTurn,
    currentPlayer,
    gameState.selectedTiles,
    gameState.grid,
    gameState.wordsFound,
    players,
    finalizeTurn,
    match?.id,
    localUserId,
    playerName,
  ]);

  const handleClearSelection = useCallback(() => {
    if (!isMyTurn) return;

    // Broadcast selection clear
    if (match?.id) {
      realtime.sendPlayerAction(match.id, localUserId, playerName, {
        type: 'selection_clear',
        timestamp: new Date().toISOString(),
      });
    }

    setGameState(prev => ({
      ...prev,
      selectedTiles: [],
      currentWord: ''
    }));
    setShowValidation(false);
    setIsValid(null);
  }, [isMyTurn, match?.id, localUserId, playerName]);

  const handleShuffleLetters = useCallback(async () => {
    if (!isMyTurn || hasShuffledThisTurn || gameState.gameOver) {
      return;
    }

    const previousGrid = gameState.grid.map(row => row.map(tile => ({ ...tile })));
    const letters = previousGrid.flat().map(tile => tile.letter);

    if (letters.length <= 1) {
      return;
    }

    const shuffledLetters = [...letters];
    for (let i = shuffledLetters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledLetters[i], shuffledLetters[j]] = [shuffledLetters[j], shuffledLetters[i]];
    }

    let index = 0;
    const newGrid = previousGrid.map(row =>
      row.map(tile => ({
        ...tile,
        letter: shuffledLetters[index++],
      }))
    );

    setGameState(prev => ({
      ...prev,
      grid: newGrid,
      selectedTiles: [],
      currentWord: '',
    }));
    setShowValidation(false);
    setIsValid(null);
    setLastScore(undefined);
    setHasShuffledThisTurn(true);

    if (match?.id) {
      try {
        await api.game.updateMatchProgress(match.id, {
          gridData: newGrid,
          currentPlayerId,
        });
      } catch (error) {
        console.error('Failed to sync shuffled grid:', error);
        setGameState(prev => ({
          ...prev,
          grid: previousGrid,
          selectedTiles: [],
          currentWord: '',
        }));
        setHasShuffledThisTurn(false);
      }
    }
  }, [
    currentPlayerId,
    gameState.gameOver,
    gameState.grid,
    hasShuffledThisTurn,
    isMyTurn,
    match?.id,
  ]);

  const handleVoteQuit = () => {
    alert('Vote to quit initiated! (Feature requires multiplayer server)');
    setShowSettings(false);
  };

  const handleForfeit = () => {
    if (confirm('Are you sure you want to forfeit? You will lose all progress.')) {
      onBack();
    }
  };

  const canSubmit = gameState.currentWord.length >= 3 && !gameState.gameOver && isMyTurn;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* DEBUG PANEL */}
        <div className="mb-4 bg-black/50 text-yellow-300 p-4 rounded-lg border border-yellow-500/50 font-mono text-xs">
          <div className="font-bold mb-2">🔍 DEBUG INFO</div>
          <div>Match ID: {match?.id || 'N/A'}</div>
          <div>Current Player ID: {currentPlayerId}</div>
          <div>Local User ID: {localUserId}</div>
          <div>Is My Turn: {isMyTurn ? 'YES' : 'NO'}</div>
          <div className="mt-2">Players:</div>
          {players.map((p, i) => (
            <div key={p.id} className="ml-4">
              {i + 1}. {p.username} (ID: {p.id.slice(0, 8)}...) - Rounds: {p.roundsPlayed}/{MAX_ROUNDS_PER_PLAYER} - Score: {p.score}
              {p.id === currentPlayerId && ' ← CURRENT'}
              {p.id === localUserId && ' ← YOU'}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-purple-800/50 hover:bg-purple-700/50 text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg border-2 border-purple-600/30"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Menu
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="px-6 py-3 bg-purple-800/50 hover:bg-purple-700/50 text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg border-2 border-purple-600/30"
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </div>

        <div className={`rounded-xl p-6 mb-4 shadow-2xl border-4 transition-all ${
          isMyTurn
            ? 'bg-gradient-to-r from-green-600/40 to-emerald-600/40 border-green-400 animate-pulse'
            : 'bg-purple-900/30 border-purple-700/50'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-3xl font-bold mb-2 ${
                isMyTurn ? 'text-green-300' : 'text-white'
              }`}>
                {isMyTurn ? '🎯 YOUR TURN!' : `⏳ ${currentPlayer.username.toUpperCase()}'S TURN`}
              </h3>
              <p className={isMyTurn ? 'text-green-200' : 'text-purple-300'}>
                Round {currentRound} of {MAX_ROUNDS_PER_PLAYER}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-yellow-400">{gameState.score}</div>
              <div className="text-purple-300 text-sm">Your Score</div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_auto_300px] gap-8">
          <div className="space-y-6">
            {/* Live Actions Display - shown when not your turn and there are active player actions */}
            {!isMyTurn && playerActions.size > 0 ? (
              <div className="bg-purple-900/30 rounded-xl p-6 shadow-lg border-2 border-purple-700/50 min-h-[100px]">
                <h2 className="text-3xl font-bold text-center text-purple-200 mb-4">
                  Live Actions:
                </h2>
                <div className="space-y-3">
                  {Array.from(playerActions.entries()).map(([playerId, action]) => {
                    const player = players.find(p => p.id === playerId);
                    if (!player) return null;

                    return (
                      <div
                        key={playerId}
                        className="flex items-center gap-3 justify-center text-lg"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                          <span className="text-white font-semibold">
                            {player.username}
                          </span>
                        </div>
                        <span className="text-purple-300">-</span>
                        <div>
                          {action.type === 'letter_select' && action.selectedLetters && (
                            <span className="text-purple-200">
                              Selecting: <span className="font-mono text-yellow-300 font-bold text-xl">{action.selectedLetters}</span>
                            </span>
                          )}
                          {action.type === 'word_attempt' && action.word && (
                            <span className="text-green-300 font-semibold">
                              Attempting: <span className="font-mono font-bold text-xl">{action.word}</span>
                            </span>
                          )}
                          {action.type === 'selection_clear' && (
                            <span className="text-gray-400 italic">Cleared selection</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <WordDisplay
                currentWord={gameState.currentWord}
                isValid={isValid}
                showValidation={showValidation}
                lastScore={lastScore}
                isMyTurn={isMyTurn}
                currentPlayerName={currentPlayer?.username ?? 'Player'}
                currentWordScore={currentWordScore}
              />
            )}

            <div className="flex items-center justify-center">
              <GameGrid
                grid={gameState.grid}
                selectedTiles={gameState.selectedTiles}
                onTileSelect={handleTileSelect}
                onDragComplete={handleSubmitWord}
                gameOver={gameState.gameOver || !isMyTurn}
              />
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={handleShuffleLetters}
                disabled={!isMyTurn || gameState.gameOver || hasShuffledThisTurn}
                className="px-6 py-3 bg-purple-800/50 hover:bg-purple-700/50 disabled:bg-purple-950/30 disabled:opacity-50
                         text-white rounded-xl font-semibold transition-all flex items-center gap-2 border-2 border-purple-600/30
                         disabled:cursor-not-allowed shadow-lg"
              >
                <Shuffle className="w-5 h-5" />
                Shuffle Letters
              </button>

              <button
                onClick={handleClearSelection}
                disabled={gameState.selectedTiles.length === 0 || gameState.gameOver || !isMyTurn}
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
            </div>

          </div>

          <div className="hidden lg:block w-px bg-purple-700/50"></div>

          <div className="space-y-6">
            <PlayerLeaderboard
              players={players}
              isHost={isHost}
              localUserId={localUserId}
              removingPlayerId={removingPlayerId}
              onRemovePlayer={isHost && lobbyId ? handleRemovePlayer : undefined}
            />
            <WordsList words={gameState.wordsFound} />
          </div>
        </div>
      </div>

      {showSettings && (
        <SettingsMenu
          onClose={() => setShowSettings(false)}
          onVoteQuit={handleVoteQuit}
          onForfeit={handleForfeit}
        />
      )}

      <GameOverOverlay
        visible={gameState.gameOver}
        players={gameOverPlayers}
        details={gameOverDetails}
        onExit={onBack}
        onPlayAgain={onPlayAgain}
      />
    </div>
  );
}
