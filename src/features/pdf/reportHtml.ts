/**
 * HTML del PDF provisional de un reporte que sigue en la bandeja de salida.
 *
 * Réplica del PDF oficial del panel (simari-calderas:
 * resources/views/admin/service-reports/pdf.blade.php + _field-data.blade.php):
 * encabezado oscuro con logo, «Reporte para», tira de metadatos, equipo/lecturas/
 * materiales, textos, fotos en 2 columnas y firma de conformidad. Diferencias:
 *
 * - No hay folio: dice «PENDIENTE DE FOLIO» y lleva la marca «PROVISIONAL».
 * - Encabezado y pie van en el flujo (primera página / final del documento) en
 *   lugar de `position: fixed` en cada página: el motor de impresión de iOS no
 *   respeta los márgenes de `@page`, así que un encabezado fijo se encimaría.
 * - Aquí sí hay flexbox (WebKit/Chromium), no las tablas que necesita DomPDF.
 *
 * Función pura (sin imports de React Native) para poder probarla en Node.
 * Todo el texto del usuario se escapa.
 */
import { EQUITERM_LOGO_DATA_URI } from './logo';

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

type Scalar = string | number | boolean | null | undefined;

/** Lo que guarda `buildReportBody` (todo opcional: viene de AsyncStorage). */
export interface LocalReportBody {
  capturado_en?: string;
  cliente?: { id?: number; nombre?: string; empresa?: string; ubicacion?: string };
  equipo?: Record<string, Scalar>;
  tipo_servicio?: string;
  hallazgos?: string;
  trabajos_realizados?: string;
  recomendaciones?: string;
  materiales?: { descripcion?: Scalar; cantidad?: Scalar; unidad?: Scalar }[];
  lecturas?: Record<string, Scalar>;
  fotos_meta?: { orden?: number; descripcion?: string }[];
  firma?: { nombre?: string; trazo?: string; ancho?: number; alto?: number; firmado_en?: string };
}

export type ReportSignature =
  /** Trazo SVG (`d`) del SignaturePad con el tamaño del lienzo. */
  | { kind: 'path'; d: string; width: number; height: number }
  /** Imagen ya lista (data URI del SVG/PNG de la firma). */
  | { kind: 'image'; src: string };

export interface ReportPhoto {
  /** data URI (o file://) de la foto. */
  src: string;
  caption?: string;
}

export interface ReportHtmlInput {
  body: LocalReportBody;
  photos: ReportPhoto[];
  signature?: ReportSignature | null;
  /** Nombre del técnico de la sesión (Encargado / Elaboró). */
  userName?: string;
  /** Momento de generación (pie de página). Default: ahora. */
  generatedAt?: Date;
}

/* ------------------------------------------------------------------ */
/* Datos fijos de Equiterm (los mismos del PDF del panel)              */
/* ------------------------------------------------------------------ */

export const EQUITERM_CONTACT = {
  email: 'administracion@equitermindustries.com.mx',
  address: 'Lic. Benito Juárez 118A, Col. Pocitos, C.P. 20328, Aguascalientes, Aguascalientes',
  web: 'equitermindustries.com.mx',
};

/** La app manda el valor corto; el panel muestra la etiqueta de ServiceReportType. */
const SERVICE_TYPE_LABEL: Record<string, string> = {
  preventivo: 'Mantenimiento Preventivo',
  correctivo: 'Mantenimiento Correctivo',
  arranque: 'Arranque',
  inspeccion: 'Inspección',
};

export function serviceTypeLabel(value?: string): string {
  const v = (value ?? '').trim();
  if (!v) return '—';
  const key = v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  return SERVICE_TYPE_LABEL[key] ?? v;
}

const EQUIPMENT_FIELDS: [string, string][] = [
  ['tipo', 'Tipo'],
  ['marca', 'Marca'],
  ['modelo', 'Modelo'],
  ['numero_serie', 'N.º de serie'],
  ['capacidad', 'Capacidad'],
  ['ubicacion', 'Ubicación'],
];

