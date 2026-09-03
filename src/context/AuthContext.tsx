import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import { getSession, logOut as logOutFn, type BuilderAccount } from "../lib/auth";

interface AuthContextValue {
  account: BuilderAccount | null;
  loading: boolean;
  refresh: () => void;
  logOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<BuilderAccount | null>(null);
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
    window.addEventListener("clearparcel-auth-change", refresh);
    return () => {
      active = false;
      sub.subscription.unsubscribe();
      window.removeEventListener("clearparcel-auth-change", refresh);
    };
  }, []);

  const value: AuthContextValue = {
    account,
    loading,
    refresh,
    logOut: () => {
      logOutFn().then(() => setAccount(null));
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
