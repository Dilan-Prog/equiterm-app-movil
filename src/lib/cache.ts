import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Caché simple en AsyncStorage para uso sin conexión.
 * Cada entrada guarda el dato y la fecha en que se guardó.
 */
const PREFIX = 'equiterm.cache.';

export type CacheEntry<T> = { data: T; savedAt: number };

export async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, savedAt: Date.now() };
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // Sin espacio o error de almacenamiento: no es crítico.
  }
}

export async function getCache<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed !== 'object' || !('data' in parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function removeCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFIX + key);
  } catch {
    // ignorar
  }
}

/** Borra toda la caché (p. ej. al cerrar sesión). */
export async function clearCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(PREFIX));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch {
    // ignorar
  }
}

export const cacheKeys = {
  user: 'me',
  reportList: (search: string) => `reportes.list.${search.trim().toLowerCase() || '_all'}`,
  report: (id: number | string) => `reportes.detail.${id}`,
  agenda: 'servicios.agenda',
  /** Inicio: primera página de reportes (conteos y pendientes de firma). */
  homeReports: 'inicio.reportes',
  /** Inicio: servicios de hoy. */
  agendaToday: (ymd: string) => `servicios.hoy.${ymd}`,
};

export function formatSavedAt(ts: number): string {
  try {
    return new Date(ts).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return new Date(ts).toISOString();
  }
}