const READING_FIELDS: [string, string, string][] = [
  ['presion_operacion', 'Presión de operación', 'psi'],
  ['temperatura_chimenea', 'Temperatura de chimenea', '°C'],
  ['tds', 'TDS', 'ppm'],
  ['ph', 'pH', ''],
];

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function text(value: Scalar): string {
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function isNumeric(v: string): boolean {
  return v !== '' && Number.isFinite(Number(v));
}

const pad2 = (n: number) => String(n).padStart(2, '0');

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** dd/mm/aaaa en hora local del teléfono. */
export function formatDate(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatDateTime(d: Date): string {
  return `${formatDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Semana ISO-8601 (lunes a domingo; la semana 1 contiene el primer jueves). */
export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  return Math.ceil(((t.getTime() - yearStart) / 86400000 + 1) / 7);
}

/** Deja en el `d` del trazo solo comandos y números (no se puede inyectar nada). */
function safePathData(d: string): string {
  return d.replace(/[^MmLlHhVvCcSsQqTtAaZz0-9.,\-+eE ]/g, ' ').trim();
}

/** Solo se aceptan data URIs de imagen o archivos locales para `src`. */
function safeImageSrc(src: string): string | null {
  if (/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(src)) return src;
  if (/^file:\/\//.test(src)) return escapeHtml(src);
  return null;
}

/* ------------------------------------------------------------------ */
/* Estilos (colores y tamaños del blade)                               */
/* ------------------------------------------------------------------ */

const CSS = `
@page { size: A4; margin: 12mm 0 14mm 0; }
@page :first { margin-top: 0; }
* { box-sizing: border-box; }
html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  font-family: "DejaVu Sans", Arial, Helvetica, sans-serif;
  font-size: 11px; color: #1a1a2e; background: #fff; margin: 0; padding: 0;
  -webkit-text-size-adjust: 100%;
}

/* Encabezado */
.hdr { background: #1a1a1a; }
.hdr-body { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 20px 44px 14px 44px; }
.hdr-left { flex: 1; min-width: 0; }
.hdr-right { width: 46%; text-align: right; }
.hdr-logo { height: 28px; width: auto; display: block; }
.company-meta p { font-size: 9.5px; color: #9CA3AF; line-height: 1.7; margin: 5px 0 0 0; }
.rpt-label { font-size: 9px; font-weight: bold; color: #ff6213; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 4px; }
.rpt-number { font-size: 20px; font-weight: bold; color: #fff; line-height: 1; letter-spacing: .5px; }
.rpt-dates { margin-top: 6px; }
.rpt-dates p { font-size: 9.5px; color: #9CA3AF; line-height: 1.8; display: inline; margin: 0; }
.rpt-dates span { color: #D1D5DC; font-weight: bold; }
.prov-badge {
  display: inline-block; margin-top: 7px; padding: 2px 8px; border: 1px solid #ff6213; border-radius: 3px;
  color: #ff6213; font-size: 8px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;
}
.hdr-accent { height: 3px; background: #ff6213; }

/* Contenido */
.content { padding: 0 44px; }

/* Reporte para */
.receptor { border: 1px solid #d0d0d0; border-radius: 5px; margin: 22px 0 14px 0; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
.receptor-header { background: #1a1a1a; padding: 10px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.receptor-title { font-size: 8px; font-weight: bold; color: #ff6213; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 2px; }
.receptor-name-large { font-size: 16px; font-weight: bold; color: #fff; line-height: 1.1; }
.receptor-company-tag { font-size: 10px; color: #9CA3AF; margin-top: 2px; }
.receptor-badge { display: inline-block; background: #ff6213; color: #fff; font-size: 8px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; padding: 3px 10px; border-radius: 3px; white-space: nowrap; }
.receptor-body { background: #fafafa; padding: 14px 18px 4px 18px; display: flex; }
.receptor-col { flex: 1; min-width: 0; padding-right: 20px; }
.receptor-col + .receptor-col { padding-right: 0; border-left: 1px solid #e5e5e5; padding-left: 20px; }
.r-label { font-size: 8px; color: #999; text-transform: uppercase; letter-spacing: .8px; margin-bottom: 2px; }
.r-value { font-size: 11px; color: #1a1a2e; font-weight: bold; margin-bottom: 10px; overflow-wrap: anywhere; }

/* Condiciones */
.conditions { display: flex; gap: 12px; margin-bottom: 16px; }
.cond-item { flex: 1 1 0; min-width: 0; }
.cond-label { font-size: 9px; color: #999; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 3px; }
.cond-value { font-size: 11px; color: #333; font-weight: 600; overflow-wrap: anywhere; }

.section-title {
  font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: .08em; color: #6B7280;
  border-bottom: 1px solid #E5E7EB; padding-bottom: 4px; margin: 18px 0 10px 0;
  break-after: avoid; page-break-after: avoid;
}

/* Equipo y lecturas */
.fd-cols { display: flex; gap: 16px; margin-bottom: 8px; }
.fd-col { flex: 1; min-width: 0; }
.cf-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
.cf-table tr { border-bottom: 1px solid #F3F4F6; break-inside: avoid; }
.cf-table tr:nth-child(even) { background: #f5f5f5; }
.cf-table td { padding: 6px 8px; font-size: 10px; vertical-align: top; }
.cf-table td:first-child { color: #6B7280; width: 40%; }
.cf-table td:last-child { color: #1a1a2e; font-weight: 600; overflow-wrap: anywhere; }

/* Materiales */
.meas-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 16px; }
.meas-table thead { display: table-header-group; }
.meas-table thead tr { background: #141516; }
.meas-table thead th { padding: 9px 8px; text-align: left; font-size: 9px; color: #fff; text-transform: uppercase; letter-spacing: .6px; font-weight: bold; }
.meas-table thead th.th-right { text-align: right; }
.meas-table tbody tr { break-inside: avoid; page-break-inside: avoid; }
.meas-table tbody tr:nth-child(even) { background: #f5f5f5; }
.meas-table tbody td { padding: 8px; font-size: 10px; color: #444; border-bottom: 1px solid #eee; vertical-align: top; overflow-wrap: anywhere; }

/* Texto libre */
.text-block {
  font-size: 10px; color: #374151; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere;
  background: #F9FAFB; border: 1px solid #eee; border-radius: 4px; padding: 10px 12px; margin-bottom: 4px;
}

/* Fotos */
.photo-row { display: flex; gap: 12px; margin-bottom: 12px; break-inside: avoid; page-break-inside: avoid; }
.photo { flex: 1 1 0; min-width: 0; break-inside: avoid; page-break-inside: avoid; }
.photo img { width: 100%; max-height: 280px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e5e5; display: block; }
.photo-caption { font-size: 9px; color: #6B7280; line-height: 1.4; margin-top: 4px; overflow-wrap: anywhere; }

/* Firma */
.sig-section { margin-top: 28px; border: 1px solid #d0d0d0; border-radius: 5px; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
.sig-section-header { background: #1a1a1a; padding: 10px 18px; }
.sig-section-title { font-size: 8px; font-weight: bold; color: #ff6213; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 1px; }
.sig-section-subtitle { font-size: 9px; color: #9CA3AF; }
.sig-body { padding: 20px 44px; text-align: center; }
.sig-col-label { font-size: 8px; font-weight: bold; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; padding-bottom: 6px; border-bottom: 1px solid #eee; }
.sig-wrap { margin: 0 auto; width: 60%; }
.sig-box { height: 70px; border: 1px dashed #D1D5DB; border-radius: 4px; background: #fff; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #ccc; }
.sig-box.signed { border: 1px solid #D1D5DB; }
.sig-img { max-height: 64px; max-width: 220px; display: block; margin: 0 auto; }
.sig-line { border-bottom: 1px solid #555; margin: 12px auto 6px; width: 100%; }
.sig-name { font-size: 12px; font-weight: bold; color: #1a1a2e; margin-bottom: 2px; }
.sig-position { font-size: 10px; color: #374151; }
.sig-caption { font-size: 8px; color: #999; margin-top: 6px; text-transform: uppercase; letter-spacing: 1px; }

/* Pie */
.ftr { margin-top: 28px; background: #1a1a1a; border-top: 2px solid #ff6213; break-inside: avoid; page-break-inside: avoid; }
.ftr-inner { display: flex; align-items: center; gap: 12px; min-height: 50px; padding: 8px 44px; }
.ftr-brand { width: 22%; }
.ftr-brand img { height: 22px; width: auto; display: block; }
.ftr-center { flex: 1; text-align: center; font-size: 8px; color: #6B7280; line-height: 1.7; }
.ftr-center strong { color: #ff6213; letter-spacing: 2px; }
.ftr-right { width: 30%; text-align: right; font-size: 8px; color: #6B7280; line-height: 1.7; }
.ftr-orange { color: #ff6213; }
`;

/* ------------------------------------------------------------------ */
/* Secciones                                                           */
/* ------------------------------------------------------------------ */

function kvTable(rows: { label: string; value: string }[]): string {
  return `<table class="cf-table">${rows
    .map((r) => `<tr><td>${escapeHtml(r.label)}</td><td>${escapeHtml(r.value)}</td></tr>`)
    .join('')}</table>`;
}

function fieldData(body: LocalReportBody): string {
  const eq = body.equipo ?? {};
  const equipment = EQUIPMENT_FIELDS.map(([k, label]) => ({ label, value: text(eq[k]) })).filter((r) => r.value !== '');

  const lec = body.lecturas ?? {};
  const readings = READING_FIELDS.map(([k, label, unit]) => {
    const v = text(lec[k]);
    return { label, value: unit && isNumeric(v) ? `${v} ${unit}` : v };
  }).filter((r) => r.value !== '');

  const materials = (Array.isArray(body.materiales) ? body.materiales : [])
    .map((m) => ({ descripcion: text(m?.descripcion), cantidad: text(m?.cantidad), unidad: text(m?.unidad) }))
    .filter((m) => m.descripcion + m.cantidad + m.unidad !== '');

  if (!equipment.length && !readings.length && !materials.length) return '';

  let html = '<div class="section-title">Equipo, lecturas y materiales</div>';
  if (equipment.length || readings.length) {
    html += '<div class="fd-cols">';
    if (equipment.length) html += `<div class="fd-col"><div class="cond-label">Equipo</div>${kvTable(equipment)}</div>`;
    if (readings.length) html += `<div class="fd-col"><div class="cond-label">Lecturas</div>${kvTable(readings)}</div>`;
    html += '</div>';
  }
  if (materials.length) {
    html +=
      '<div class="cond-label" style="margin-top:6px;">Materiales utilizados</div>' +
      '<table class="meas-table"><thead><tr>' +
      '<th style="width:6%;">#</th><th style="width:62%;">Descripción</th>' +
      '<th class="th-right" style="width:16%;">Cantidad</th><th style="width:16%;">Unidad</th>' +
      '</tr></thead><tbody>' +
      materials
        .map(
          (m, i) =>
            `<tr><td style="text-align:center;color:#aaa;">${i + 1}</td>` +
            `<td style="font-weight:bold;color:#1a1a2e;">${escapeHtml(m.descripcion || '—')}</td>` +
            `<td style="text-align:right;">${escapeHtml(m.cantidad || '—')}</td>` +
            `<td style="color:#888;">${escapeHtml(m.unidad || '—')}</td></tr>`,
        )
        .join('') +
      '</tbody></table>';
  }
  return html;
}

function textSection(title: string, value?: string): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  // Sin espacios alrededor del contenido: el bloque usa white-space: pre-wrap.
  return `<div class="section-title">${escapeHtml(title)}</div><div class="text-block">${escapeHtml(v)}</div>`;
}

function photosSection(photos: ReportPhoto[]): string {
  const list = photos
    .map((p) => ({ src: safeImageSrc(p.src), caption: (p.caption ?? '').trim() }))
    .filter((p): p is { src: string; caption: string } => !!p.src);
  if (!list.length) return '';
  let rows = '';
  for (let i = 0; i < list.length; i += 2) {
    const cells = list.slice(i, i + 2).map(
      (p) =>
        `<div class="photo"><img src="${p.src}" alt="Evidencia">` +
        (p.caption ? `<div class="photo-caption">${escapeHtml(p.caption)}</div>` : '') +
        '</div>',
    );
    if (cells.length === 1) cells.push('<div class="photo"></div>');
    rows += `<div class="photo-row">${cells.join('')}</div>`;
  }
  return `<div class="section-title">Evidencia fotográfica (${list.length})</div>${rows}`;
}

function signatureMarkup(sig?: ReportSignature | null): string {
  if (!sig) return '';
  if (sig.kind === 'path') {
    const d = safePathData(sig.d);
    if (!d) return '';
    const w = Math.max(1, Math.round(Number(sig.width) || 300));
    const h = Math.max(1, Math.round(Number(sig.height) || 150));
    return (
      `<svg class="sig-img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" ` +
      `style="width:220px;height:64px;" preserveAspectRatio="xMidYMid meet">` +
      `<path d="${d}" stroke="#141516" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    );
  }
  const src = safeImageSrc(sig.src);
  return src ? `<img src="${src}" class="sig-img" alt="Firma">` : '';
}

/* ------------------------------------------------------------------ */
/* Documento                                                           */
/* ------------------------------------------------------------------ */

export function buildReportHtml(input: ReportHtmlInput): string {
  const body = input.body ?? {};
  const generatedAt = input.generatedAt ?? new Date();
  const serviceDate = parseDate(body.capturado_en) ?? generatedAt;
  const fecha = formatDate(serviceDate);
  const semana = isoWeek(serviceDate);

  const customerName = text(body.cliente?.nombre) || 'Cliente';
  const company = text(body.cliente?.empresa);
  const location = text(body.cliente?.ubicacion) || text(body.equipo?.ubicacion);
  const tipo = serviceTypeLabel(body.tipo_servicio);
  const user = (input.userName ?? '').trim() || '—';

  const sigImg = signatureMarkup(input.signature);
  const signed = !!sigImg;
  const status = signed ? 'Firmado' : 'Completado';
  const signerName = text(body.firma?.nombre) || customerName;
  const logo = `<img src="${EQUITERM_LOGO_DATA_URI}" alt="Equiterm Industries" class="hdr-logo">`;

  const header =
    '<div class="hdr"><div class="hdr-body">' +
    `<div class="hdr-left">${logo}<div class="company-meta">` +
    `<p>${escapeHtml(EQUITERM_CONTACT.email)}</p><p>${escapeHtml(EQUITERM_CONTACT.address)}</p></div></div>` +
    '<div class="hdr-right">' +
    '<div class="rpt-label">Reporte de Servicio</div>' +
    '<div class="rpt-number">PENDIENTE DE FOLIO</div>' +
    '<div class="rpt-dates">' +
    `<p>Fecha: <span>${fecha}</span></p>` +
    `<p>&nbsp;&nbsp;Semana: <span>${semana}</span></p>` +
    `<p>&nbsp;&nbsp;Estado: <span>${status}</span></p>` +
    '</div>' +
    '<div class="prov-badge">Provisional</div>' +
    '</div></div><div class="hdr-accent"></div></div>';

  const receptor =
    '<div class="receptor"><div class="receptor-header"><div>' +
    '<div class="receptor-title">Reporte para</div>' +
    `<div class="receptor-name-large">${escapeHtml(customerName)}</div>` +
    (company ? `<div class="receptor-company-tag">${escapeHtml(company)}</div>` : '') +
    `</div><div><div class="receptor-badge">${escapeHtml(tipo)}</div></div></div>` +
    '<div class="receptor-body"><div class="receptor-col">' +
    (company
      ? `<div class="r-label">Empresa</div><div class="r-value">${escapeHtml(company)}</div>`
      : `<div class="r-label">Cliente</div><div class="r-value">${escapeHtml(customerName)}</div>`) +
    '</div><div class="receptor-col">' +
    `<div class="r-label">Fecha de Servicio</div><div class="r-value">${fecha}</div>` +
    (location ? `<div class="r-label">Ubicación</div><div class="r-value">${escapeHtml(location)}</div>` : '') +
    '</div></div></div>';

  const cond = (label: string, value: string) =>
    `<div class="cond-item"><div class="cond-label">${escapeHtml(label)}</div><div class="cond-value">${escapeHtml(value)}</div></div>`;
  const conditions =
    '<div class="conditions">' +
    cond('Tipo de Servicio', tipo) +
    cond('Fecha', fecha) +
    (location ? cond('Ubicación', location) : '') +
    cond('Encargado', user) +
    cond('Elaboró', user) +
    '</div>';

  const photos = photosSection(
    input.photos.map((p, i) => ({ ...p, caption: p.caption ?? body.fotos_meta?.[i]?.descripcion })),
  );

  const signature =
    '<div class="sig-section"><div class="sig-section-header">' +
    '<div class="sig-section-title">Firma de Conformidad</div>' +
    '<div class="sig-section-subtitle">Este documento certifica que el servicio fue realizado satisfactoriamente</div>' +
    '</div><div class="sig-body">' +
    '<div class="sig-col-label">Firma de Recibido — Cliente</div>' +
    `<div class="sig-wrap"><div class="sig-box${signed ? ' signed' : ''}">${signed ? sigImg : 'Firma aquí'}</div>` +
    '<div class="sig-line"></div>' +
    `<div class="sig-name">${escapeHtml(signerName)}</div>` +
    (company ? `<div class="sig-position">${escapeHtml(company)}</div>` : '') +
    '<div class="sig-caption">Nombre y Firma</div>' +
    '</div></div></div>';

  const footer =
    '<div class="ftr"><div class="ftr-inner">' +
    `<div class="ftr-brand"><img src="${EQUITERM_LOGO_DATA_URI}" alt="Equiterm Industries"></div>` +
    '<div class="ftr-center"><strong>PROVISIONAL</strong><br>' +
    `PDF provisional generado en el teléfono el ${formatDateTime(generatedAt)}.<br>` +
    'El folio oficial se asigna al enviar.</div>' +
    `<div class="ftr-right">${escapeHtml(EQUITERM_CONTACT.email)}<br><span class="ftr-orange">${escapeHtml(EQUITERM_CONTACT.web)}</span></div>` +
    '</div></div>';

  return (
    '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    `<title>Reporte provisional · ${escapeHtml(customerName)}</title>` +
    `<style>${CSS}</style></head><body>` +
    header +
    '<div class="content">' +
    receptor +
    conditions +
    fieldData(body) +
    textSection('Actividades Realizadas', body.trabajos_realizados) +
    textSection('Observaciones', body.hallazgos) +
    textSection('Recomendaciones', body.recomendaciones) +
    photos +
    signature +
    '</div>' +
    footer +
    '</body></html>'
  );
}
