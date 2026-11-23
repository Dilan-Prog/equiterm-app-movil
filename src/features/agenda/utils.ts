import { router } from 'expo-router';
import { Linking, Platform } from 'react-native';
import type { ServiceItem } from '../../api/types';
import { customerName, parseDate, personName, toYmd } from '../../lib/format';
import type { AgendaService } from './types';

/* ------------------------------------------------------------------ */
/* Fechas (nombres fijos en español de México, sin depender de Intl)  */
/* ------------------------------------------------------------------ */

export const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const WEEKDAYS_SHORT = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const x = startOfDay(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Lunes de la semana de `d`. */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7; // 0 = lunes
  return addDays(x, -dow);
}

export function sameDay(a: Date, b: Date): boolean {
  return toYmd(a) === toYmd(b);
}

/** "23 – 28 nov 2026" · "30 nov – 5 dic 2026" · "29 dic 2026 – 3 ene 2027". */
export function formatRange(a: Date, b: Date): string {
  if (a.getFullYear() !== b.getFullYear()) {
    return `${a.getDate()} ${MONTHS_SHORT[a.getMonth()]} ${a.getFullYear()} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]} ${b.getFullYear()}`;
  }
  if (a.getMonth() !== b.getMonth()) {
    return `${a.getDate()} ${MONTHS_SHORT[a.getMonth()]} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]} ${b.getFullYear()}`;
  }
  return `${a.getDate()} – ${b.getDate()} ${MONTHS_SHORT[a.getMonth()]} ${b.getFullYear()}`;
}

/** "Mar 24 nov 2026". */
export function formatShortDate(d: Date): string {
  return `${cap(WEEKDAYS_SHORT[d.getDay()].toLowerCase())} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** Encabezado de día: { title: "Hoy", subtitle: "lunes 23 de noviembre" }. */
export function dayHeading(ymd: string): { title: string; subtitle: string } {
  const d = parseDate(ymd);
  if (!d) return { title: ymd, subtitle: '' };
  const today = startOfDay(new Date());
  const long = `${WEEKDAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
  if (sameDay(d, today)) return { title: 'Hoy', subtitle: long };
  if (sameDay(d, addDays(today, 1))) return { title: 'Mañana', subtitle: long };
  if (sameDay(d, addDays(today, -1))) return { title: 'Ayer', subtitle: long };
  const year = d.getFullYear() !== today.getFullYear() ? ` de ${d.getFullYear()}` : '';
  return { title: cap(WEEKDAYS[d.getDay()]), subtitle: `${d.getDate()} de ${MONTHS[d.getMonth()]}${year}` };
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** "HH:MM" en 24 h a partir de `scheduled_at` (vacío si no trae hora). */
export function timeOf(value: unknown): string {
  if (typeof value !== 'string' || !/\d{2}:\d{2}/.test(value)) return '';
  const d = parseDate(value);
  if (!d) return '';
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/* ------------------------------------------------------------------ */
/* Servicios                                                           */
/* ------------------------------------------------------------------ */

/** Duración estimada en minutos. Números ≤ 12 se toman como horas; mayores, como minutos. */
export function durationMinutes(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v <= 0 ? null : v <= 12 ? Math.round(v * 60) : Math.round(v);
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  const hm = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]) || null;
  if (/^\d+(\.\d+)?$/.test(s)) return durationMinutes(Number(s));
  const h = s.match(/(\d+(?:[.,]\d+)?)\s*h/);
  const m = s.match(/(\d+)\s*m/);
  const total = (h ? Number(h[1].replace(',', '.')) * 60 : 0) + (m ? Number(m[1]) : 0);
  return total > 0 ? Math.round(total) : null;
}

/** "2 h" · "1 h 30 min" · "45 min". */
export function formatDuration(min: number | null): string | undefined {
  if (!min) return undefined;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

const HIGH_PRIORITY = /(alta|high|urgen|crit|crít)/i;

/** Línea descriptiva de la tarjeta: "Correctivo · Calentador de paso 500 L · Prioridad alta". */
export function serviceDescription(s: AgendaService): string | undefined {
  const main = (s.title || s.description || '').trim();
  const parts: string[] = [];
  if (main && customerName(s.customer)) parts.push(main.length > 90 ? `${main.slice(0, 88)}…` : main);
  const prio = s.priority_label || s.priority;
  if (prio && HIGH_PRIORITY.test(String(s.priority ?? prio))) {
    parts.push(/prioridad/i.test(prio) ? prio : `Prioridad ${String(prio).toLowerCase()}`);
  }
  return parts.length ? parts.join(' · ') : undefined;
}

/** Nombres de técnicos asignados (técnico principal + adicionales, sin repetir). */
export function technicianNames(s: AgendaService): string[] {
  const names = [personName(s.technician), ...(s.technicians ?? []).map(personName)].map((n) => n.trim()).filter(Boolean);
  return [...new Set(names)];
}

/** Adapta el servicio para `ServiceCard` (técnicos combinados). */
export function toCardService(s: AgendaService): ServiceItem {
  const techs = technicianNames(s);
  return { ...s, technician: techs.length ? techs.join(', ') : s.technician };
}

export function customerId(s: AgendaService): number | undefined {
  return s.customer && typeof s.customer === 'object' && s.customer.id != null ? s.customer.id : undefined;
}

/** Abre la app de mapas con la dirección del servicio. */
export async function openDirections(address: string) {
  const q = encodeURIComponent(address);
  const web = `https://www.google.com/maps/search/?api=1&query=${q}`;
  const native = Platform.select({ ios: `http://maps.apple.com/?q=${q}`, android: `geo:0,0?q=${q}`, default: web });
  try {
    await Linking.openURL(native);
  } catch {
    Linking.openURL(web).catch(() => undefined);
  }
}

/** Abre "Nuevo reporte" con el cliente y el servicio precargados. */
export function createReportFor(s: AgendaService) {
  const params: Record<string, string> = { serviceId: String(s.id) };
  const name = customerName(s.customer);
  const id = customerId(s);
  if (name) params.customerName = name;
  if (id != null) params.customerId = String(id);
  router.push({ pathname: '/reporte-nuevo', params });
}

/** Agrupa por día (YYYY-MM-DD), ordenado por hora. */
export function groupByDay(items: AgendaService[]): Map<string, AgendaService[]> {
  const groups = new Map<string, AgendaService[]>();
  for (const s of items) {
    const d = parseDate(s.scheduled_at);
    const key = d ? toYmd(d) : 'sin-fecha';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  for (const list of groups.values()) list.sort((a, b) => String(a.scheduled_at ?? '').localeCompare(String(b.scheduled_at ?? '')));
  return groups;
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}
