import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useConsumerAuth } from "../context/ConsumerAuthContext";

export default function AdminProtectedRoute({ children }: { children: ReactNode }) {
  const { account: builderAccount, loading: builderLoading } = useAuth();
  const { account: consumerAccount, loading: consumerLoading } = useConsumerAuth();
  if (builderLoading || consumerLoading) return null;
  const isAdmin = Boolean(builderAccount?.isAdmin || consumerAccount?.isAdmin);
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
