import { Navigate, Outlet, useSearchParams } from "react-router-dom";

import Loading from "@/components/custom/loading";
import { useAuth } from "@/components/providers/auth-context-provider";

export function PublicOnly() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();

  if (loading) return <Loading />;
  if (user) return <Navigate to={searchParams.get("next") || "/"} replace />;

  return <Outlet />;
}
