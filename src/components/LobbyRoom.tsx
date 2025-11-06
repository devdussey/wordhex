import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, X, Copy, Check, Play, UserX } from 'lucide-react';
import { api, realtime } from '../services/api';
import { useError } from '../contexts/ErrorContext';
import { ErrorSeverity, ErrorType } from '../types/errors';
import type { LobbySummary, LobbyPlayer, MatchSummary, RealtimeMessage } from '../types/api';

interface LobbyRoomProps {
  lobbyId: string;
  lobbyCode: string;
  playerId: string;
  playerName: string;
  isHost: boolean;
  onStartGame: (match: MatchSummary) => void;
  onLeave: () => void;
}

export function LobbyRoom({
  lobbyId,
  lobbyCode,
  playerId,
  playerName,
  isHost,
  onStartGame,
  onLeave,
}: LobbyRoomProps) {
  const { showError, logError } = useError();
  const [lobby, setLobby] = useState<LobbySummary | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [removingPlayerId, setRemovingPlayerId] = useState<string | null>(null);

  const players: LobbyPlayer[] = lobby?.players ?? [];
  const me = players.find((player) => player.userId === playerId);
  const myReady = me?.ready ?? false;
  const amHost = lobby?.hostId === playerId || isHost;

  const canStart = useMemo(() => {
    if (!lobby) return false;
    if (!amHost) return false;
    if (lobby.players.length < 2) return false;
    return lobby.players.every((player) => player.ready);
  }, [lobby, amHost]);

  const handleLobbyUpdate = useCallback(
    (payload: RealtimeMessage) => {
      if (payload.type === 'lobby:update') {
        const updatedLobby = payload.lobby as LobbySummary | undefined;
        if (updatedLobby?.id === lobbyId) {
          const stillInLobby = updatedLobby.players.some((player) => player.userId === playerId);
          if (!stillInLobby) {
            showError({
              message: 'You have been removed from the lobby by the host.',
              userMessage: 'You have been removed from the lobby by the host.',
              severity: ErrorSeverity.MEDIUM,
              type: ErrorType.GAMEPLAY,
              timestamp: Date.now(),
              retryable: false,
            });
            onLeave();
            return;
          }
          setLobby(updatedLobby);
        }
      }
      if (payload.type === 'lobby:deleted' && payload.lobbyId === lobbyId) {
        showError({
          message: 'Lobby closed by host',
          userMessage: 'Lobby closed by host',
          severity: ErrorSeverity.MEDIUM,
          type: ErrorType.GAMEPLAY,
          timestamp: Date.now(),
          retryable: false,
        });
        onLeave();
      }
      if (payload.type === 'match:started') {
        const match = payload.match as MatchSummary | undefined;
        if (match?.id) {
          setStarting(false);
          onStartGame({
            ...match,
            lobbyId: match.lobbyId ?? lobbyId,
            players: match.players ?? lobby?.players ?? [],
          });
        }
      }
    },
    [lobbyId, lobby, onLeave, onStartGame, playerId, showError]
  );

  const fetchLobby = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.lobby.get(lobbyId);
      setLobby(response);
    } catch (error) {
      logError(error, ErrorType.NETWORK, ErrorSeverity.HIGH, 'Failed to load lobby');
      onLeave();
    } finally {
      setLoading(false);
    }
  }, [lobbyId, logError, onLeave]);

  useEffect(() => {
    fetchLobby();
  }, [fetchLobby]);

  useEffect(() => {
    const channel = `lobby:${lobbyId}`;
    realtime.subscribe(channel, handleLobbyUpdate);
    return () => {
      realtime.unsubscribe(channel, handleLobbyUpdate);
    };
  }, [lobbyId, handleLobbyUpdate]);

  const copyCode = () => {
    navigator.clipboard.writeText(lobbyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleReady = async () => {
    try {
      const response = await api.lobby.ready({
        lobbyId,
        userId: playerId,
        ready: !myReady,
      });
      if (response.lobby) {
        setLobby(response.lobby);
      }
    } catch (error) {
      logError(error, ErrorType.NETWORK, ErrorSeverity.MEDIUM, 'Failed to update ready status');
    }
  };

  const handleStartGameClick = async () => {
    if (!canStart) return;
    setStarting(true);
    try {
      const response = await api.lobby.start({ lobbyId });
      if (response.match) {
        if (response.lobby) {
          setLobby(response.lobby);
        }
        setStarting(false);
        onStartGame(response.match);
      } else {
        throw new Error('Match did not start properly');
      }
    } catch (error) {
      setStarting(false);
      logError(error, ErrorType.NETWORK, ErrorSeverity.HIGH, 'Failed to start match');
    }
  };

  const handleRemovePlayer = async (targetUserId: string, username: string) => {
    if (!amHost || targetUserId === playerId) {
      return;
    }

    const confirmed = window.confirm(`Remove ${username} from the lobby?`);
    if (!confirmed) {
      return;
    }

    setRemovingPlayerId(targetUserId);
    try {
      const response = await api.lobby.removePlayer({
        lobbyId,
        targetUserId,
        requestedBy: playerId,
      });
      if (response.lobby) {
        setLobby(response.lobby);
      }
    } catch (error) {
      logError(error, ErrorType.NETWORK, ErrorSeverity.MEDIUM, 'Failed to remove player from lobby');
      showError({
        message: error instanceof Error ? error.message : 'Failed to remove player from lobby',
        userMessage: 'Failed to remove player from lobby',
        severity: ErrorSeverity.MEDIUM,
        type: ErrorType.NETWORK,
        timestamp: Date.now(),
        retryable: true,
      });
    } finally {
      setRemovingPlayerId(null);
    }
  };

  const handleLeaveLobby = async () => {
    try {
      await api.lobby.leave({ lobbyId, userId: playerId });
    } catch (error) {
      logError(error, ErrorType.NETWORK, ErrorSeverity.MEDIUM, 'Failed to leave lobby', { lobbyId });
    } finally {
      onLeave();
    }
  };

  if (loading && !lobby) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 flex items-center justify-center p-8">
        <div className="text-center text-purple-200">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-400 border-t-transparent mx-auto mb-6" />
          Loading lobby...
        </div>
      </div>
    );
  }

  if (!lobby) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={handleLeaveLobby}
            className="px-6 py-3 bg-purple-800/50 hover:bg-purple-700/50 text-white rounded-xl
                     font-semibold transition-all flex items-center gap-2 shadow-lg border-2 border-purple-600/30"
          >
            <X className="w-5 h-5" />
            Leave Lobby
          </button>

          <div className="bg-purple-900/40 rounded-lg px-4 py-2 border border-purple-600/30">
            <p className="text-purple-300 text-sm">Lobby Code</p>
            <div className="flex items-center gap-3">
              <span className="text-white text-2xl font-mono tracking-widest">{lobby.code}</span>
              <button
                onClick={copyCode}
                className="p-2 bg-purple-700/50 hover:bg-purple-600/60 rounded-lg transition-colors"
                title="Copy code"
              >
                {copied ? <Check className="w-5 h-5 text-white" /> : <Copy className="w-5 h-5 text-white" />}
              </button>
            </div>
            <p className="text-purple-400 text-xs mt-2 text-right">Signed in as {playerName}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-[2fr_1fr] gap-6">
          <div className="bg-purple-900/30 rounded-2xl p-6 shadow-xl border-4 border-purple-700/40">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-white">Players</h2>
              <div className="flex items-center gap-2 text-purple-200">
                <Users className="w-5 h-5" />
                <span>{players.length}/8</span>
              </div>
            </div>

            <div className="space-y-3">
              {amHost && (
                <div
                  className="bg-purple-950/60 p-4 rounded-lg border-2 border-dashed border-purple-500/60 text-center"
                >
                  <p className="text-purple-200 text-sm mb-2">
                    Share this code with friends to invite them:
                  </p>
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <span className="text-white text-3xl font-mono tracking-widest">{lobbyCode}</span>
                    <button
                      onClick={copyCode}
                      className="p-2 bg-purple-700/50 hover:bg-purple-600/60 rounded-lg transition-colors"
                      title="Copy lobby code"
                    >
                      {copied ? <Check className="w-5 h-5 text-white" /> : <Copy className="w-5 h-5 text-white" />}
                    </button>
                  </div>
                  <p className="text-purple-300 text-xs">
                    Anyone with the code can join from the main menu using <span className="font-semibold">Join with Code</span>.
                  </p>
                </div>
              )}

              {players.map((player) => (
                <div
                  key={player.userId}
                  className="bg-purple-950/50 p-4 rounded-lg border-2 border-purple-700/60 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                      {player.username.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">{player.username}</span>
                        {player.isHost && (
                          <span className="text-yellow-400 text-xs font-bold px-2 py-0.5 bg-yellow-900/40 rounded">
                            HOST
                          </span>
                        )}
                        {player.userId === playerId && (
                          <span className="text-purple-300 text-xs">(You)</span>
                        )}
                      </div>
                      <p className="text-purple-300 text-xs">
                        Joined {new Date(player.joinedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {player.ready ? (
                      <span className="text-green-400 font-semibold">Ready</span>
                    ) : (
                      <span className="text-gray-400">Not Ready</span>
                    )}
                    {amHost && player.userId !== playerId && (
                      <button
                        type="button"
                        onClick={() => handleRemovePlayer(player.userId, player.username)}
                        disabled={removingPlayerId === player.userId}
                        className="p-2 rounded-lg bg-red-900/40 hover:bg-red-800/60 text-red-200 border border-red-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Remove ${player.username}`}
                        title={`Remove ${player.username}`}
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {Array.from({ length: Math.max(0, 8 - players.length) }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="bg-purple-950/20 p-4 rounded-lg border-2 border-dashed border-purple-700/30 text-center text-purple-500"
                >
                  Waiting for player...
                </div>
              ))}
            </div>
          </div>

          <div className="bg-purple-900/30 rounded-2xl p-6 shadow-xl border-4 border-purple-700/40 space-y-4">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Lobby Settings</h3>
              <p className="text-purple-300 text-sm">Host: {players.find((p) => p.isHost)?.username}</p>
              <p className="text-purple-300 text-sm mt-1">
                Privacy: {lobby?.isPrivate ? 'Private (code required)' : 'Public'}
              </p>
            </div>

            {!amHost && (
              <button
                onClick={toggleReady}
                className={`w-full px-6 py-4 rounded-lg font-bold text-lg transition-all ${
                  myReady
                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {myReady ? 'Cancel Ready' : 'Ready Up'}
              </button>
            )}

            {amHost && (
              <button
                onClick={handleStartGameClick}
                disabled={!canStart || starting}
                className={`w-full px-6 py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                  canStart && !starting
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Play className="w-6 h-6" />
                {starting ? 'Starting...' : 'Start Game'}
              </button>
            )}

            {amHost && !canStart && (
              <p className="text-purple-300 text-sm text-center">
                {players.length < 2
                  ? 'Need at least 2 players to start'
                  : 'All players must be ready to start'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
