import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AUTH_REQUIRED_EVENT, type Me } from "@/lib/api-client";
import { data } from "@/lib/data";

type AuthState =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "error"; message: string }
  | { status: "authed"; me: Me };

interface AuthContextValue {
  state: AuthState;
  me: Me | null;
  isAdmin: boolean;
  logout: () => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const me = await data.getMe();
      setState(me ? { status: "authed", me } : { status: "anon" });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "unreachable" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Any 401 from the API (expired or revoked session) drops back to the login screen.
  useEffect(() => {
    const onAuthRequired = () => setState((current) => (current.status === "authed" ? { status: "anon" } : current));
    window.addEventListener(AUTH_REQUIRED_EVENT, onAuthRequired);
    return () => window.removeEventListener(AUTH_REQUIRED_EVENT, onAuthRequired);
  }, []);

  const logout = useCallback(async () => {
    try {
      await data.logout();
    } finally {
      setState({ status: "anon" });
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const me = state.status === "authed" ? state.me : null;
    return { state, me, isAdmin: me?.role === "admin", logout, retry: () => void load() };
  }, [state, logout, load]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
