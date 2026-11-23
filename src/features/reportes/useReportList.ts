import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api } from '../../api/client';
import type { ReportSummary } from '../../api/types';
import { useOnline } from '../../hooks/useOnline';
import { cacheKeys, getCache, setCache } from '../../lib/cache';

export const PER_PAGE = 20;
export const SEARCH_DEBOUNCE_MS = 600;

type CachedList = { items: ReportSummary[]; lastPage: number; total: number | null };

export interface ReportListState {
  /** Texto del buscador (inmediato). */
  query: string;
  setQuery: (q: string) => void;
  /** Búsqueda aplicada (con debounce de 600 ms). */
  search: string;
  /** Aplica la búsqueda sin esperar el debounce (botón "buscar" del teclado). */
  submitSearch: () => void;
  items: ReportSummary[];
  total: number | null;
  /** Primera carga sin datos que mostrar. */
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: ApiError | null;
  /** Lo mostrado viene de la caché (no se pudo actualizar). */
  fromCache: boolean;
  savedAt: number | null;
  hasMore: boolean;
  reload: () => void;
  refresh: () => void;
  loadMore: () => void;
}

/**
 * Lista paginada de reportes con búsqueda (debounce), caché sin conexión,
 * deslizar para actualizar y scroll infinito. La caché de la primera página
 * se muestra al instante mientras llega la respuesta.
 */
export function useReportList(): ReportListState {
  const online = useOnline();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<ReportSummary[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const loadFirstPage = useCallback(
    async (mode: 'initial' | 'refresh') => {
      const id = ++reqId.current;
      const key = cacheKeys.reportList(search);
      setError(null);
      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoading(true);
        // Pantalla instantánea: lo último guardado mientras responde el servidor.
        const cached = await getCache<CachedList>(key);
        if (id !== reqId.current) return;
        setPage(1);
        setLastPage(1);
        if (cached) {
          setItems(cached.data.items ?? []);
          setTotal(cached.data.total ?? null);
          setSavedAt(cached.savedAt);
          setLoading(false);
        } else {
          setItems([]);
          setTotal(null);
        }
      }
      try {
        const res = await api.reports({ search, page: 1, per_page: PER_PAGE });
        if (id !== reqId.current) return;
        const data = Array.isArray(res?.data) ? res.data : [];
        const lp = Number(res?.meta?.last_page ?? 1) || 1;
        const tot = res?.meta?.total ?? null;
        setItems(data);
        setPage(1);
        setLastPage(lp);
        setTotal(tot);
        setFromCache(false);
        setSavedAt(Date.now());
        setCache<CachedList>(key, { items: data, lastPage: lp, total: tot });
      } catch (e) {
        if (id !== reqId.current) return;
        const err = e instanceof ApiError ? e : new ApiError('Error inesperado', 0);
        setError(err);
        if (err.status === 0 || err.status >= 500) {
          const cached = await getCache<CachedList>(key);
          if (id !== reqId.current) return;
          if (cached) {
            setItems(cached.data.items ?? []);
            setTotal(cached.data.total ?? null);
            setPage(1);
            setLastPage(1);
            setFromCache(true);
            setSavedAt(cached.savedAt);
            return;
          }
        }
        setItems([]);
        setTotal(null);
        setFromCache(false);
      } finally {
        if (id === reqId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [search],
  );

  useEffect(() => {
    loadFirstPage('initial');
  }, [loadFirstPage]);

  // Al volver la conexión, si lo mostrado es de la caché, actualizar.
  const wasOffline = useRef(false);
  useEffect(() => {
    if (online === false) wasOffline.current = true;
    else if (online && wasOffline.current) {
      wasOffline.current = false;
      if (fromCache) loadFirstPage('refresh');
    }
  }, [online, fromCache, loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || refreshing || fromCache || page >= lastPage) return;
    const id = reqId.current;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await api.reports({ search, page: next, per_page: PER_PAGE });
      if (id !== reqId.current) return;
      const data = Array.isArray(res?.data) ? res.data : [];
      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...data.filter((x) => !seen.has(x.id))];
      });
      setPage(next);
      setLastPage(Number(res?.meta?.last_page ?? next) || next);
    } catch {
      // Se reintenta en el siguiente onEndReached.
    } finally {
      if (id === reqId.current) setLoadingMore(false);
    }
  }, [loading, loadingMore, refreshing, fromCache, page, lastPage, search]);

  return {
    query,
    setQuery,
    search,
    submitSearch: () => setSearch(query.trim()),
    items,
    total,
    loading,
    refreshing,
    loadingMore,
    error,
    fromCache,
    savedAt,
    hasMore: !fromCache && page < lastPage,
    reload: () => loadFirstPage('initial'),
    refresh: () => loadFirstPage('refresh'),
    loadMore,
  };
}
