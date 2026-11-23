import type { ReportSummary } from '../../api/types';

/** Filtros de la lista (chips). `todos` no filtra. */
export type ReportFilter = 'todos' | 'borrador' | 'en_proceso' | 'completado' | 'firmado';

export const REPORT_FILTERS: { key: ReportFilter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'borrador', label: 'Borrador' },
  { key: 'en_proceso', label: 'En proceso' },
  { key: 'completado', label: 'Completado' },
  { key: 'firmado', label: 'Firmado' },
];

function norm(s?: string | null): string {
  return (s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s-]+/g, '_');
}

/**
 * Agrupa el status crudo del API en uno de los 4 chips. Un reporte firmado
 * (`is_signed`) siempre cuenta como "Firmado". Devuelve `null` si el status
 * no encaja en ninguno (sólo aparece en "Todos").
 */
export function reportBucket(r: Pick<ReportSummary, 'status' | 'status_label' | 'is_signed'>): Exclude<ReportFilter, 'todos'> | null {
  if (r.is_signed) return 'firmado';
  const s = norm(r.status) || norm(r.status_label);
  if (!s) return null;
  if (/(firmad|signed)/.test(s)) return 'firmado';
  if (/(borrador|draft|pendiente|pending|nuevo|new|abierto|open|creado|created)/.test(s)) return 'borrador';
  if (/(proceso|progress|curso|iniciad|started|asignad|assigned|revision|review)/.test(s)) return 'en_proceso';
  if (/(complet|finaliz|terminad|cerrad|closed|done|finished)/.test(s)) return 'completado';
  return null;
}

export function countByFilter(items: ReportSummary[]): Record<ReportFilter, number> {
  const counts: Record<ReportFilter, number> = { todos: items.length, borrador: 0, en_proceso: 0, completado: 0, firmado: 0 };
  for (const it of items) {
    const b = reportBucket(it);
    if (b) counts[b] += 1;
  }
  return counts;
}

export function applyFilter(items: ReportSummary[], filter: ReportFilter): ReportSummary[] {
  if (filter === 'todos') return items;
  return items.filter((it) => reportBucket(it) === filter);
}
