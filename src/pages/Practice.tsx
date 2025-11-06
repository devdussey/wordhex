import { FormEvent, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

type WordRecord = {
  id: string;
  value: string;
  hint: string | null;
};

type GuessResult = {
  guess: string;
  correct: boolean;
  timestamp: string;
};

type PracticeSessionProps = {
  session: Session;
};

function PracticeSession({ session }: PracticeSessionProps) {
  const [currentWord, setCurrentWord] = useState<WordRecord | null>(null);
  const [guess, setGuess] = useState('');
  const [history, setHistory] = useState<GuessResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadWord = async () => {
    setLoading(true);
    setErrorMessage(null);
    const { data, error } = await supabase
      .from('words')
      .select('id, value, hint')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.info('[Practice] Could not load words table:', error.message);
      setErrorMessage('Connect your Supabase "words" table to surface puzzle data here.');
      setCurrentWord(null);
    } else if (data) {
      setCurrentWord(data as WordRecord);
    } else {
      setCurrentWord(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadWord();
  }, []);

  const handleGuess = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!guess.trim()) {
      return;
    }

    const normalizedGuess = guess.trim().toLowerCase();
    const isCorrect = currentWord ? normalizedGuess === currentWord.value.toLowerCase() : false;
    setHistory((prev) => [
      {
        guess: normalizedGuess,
        correct: isCorrect,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
    setGuess('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-fuchsia-950 pb-16">
      <div className="mx-auto max-w-3xl px-6 py-12 text-purple-100">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-white">Practice Arena</h1>
          <p className="mt-3 text-purple-300">
            Plug in your Supabase word bank and use this lightweight solo mode to test gameplay flows before shipping them to the main app.
          </p>
          <p className="mt-2 text-sm text-purple-400">
            Signed in as <span className="font-semibold text-purple-200">{session.user.email ?? session.user.id}</span>
          </p>
        </header>

        {loading ? (
          <div className="flex h-40 items-center justify-center rounded-3xl border border-purple-900/60 bg-purple-950/40">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-400 border-t-transparent" />
            <span className="ml-4 text-purple-200">Fetching the next puzzle…</span>
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-center text-amber-100">{errorMessage}</div>
        ) : currentWord ? (
          <div className="rounded-3xl border border-purple-900/60 bg-purple-950/60 p-8 shadow-lg">
            <h2 className="text-xl font-semibold text-white">Guess the hidden word</h2>
            {currentWord.hint && <p className="mt-2 text-sm text-purple-300">Hint: {currentWord.hint}</p>}

            <form onSubmit={handleGuess} className="mt-6 flex flex-col gap-4 md:flex-row">
              <input
                value={guess}
                onChange={(event) => setGuess(event.target.value)}
                placeholder="Type your guess"
                className="w-full rounded-xl border border-purple-800/60 bg-purple-900/50 px-4 py-3 text-purple-100 focus:border-purple-400 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-purple-700 hover:to-pink-700"
              >
                Submit guess
              </button>
            </form>
          </div>
        ) : (
          <div className="rounded-2xl border border-purple-900/60 bg-purple-950/40 p-6 text-center text-purple-200">
            No puzzles available yet. Add rows to your Supabase "words" table to start practicing here.
          </div>
        )}

        <section className="mt-12 rounded-3xl border border-purple-900/60 bg-purple-950/40 p-8 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Recent guesses</h2>
            <button
              type="button"
              onClick={() => {
                setHistory([]);
                void loadWord();
              }}
              className="text-sm font-medium text-purple-300 underline underline-offset-4 hover:text-white"
            >
              Reset puzzle
            </button>
          </div>
          {history.length === 0 ? (
            <p className="mt-4 text-purple-300">You have not made any guesses yet. Try the puzzle above!</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {history.map((item) => (
                <li
                  key={item.timestamp}
                  className={`flex items-center justify-between rounded-2xl border border-purple-900/60 bg-purple-950/60 px-4 py-3 text-sm ${
                    item.correct ? 'text-emerald-300' : 'text-purple-200'
                  }`}
                >
                  <span className="font-medium uppercase tracking-widest">{item.guess}</span>
                  <span className={item.correct ? 'font-semibold text-emerald-300' : 'text-purple-400'}>
                    {item.correct ? 'Correct' : 'Try again'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

type PracticeArenaProps = {
  onExit: () => void;
};

export function PracticeArena({ onExit }: PracticeArenaProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
      setInitializing(false);
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setInitializing(false);
      setAuthenticating(false);
      setError(null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleDiscordLogin = async () => {
    if (typeof window === 'undefined') {
      return;
    }

    setError(null);
    setAuthenticating(true);
    const redirectTo = window.location.href;

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo,
      },
    });

    if (signInError) {
      setError(signInError.message);
      setAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    setAuthenticating(true);
    await supabase.auth.signOut();
    setAuthenticating(false);
  };

  if (initializing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-fuchsia-950 px-6 py-12 text-purple-100">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-purple-400 border-t-transparent" />
        <p className="mt-4 text-sm text-purple-300">Connecting to Supabase…</p>
        <button
          type="button"
          onClick={onExit}
          className="mt-8 text-sm font-medium text-purple-300 underline underline-offset-4 hover:text-white"
        >
          Return to main menu
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-fuchsia-950 px-4 py-12">
        <div className="w-full max-w-lg space-y-6 rounded-3xl border border-purple-900/60 bg-purple-950/60 p-10 text-center shadow-2xl">
          <div className="flex items-center justify-between text-purple-300">
            <button
              type="button"
              onClick={onExit}
              className="text-sm font-medium text-purple-300 underline underline-offset-4 hover:text-white"
            >
              Back to menu
            </button>
            <span className="text-xs uppercase tracking-[0.35em] text-purple-400">Practice Arena</span>
          </div>
          <div className="flex justify-center">
            <img src="/Dorion_zIkK0aVc6b.png" alt="WordHex" className="h-28 w-28" />
          </div>
          <div>
            <h1 className="bg-gradient-to-r from-purple-300 via-pink-300 to-blue-300 bg-clip-text text-3xl font-bold text-transparent">
              Sign in to practice
            </h1>
            <p className="mt-3 text-sm text-purple-200">
              Use your Supabase-backed Discord login to play a lightweight solo mode without leaving the main Wordhex experience.
            </p>
          </div>
          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-left text-red-100">
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
            disabled={authenticating}
            className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 text-sm font-semibold text-white shadow-lg transition hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {authenticating ? 'Redirecting…' : 'Continue with Discord'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-fuchsia-950">
      <header className="border-b border-purple-900/60 bg-purple-950/60">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-6 text-purple-100 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Practice Arena</h1>
            <p className="text-sm text-purple-300">
              Signed in as <span className="font-medium text-purple-100">{session.user.email ?? session.user.id}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onExit}
              className="rounded-lg border border-purple-700/70 px-4 py-2 text-sm font-medium text-purple-200 transition hover:border-purple-500 hover:text-white"
            >
              Back to menu
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={authenticating}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {authenticating ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>
      <PracticeSession session={session} />
    </div>
  );
}

