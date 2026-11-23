/**
 * Convierte la respuesta de GET /reportes/{id} (campos variables) en un
 * modelo de vista para el detalle: tarjeta resumen, secciones colapsables,
 * fotos y firma. Lo que no se reconoce cae en secciones genéricas.
 */
import type { ReportDetail as ReportDetailData, ReportImage } from '../../api/types';
import { customerName, formatDate, formatDateTime, formatScalar, formatTime, humanizeKey, isScalar, personName } from '../../lib/format';
import type { IconName } from '../../ui';

export type GridItem = { label: string; value: string };
export type MaterialItem = { name: string; qty: string; detail: string };

export type SectionContent =
  | { kind: 'grid'; items: GridItem[] }
  | { kind: 'bullets'; items: string[]; icon: IconName; tone: 'warn' | 'ok' | 'brandInk' | 'muted' }
  | { kind: 'text'; paragraphs: string[] }
  | { kind: 'materials'; items: MaterialItem[] }
  | { kind: 'image'; uri: string };

export interface DetailSection {
  key: string;
  title: string;
  icon: IconName;
  summary?: string;
  defaultExpanded?: boolean;
  content: SectionContent;
}

export interface SignatureInfo {
  /** URI de imagen (data: o http) o null si sólo hay datos del firmante. */
  uri: string | null;
  name: string;
  signedAt: string;
}

export interface ReportViewModel {
  id: number | string;
  folio: string;
  title: string;
  status?: string | null;
  statusLabel?: string | null;
  isSigned: boolean;
  client: string;
  contact: string;
  technician: string;
  dateText: string;
  location: string;
  sections: DetailSection[];
  images: ReportImage[];
  signature: SignatureInfo | null;
  pdfUrl: string | null;
}

/* ------------------------------------------------------------------ */

const norm = (k: string) =>
  k
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s-]+/g, '_');

const KEYS = {
  equipmentObj: ['equipment', 'equipo', 'boiler', 'caldera', 'asset', 'equipment_data', 'datos_equipo'],
  equipmentFields: [
    'equipment_type', 'tipo_equipo', 'brand', 'marca', 'model', 'modelo', 'serial_number', 'serial', 'numero_serie',
    'no_serie', 'num_serie', 'capacity', 'capacidad', 'fuel', 'combustible', 'year', 'anio', 'ano',
    'equipment_location', 'ubicacion_equipo',
  ],
  findings: ['findings', 'hallazgos', 'hallazgo', 'diagnosis', 'diagnostico', 'problems', 'issues', 'fallas'],
  work: [
    'work_performed', 'work_done', 'trabajos_realizados', 'trabajo_realizado', 'trabajos', 'activities',
    'actividades', 'tasks', 'tareas', 'services_performed',
  ],
  materials: ['materials', 'materiales', 'parts', 'refacciones', 'spare_parts', 'supplies', 'insumos'],
  readings: ['readings', 'lecturas', 'measurements', 'mediciones', 'parametros', 'parameters'],
  observations: ['observations', 'observaciones', 'notes', 'notas', 'comments', 'comentarios'],
  recommendations: ['recommendations', 'recomendaciones', 'recomendacion', 'recommendation'],
  signature: [
    'signature', 'signature_image', 'signature_base64', 'signature_url', 'signature_data', 'firma', 'firma_cliente',
    'client_signature', 'customer_signature', 'signature_path',
  ],
  signer: ['signer_name', 'signed_by', 'firmante', 'nombre_firma', 'signature_name', 'firmado_por', 'signer'],
  signedAt: ['signed_at', 'fecha_firma', 'signature_date', 'firmado_el'],
  location: ['location', 'ubicacion', 'address', 'direccion', 'city', 'ciudad', 'site', 'sucursal', 'planta'],
  contact: ['contact_name', 'contacto', 'contact', 'customer_contact'],
  title: ['title', 'titulo', 'equipment_name', 'equipment_description', 'nombre_equipo'],
  photos: ['photos', 'fotos', 'evidencias', 'evidence', 'attachments', 'adjuntos'],
};

/** Campos ya representados en el encabezado o ignorados. */
const HANDLED = new Set([
  'id', 'folio', 'status', 'status_label', 'service_date', 'customer', 'technician', 'service_type', 'is_signed',
  'updated_at', 'images', 'pdf_url', 'pdf',
]);

