
import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Lock } from 'lucide-react';

export function Login() {
  const {
    user,
    loading,
    error,
    clearError,
    loginWithDiscord,
    loginAsGuest,
    registerWithEmail,
    loginWithEmail,
  } = useAuth();
  const [mode, setMode] = useState<'landing' | 'guest' | 'email'>('landing');
  const [guestUsername, setGuestUsername] = useState('');
  const [guestError, setGuestError] = useState<string | null>(null);
  const [emailMode, setEmailMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailUsername, setEmailUsername] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const emailHeading = emailMode === 'register' ? 'Create Your Account' : 'Welcome Back';

  const handleGuestSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGuestError(null);
    const trimmed = guestUsername.trim();
    if (trimmed.length < 3) {
      setGuestError('Username must be at least 3 characters long.');
      return;
    }
    try {
      await loginAsGuest(trimmed);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start guest session.';
      setGuestError(message);
    }
  };

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    const trimmedEmail = email.trim();
    const passwordValue = emailPassword;
    const trimmedUsername = emailUsername.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmedEmail)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    if (passwordValue.length < 8) {
      setEmailError('Password must be at least 8 characters long.');
      return;
    }
    if (emailMode === 'register' && trimmedUsername.length < 3) {
      setEmailError('Username must be at least 3 characters long.');
      return;
    }

    try {
      if (emailMode === 'register') {
        await registerWithEmail(trimmedEmail, passwordValue, trimmedUsername);
      } else {
        await loginWithEmail(trimmedEmail, passwordValue);
      }
      setEmailPassword('');
      setEmail(trimmedEmail);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to process your request.';
      setEmailError(message);
    }
  };

  if (mode === 'guest') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="flex items-center justify-center mb-6">
            <img src="/Dorion_zIkK0aVc6b.png" alt="WordHex" className="w-48 h-48" />
          </div>

          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-4">
            WORDHEX
          </h1>
          <p className="text-purple-200 text-lg mb-8">Choose Your Username</p>

          <form onSubmit={handleGuestSubmit} className="bg-purple-900/30 rounded-2xl p-8 shadow-2xl border-4 border-purple-700/50 space-y-6">
            <div className="text-left">
              <label className="text-sm text-purple-300 uppercase tracking-widest mb-2 block">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
                <input
                  type="text"
                  value={guestUsername}
                  onChange={(e) => setGuestUsername(e.target.value)}
                  placeholder="Enter username..."
                  minLength={3}
                  maxLength={20}
                  className="w-full pl-12 pr-4 py-3 bg-purple-950/50 border-2 border-purple-600/50 rounded-lg text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50"
                  autoFocus
                />
              </div>
              <p className="text-purple-300 text-xs mt-2">3-20 characters</p>
            </div>

            {guestError && <p className="text-red-300 text-sm text-left">{guestError}</p>}

            <button
              type="submit"
              disabled={guestUsername.trim().length < 3 || loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-purple-900/50 disabled:to-purple-900/50 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-all disabled:cursor-not-allowed"
            >
              {loading ? 'Starting...' : 'Start Playing'}
            </button>

            <button
              type="button"
              onClick={() => {
                setGuestError(null);
                setMode('landing');
              }}
              className="w-full text-purple-300 hover:text-white text-sm transition-colors"
            >
              ← Back
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (mode === 'email') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="flex items-center justify-center mb-6">
            <img src="/Dorion_zIkK0aVc6b.png" alt="WordHex" className="w-48 h-48" />
          </div>

          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-4">
            WORDHEX
          </h1>
          <p className="text-purple-200 text-lg mb-8">{emailHeading}</p>

          <div className="bg-purple-900/30 rounded-2xl p-8 shadow-2xl border-4 border-purple-700/50 space-y-6 text-left">
            <div className="flex items-center justify-between bg-purple-950/40 rounded-lg p-1">
              <button
                type="button"
                onClick={() => {
                  setEmailMode('login');
                  setEmailError(null);
                }}
                className={`flex-1 py-2 text-center rounded-md text-sm font-semibold transition-colors ${
                  emailMode === 'login'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-purple-200 hover:text-white'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailMode('register');
                  setEmailError(null);
                }}
                className={`flex-1 py-2 text-center rounded-md text-sm font-semibold transition-colors ${
                  emailMode === 'register'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-purple-200 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-5">
              <div>
                <label className="text-sm text-purple-300 uppercase tracking-widest mb-2 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-12 pr-4 py-3 bg-purple-950/50 border-2 border-purple-600/50 rounded-lg text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50"
                    required
                  />
                </div>
              </div>

              {emailMode === 'register' && (
                <div>
                  <label className="text-sm text-purple-300 uppercase tracking-widest mb-2 block">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
                    <input
                      type="text"
                      value={emailUsername}
                      onChange={(e) => setEmailUsername(e.target.value)}
                      placeholder="Choose a username"
                      minLength={3}
                      maxLength={20}
                      className="w-full pl-12 pr-4 py-3 bg-purple-950/50 border-2 border-purple-600/50 rounded-lg text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm text-purple-300 uppercase tracking-widest mb-2 block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
                  <input
                    type="password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    placeholder="Enter password"
                    minLength={8}
                    className="w-full pl-12 pr-4 py-3 bg-purple-950/50 border-2 border-purple-600/50 rounded-lg text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50"
                    required
                  />
                </div>
                <p className="text-purple-300 text-xs mt-2">At least 8 characters</p>
              </div>

              {emailError && <p className="text-red-300 text-sm">{emailError}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-purple-900/50 disabled:to-purple-900/50 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-all disabled:cursor-not-allowed"
              >
                {loading
                  ? emailMode === 'register'
                    ? 'Creating account…'
                    : 'Signing in…'
                  : emailMode === 'register'
                    ? 'Create Account'
                    : 'Log In'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setMode('landing');
                setEmailError(null);
              }}
              className="w-full text-purple-300 hover:text-white text-sm transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="flex items-center justify-center mb-6">
          <img src="/Dorion_zIkK0aVc6b.png" alt="WordHex" className="w-48 h-48" />
        </div>

        <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-4">
          WORDHEX
        </h1>
        <p className="text-purple-200 text-lg mb-8">Welcome! Choose how to play:</p>

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
              {user.email && (
                <p className="text-purple-200 text-sm mt-1">Email: {user.email}</p>
              )}
            </div>
          )}

          <button
            onClick={() => setMode('guest')}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-4 rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg"
          >
            <User className="w-5 h-5 inline mr-2" />
            Play with Custom Username
          </button>

          {/* Discord OAuth temporarily disabled until backend endpoints are implemented
          <button
            onClick={() => loginWithDiscord()}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            disabled={loading}
          >
            {loading ? 'Please wait…' : 'Use Discord Identity'}
          </button>
          */}

          <button
            onClick={() => loginWithDiscord()}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            disabled={loading}
          >
            {loading ? 'Please wait…' : 'Use Discord Sign-In'}
          </button>

          <p className="text-purple-300 text-xs text-center mt-4">
            No account needed—just pick a username and start playing!
          </p>
        </div>
      </div>
    </div>
  );
}
