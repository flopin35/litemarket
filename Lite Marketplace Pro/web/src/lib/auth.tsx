import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, onAuthChange, refreshSession, setAccessToken } from "./api";
import type { AuthResponse, MeView } from "./types";

interface SignupInput {
  email: string;
  password: string;
  storeName: string;
  whatsapp: string;
  fullName?: string;
}

interface AuthState {
  me: MeView | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<MeView>;
  signup: (input: SignupInput) => Promise<MeView>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    refreshSession().then((auth) => {
      if (!alive) return;
      setMe(auth?.me ?? null);
      setLoading(false);
    });
    const off = onAuthChange((auth) => setMe(auth?.me ?? null));
    return () => {
      alive = false;
      off();
    };
  }, []);

  const accept = useCallback((auth: AuthResponse) => {
    setAccessToken(auth.accessToken);
    setMe(auth.me);
    return auth.me;
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      me,
      loading,
      login: async (email, password) => accept(await api.post<AuthResponse>("/api/auth/login", { email, password })),
      signup: async (input) => accept(await api.post<AuthResponse>("/api/auth/signup", input)),
      logout: async () => {
        try {
          await api.post("/api/auth/logout");
        } finally {
          setAccessToken(null);
          setMe(null);
        }
      },
      reload: async () => {
        setMe(await api.get<MeView>("/api/me"));
      },
    }),
    [me, loading, accept],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
