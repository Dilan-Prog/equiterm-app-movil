/** Utilidades de formato tolerantes a valores nulos o inesperados. */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (typeof value === 'string' && DATE_ONLY.test(value)) {
    // Fecha sin hora: interpretar en hora local para no correr un día.
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const s = typeof value === 'string' ? value.replace(' ', 'T') : value;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function hasTime(value: unknown): boolean {
  return typeof value === 'string' && /\d{2}:\d{2}/.test(value);
}

export function formatDate(value: unknown, fallback = '—'): string {
  const d = parseDate(value);
  if (!d) return typeof value === 'string' && value ? value : fallback;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: unknown, fallback = '—'): string {
  const d = parseDate(value);
  if (!d) return typeof value === 'string' && value ? value : fallback;
  if (!hasTime(value)) return formatDate(value, fallback);
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(value: unknown, fallback = ''): string {
  const d = parseDate(value);
  if (!d || !hasTime(value)) return fallback;
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

/** YYYY-MM-DD en hora local. */
export function toYmd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function formatDayHeader(ymd: string): string {
  const d = parseDate(ymd);
  if (!d) return ymd;
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const label = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  const cap = label.charAt(0).toUpperCase() + label.slice(1);
  if (toYmd(d) === toYmd(today)) return `Hoy · ${cap}`;
  if (toYmd(d) === toYmd(tomorrow)) return `Mañana · ${cap}`;
  return cap;
}

const LABELS: Record<string, string> = {
  folio: 'Folio',
  status: 'Estatus',
  status_label: 'Estatus',
  service_date: 'Fecha de servicio',
  service_type: 'Tipo de servicio',
  customer: 'Cliente',
  technician: 'Técnico',
  created_at: 'Creado',
  updated_at: 'Actualizado',
  signed_at: 'Firmado',
  is_signed: 'Firmado',
  address: 'Dirección',
  notes: 'Notas',
  observations: 'Observaciones',
  observaciones: 'Observaciones',
  description: 'Descripción',
  diagnosis: 'Diagnóstico',
  recommendations: 'Recomendaciones',
  work_performed: 'Trabajo realizado',
  equipment: 'Equipo',
  brand: 'Marca',
  model: 'Modelo',
  serial_number: 'Número de serie',
  capacity: 'Capacidad',
  location: 'Ubicación',
  start_time: 'Hora de inicio',
  end_time: 'Hora de término',
  contact_name: 'Contacto',
  contact_phone: 'Teléfono de contacto',
  phone: 'Teléfono',
  email: 'Correo',
  signer_name: 'Firmó',
  materials: 'Materiales',
  checklist: 'Lista de verificación',
  readings: 'Lecturas',
  quantity: 'Cantidad',
  name: 'Nombre',
  value: 'Valor',
  unit: 'Unidad',
  scheduled_at: 'Programado',
  title: 'Título',
};

export function humanizeKey(key: string): string {
  if (LABELS[key]) return LABELS[key];
  const s = key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function isScalar(v: unknown): v is string | number | boolean {
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
}

const DATE_KEY = /(_at|_date|date|fecha)$/i;

/** Convierte un valor escalar en texto legible. */
export function formatScalar(key: string, v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'string' && DATE_KEY.test(key) && parseDate(v)) return formatDateTime(v);
  return String(v);
}

/** Texto para un objeto pequeño (cliente, técnico...) */
export function describeObject(o: unknown): string {
  if (!o || typeof o !== 'object') return isScalar(o) ? String(o) : '';
  const obj = o as Record<string, unknown>;
  const main = obj.name ?? obj.title ?? obj.label ?? obj.folio ?? obj.description;
  const extra = obj.company ?? obj.model ?? obj.value;
  const parts = [main, extra].filter((x) => isScalar(x) && String(x).trim() !== '').map(String);
  if (parts.length) return parts.join(' · ');
  return Object.entries(obj)
    .filter(([k, v]) => k !== 'id' && isScalar(v) && String(v).trim() !== '')
    .slice(0, 3)
    .map(([, v]) => String(v))
    .join(' · ');
}

export function customerName(c: unknown): string {
  if (!c) return '';
  if (typeof c === 'string') return c;
  if (typeof c === 'object') {
    const o = c as { name?: string | null; company?: string | null };
    if (o.company && o.name && o.company !== o.name) return `${o.company} · ${o.name}`;
    return o.company || o.name || '';
  }
  return '';
}

export function personName(p: unknown): string {
  if (!p) return '';
  if (typeof p === 'string') return p;
  if (typeof p === 'object') return (p as { name?: string | null }).name ?? '';
  return '';
}
