import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import { getSession, logOut as logOutFn, type ConsumerAccount } from "../lib/consumerAuth";

interface ConsumerAuthContextValue {
  account: ConsumerAccount | null;
  loading: boolean;
  refresh: () => void;
  logOut: () => void;
}

const ConsumerAuthContext = createContext<ConsumerAuthContextValue | null>(null);

export function ConsumerAuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<ConsumerAccount | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    getSession().then(setAccount);
  };

  useEffect(() => {
    let active = true;
    getSession().then((a) => {
      if (active) {
        setAccount(a);
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      getSession().then((a) => active && setAccount(a));
    });
    window.addEventListener("homey-consumer-auth-change", refresh);
    return () => {
      active = false;
      sub.subscription.unsubscribe();
      window.removeEventListener("homey-consumer-auth-change", refresh);
    };
  }, []);

  const value: ConsumerAuthContextValue = {
    account,
    loading,
    refresh,
    logOut: () => {
      logOutFn().then(() => setAccount(null));
    },
  };

  return <ConsumerAuthContext.Provider value={value}>{children}</ConsumerAuthContext.Provider>;
}

export function useConsumerAuth() {
  const ctx = useContext(ConsumerAuthContext);
  if (!ctx) throw new Error("useConsumerAuth must be used within ConsumerAuthProvider");
  return ctx;
}
