import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { account, loading } = useAuth();
  if (loading) return null;
  if (!account) return <Navigate to="/builder-login" replace />;
  return <>{children}</>;
}
