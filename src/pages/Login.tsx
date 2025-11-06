import { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import type { AuthSession } from "../types";

interface LoginProps {
  session: AuthSession | null;
  loading: boolean;
  supabaseReady: boolean;
  onSignIn: () => Promise<void>;
}

export default function Login({ session, loading, supabaseReady, onSignIn }: LoginProps) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (session && !loading) {
      const redirectTo = (location.state as { from?: { pathname: string } } | undefined)?.from ?? {
        pathname: "/dashboard",
      };
      navigate(redirectTo, { replace: true });
    }
  }, [loading, location.state, navigate, session]);

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="page login-page">
      <section className="card">
        <h1 className="card__title">Sign in to Wordhex</h1>
        <p className="card__subtitle">
          {supabaseReady
            ? "Connect with Discord to access your stats and the competitive leaderboard."
            : "Start an offline demo session to explore the Wordhex experience."}
        </p>
        <button className="button button--primary" type="button" onClick={() => onSignIn()}>
          {supabaseReady ? "Continue with Discord" : "Start offline demo"}
        </button>
        {!supabaseReady ? (
          <p className="card__footnote">
            Supply <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your
            <code>.env</code> file to enable live Supabase authentication.
          </p>
        ) : null}
      </section>
    </main>
  );
}
