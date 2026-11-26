/**
 * PDF OFICIAL del servidor guardado en el teléfono
 * ---------------------------------------------------------------------------
 * `GET /reportes/{id}` trae `pdf_url`: una URL firmada (sin token) que caduca
 * a los 30 min. Para poder ver/compartir el PDF sin conexión se descarga a
 * `officialPdfFile(id)` (ver `storage.ts`) y se recuerda con qué versión del
 * reporte se descargó (`updated_at`, firmado, estado) en un índice JSON junto
 * a los PDFs (`pdfs/official-index.json`).
 *
 * - Descarga a un temporal, verifica que empiece con `%PDF` y sólo entonces
 *   reemplaza el archivo guardado (nunca queda un PDF a medias).
 * - Vigencia: si el detalle trae un `updated_at` más nuevo o pasó a firmado,
 *   el guardado se considera desactualizado y se vuelve a descargar.
 * - Límite: se conservan `MAX_OFFICIAL_PDFS`; se borran los de acceso más antiguo.
 * - `clearOfficialPdfs()` lo llama `clearCache()` (cerrar sesión y
 *   «Datos sin conexión → Borrar» en Perfil). No toca los PDF provisionales
 *   (`local-*.pdf`) de la bandeja de salida.
 */
import { File, Paths } from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { existingPdf, officialPdfFile, pdfDir } from './storage';

/** Máximo de PDFs oficiales guardados (≈ 60 × 0.3–2 MB). */
export const MAX_OFFICIAL_PDFS = 60;

const INDEX_NAME = 'official-index.json';
const OFFICIAL_RE = /^report-([0-9a-zA-Z_-]+)\.pdf$/;

/** Datos mínimos del reporte para descargar y decidir vigencia. */
export interface OfficialPdfSource {
  id: number | string;
  pdf_url?: string | null;
  updated_at?: string | null;
  is_signed?: boolean | null;
  status?: string | null;
}

interface IndexEntry {
  updatedAt: string | null;
  signed: boolean;
  status: string | null;
  savedAt: number;
  accessedAt: number;
}

type Index = Record<string, IndexEntry>;

export type OfficialPdfErrorKind = 'network' | 'expired' | 'notFound' | 'server' | 'invalid' | 'noUrl';

export class OfficialPdfError extends Error {
  kind: OfficialPdfErrorKind;
  status?: number;
  constructor(kind: OfficialPdfErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'OfficialPdfError';
    this.kind = kind;
    this.status = status;
  }
}

/** Mensajes para el usuario según el tipo de error. */
export const OFFICIAL_PDF_MSG: Record<OfficialPdfErrorKind, string> = {
  network: 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
  expired: 'El enlace del PDF caducó. Actualiza el reporte e inténtalo de nuevo.',
  notFound: 'El servidor no encontró el PDF de este reporte.',
  server: 'El servidor no pudo generar el PDF. Inténtalo más tarde.',
  invalid: 'El servidor no devolvió un PDF válido.',
  noUrl: 'Este reporte no tiene PDF disponible.',
};

/** Aviso cuando no hay red y el PDF no está guardado. */
export const PDF_NOT_SAVED_OFFLINE = 'Este PDF aún no está guardado en el teléfono. Ábrelo una vez con internet.';

const key = (id: number | string) => String(id);

/* ------------------------------------------------------------------ */
/* Índice (JSON junto a los PDFs)                                      */
/* ------------------------------------------------------------------ */

let indexMem: Index | null = null;

function indexFile(): File {
  return new File(pdfDir(), INDEX_NAME);
}

function readIndex(): Index {
  if (indexMem) return indexMem;
  let parsed: Index = {};
  try {
    const f = indexFile();
    if (f.exists) {
      const raw = JSON.parse(f.textSync()) as unknown;
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) parsed = raw as Index;
    }
  } catch {
    parsed = {}; // índice corrupto: se reconstruye (los PDFs siguen sirviendo)
  }
  indexMem = parsed;
  return parsed;
}

function writeIndex(next: Index) {
  indexMem = next;
  try {
    const f = indexFile();
    if (!f.exists) f.create({ intermediates: true });
    f.writeSync(JSON.stringify(next));
  } catch {
    // no crítico: en el peor caso se vuelve a descargar
  }
}

function updateIndex(mut: (idx: Index) => void) {
  const next = { ...readIndex() };
  mut(next);
  writeIndex(next);
}

/* ------------------------------------------------------------------ */
/* Suscripción (para que la UI se entere de descargas en segundo plano) */
/* ------------------------------------------------------------------ */

