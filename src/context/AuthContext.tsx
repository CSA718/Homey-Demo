import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getSession, logOut as logOutFn, type BuilderAccount } from "../lib/auth";

interface AuthContextValue {
  account: BuilderAccount | null;
  refresh: () => void;
  logOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<BuilderAccount | null>(() => getSession());

  useEffect(() => {
    const refresh = () => setAccount(getSession());
    window.addEventListener("homey-auth-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("homey-auth-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const value: AuthContextValue = {
    account,
    refresh: () => setAccount(getSession()),
    logOut: () => {
      logOutFn();
      setAccount(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
