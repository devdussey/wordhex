import { useState } from 'react';
import { api } from '../services/api';

export function LoginButton(): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (): Promise<void> => {
    if (loading) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const returnTo = window.location.href;
      const url = await api.auth.getDiscordAuthUrl(returnTo);

      if (!url) {
        throw new Error('Missing Discord OAuth URL.');
      }

      // Navigate Discord Activity frame to the OAuth flow in the top window.
      window.open(url, '_top');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Discord login failed. Please try again.';
      console.error('[LoginButton] Discord login failed:', err);
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        className="px-5 py-3 rounded-lg font-semibold bg-[#5865F2] text-white shadow-sm transition hover:bg-[#4752C4] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Connecting…' : 'Login with Discord'}
      </button>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}

export default LoginButton;
