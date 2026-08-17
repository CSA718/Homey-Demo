import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getSession, logOut as logOutFn, type ConsumerAccount } from "../lib/consumerAuth";

interface ConsumerAuthContextValue {
  account: ConsumerAccount | null;
  refresh: () => void;
  logOut: () => void;
}

const ConsumerAuthContext = createContext<ConsumerAuthContextValue | null>(null);

export function ConsumerAuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<ConsumerAccount | null>(() => getSession());

  useEffect(() => {
    const refresh = () => setAccount(getSession());
    window.addEventListener("homey-consumer-auth-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("homey-consumer-auth-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const value: ConsumerAuthContextValue = {
    account,
    refresh: () => setAccount(getSession()),
    logOut: () => {
      logOutFn();
      setAccount(null);
    },
  };

  return <ConsumerAuthContext.Provider value={value}>{children}</ConsumerAuthContext.Provider>;
}

export function useConsumerAuth() {
  const ctx = useContext(ConsumerAuthContext);
  if (!ctx) throw new Error("useConsumerAuth must be used within ConsumerAuthProvider");
  return ctx;
}