const LABELS: Record<string, string> = {
  type: 'Tipo',
  tipo: 'Tipo',
  equipment_type: 'Tipo',
  tipo_equipo: 'Tipo',
  serial_number: 'No. de serie',
  serial: 'No. de serie',
  numero_serie: 'No. de serie',
  no_serie: 'No. de serie',
  fuel: 'Combustible',
  year: 'Año',
  anio: 'Año',
  location: 'Ubicación',
  equipment_location: 'Ubicación',
  ubicacion: 'Ubicación',
};

const label = (k: string) => LABELS[norm(k)] ?? humanizeKey(k);

const IMAGE_URL = /^https?:\/\/.+\.(png|jpe?g|gif|webp)(\?.*)?$/i;
const LONG_TEXT = 90;

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function nonEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v as object).length > 0;
  return true;
}

function str(v: unknown): string {
  return isScalar(v) ? String(v).trim() : '';
}

function pick(obj: Record<string, unknown>, names: string[]): unknown {
  for (const [k, v] of Object.entries(obj)) if (names.includes(norm(k)) && nonEmpty(v)) return v;
  return undefined;
}

/** Texto representativo de un objeto de una lista (hallazgo, actividad…). */
function itemText(o: unknown): string {
  if (isScalar(o)) return String(o).trim();
  if (!o || typeof o !== 'object') return '';
  const obj = o as Record<string, unknown>;
  const main = pick(obj, ['description', 'descripcion', 'text', 'texto', 'detail', 'detalle', 'name', 'nombre', 'title', 'titulo', 'label', 'activity', 'actividad', 'value', 'valor']);
  if (isScalar(main)) return String(main).trim();
  return Object.entries(obj)
    .filter(([k, v]) => k !== 'id' && !/_id$/.test(k) && isScalar(v) && String(v).trim() !== '')
    .map(([, v]) => String(v))
    .slice(0, 3)
    .join(' · ');
}

/** String multilínea o arreglo → elementos de texto. */
function toItems(v: unknown): string[] {
  if (typeof v === 'string') {
    return v
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*(?:[-•*·]|\d+[.)])\s*/, '').trim())
      .filter(Boolean);
  }
  if (Array.isArray(v)) return v.map(itemText).filter(Boolean);
  if (v && typeof v === 'object') return Object.values(v as object).map(itemText).filter(Boolean);
  return isScalar(v) ? [String(v)] : [];
}

function scalarGrid(obj: Record<string, unknown>): GridItem[] {
  return Object.entries(obj)
    .filter(([k, v]) => k !== 'id' && !/_id$/.test(k) && isScalar(v) && String(v).trim() !== '')
    .map(([k, v]) => ({ label: label(k), value: formatScalar(k, v) }));
}

function toMaterials(v: unknown): MaterialItem[] {
  const arr = Array.isArray(v) ? v : typeof v === 'string' ? toItems(v) : v && typeof v === 'object' ? [v] : [];
  return arr
    .map((it): MaterialItem | null => {
      if (isScalar(it)) return { name: String(it), qty: '', detail: '' };
      if (!it || typeof it !== 'object') return null;
      const o = it as Record<string, unknown>;
      const name = str(pick(o, ['name', 'nombre', 'description', 'descripcion', 'concepto', 'concept', 'material', 'part', 'refaccion'])) || itemText(o);
      const q = str(pick(o, ['quantity', 'cantidad', 'qty', 'cant']));
      const unit = str(pick(o, ['unit', 'unidad', 'uom']));
      const used = ['name', 'nombre', 'description', 'descripcion', 'concepto', 'concept', 'material', 'part', 'refaccion', 'quantity', 'cantidad', 'qty', 'cant', 'unit', 'unidad', 'uom', 'id'];
      const detail = Object.entries(o)
        .filter(([k, val]) => !used.includes(norm(k)) && !/_id$/.test(k) && isScalar(val) && String(val).trim() !== '')
        .map(([k, val]) => `${label(k)}: ${formatScalar(k, val)}`)
        .join(' · ');
      return { name, qty: [q, unit].filter(Boolean).join(' '), detail };
    })
    .filter((x): x is MaterialItem => !!x && !!x.name);
}

