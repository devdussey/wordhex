import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const {
    user,
    loading,
    error,
    clearError,
    loginWithDiscord,
  } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="flex items-center justify-center mb-6">
          <img src="/Dorion_zIkK0aVc6b.png" alt="WordHex" className="w-48 h-48" />
        </div>

        <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-4">
          WORDHEX
        </h1>
        <p className="text-purple-200 text-lg mb-8">Sign in with Discord to play</p>

        <div className="bg-purple-900/30 rounded-2xl p-8 shadow-2xl border-4 border-purple-700/50 space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-lg text-left">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm leading-5">{error}</p>
                <button
                  type="button"
                  onClick={clearError}
                  className="text-red-100 hover:text-white text-xs font-semibold"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {user && (
            <div className="mb-6 pb-6 border-b border-purple-700/50">
              <p className="text-sm text-purple-300 uppercase tracking-widest mb-1">Current Player</p>
              <p className="text-white text-2xl font-bold">{user.username}</p>
              {user.discordId && (
                <p className="text-purple-200 text-sm mt-1">Discord ID: {user.discordId}</p>
              )}
            </div>
          )}

          <button
            onClick={() => loginWithDiscord()}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg disabled:from-purple-900/50 disabled:to-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Connecting…' : 'Sign in with Discord'}
          </button>

          <p className="text-purple-300 text-xs text-center mt-4">
            Discord authentication required to play
          </p>
        </div>
      </div>
    </div>
  );
}
