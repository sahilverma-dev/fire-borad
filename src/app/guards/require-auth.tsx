import { Navigate, Outlet, useLocation } from "react-router-dom";

import Loading from "@/components/custom/loading";
import { useAuth } from "@/components/providers/auth-context-provider";

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;

  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <Outlet />;
}
