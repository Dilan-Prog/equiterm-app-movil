import type { OutboxEntry } from '../../lib/outbox';
import type { IconName, OutboxItemStatus } from '../../ui';

export function formatBytes(bytes?: number): string | undefined {
  if (!bytes || bytes <= 0) return undefined;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "hoy a las 08:12" · "ayer a las 18:40" · "21 nov, 08:12". */
export function relativeWhen(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (isSameDay(d, now)) return `hoy a las ${hhmm(d)}`;
  if (isSameDay(d, y)) return `ayer a las ${hhmm(d)}`;
  return `el ${d.getDate()} ${MONTHS[d.getMonth()]}, ${hhmm(d)}`;
}

export function uiStatus(e: OutboxEntry): OutboxItemStatus {
  return e.status === 'error' ? 'failed' : e.status;
}

export function entryIcon(e: OutboxEntry): IconName {
  if (e.type.includes('firma') || e.type.includes('signature')) return 'signature';
  if (e.type.includes('foto') || e.type.includes('photo')) return 'photo_library';
  return 'description';
}

export function entryTitle(e: OutboxEntry): string {
  if (e.label) return e.label;
  if (e.type === 'service_report.create') return 'Reporte de servicio';
  return e.type;
}

/** Subtítulo de la fila: "Caldera 150 CC · Preventivo · 4 fotos · 1.2 MB" o "Enviado hoy a las 08:12 · 0.9 MB". */
export function entrySubtitle(e: OutboxEntry): string {
  const size = formatBytes(e.sizeBytes);
  const head = e.status === 'sent' && e.sentAt ? `Enviado ${relativeWhen(e.sentAt)}` : e.subtitle || `Guardado ${relativeWhen(e.createdAt)}`;
  return [head, size].filter(Boolean).join(' · ');
}
