import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';
import { getCache, setCache } from '../lib/cache';

export interface CachedFetchState<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: ApiError | null;
  /** Si los datos mostrados vienen de la caché (no se pudo actualizar). */
  fromCache: boolean;
  savedAt: number | null;
  reload: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Carga datos del API y los guarda en caché. Si la petición falla por red o
 * error del servidor, muestra lo último guardado.
 * Errores 401/403/404 no usan caché (se muestran tal cual).
 */
export function useCachedFetch<T>(cacheKey: string | null, fetcher: () => Promise<T>): CachedFetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const reqId = useRef(0);

  const run = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (!cacheKey) return;
      const id = ++reqId.current;
      if (mode === 'initial') {
        setLoading(true);
        setData(null);
        setFromCache(false);
        setSavedAt(null);
        // Mostrar caché mientras llega la respuesta (pantalla instantánea).
        const cached = await getCache<T>(cacheKey);
        if (id !== reqId.current) return;
        if (cached) {
          setData(cached.data);
          setSavedAt(cached.savedAt);
        }
      } else {
        setRefreshing(true);
      }
      setError(null);
      try {
        const fresh = await fetcherRef.current();
        if (id !== reqId.current) return;
        setData(fresh);
        setFromCache(false);
        setSavedAt(Date.now());
        setCache(cacheKey, fresh);
      } catch (e) {
        if (id !== reqId.current) return;
        const err = e instanceof ApiError ? e : new ApiError(String((e as Error)?.message ?? e), 0);
        setError(err);
        const recoverable = err.status === 0 || err.status >= 500;
        if (recoverable) {
          const cached = await getCache<T>(cacheKey);
          if (id !== reqId.current) return;
          if (cached) {
            setData(cached.data);
            setSavedAt(cached.savedAt);
            setFromCache(true);
          }
        } else {
          setData(null);
          setFromCache(false);
        }
      } finally {
        if (id === reqId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [cacheKey],
  );

  useEffect(() => {
    run('initial');
  }, [run]);

  return {
    data,
    loading,
    refreshing,
    error,
    fromCache,
    savedAt,
    reload: () => run('initial'),
    refresh: () => run('refresh'),
  };
}
