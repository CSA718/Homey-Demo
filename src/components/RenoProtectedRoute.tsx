import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useRenoAuth } from "../context/RenoAuthContext";

export default function RenoProtectedRoute({ children }: { children: ReactNode }) {
  const { account } = useRenoAuth();
  if (!account) return <Navigate to="/renovate/login" replace />;
  return <>{children}</>;
}
