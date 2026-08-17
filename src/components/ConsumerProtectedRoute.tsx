import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useConsumerAuth } from "../context/ConsumerAuthContext";

export default function ConsumerProtectedRoute({ children }: { children: ReactNode }) {
  const { account, loading } = useConsumerAuth();
  if (loading) return null;
  if (!account) return <Navigate to="/account/login" replace />;
  return <>{children}</>;
}
