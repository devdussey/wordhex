import { useEffect, useMemo, useState } from 'react';
import { Loader2, X, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, realtime } from '../services/api';
import { useError } from '../contexts/ErrorContext';
import { ErrorSeverity, ErrorType } from '../types/errors';
import type { MatchmakingSnapshot, RealtimeMessage, LobbySummary } from '../types/api';

interface MatchmakingQueueProps {
  onMatchFound: (lobby: LobbySummary) => void;
  onCancel: () => void;
  serverId?: string;
}

export function MatchmakingQueue({ onCancel, onMatchFound, serverId = 'global' }: MatchmakingQueueProps) {
  const { user, getUsername } = useAuth();
  const { logError } = useError();
  const [timeInQueue, setTimeInQueue] = useState(0);
  const [queuePosition, setQueuePosition] = useState(1);
  const [playersInQueue, setPlayersInQueue] = useState(1);
  const [joining, setJoining] = useState(true);

  const playerId = user?.id || '';
  const username = useMemo(() => getUsername(), [getUsername]);

  useEffect(() => {
    let cancelled = false;

    const joinQueue = async () => {
      try {
        const result = await api.matchmaking.join({
          userId: playerId,
          username,
          serverId,
        });

        if (cancelled) return;

        if (result.status === 'matched' && result.lobby) {
          onMatchFound(result.lobby);
        } else {
          setQueuePosition(result.queuePosition || 1);
          setPlayersInQueue(result.playersInQueue || 1);
        }
      } catch (error) {
        logError(error, ErrorType.NETWORK, ErrorSeverity.HIGH, 'Failed to join matchmaking queue');
        onCancel();
      } finally {
        setJoining(false);
      }
    };

    joinQueue();

    return () => {
      cancelled = true;
    };
  }, [playerId, username, serverId, onMatchFound, onCancel, logError]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeInQueue((time) => time + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMatchmakingUpdate = (payload: RealtimeMessage) => {
      if (payload.type !== 'matchmaking:update') {
        return;
      }
      const snapshot = payload.snapshot as MatchmakingSnapshot | undefined;
      if (!snapshot) return;

      if (Array.isArray(snapshot.entries)) {
        const serverEntries = snapshot.entries.filter((entry) => entry.serverId === serverId);
        setPlayersInQueue(serverEntries.length || snapshot.queueSize || 1);
        const position =
          serverEntries.findIndex((entry) => entry.userId === playerId) + 1 ||
          serverEntries.length ||
          1;
        setQueuePosition(position);
      } else if (typeof snapshot.queueSize === 'number') {
        setPlayersInQueue(snapshot.queueSize || 1);
      }
    };

    realtime.subscribe('matchmaking:global', handleMatchmakingUpdate);
    return () => realtime.unsubscribe('matchmaking:global', handleMatchmakingUpdate);
  }, [playerId, serverId]);

  useEffect(() => {
    const handleLobbyMatch = (payload: RealtimeMessage) => {
      if (payload.type !== 'lobby:update') {
        return;
      }
      const lobby = payload.lobby as LobbySummary | undefined;
      if (!lobby || lobby.status !== 'waiting') {
        return;
      }
      if (lobby.players.some((player) => player.userId === playerId)) {
        onMatchFound(lobby);
      }
    };

    realtime.subscribe(`server:${serverId}:lobbies`, handleLobbyMatch);
    return () => realtime.unsubscribe(`server:${serverId}:lobbies`, handleLobbyMatch);
  }, [playerId, serverId, onMatchFound]);

  useEffect(() => {
    return () => {
      api.matchmaking.leave({ userId: playerId }).catch((error) => {
        logError(error, ErrorType.NETWORK, ErrorSeverity.LOW, 'Failed to leave matchmaking queue', {
          userId: playerId,
        });
      });
    };
  }, [playerId, logError]);

  const handleCancel = async () => {
    try {
      await api.matchmaking.leave({ userId: playerId });
    } catch (error) {
      logError(error, ErrorType.NETWORK, ErrorSeverity.MEDIUM, 'Failed to leave matchmaking queue');
    } finally {
      onCancel();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 flex items-center justify-center p-8">
      <div className="max-w-lg w-full">
        <div className="bg-purple-900/30 rounded-2xl p-12 shadow-2xl border-4 border-purple-700/50 text-center">
          <Loader2 className="w-16 h-16 text-purple-400 mx-auto mb-6 animate-spin" />

          <h2 className="text-4xl font-bold text-white mb-4">Searching for Players</h2>

          <div className="space-y-4 mb-8">
            <div className="bg-purple-950/50 rounded-lg p-4">
              <p className="text-purple-300 text-sm mb-1">Time in Queue</p>
              <p className="text-3xl font-bold text-white font-mono">{formatTime(timeInQueue)}</p>
            </div>

            <div className="bg-purple-950/50 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="w-5 h-5 text-purple-400" />
                <p className="text-purple-300 text-sm">Players in Queue</p>
              </div>
              <p className="text-2xl font-bold text-white">{playersInQueue}</p>
              <p className="text-purple-400 text-xs mt-1">Your position: #{queuePosition}</p>
            </div>
          </div>

          <p className="text-purple-300 text-sm mb-6">
            {joining ? 'Contacting lobby server…' : 'Matching you with up to 7 other players…'}
          </p>

          <button
            onClick={handleCancel}
            className="px-8 py-3 bg-purple-800/50 hover:bg-purple-700/50 text-white rounded-xl
                     font-semibold transition-all flex items-center gap-2 mx-auto shadow-lg border-2 border-purple-600/30"
          >
            <X className="w-5 h-5" />
            Cancel Search
          </button>
        </div>
      </div>
    </div>
  );
}
