import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { ApiError, api, setAuthToken, setUnauthorizedHandler } from '../api/client';
import type { User } from '../api/types';
import { cacheKeys, clearCache, getCache, setCache } from '../lib/cache';
import { loadServerConfig } from '../lib/config';

const TOKEN_KEY = 'equiterm_token';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** Mensaje mostrado en login tras cierre de sesión forzado (401). */
  notice: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: (opts?: { notice?: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
  can: (module: string, action?: string) => boolean;
  clearNotice: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function deviceName(): string {
  const name = Constants.deviceName;
  const os = Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : Platform.OS;
  return `Equiterm App - ${name ? `${name} ` : ''}(${os} ${Platform.Version})`.slice(0, 120);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const loggingOut = useRef(false);

  const clearSession = useCallback(async (wipeCache: boolean) => {
    setAuthToken(null);
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      // ignorar
    }
    if (wipeCache) await clearCache();
    setUser(null);
    setStatus('signedOut');
  }, []);

  const logout = useCallback(
    async (opts?: { notice?: string }) => {
      if (loggingOut.current) return;
      loggingOut.current = true;
      try {
        // Intentar revocar el token en el servidor (sin bloquear si no hay red).
        await Promise.race([api.logout().catch(() => undefined), new Promise((r) => setTimeout(r, 3000))]);
      } finally {
        await clearSession(true);
        setNotice(opts?.notice ?? null);
        loggingOut.current = false;
      }
    },
    [clearSession],
  );

  // 401 en cualquier petición → regresar al login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (loggingOut.current) return;
      loggingOut.current = true;
      clearSession(true).finally(() => {
        setNotice('Tu sesión expiró. Inicia sesión de nuevo.');
        loggingOut.current = false;
      });
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  // Arranque: cargar servidor y token, validar con /me.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadServerConfig();
      let token: string | null = null;
      try {
        token = await SecureStore.getItemAsync(TOKEN_KEY);
      } catch {
        token = null;
      }
      if (!token) {
        if (!cancelled) setStatus('signedOut');
        return;
      }
      setAuthToken(token);
      try {
        const me = await api.me();
        if (cancelled) return;
        setUser(me);
        setStatus('signedIn');
        setCache(cacheKeys.user, me);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          await clearSession(e.status === 401);
          if (e.status === 403) setNotice(e.message);
          return;
        }
        // Sin conexión o error del servidor: entrar con el usuario guardado.
        const cached = await getCache<User>(cacheKeys.user);
        if (cached?.data) {
          setUser(cached.data);
          setStatus('signedIn');
        } else {
          await clearSession(false);
          setNotice(e instanceof Error ? e.message : 'No se pudo validar la sesión.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email.trim(), password, deviceName());
    if (!res?.token) throw new ApiError('Respuesta inválida del servidor al iniciar sesión.', 200, res);
    setAuthToken(res.token);
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, res.token);
    } catch {
      // Si falla el almacenamiento seguro, la sesión dura sólo mientras la app esté abierta.
    }
    let u = res.user;
    if (!u) u = await api.me();
    await setCache(cacheKeys.user, u);
    setNotice(null);
    setUser(u);
    setStatus('signedIn');
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await api.me();
    setUser(me);
    setCache(cacheKeys.user, me);
  }, []);

  const can = useCallback(
    (module: string, action = 'view') => {
      if (!user) return false;
      if (user.is_admin) return true;
      const actions = user.permissions?.[module];
      return Array.isArray(actions) && actions.includes(action);
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, notice, login, logout, refreshUser, can, clearNotice: () => setNotice(null) }),
    [status, user, notice, login, logout, refreshUser, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
