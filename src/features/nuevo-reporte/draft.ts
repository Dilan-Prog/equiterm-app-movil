import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { createIdempotencyKey, persistFile } from '../../lib/outbox';
import { emptyDraft, type ReportDraft } from './types';

/**
 * Borrador del asistente: se guarda en AsyncStorage (fuera del prefijo de la
 * caché, así que cerrar sesión no lo borra) y las fotos en
 * `documentDirectory/report-draft/` para que sobrevivan si se cierra la app.
 */
const DRAFT_KEY = 'equiterm.reporteDraft.v1';

export function draftPhotoDir(): Directory {
  return new Directory(Paths.document, 'report-draft');
}

export async function loadDraft(): Promise<ReportDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReportDraft>;
    if (!parsed || parsed.version !== 1) return null;
    const base = emptyDraft();
    const d: ReportDraft = {
      ...base,
      ...parsed,
      cliente: { ...base.cliente, ...parsed.cliente },
      equipo: { ...base.equipo, ...parsed.equipo },
      trabajo: {
        ...base.trabajo,
        ...parsed.trabajo,
        lecturas: { ...base.trabajo.lecturas, ...parsed.trabajo?.lecturas },
        materiales: parsed.trabajo?.materiales ?? [],
      },
      firma: { ...base.firma, ...parsed.firma },
      // Descartar fotos cuyo archivo ya no exista.
      fotos: (parsed.fotos ?? []).filter((p) => {
        try {
          return new File(p.uri).exists;
        } catch {
          return false;
        }
      }),
    } as ReportDraft;
    return d;
  } catch {
    return null;
  }
}

let pending: ReturnType<typeof setTimeout> | null = null;
let latest: ReportDraft | null = null;

/** Guarda el borrador con un pequeño retraso (agrupa escritura mientras se teclea). */
export function saveDraftDebounced(d: ReportDraft, delay = 400) {
  latest = d;
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    void saveDraftNow(latest!);
  }, delay);
}

export async function saveDraftNow(d: ReportDraft): Promise<void> {
  if (pending) {
    clearTimeout(pending);
    pending = null;
  }
  latest = d;
  try {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, updatedAt: Date.now() }));
  } catch {
    // ignorar: se reintenta en el siguiente cambio
  }
}

/** Borra borrador + fotos del borrador. */
export async function clearDraft(): Promise<void> {
  if (pending) {
    clearTimeout(pending);
    pending = null;
  }
  latest = null;
  try {
    await AsyncStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignorar
  }
  try {
    const dir = draftPhotoDir();
    if (dir.exists) dir.delete();
  } catch {
    // ignorar
  }
}

/** Copia una foto elegida/tomada (normalmente en caché) a la carpeta del borrador. */
export async function persistDraftPhoto(uri: string): Promise<{ id: string; uri: string }> {
  const id = createIdempotencyKey();
  const ext = (uri.split('?')[0].split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
  const file = await persistFile(uri, draftPhotoDir(), `${id}.${/^[a-z0-9]+$/.test(ext) ? ext : 'jpg'}`);
  return { id, uri: file.uri };
}

export function deleteDraftPhoto(uri: string) {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // ignorar
  }
}

/** Escribe la firma como SVG en la carpeta del borrador (se adjunta como archivo `firma`). */
export async function writeSignatureSvg(path: string, width: number, height: number): Promise<string> {
  const dir = draftPhotoDir();
  dir.create({ intermediates: true, idempotent: true });
  const f = new File(dir, `firma-${Date.now()}.svg`);
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect width="100%" height="100%" fill="#ffffff"/>` +
    `<path d="${path}" stroke="#141516" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  f.create({ overwrite: true });
  await f.write(svg);
  return f.uri;
}
