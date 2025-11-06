import { useState } from 'react';
import { Navigate } from '../lib/router';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

type LoginProps = {
  session: Session | null;
};

export function Login({ session }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) {
    return <Navigate to="/" replace />;
  }

  const handleDiscordLogin = async () => {
    setError(null);
    setLoading(true);
    const redirectTo = `${window.location.origin}`;

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo,
      },
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-purple-800/60 bg-purple-900/40 p-10 text-center shadow-2xl">
        <div className="mb-6 flex items-center justify-center">
          <img src="/Dorion_zIkK0aVc6b.png" alt="WordHex" className="h-32 w-32" />
        </div>
        <h1 className="bg-gradient-to-r from-purple-300 via-pink-300 to-blue-300 bg-clip-text text-4xl font-bold text-transparent">
          WordHex
        </h1>
        <p className="mt-3 text-purple-200">Sign in with Discord to continue</p>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/50 bg-red-500/20 p-4 text-left text-red-100">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm leading-5">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-xs font-semibold text-red-100 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleDiscordLogin}
          disabled={loading}
          className="mt-8 w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 text-sm font-semibold text-white shadow-lg transition hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Redirecting…' : 'Continue with Discord'}
        </button>
        <p className="mt-4 text-xs text-purple-300">Discord authentication is required to play WordHex.</p>
      </div>
    </div>
  );
}
