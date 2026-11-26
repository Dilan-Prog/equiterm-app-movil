import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Print from 'expo-print';
import { Platform } from 'react-native';
import type { OutboxEntry, OutboxFile } from '../../lib/outbox';
import { buildReportHtml, type LocalReportBody, type ReportPhoto, type ReportSignature } from './reportHtml';
import { deletePdf, existingPdf, localPdfFile } from './storage';

/**
 * PDF provisional de un reporte que sigue en la bandeja de salida, generado en
 * el teléfono sin conexión (HTML de `reportHtml.ts` → `expo-print`).
 *
 * Tamaño: las fotos se decodifican a máx. {@link PDF_PHOTO_MAX} px por lado y se
 * vuelven a comprimir (JPEG {@link PDF_PHOTO_QUALITY}) antes de incrustarlas
 * como data URI. En el PDF cada foto mide ~9 cm de ancho, así que 1000 px dan
 * ~280 ppp: nítido al imprimir y ~100–200 KB por foto en lugar de 0.5 MB.
 *
 * Regeneración: el cuerpo y los archivos de una entrada de la bandeja no
 * cambian después de encolarse (solo su estado/intentos), así que el PDF se
 * reutiliza mientras exista y sea posterior a `entry.createdAt`. Se regenera
 * con `{ force: true }` o si el archivo no existe. El PDF se borra cuando la
 * entrada sale de la bandeja (enganche en `outbox.ts`).
 */

/** Lado máximo (px) de las fotos dentro del PDF. */
export const PDF_PHOTO_MAX = 1000;
/** Calidad JPEG de las fotos dentro del PDF (0–1). */
export const PDF_PHOTO_QUALITY = 0.6;

/** A4 en puntos (72 ppp), como espera `printToFileAsync`. */
const A4 = { width: 595, height: 842 };
/**
 * iOS ignora los márgenes de `@page`; se los pasamos al motor de impresión para
 * que las páginas 2+ no empiecen pegadas al borde. (Android sí respeta `@page`,
 * incluido `:first` sin margen superior para el encabezado a sangre.)
 */
const IOS_MARGINS = { top: 28, bottom: 34, left: 0, right: 0 };

export interface LocalPdfOptions {
  /** Nombre del técnico de la sesión (Encargado / Elaboró). */
  userName?: string;
  /** Regenerar aunque ya exista. */
  force?: boolean;
}

