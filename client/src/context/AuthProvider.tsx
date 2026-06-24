'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';

interface AuthContextValue {
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ isLoading: true });

export function useAuthBootstrap() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const setUser = useAuthStore((s) => s.setUser);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        // Attempt silent refresh using the httpOnly refresh cookie.
        const refreshRes = await api.post('/auth/refresh');
        if (cancelled) return;
        setAccessToken(refreshRes.data.accessToken);

        const meRes = await api.get<{ user: User }>('/auth/me');
        if (cancelled) return;
        setUser(meRes.data.user);
      } catch {
        if (!cancelled) logout();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <AuthContext.Provider value={{ isLoading }}>{children}</AuthContext.Provider>;
}
