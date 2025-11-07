import type { Session } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { Navigate } from '../lib';

type ProtectedRouteProps = {
  session: Session | null;
  redirectPath?: string;
  children: (session: Session) => ReactNode;
};

export function ProtectedRoute({ session, redirectPath = '/login', children }: ProtectedRouteProps) {
  if (!session) {
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children(session)}</>;
}
