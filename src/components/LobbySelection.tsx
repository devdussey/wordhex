import { useState } from 'react';
import { Users, Dices, ArrowLeft, Hash, Sparkles } from 'lucide-react';
import { ActiveSessionsList } from './ActiveSessionsList';
import type { LobbySummary } from '../types/api';

interface LobbySelectionProps {
  onStartLobby: (options: { isPrivate: boolean }) => void;
  onJoinSession: (sessionId: string) => void;
  onBack: () => void;
  serverId?: string;
  onJoinLobby: (lobby: LobbySummary) => void;
}

export function LobbySelection({ onStartLobby, onJoinSession, onBack, serverId, onJoinLobby }: LobbySelectionProps) {
  const [joinCode, setJoinCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [showMatchmakingInfo, setShowMatchmakingInfo] = useState(false);
  const [isPrivateLobby, setIsPrivateLobby] = useState(false);

  const handleJoinWithCode = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 4) {
      setCodeError('Code must be 4 digits');
      return;
    }
    if (!/^\d{4}$/.test(code)) {
      setCodeError('Code must contain only numbers');
      return;
    }
    setCodeError('');
    onJoinSession(code);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 p-8">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={onBack}
          className="mb-6 px-6 py-3 bg-purple-800/50 hover:bg-purple-700/50 text-white rounded-xl
                   font-semibold transition-all flex items-center gap-2 shadow-lg border-2 border-purple-600/30"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Menu
        </button>

        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Choose Game Mode</h1>
          <p className="text-purple-300 text-lg">Join a match or create your own lobby</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <button
                onClick={() => setShowMatchmakingInfo(true)}
                className="bg-gradient-to-br from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700
                         rounded-2xl p-8 shadow-2xl border-4 border-white/10
                         transform transition-all duration-200
                         hover:scale-105 hover:shadow-3xl active:scale-95
                         group relative overflow-hidden"
                aria-disabled="true"
              >
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <Sparkles className="w-12 h-12 text-white/80 animate-pulse" />
                  <span className="text-2xl font-bold text-white tracking-wide">Coming Soon</span>
                  <p className="text-white/80 text-sm px-6 text-center">
                    Global matchmaking will unlock after the core game launches.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-4 opacity-40 pointer-events-none">
                  <Dices className="w-16 h-16 text-white" />
                  <span className="text-3xl font-bold text-white">Join Random</span>
                  <p className="text-white/80 text-sm">Match with up to 7 other players</p>
                </div>
              </button>

              <div
                className="bg-gradient-to-br from-green-500 to-emerald-600
                         rounded-2xl p-8 shadow-2xl border-4 border-white/10
                         transform transition-all duration-200
                         hover:scale-105 hover:shadow-3xl active:scale-95
                         group"
              >
                <div className="flex flex-col items-center gap-4 text-center">
                  <Users className="w-16 h-16 text-white group-hover:scale-110 transition-transform" />
                  <span className="text-3xl font-bold text-white">Start Lobby</span>
                  <p className="text-white/80 text-sm">Create your own room (Max 8 players)</p>
                </div>

                <div className="mt-6 space-y-4">
                  <div
                    className="flex items-center justify-between gap-4 bg-emerald-950/50 border-2 border-emerald-300/40
                             rounded-xl px-4 py-3"
                  >
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {isPrivateLobby ? 'Private Lobby' : 'Public Lobby'}
                      </p>
                      <p className="text-emerald-100/80 text-xs">
                        {isPrivateLobby
                          ? 'Hidden from lobby browser. Share the code with friends to join.'
                          : 'Visible to everyone in this server.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isPrivateLobby}
                      aria-label={isPrivateLobby ? 'Set lobby to public' : 'Set lobby to private'}
                      onClick={() => setIsPrivateLobby((value) => !value)}
                      className={`relative inline-flex h-9 w-16 items-center rounded-full border-2 transition-colors
                        ${
                          isPrivateLobby
                            ? 'bg-purple-600 border-purple-300'
                            : 'bg-white/20 border-white/50'
                        }
                      `}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform
                          ${isPrivateLobby ? 'translate-x-7' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onStartLobby({ isPrivate: isPrivateLobby })}
                    className="w-full px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg
                             border border-white/40 shadow-lg transition-all"
                  >
                    {isPrivateLobby ? 'Start Private Lobby' : 'Start Public Lobby'}
                  </button>
                </div>
              </div>
            </div>

            {/* Join with Code */}
            <div className="bg-purple-900/30 rounded-2xl p-6 shadow-2xl border-4 border-purple-700/50">
              <div className="flex items-center gap-3 mb-4">
                <Hash className="w-6 h-6 text-purple-400" />
                <h3 className="text-2xl font-bold text-white">Join with Code</h3>
              </div>
              <p className="text-purple-300 mb-4">Enter a 4-digit lobby code</p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setJoinCode(value);
                    setCodeError('');
                  }}
                  placeholder="1234"
                  maxLength={4}
                  className="flex-1 px-6 py-4 bg-purple-950/50 border-2 border-purple-600/50 rounded-lg
                           text-white text-3xl font-mono text-center tracking-widest
                           placeholder-purple-500 focus:outline-none focus:border-pink-400 transition-colors"
                />
                <button
                  onClick={handleJoinWithCode}
                  disabled={joinCode.length !== 4}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600
                           hover:from-purple-700 hover:to-pink-700
                           disabled:opacity-50 disabled:cursor-not-allowed
                           text-white font-bold rounded-lg transition-all"
                >
                  Join
                </button>
              </div>
              {codeError && (
                <p className="text-red-400 text-sm mt-2">{codeError}</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            {serverId && (
              <ActiveSessionsList serverId={serverId} onJoinLobby={onJoinLobby} />
            )}
          </div>
        </div>
      </div>

      {showMatchmakingInfo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full bg-slate-900/95 border-2 border-purple-500/40 rounded-2xl p-8 text-center space-y-4">
            <Sparkles className="w-12 h-12 text-purple-300 mx-auto" />
            <h2 className="text-2xl font-bold text-white">Matchmaking Coming Soon</h2>
            <p className="text-slate-300">
              We&apos;re polishing the core Wordhex experience first. Random matchmaking will roll out
              right after launch so you can instantly team up with new players.
            </p>
            <button
              onClick={() => setShowMatchmakingInfo(false)}
              className="px-6 py-3 bg-purple-700 hover:bg-purple-600 text-white font-semibold rounded-lg transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