export function isReportEntry(entry: Pick<OutboxEntry, 'type' | 'endpoint'>): boolean {
  return entry.type === 'service_report.create' || entry.endpoint.replace(/^\//, '') === 'reportes';
}

/** Se puede generar mientras la entrada conserva sus archivos (no enviada). */
export function canGenerateLocalPdf(entry: OutboxEntry): boolean {
  return isReportEntry(entry) && entry.status !== 'sent';
}

async function photoDataUri(f: OutboxFile): Promise<string | null> {
  try {
    const ctx = ImageManipulator.manipulate(f.uri, { maxWidth: PDF_PHOTO_MAX, maxHeight: PDF_PHOTO_MAX });
    try {
      const img = await ctx.renderAsync();
      try {
        const res = await img.saveAsync({ compress: PDF_PHOTO_QUALITY, format: SaveFormat.JPEG, base64: true });
        // El JPEG temporal ya no se necesita: queda el base64.
        try {
          const tmp = new File(res.uri);
          if (tmp.exists && tmp.uri !== new File(f.uri).uri) tmp.delete();
        } catch {
          // ignorar
        }
        if (res.base64) return `data:image/jpeg;base64,${res.base64}`;
      } finally {
        img.release();
      }
    } finally {
      ctx.release();
    }
  } catch {
    // probar sin reducir
  }
  try {
    const file = new File(f.uri);
    if (!file.exists) return null;
    const mime = /^image\/(png|jpe?g|webp|gif)$/.test(f.type) ? f.type : 'image/jpeg';
    return `data:${mime};base64,${await file.base64()}`;
  } catch {
    return null;
  }
}

async function signatureFor(body: LocalReportBody, files: OutboxFile[]): Promise<ReportSignature | null> {
  const f = body.firma;
  if (f?.trazo && f.trazo.trim()) {
    return { kind: 'path', d: f.trazo, width: Number(f.ancho) || 300, height: Number(f.alto) || 150 };
  }
  const svg = files.find((x) => x.field === 'firma');
  if (!svg) return null;
  try {
    const file = new File(svg.uri);
    if (!file.exists) return null;
    const mime = svg.type === 'image/png' ? 'image/png' : 'image/svg+xml';
    return { kind: 'image', src: `data:${mime};base64,${await file.base64()}` };
  } catch {
    return null;
  }
}

/** Genera (siempre) el PDF de la entrada y lo guarda en `localPdfFile(entry.id)`. */
export async function generateLocalReportPdf(entry: OutboxEntry, opts: LocalPdfOptions = {}): Promise<File> {
  if (!isReportEntry(entry)) throw new Error('Esta entrada de la bandeja no es un reporte.');
  const body = (entry.body && typeof entry.body === 'object' ? entry.body : {}) as LocalReportBody;
  const photoFiles = entry.files.filter((f) => f.field.startsWith('fotos'));

  // Una a la vez para no tener varias fotos decodificadas en memoria.
  const photos: ReportPhoto[] = [];
  for (let i = 0; i < photoFiles.length; i++) {
    const src = await photoDataUri(photoFiles[i]);
    if (src) photos.push({ src, caption: body.fotos_meta?.[i]?.descripcion });
  }
  const signature = await signatureFor(body, entry.files);

  const html = buildReportHtml({ body, photos, signature, userName: opts.userName, generatedAt: new Date() });
  const result = await Print.printToFileAsync({
    html,
    ...A4,
    ...(Platform.OS === 'ios' ? { margins: IOS_MARGINS } : null),
  });

  const dest = localPdfFile(entry.id);
  const tmp = new File(result.uri);
  if (tmp.uri === dest.uri) return dest;
  deletePdf(dest);
  try {
    await tmp.move(dest, { overwrite: true });
  } catch {
    // Algunos proveedores no permiten mover entre volúmenes: copiar y borrar.
    await tmp.copy(dest, { overwrite: true });
    deletePdf(tmp);
  }
  return localPdfFile(entry.id);
}

const inFlight = new Map<string, Promise<File>>();

/**
 * Reutiliza el PDF si ya existe y es posterior a la creación de la entrada; si
 * no, lo genera. Llamadas simultáneas para la misma entrada comparten el trabajo.
 */
export function getOrCreateLocalReportPdf(entry: OutboxEntry, opts: LocalPdfOptions = {}): Promise<File> {
  if (!opts.force) {
    const existing = existingPdf(localPdfFile(entry.id));
    if (existing) {
      let mtime = 0;
      try {
        mtime = existing.info().modificationTime ?? 0;
      } catch {
        mtime = 0;
      }
      if (mtime >= entry.createdAt) return Promise.resolve(existing);
    }
  }
  const running = inFlight.get(entry.id);
  if (running) return running;
  const p = generateLocalReportPdf(entry, opts).finally(() => inFlight.delete(entry.id));
  inFlight.set(entry.id, p);
  return p;
}

/** Título/subtítulo del visor para una entrada (cliente del reporte). */
export function localPdfViewerParams(entry: OutboxEntry, uri: string) {
  const body = (entry.body && typeof entry.body === 'object' ? entry.body : {}) as LocalReportBody;
  const cliente = body.cliente?.nombre?.trim() || entry.label?.replace(/^Reporte\s*·\s*/, '') || '';
  return { uri, title: 'Reporte provisional', subtitle: cliente, provisional: true };
}
