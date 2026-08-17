import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getSession, logOut as logOutFn, type RenoAccount } from "../lib/renoAuth";

interface RenoAuthContextValue {
  account: RenoAccount | null;
  refresh: () => void;
  logOut: () => void;
}

const RenoAuthContext = createContext<RenoAuthContextValue | null>(null);

export function RenoAuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<RenoAccount | null>(() => getSession());

  useEffect(() => {
    const refresh = () => setAccount(getSession());
    window.addEventListener("homey-reno-auth-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("homey-reno-auth-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const value: RenoAuthContextValue = {
    account,
    refresh: () => setAccount(getSession()),
    logOut: () => {
      logOutFn();
      setAccount(null);
    },
  };

  return <RenoAuthContext.Provider value={value}>{children}</RenoAuthContext.Provider>;
}

export function useRenoAuth() {
  const ctx = useContext(RenoAuthContext);
  if (!ctx) throw new Error("useRenoAuth must be used within RenoAuthProvider");
  return ctx;
}