function toReadings(v: unknown): GridItem[] {
  if (Array.isArray(v)) {
    return v
      .map((it, i): GridItem | null => {
        if (isScalar(it)) return { label: `Lectura ${i + 1}`, value: String(it) };
        if (!it || typeof it !== 'object') return null;
        const o = it as Record<string, unknown>;
        const l = str(pick(o, ['name', 'nombre', 'label', 'parametro', 'parameter', 'concepto', 'concept', 'description', 'descripcion', 'tipo', 'type']));
        const val = str(pick(o, ['value', 'valor', 'reading', 'lectura', 'medicion', 'measurement', 'result', 'resultado']));
        const unit = str(pick(o, ['unit', 'unidad', 'uom']));
        if (!l && !val) {
          const t = itemText(o);
          return t ? { label: `Lectura ${i + 1}`, value: t } : null;
        }
        return { label: l || `Lectura ${i + 1}`, value: [val || '—', unit].filter(Boolean).join(' ') };
      })
      .filter((x): x is GridItem => !!x);
  }
  if (v && typeof v === 'object') return scalarGrid(v as Record<string, unknown>);
  return toItems(v).map((t, i) => ({ label: `Lectura ${i + 1}`, value: t }));
}

/** Normaliza la imagen de firma: base64 crudo, data URI o URL. */
function signatureUri(v: unknown): string | null {
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return null;
    if (s.startsWith('data:image')) return s;
    if (/^https?:\/\//i.test(s) || s.startsWith('file:')) return s;
    if (s.startsWith('<svg')) return null;
    if (/^[A-Za-z0-9+/=\s]+$/.test(s) && s.length > 100) {
      const mime = s.startsWith('/9j/') ? 'image/jpeg' : 'image/png';
      return `data:${mime};base64,${s.replace(/\s+/g, '')}`;
    }
    return null;
  }
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return signatureUri(pick(o, ['image', 'url', 'data', 'base64', 'src', 'uri', 'path', 'signature', 'firma']));
  }
  return null;
}

