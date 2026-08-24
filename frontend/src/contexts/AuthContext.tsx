import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../lib/supabase';

// ─── Types ───
export type UserPerfil = 'gestor' | 'expedidor' | 'comum';

export interface AuthUser {
  id: string;
  email: string;
  nome: string;
  perfil: UserPerfil;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: () => {},
  isAuthenticated: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

// ─── Permission Map ───
export const PERFIL_ROUTES: Record<UserPerfil, string[]> = {
  gestor: [
    '/', '/dashboard', '/expedicao', '/producao', '/historico',
    '/estoque', '/rastreabilidade', '/logistica', '/iot', '/nps', '/tv', '/usuarios',
  ],
  expedidor: [
    '/', '/expedicao', '/producao', '/tv',
  ],
  comum: [
    '/', '/nps', '/tv',
  ],
};

export function canAccess(perfil: UserPerfil | undefined, path: string): boolean {
  if (!perfil) return false;
  return PERFIL_ROUTES[perfil]?.includes(path) ?? false;
}

export function getDefaultRoute(_perfil: UserPerfil): string {
  return '/';
}

// ─── Provider ───
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser) as AuthUser;
        setToken(savedToken);
        setUser(parsedUser);

        // Validate token is still valid
        fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` },
        })
          .then((res) => {
            if (!res.ok) {
              // Token expired or invalid
              localStorage.removeItem('auth_token');
              localStorage.removeItem('auth_user');
              setToken(null);
              setUser(null);
            }
          })
          .catch(() => {
            // Network error — keep cached session
          })
          .finally(() => setLoading(false));
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, senha: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Erro desconhecido' }));
        return { success: false, error: err.detail || 'Credenciais inválidas' };
      }

      const data = await res.json();
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Servidor offline. Verifique o backend.' };
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!user && !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
