import { ApiError, apiRequest } from '../../api/client';
import { getCache, setCache } from '../../lib/cache';
import type { ClientOption } from './types';

/**
 * Búsqueda de clientes: GET /clientes?search=. El endpoint puede no existir
 * todavía en el backend; en ese caso (`unavailable`) el asistente cambia a
 * captura libre (nombre del cliente + empresa).
 */
export type ClientSearchResult =
  | { kind: 'ok'; items: ClientOption[]; fromCache?: boolean }
  | { kind: 'unavailable' } // 404/405: el servidor aún no expone /clientes
  | { kind: 'offline'; items: ClientOption[] } // sin red: lo que haya en caché
  | { kind: 'error'; message: string };

const CACHE_KEY = 'clientes.list';

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : undefined;
}

/** Normaliza la forma del cliente (nombres de campo tolerantes). */
function normalize(raw: unknown): ClientOption | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = (r.id ?? r.uuid ?? r.clave) as number | string | undefined;
  const nombre = str(r.nombre) ?? str(r.name) ?? str(r.razon_social) ?? str(r.empresa) ?? str(r.company);
  if (id === undefined || id === null || !nombre) return null;
  const contacto = str(r.contacto) ?? str(r.contact_name) ?? str(r.contact) ?? str((r.contacto as Record<string, unknown>)?.nombre);
  const city = str(r.ciudad) ?? str(r.city) ?? str(r.municipio);
  const state = str(r.estado) ?? str(r.state);
  const ubicacion = str(r.ubicacion) ?? str(r.location) ?? (city ? (state ? `${city}, ${state}` : city) : undefined);
  return { id, nombre, contacto, ubicacion };
}

function filterLocal(items: ClientOption[], q: string): ClientOption[] {
  const s = q.trim().toLowerCase();
  if (!s) return items;
  return items.filter((c) => [c.nombre, c.contacto, c.ubicacion].some((x) => x?.toLowerCase().includes(s)));
}

export async function searchClients(search: string): Promise<ClientSearchResult> {
  try {
    const res = await apiRequest<unknown>('/clientes', { query: { search: search.trim() || undefined, per_page: 50 } });
    const arr = Array.isArray(res)
      ? res
      : res && typeof res === 'object' && Array.isArray((res as { data?: unknown }).data)
        ? ((res as { data: unknown[] }).data as unknown[])
        : [];
    const items = arr.map(normalize).filter((x): x is ClientOption => !!x);
    if (!search.trim()) void setCache(CACHE_KEY, items);
    return { kind: 'ok', items };
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 404 || e.status === 405) return { kind: 'unavailable' };
      if (e.status === 0) {
        const cached = await getCache<ClientOption[]>(CACHE_KEY);
        return { kind: 'offline', items: filterLocal(cached?.data ?? [], search) };
      }
      return { kind: 'error', message: e.message };
    }
    return { kind: 'error', message: e instanceof Error ? e.message : 'No se pudo buscar clientes.' };
  }
}
