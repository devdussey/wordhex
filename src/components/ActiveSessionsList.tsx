import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, LogIn } from 'lucide-react';
import { api, realtime } from '../services/api';
import { useError } from '../contexts/ErrorContext';
import { ErrorSeverity, ErrorType } from '../types/errors';
import type { LobbySummary, RealtimeMessage } from '../types/api';
import { useAuth } from '../contexts/AuthContext';

interface ActiveSessionsListProps {
  serverId: string;
  onJoinLobby: (lobby: LobbySummary) => void;
}

export function ActiveSessionsList({ serverId, onJoinLobby }: ActiveSessionsListProps) {
  const { logError } = useError();
  const { user, getUsername } = useAuth();
  const [lobbies, setLobbies] = useState<LobbySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningLobbyId, setJoiningLobbyId] = useState<string | null>(null);

  const fetchLobbies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.lobby.list({ serverId });
      setLobbies(data);
    } catch (error) {
      logError(error, ErrorType.NETWORK, ErrorSeverity.MEDIUM, 'Failed to fetch public lobbies');
    } finally {
      setLoading(false);
    }
  }, [serverId, logError]);

  useEffect(() => {
    fetchLobbies();
  }, [fetchLobbies]);

  useEffect(() => {
    const channel = `server:${serverId}:lobbies`;
    const handler = (payload: RealtimeMessage) => {
      if (payload.type === 'lobby:update' || payload.type === 'lobby:deleted') {
        fetchLobbies();
      }
    };
    realtime.subscribe(channel, handler);
    return () => realtime.unsubscribe(channel, handler);
  }, [serverId, fetchLobbies]);

  const sortedLobbies = useMemo(() => {
    return [...lobbies].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [lobbies]);

  const handleJoinLobby = useCallback(
    async (lobbyId: string) => {
      if (!user) {
        return;
      }
      setJoiningLobbyId(lobbyId);
      try {
        const response = await api.lobby.join({
          lobbyId,
          userId: user.id,
          username: getUsername(),
        });
        if (response?.lobby) {
          onJoinLobby(response.lobby);
        }
      } catch (error) {
        logError(error, ErrorType.NETWORK, ErrorSeverity.MEDIUM, 'Failed to join lobby');
      } finally {
        setJoiningLobbyId(null);
      }
    },
    [user, getUsername, onJoinLobby, logError]
  );

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border-2 border-slate-700/50">
        <h3 className="text-xl font-bold text-white mb-4">Public Lobbies</h3>
        <div className="text-center text-slate-400 py-8">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (sortedLobbies.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border-2 border-slate-700/50">
        <h3 className="text-xl font-bold text-white mb-4">Public Lobbies</h3>
        <div className="text-center text-slate-400 py-8">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No public lobbies available right now</p>
          <p className="text-sm mt-2">Create a lobby or check back soon!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border-2 border-slate-700/50">
      <h3 className="text-xl font-bold text-white mb-4">
        Public Lobbies ({sortedLobbies.length})
      </h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sortedLobbies.map((lobby) => (
          <div
            key={lobby.id}
            className="bg-slate-700/50 rounded-lg p-4 border-2 border-slate-600/50
                     hover:border-purple-500/50 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white font-semibold">Lobby #{lobby.code}</p>
                <p className="text-slate-400 text-sm">
                  Host: {lobby.players.find((p) => p.isHost)?.username ?? 'Unknown'}
                </p>
                <p className="text-slate-400 text-sm">
                  Players: {lobby.players.length} / {lobby.maxPlayers}
                </p>
              </div>
              <div className="bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/50">
                <p className="text-purple-300 text-xs font-semibold">Waiting</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="text-slate-300 text-sm">
                Created {new Date(lobby.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <button
                onClick={() => handleJoinLobby(lobby.id)}
                disabled={!user || joiningLobbyId === lobby.id}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/50
                         text-white rounded-lg font-semibold transition-colors"
              >
                <LogIn className="w-4 h-4" />
                {joiningLobbyId === lobby.id ? 'Joining...' : 'Join'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
