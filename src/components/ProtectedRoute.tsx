import type { Session } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { Navigate } from '../lib/router';

type ProtectedRouteProps = {
  session: Session | null;
  redirectPath?: string;
  loading?: boolean;
  fallback?: ReactNode;
  children: (session: Session) => ReactNode;
};

function DefaultFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-fuchsia-950">
      <div className="text-center text-purple-200">
        <div className="mx-auto mb-6 h-14 w-14 animate-spin rounded-full border-4 border-purple-400 border-t-transparent" />
        <p className="text-sm">Preparing your session…</p>
      </div>
    </div>
  );
}

export function ProtectedRoute({ session, redirectPath = '/login', loading, fallback, children }: ProtectedRouteProps) {
  if (loading) {
    return <>{fallback ?? <DefaultFallback />}</>;
  }

  if (!session) {
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children(session)}</>;
}
