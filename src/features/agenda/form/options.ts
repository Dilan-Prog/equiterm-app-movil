import { useEffect, useState } from 'react';
import { apiRequest } from '../../../api/client';
import type { Paginated, ReportSummary, User } from '../../../api/types';
import { cacheKeys, getCache } from '../../../lib/cache';
import { customerName, personName, toYmd } from '../../../lib/format';
import type { AgendaService } from '../types';

export interface CustomerOption {
  id?: number;
  name: string;
  address?: string;
}

export interface TechnicianOption {
  id?: number;
  name: string;
}

function refId(v: unknown): number | undefined {
  return v && typeof v === 'object' && typeof (v as { id?: unknown }).id === 'number' ? (v as { id: number }).id : undefined;
}

function addUnique<T extends { id?: number; name: string }>(map: Map<string, T>, item: T) {
  const key = item.id != null ? `id:${item.id}` : `n:${item.name.toLowerCase()}`;
  const byName = [...map.entries()].find(([, v]) => v.name.toLowerCase() === item.name.toLowerCase());
  if (byName) {
    // Completar datos que falten (id, dirección).
    const prev = byName[1] as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...item };
    for (const [k, v] of Object.entries(prev)) if (v !== undefined && v !== null && v !== '') merged[k] = v;
    map.set(byName[0], merged as T);
    return;
  }
  if (!map.has(key)) map.set(key, item);
}

const CLIENTS_CACHE_KEY = 'clientes.list'; // la llena el asistente de Nuevo reporte

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

/** Normaliza un cliente de `GET /clientes` o de la caché `clientes.list`. */
function toCustomer(raw: unknown): CustomerOption | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const name = str(r.nombre) ?? str(r.name) ?? str(r.razon_social) ?? str(r.empresa) ?? str(r.company);
  if (!name) return null;
  const id = typeof r.id === 'number' ? r.id : undefined;
  const address = str(r.direccion) ?? str(r.address) ?? str(r.ubicacion) ?? str(r.location);
  return { id, name, address };
}

/** Intenta `GET /clientes` (puede no existir); si falla, usa la caché. */
async function loadClients(): Promise<CustomerOption[]> {
  try {
    const res = await apiRequest<unknown>('/clientes', { query: { per_page: 100 } });
    const arr = Array.isArray(res) ? res : Array.isArray((res as { data?: unknown })?.data) ? ((res as { data: unknown[] }).data) : [];
    return arr.map(toCustomer).filter((c): c is CustomerOption => !!c);
  } catch {
    const cached = await getCache<unknown[]>(CLIENTS_CACHE_KEY);
    return Array.isArray(cached?.data) ? cached!.data.map(toCustomer).filter((c): c is CustomerOption => !!c) : [];
  }
}

/**
 * Clientes y técnicos conocidos, tomados de lo que ya está guardado en el
 * teléfono (agenda, servicios de hoy y reportes recientes) más `GET /clientes`
 * si el servidor lo tiene. No hay catálogo de técnicos; el usuario también puede
 * escribir un cliente nuevo.
 */
export function useKnownOptions(user: User | null) {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [clients, agenda, today, reports] = await Promise.all([
        loadClients(),
        getCache<AgendaService[]>(cacheKeys.agenda),
        getCache<AgendaService[]>(cacheKeys.agendaToday(toYmd(new Date()))),
        getCache<Paginated<ReportSummary>>(cacheKeys.homeReports),
      ]);
      const cMap = new Map<string, CustomerOption>();
      const tMap = new Map<string, TechnicianOption>();
      if (user?.name) addUnique(tMap, { id: user.id, name: user.name });
      for (const c of clients) addUnique(cMap, c);
      const services = [...(Array.isArray(agenda?.data) ? agenda!.data : []), ...(Array.isArray(today?.data) ? today!.data : [])];
      for (const s of services) {
        const name = customerName(s.customer);
        if (name) addUnique(cMap, { id: refId(s.customer), name, address: s.address?.trim() || undefined });
        for (const t of [s.technician, ...(s.technicians ?? [])]) {
          const tn = personName(t).trim();
          if (tn) addUnique(tMap, { id: refId(t), name: tn });
        }
      }
      const reportList = Array.isArray(reports?.data?.data) ? reports!.data.data : [];
      for (const r of reportList) {
        const name = customerName(r.customer);
        if (name) addUnique(cMap, { id: refId(r.customer), name });
        const tn = personName(r.technician).trim();
        if (tn) addUnique(tMap, { id: refId(r.technician), name: tn });
      }
      if (!alive) return;
      setCustomers([...cMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'es')));
      const techs = [...tMap.values()];
      // El usuario actual primero, el resto alfabético.
      const me = techs.filter((t) => t.name === user?.name);
      const rest = techs.filter((t) => t.name !== user?.name).sort((a, b) => a.name.localeCompare(b.name, 'es'));
      setTechnicians([...me, ...rest]);
    })();
    return () => {
      alive = false;
    };
  }, [user?.id, user?.name]);

  return { customers, technicians };
}