function toPhotos(v: unknown): ReportImage[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((it, i): ReportImage | null => {
      if (typeof it === 'string' && /^https?:\/\//.test(it)) return { id: `p${i}`, url: it };
      if (!it || typeof it !== 'object') return null;
      const o = it as Record<string, unknown>;
      const url = str(pick(o, ['url', 'src', 'uri', 'image', 'path']));
      if (!/^(https?:|data:image|file:)/.test(url)) return null;
      return { id: (o.id as string | number) ?? `p${i}`, url, caption: str(pick(o, ['caption', 'descripcion', 'description', 'title', 'titulo', 'name', 'nombre'])) || null };
    })
    .filter((x): x is ReportImage => !!x);
}

/* ------------------------------------------------------------------ */

/**
 * Adapta campos del panel (simari-calderas) a los nombres que reconoce el detalle:
 * - `activity.content` (formulario de actividad) → `trabajos_realizados`.
 * - En reportes capturados en la app, `observations` guarda los hallazgos.
 * - `origin` / `captured_at` → filas legibles en «Información adicional».
 */
function normalizeServerFields(data: ReportDetailData): [string, unknown][] {
  const src = data as Record<string, unknown>;
  const fromApp = src.origin === 'app_movil';
  const out: [string, unknown][] = [];
  for (const [k, v] of Object.entries(src)) {
    if (k === 'activity' && v && typeof v === 'object' && !Array.isArray(v)) {
      const content = (v as Record<string, unknown>).content;
      if (nonEmpty(content)) out.push(['trabajos_realizados', content]);
      continue;
    }
    if (k === 'observations' && fromApp) {
      out.push(['hallazgos', v]);
      continue;
    }
    if (k === 'origin') {
      if (fromApp) out.push(['Origen', 'Capturado en la app']);
      continue;
    }
    if (k === 'captured_at') {
      if (typeof v === 'string' && v) out.push(['Capturado el', formatDateTime(v)]);
      continue;
    }
    if (k === 'form_behavior') continue;
    out.push([k, v]);
  }
  return out;
}

export function buildReportViewModel(data: ReportDetailData): ReportViewModel {
  const consumed = new Set<string>();
  const entries = normalizeServerFields(data);
  /** Primer campo no vacío cuyo nombre normalizado esté en `names`; lo marca como usado. */
  const take = (names: string[]): unknown => {
    for (const [k, v] of entries) {
      if (consumed.has(k) || HANDLED.has(k)) continue;
      if (names.includes(norm(k)) && nonEmpty(v)) {
        consumed.add(k);
        return v;
      }
    }
    return undefined;
  };
  const takeAll = (names: string[]): [string, unknown][] => {
    const out: [string, unknown][] = [];
    for (const [k, v] of entries) {
      if (consumed.has(k) || HANDLED.has(k)) continue;
      if (names.includes(norm(k)) && nonEmpty(v)) {
        consumed.add(k);
        out.push([k, v]);
      }
    }
    return out;
  };

  const customer = data.customer && typeof data.customer === 'object' ? (data.customer as Record<string, unknown>) : null;
  const company = str(customer?.company) || str(customer?.name) || customerName(data.customer);
  const contactTop = take(KEYS.contact);
  const contact =
    (customer && str(customer.company) && str(customer.name) && customer.company !== customer.name ? str(customer.name) : '') ||
    itemText(contactTop);

  // Equipo
  const eqRaw = take(KEYS.equipmentObj);
  const eqGrid: GridItem[] = [];
  let eqType = '';
  let eqCapacity = '';
  if (eqRaw && typeof eqRaw === 'object' && !Array.isArray(eqRaw)) {
    const o = eqRaw as Record<string, unknown>;
    eqGrid.push(...scalarGrid(o));
    eqType = str(pick(o, ['type', 'tipo', 'equipment_type', 'tipo_equipo', 'name', 'nombre', 'description', 'descripcion']));
    eqCapacity = str(pick(o, ['capacity', 'capacidad']));
  } else if (isScalar(eqRaw)) {
    eqType = String(eqRaw);
    eqGrid.push({ label: 'Equipo', value: eqType });
  }
  for (const [k, v] of takeAll(KEYS.equipmentFields)) {
    if (!isScalar(v)) continue;
    eqGrid.push({ label: label(k), value: formatScalar(k, v) });
    if (!eqType && ['equipment_type', 'tipo_equipo'].includes(norm(k))) eqType = String(v);
    if (!eqCapacity && ['capacity', 'capacidad'].includes(norm(k))) eqCapacity = String(v);
  }

  const titleRaw = take(KEYS.title);
  const equipmentTitle = [eqType, eqCapacity && !eqType.includes(eqCapacity) ? eqCapacity : ''].filter(Boolean).join(' ');
  const title = str(titleRaw) || equipmentTitle || str(data.service_type) || 'Reporte de servicio';

  // Ubicación
  const locRaw = take(KEYS.location);
  const location =
    (locRaw && typeof locRaw === 'object' ? itemText(locRaw) : str(locRaw)) ||
    (customer ? str(pick(customer, ['city', 'ciudad', 'location', 'ubicacion', 'address', 'direccion'])) : '');

  // Firma
  const sigRaw = take(KEYS.signature);
  const sigObj = sigRaw && typeof sigRaw === 'object' ? (sigRaw as Record<string, unknown>) : null;
  const signer = str(take(KEYS.signer)) || (sigObj ? str(pick(sigObj, ['name', 'nombre', 'signer_name', 'signed_by'])) : '');
  const signedAtRaw = take(KEYS.signedAt) ?? (sigObj ? pick(sigObj, ['signed_at', 'date', 'fecha', 'created_at']) : undefined);
  const sigUri = signatureUri(sigRaw);
  const signature: SignatureInfo | null =
    sigUri || signer || (data.is_signed && signedAtRaw)
      ? { uri: sigUri, name: signer, signedAt: signedAtRaw ? formatDateTime(signedAtRaw, '') : '' }
      : null;

  // Fotos (images + otros arreglos de fotos)
  const images: ReportImage[] = Array.isArray(data.images)
    ? data.images.filter((i): i is ReportImage => !!i && typeof i.url === 'string' && !!i.url)
    : [];
  for (const [, v] of takeAll(KEYS.photos)) images.push(...toPhotos(v));

  const sections: DetailSection[] = [];

  if (eqGrid.length) {
    sections.push({
      key: 'equipo',
      title: 'Equipo',
      icon: 'mode_heat',
      summary: [eqType, eqCapacity].filter(Boolean).join(' · ') || undefined,
      defaultExpanded: true,
      content: { kind: 'grid', items: eqGrid },
    });
  }

  const findings = takeAll(KEYS.findings).flatMap(([, v]) => toItems(v));
  if (findings.length) {
    sections.push({
      key: 'hallazgos',
      title: 'Hallazgos',
      icon: 'report',
      summary: plural(findings.length, 'hallazgo', 'hallazgos'),
      defaultExpanded: true,
      content: { kind: 'bullets', items: findings, icon: 'warning', tone: 'warn' },
    });
  }

  const work = takeAll(KEYS.work).flatMap(([, v]) => toItems(v));
  if (work.length) {
    sections.push({
      key: 'trabajos',
      title: 'Trabajos realizados',
      icon: 'build',
      summary: plural(work.length, 'actividad', 'actividades'),
      content: { kind: 'bullets', items: work, icon: 'check_circle', tone: 'ok' },
    });
  }

  const materials = takeAll(KEYS.materials).flatMap(([, v]) => toMaterials(v));
  if (materials.length) {
    sections.push({
      key: 'materiales',
      title: 'Materiales',
      icon: 'inventory_2',
      summary: plural(materials.length, 'concepto', 'conceptos'),
      content: { kind: 'materials', items: materials },
    });
  }

  const readings = takeAll(KEYS.readings).flatMap(([, v]) => toReadings(v));
  if (readings.length) {
    sections.push({
      key: 'lecturas',
      title: 'Lecturas',
      icon: 'speed',
      summary: plural(readings.length, 'lectura', 'lecturas'),
      content: { kind: 'grid', items: readings },
    });
  }

  const notes = takeAll(KEYS.observations).flatMap(([, v]) => toItems(v));
  if (notes.length) {
    sections.push({
      key: 'observaciones',
      title: 'Observaciones',
      icon: 'notes',
      summary: plural(notes.length, 'nota', 'notas'),
      content: { kind: 'text', paragraphs: notes },
    });
  }

  const recs = takeAll(KEYS.recommendations).flatMap(([, v]) => toItems(v));
  if (recs.length) {
    sections.push({
      key: 'recomendaciones',
      title: 'Recomendaciones',
      icon: 'tips_and_updates',
      summary: plural(recs.length, 'recomendación', 'recomendaciones'),
      content: { kind: 'bullets', items: recs, icon: 'arrow_right', tone: 'brandInk' },
    });
  }

  // Resto: genérico (como el detalle anterior).
  const general: GridItem[] = [];
  for (const [key, value] of entries) {
    if (consumed.has(key) || HANDLED.has(key) || !nonEmpty(value)) continue;
    if (/_id$/.test(key) && typeof value === 'number') continue;
    if (isScalar(value)) {
      if (typeof value === 'string' && IMAGE_URL.test(value)) {
        sections.push({ key, title: label(key), icon: 'image', content: { kind: 'image', uri: value } });
      } else if (typeof value === 'string' && (value.length > LONG_TEXT || value.includes('\n'))) {
        sections.push({ key, title: label(key), icon: 'notes', summary: undefined, content: { kind: 'text', paragraphs: toItems(value) } });
      } else {
        general.push({ label: label(key), value: formatScalar(key, value) });
      }
    } else if (Array.isArray(value)) {
      const items = toItems(value);
      if (items.length) {
        sections.push({ key, title: label(key), icon: 'list', summary: String(items.length), content: { kind: 'bullets', items, icon: 'circle', tone: 'muted' } });
      }
    } else if (typeof value === 'object') {
      const grid = scalarGrid(value as Record<string, unknown>);
      if (grid.length) sections.push({ key, title: label(key), icon: 'info', content: { kind: 'grid', items: grid } });
    }
  }
  if (data.updated_at) general.push({ label: 'Actualizado', value: formatDateTime(data.updated_at) });
  if (data.service_type && title !== data.service_type) general.unshift({ label: 'Tipo de servicio', value: String(data.service_type) });
  if (general.length) {
    sections.push({ key: '_general', title: 'Información adicional', icon: 'info', content: { kind: 'grid', items: general } });
  }

  const date = formatDate(data.service_date, '');
  const time = formatTime(data.service_date);

  return {
    id: data.id,
    folio: data.folio || `Reporte #${data.id}`,
    title,
    status: data.status,
    statusLabel: data.status_label,
    isSigned: !!data.is_signed,
    client: company,
    contact,
    technician: personName(data.technician),
    dateText: time ? `${date} · ${time}` : date,
    location,
    sections,
    images,
    signature,
    pdfUrl: typeof data.pdf_url === 'string' && data.pdf_url ? data.pdf_url : null,
  };
}
