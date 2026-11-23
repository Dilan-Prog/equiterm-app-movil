import { apiRequest } from '../../api/client';
import { cacheKeys } from '../../lib/cache';
import type { AgendaService } from './types';

/** `GET /servicios?from=YYYY-MM-DD&to=YYYY-MM-DD` → lista de servicios. */
export async function fetchAgenda(from: string, to: string): Promise<AgendaService[]> {
  const res = await apiRequest<{ data?: AgendaService[] } | AgendaService[]>('/servicios', { query: { from, to } });
  if (Array.isArray(res)) return res;
  return Array.isArray(res?.data) ? res.data : [];
}

/** Claves de caché de la agenda (la lista reutiliza la clave compartida). */
export const agendaCacheKeys = {
  list: cacheKeys.agenda,
  week: (mondayYmd: string) => `servicios.semana.${mondayYmd}`,
};
