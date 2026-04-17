import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { loginUser, loadSession, clearSession } from "../lib/auth";
import type { AuthUser } from "../types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = loadSession();
    setUser(saved);
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const result = await loginUser(username, password);
    if (result.ok && result.user) {
      setUser(result.user);
    }
    return { ok: result.ok, error: result.error };
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
