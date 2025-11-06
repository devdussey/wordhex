import type { PropsWithChildren, ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { AuthSession } from "../types";

interface ProtectedRouteProps extends PropsWithChildren {
  loading: boolean;
  session: AuthSession | null;
  redirectPath?: string;
  fallback?: ReactElement;
}

const defaultFallback = (
  <div className="page-state">
    <h2 className="page-state__title">Checking your session</h2>
    <p className="page-state__message">Loading secure content…</p>
  </div>
);

export default function ProtectedRoute({
  children,
  loading,
  session,
  redirectPath = "/login",
  fallback = defaultFallback,
}: ProtectedRouteProps) {
  const location = useLocation();

  if (loading) {
    return fallback;
  }

  if (!session) {
    return <Navigate to={redirectPath} replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