const listeners = new Set<(reportId: string) => void>();

function notify(reportId: string) {
  for (const l of listeners) {
    try {
      l(reportId);
    } catch {
      // ignorar
    }
  }
}

export function subscribeOfficialPdfs(listener: (reportId: string) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/* ------------------------------------------------------------------ */
/* Consulta                                                            */
/* ------------------------------------------------------------------ */

/** PDF oficial guardado (o null). No revisa vigencia. */
export function getOfficialPdf(reportId: number | string): File | null {
  return existingPdf(officialPdfFile(reportId));
}

/** Marca el PDF como usado (para el borrado por antigüedad). */
export function touchOfficialPdf(reportId: number | string): void {
  const k = key(reportId);
  const entry = readIndex()[k];
  if (!entry) return;
  updateIndex((idx) => {
    idx[k] = { ...entry, accessedAt: Date.now() };
  });
}

function parseTime(s: string | null | undefined): number | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

/**
 * true si falta el PDF o el guardado corresponde a una versión anterior del
 * reporte (`updated_at` más nuevo, o pasó de no firmado a firmado).
 * Sin datos de versión guardados se considera vigente si el archivo existe
 * (no hay forma de saber; evita descargas en bucle).
 */
export function isOfficialPdfStale(report: OfficialPdfSource): boolean {
  if (!getOfficialPdf(report.id)) return true;
  const entry = readIndex()[key(report.id)];
  if (!entry) return false;
  if (report.is_signed && !entry.signed) return true;
  const now = parseTime(report.updated_at);
  const saved = parseTime(entry.updatedAt);
  if (now !== null && saved !== null) return now > saved;
  if (now !== null && saved === null) return true;
  return false;
}

/* ------------------------------------------------------------------ */
/* Descarga                                                            */
/* ------------------------------------------------------------------ */

const inFlight = new Map<string, Promise<File>>();
/** Sube con `clearOfficialPdfs()`: descargas iniciadas antes no se guardan. */
let generation = 0;

/** Extrae el código HTTP del mensaje de `UnableToDownloadException` (iOS/Android). */
function statusFromError(e: unknown): number | undefined {
  const msg = e instanceof Error ? e.message : String(e ?? '');
  const m = /status:?\s*(\d{3})/i.exec(msg) ?? /HTTP\s+(\d{3})/i.exec(msg);
  return m ? Number(m[1]) : undefined;
}

function toPdfError(e: unknown): OfficialPdfError {
  if (e instanceof OfficialPdfError) return e;
  const status = statusFromError(e);
  if (status === 401 || status === 403 || status === 410) return new OfficialPdfError('expired', OFFICIAL_PDF_MSG.expired, status);
  if (status === 404) return new OfficialPdfError('notFound', OFFICIAL_PDF_MSG.notFound, status);
  if (status !== undefined && status >= 500) return new OfficialPdfError('server', OFFICIAL_PDF_MSG.server, status);
  if (status !== undefined) return new OfficialPdfError('server', `${OFFICIAL_PDF_MSG.server} (${status})`, status);
  return new OfficialPdfError('network', OFFICIAL_PDF_MSG.network);
}

/** Lee los primeros bytes: un PDF válido empieza con `%PDF`. */
function looksLikePdf(file: File): boolean {
  let handle: ReturnType<File['open']> | null = null;
  try {
    if (!file.exists || (file.size ?? 0) < 8) return false;
    handle = file.open();
    const head = handle.readBytesSync(16);
    // Algunos servidores anteponen BOM/espacios: buscar %PDF en los primeros bytes.
    const text = String.fromCharCode(...Array.from(head));
    return text.includes('%PDF');
  } catch {
    return false;
  } finally {
    try {
      handle?.close();
    } catch {
      // ignorar
    }
  }
}

function safeDelete(file: File) {
  try {
    if (file.exists) file.delete();
  } catch {
    // ignorar
  }
}

/**
 * Descarga el PDF oficial y reemplaza el guardado. Lanza `OfficialPdfError`.
 * Varias llamadas simultáneas para el mismo reporte comparten la descarga.
 */
export function downloadOfficialPdf(
  reportId: number | string,
  pdfUrl: string,
  meta?: Pick<OfficialPdfSource, 'updated_at' | 'is_signed' | 'status'>,
): Promise<File> {
  const k = key(reportId);
  const running = inFlight.get(k);
  if (running) return running;
  const p = doDownload(reportId, pdfUrl, meta).finally(() => inFlight.delete(k));
  inFlight.set(k, p);
  return p;
}

async function doDownload(
  reportId: number | string,
  pdfUrl: string,
  meta?: Pick<OfficialPdfSource, 'updated_at' | 'is_signed' | 'status'>,
): Promise<File> {
  if (!pdfUrl || !/^https?:\/\//i.test(pdfUrl)) throw new OfficialPdfError('noUrl', OFFICIAL_PDF_MSG.noUrl);
  const k = key(reportId);
  const dest = officialPdfFile(reportId);
  const gen = generation;
  const tmp = new File(Paths.cache, `pdf-dl-${k.replace(/[^0-9a-zA-Z_-]/g, '')}-${Date.now()}.pdf`);
  try {
    let downloaded: File;
    try {
      downloaded = await File.downloadFileAsync(pdfUrl, tmp, { idempotent: true, headers: { Accept: 'application/pdf' } });
    } catch (e) {
      throw toPdfError(e);
    }
    if (!looksLikePdf(downloaded)) {
      // p. ej. una página HTML de error con 200: no guardarla.
      throw new OfficialPdfError('invalid', OFFICIAL_PDF_MSG.invalid);
    }
    // Se cerró sesión / se borraron los datos mientras descargaba: no guardar.
    if (gen !== generation) throw new OfficialPdfError('network', OFFICIAL_PDF_MSG.network);
    try {
      downloaded.moveSync(dest, { overwrite: true });
    } catch {
      // Respaldo si `overwrite` no se respeta en la plataforma.
      safeDelete(dest);
      downloaded.moveSync(dest);
    }
    const now = Date.now();
    updateIndex((idx) => {
      idx[k] = {
        updatedAt: meta?.updated_at ?? null,
        signed: !!meta?.is_signed,
        status: meta?.status ?? null,
        savedAt: now,
        accessedAt: now,
      };
    });
    pruneOfficialPdfs(k);
    notify(k);
    return officialPdfFile(reportId);
  } finally {
    safeDelete(tmp);
  }
}

/**
 * Devuelve el PDF guardado si existe y está vigente; si no, lo descarga.
 * Si la URL firmada ya caducó (401/403/410) y se pasa `refetch`, pide el
 * detalle de nuevo (URL nueva) y reintenta una vez.
 * Si la descarga falla pero hay una copia anterior, devuelve esa copia.
 */
export async function ensureOfficialPdf(
  report: OfficialPdfSource,
  opts: { refetch?: () => Promise<OfficialPdfSource> } = {},
): Promise<File> {
  const saved = getOfficialPdf(report.id);
  if (saved && !isOfficialPdfStale(report)) return saved;
  try {
    if (!report.pdf_url) throw new OfficialPdfError('noUrl', OFFICIAL_PDF_MSG.noUrl);
    try {
      return await downloadOfficialPdf(report.id, report.pdf_url, report);
    } catch (e) {
      const err = toPdfError(e);
      if ((err.kind !== 'expired' && err.kind !== 'noUrl') || !opts.refetch) throw err;
      let fresh: OfficialPdfSource;
      try {
        fresh = await opts.refetch();
      } catch {
        throw err;
      }
      if (!fresh?.pdf_url) throw new OfficialPdfError('noUrl', OFFICIAL_PDF_MSG.noUrl);
      return await downloadOfficialPdf(report.id, fresh.pdf_url, fresh);
    }
  } catch (e) {
    if (saved && saved.exists) return saved; // versión anterior mejor que nada
    throw toPdfError(e);
  }
}

/**
 * Auto-guardado en segundo plano: descarga si falta o está desactualizado.
 * Nunca lanza ni muestra errores.
 */
export function prefetchOfficialPdf(report: OfficialPdfSource | null | undefined): void {
  if (!report?.pdf_url) return;
  try {
    if (!isOfficialPdfStale(report)) return;
  } catch {
    return;
  }
  downloadOfficialPdf(report.id, report.pdf_url, report).catch(() => undefined);
}

/* ------------------------------------------------------------------ */
/* Espacio                                                             */
/* ------------------------------------------------------------------ */

function listOfficial(): { id: string; file: File }[] {
  try {
    const out: { id: string; file: File }[] = [];
    for (const item of pdfDir().list()) {
      if (!(item instanceof File)) continue;
      const m = OFFICIAL_RE.exec(item.name);
      if (m) out.push({ id: m[1], file: item });
    }
    return out;
  } catch {
    return [];
  }
}

/** Deja como máximo `MAX_OFFICIAL_PDFS`, borrando los de acceso más antiguo. */
export function pruneOfficialPdfs(keepId?: string): void {
  const files = listOfficial();
  const idx = readIndex();
  const present = new Set(files.map((f) => f.id));
  const staleKeys = Object.keys(idx).filter((k) => !present.has(k.replace(/[^0-9a-zA-Z_-]/g, '')));
  if (files.length <= MAX_OFFICIAL_PDFS && !staleKeys.length) return;
  const lastUse = (f: { id: string; file: File }) => {
    const e = idx[f.id];
    if (e) return e.accessedAt || e.savedAt;
    try {
      return f.file.modificationTime ?? 0;
    } catch {
      return 0;
    }
  };
  const removable = files.filter((f) => f.id !== keepId).sort((a, b) => lastUse(a) - lastUse(b));
  const excess = Math.max(0, files.length - MAX_OFFICIAL_PDFS);
  const toDelete = removable.slice(0, excess);
  for (const f of toDelete) safeDelete(f.file);
  updateIndex((next) => {
    for (const f of toDelete) delete next[f.id];
    for (const k of staleKeys) delete next[k];
  });
}

/** Cantidad y bytes de los PDFs oficiales guardados (para Perfil). */
export function getOfficialPdfsUsage(): { count: number; bytes: number } {
  const files = listOfficial();
  let bytes = 0;
  for (const f of files) {
    try {
      bytes += f.file.size ?? 0;
    } catch {
      // ignorar
    }
  }
  return { count: files.length, bytes };
}

/** Borra todos los PDFs oficiales (no los provisionales de la bandeja). */
export function clearOfficialPdfs(): void {
  generation++;
  const files = listOfficial();
  for (const f of files) safeDelete(f.file);
  writeIndex({});
  for (const f of files) notify(f.id);
}

/* ------------------------------------------------------------------ */
/* Hook para el detalle                                                */
/* ------------------------------------------------------------------ */

export interface UseOfficialPdf {
  /** URI `file://` del PDF guardado (o null). */
  uri: string | null;
  /** Descargando (por acción del usuario o en segundo plano). */
  downloading: boolean;
  /** Devuelve el PDF (guardado o recién descargado). Lanza `OfficialPdfError`. */
  ensure: () => Promise<File>;
}

/**
 * Estado del PDF oficial de un reporte. Con `autoSave` (detalle recién
 * traído del servidor) lo descarga en segundo plano si falta o cambió.
 */
export function useOfficialPdf(
  report: OfficialPdfSource | null,
  opts: { autoSave: boolean; refetch?: () => Promise<OfficialPdfSource> },
): UseOfficialPdf {
  const id = report ? key(report.id) : null;
  const [uri, setUri] = useState<string | null>(() => (report ? getOfficialPdf(report.id)?.uri ?? null : null));
  const [downloading, setDownloading] = useState(false);
  const reportRef = useRef(report);
  reportRef.current = report;
  const refetchRef = useRef(opts.refetch);
  refetchRef.current = opts.refetch;

  const sync = useCallback(() => {
    if (!id) {
      setUri(null);
      return;
    }
    setUri(getOfficialPdf(id)?.uri ?? null);
    setDownloading(inFlight.has(id));
  }, [id]);

  useEffect(() => {
    sync();
    return subscribeOfficialPdfs((rid) => {
      if (rid === id) sync();
    });
  }, [id, sync]);

  // Auto-guardado sin bloquear la UI (los errores se ignoran).
  const { autoSave } = opts;
  const version = report ? `${report.updated_at ?? ''}|${report.is_signed ? 1 : 0}|${report.pdf_url ? 1 : 0}` : '';
  useEffect(() => {
    const r = reportRef.current;
    if (!autoSave || !r?.pdf_url) return;
    let stale = false;
    try {
      stale = isOfficialPdfStale(r);
    } catch {
      return;
    }
    if (!stale) return;
    setDownloading(true);
    downloadOfficialPdf(r.id, r.pdf_url, r)
      .catch(() => undefined)
      .finally(sync);
  }, [autoSave, id, version, sync]);

  const ensure = useCallback(async () => {
    const r = reportRef.current;
    if (!r) throw new OfficialPdfError('noUrl', OFFICIAL_PDF_MSG.noUrl);
    setDownloading(true);
    try {
      const file = await ensureOfficialPdf(r, { refetch: refetchRef.current });
      touchOfficialPdf(r.id);
      return file;
    } finally {
      sync();
    }
  }, [sync]);

  return { uri, downloading, ensure };
}
