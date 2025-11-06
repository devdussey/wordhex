import { useState } from 'react';
import { MainMenu } from '../components/MainMenu';
import { TurnBasedGame } from '../components/TurnBasedGame';
import { Statistics } from '../components/Statistics';
import { Options } from '../components/Options';
import { LobbySelection } from '../components/LobbySelection';
import { LobbyRoom } from '../components/LobbyRoom';
import { DiscordLogin } from '../components/DiscordLogin';
import { Leaderboard as LegacyLeaderboard } from '../components/Leaderboard';
import { useAuth } from '../contexts/AuthContext';
import { useError } from '../contexts/ErrorContext';
import { api } from '../services/api';
import { ErrorType, ErrorSeverity } from '../types/errors';
import type { LobbySummary, MatchSummary } from '../types/api';
import { useNavigate } from '../lib/router';

type Page = 'menu' | 'lobby-selection' | 'lobby-room' | 'play' | 'statistics' | 'leaderboard' | 'options';

export function Game() {
  const navigate = useNavigate();
  const { user, getUsername, loading } = useAuth();
  const { showError, logError } = useError();
  const [currentPage, setCurrentPage] = useState<Page>('menu');
  const [activeLobby, setActiveLobby] = useState<LobbySummary | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<MatchSummary | null>(null);
  const defaultServerId = import.meta.env.VITE_SERVER_ID || 'dev-server-123';
  const [serverId] = useState(() => {
    if (typeof window === 'undefined') {
      return defaultServerId;
    }

    const discordContext = window.__WORDHEX_DISCORD_CONTEXT__;
    if (discordContext?.guildId) {
      return discordContext.guildId;
    }

    const url = new URL(window.location.href);
    const urlServerId = url.searchParams.get('serverId')?.trim();
    if (urlServerId) {
      try {
        window.localStorage.setItem('wordhex_server_id', urlServerId);
      } catch {
        // Ignore storage errors (e.g. privacy mode)
      }
      return urlServerId;
    }

    try {
      const stored = window.localStorage.getItem('wordhex_server_id');
      if (stored) {
        return stored;
      }
    } catch {
      // Ignore storage access issues
    }

    return defaultServerId;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-400 border-t-transparent mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white">Connecting to WordHex.</h2>
          <p className="text-purple-200 mt-2">Getting your player profile ready.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <DiscordLogin />;
  }

  const playerName = getUsername();
  const playerId = user.id;

  const handlePlayClick = () => {
    setCurrentPage('lobby-selection');
  };

  const handleStartLobby = async ({ isPrivate = false }: { isPrivate?: boolean } = {}) => {
    try {
      const response = await api.lobby.create({
        hostId: playerId,
        username: playerName,
        serverId,
        isPrivate,
      });
      const lobby = response?.lobby;
      if (!lobby) {
        throw new Error('Failed to create lobby');
      }
      setActiveLobby(lobby);
      setIsHost(true);
      setCurrentPage('lobby-room');
    } catch (error) {
      logError(error, ErrorType.NETWORK, ErrorSeverity.HIGH, 'Could not create lobby');
    }
  };

  const handleStartGame = (match: MatchSummary) => {
    setCurrentMatch(match);
    setCurrentPage('play');
  };

  const handlePlayAgain = async () => {
    setCurrentMatch(null);

    if (isHost) {
      await handleStartLobby({ isPrivate: false });
      return;
    }

    setActiveLobby(null);
    setIsHost(false);
    setCurrentPage('lobby-selection');
  };

  const handleLobbyJoined = (lobby: LobbySummary) => {
    setActiveLobby(lobby);
    setIsHost(false);
    setCurrentPage('lobby-room');
  };

  const handleJoinSession = async (code: string) => {
    try {
      const response = await api.lobby.join({
        code,
        userId: playerId,
        username: playerName,
      });
      const lobby = response?.lobby;
      if (!lobby) {
        throw new Error('Lobby not found');
      }
      handleLobbyJoined(lobby);
    } catch (error) {
      const appError = logError(
        error,
        ErrorType.NETWORK,
        ErrorSeverity.MEDIUM,
        error instanceof Error ? error.message : 'Failed to join lobby'
      );
      showError(appError);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'menu':
        return (
          <MainMenu
            onNavigate={(page) => {
              if (page === 'play') {
                handlePlayClick();
                return;
              }
              if (page === 'practice') {
                navigate('/practice');
                return;
              }
              setCurrentPage(page);
            }}
          />
        );
      case 'lobby-selection':
        return (
          <LobbySelection
            onStartLobby={({ isPrivate }) => handleStartLobby({ isPrivate })}
            onJoinSession={handleJoinSession}
            onBack={() => setCurrentPage('menu')}
            serverId={serverId}
            onJoinLobby={handleLobbyJoined}
          />
        );
      case 'lobby-room':
        return activeLobby ? (
          <LobbyRoom
            lobbyId={activeLobby.id}
            lobbyCode={activeLobby.code}
            playerId={playerId}
            playerName={playerName}
            isHost={isHost}
            onStartGame={handleStartGame}
            onLeave={() => {
              setActiveLobby(null);
              setCurrentMatch(null);
              setIsHost(false);
              setCurrentPage('menu');
            }}
          />
        ) : null;
      case 'play':
        return (
          <TurnBasedGame
            onBack={() => {
              setCurrentMatch(null);
              setActiveLobby(null);
              setIsHost(false);
              setCurrentPage('menu');
            }}
            serverId={serverId}
            isHost={isHost}
            match={currentMatch}
            onPlayAgain={handlePlayAgain}
          />
        );
      case 'statistics':
        return <Statistics onBack={() => setCurrentPage('menu')} />;
      case 'leaderboard':
        return <LegacyLeaderboard onBack={() => setCurrentPage('menu')} />;
      case 'options':
        return <Options onBack={() => setCurrentPage('menu')} />;
      default:
        return (
          <MainMenu
            onNavigate={(page) => {
              if (page === 'play') {
                handlePlayClick();
                return;
              }
              if (page === 'practice') {
                navigate('/practice');
                return;
              }
              setCurrentPage(page);
            }}
          />
        );
    }
  };

  return (
    <>{renderPage()}</>
  );
}

