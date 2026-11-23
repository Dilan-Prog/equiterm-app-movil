/**
 * OUTBOX (bandeja de salida)
 * ---------------------------------------------------------------------------
 * Cola persistente de operaciones de escritura que se envían al servidor
 * cuando hay conexión. Nunca se pierde información: un item sólo sale de la
 * cola cuando el servidor responde 2xx (o cuando el usuario lo elimina).
 *
 * - Persistencia: AsyncStorage (`equiterm.outbox.v1`, fuera del prefijo de la
 *   caché para que cerrar sesión NO la borre). Los archivos (fotos, firma) se
 *   copian a `Paths.document/outbox/<id>/` para que sobrevivan a la limpieza
 *   de la caché del sistema.
 * - Estados: pending → sending → sent | error (con `attempts`, `lastError`,
 *   `progress` 0–100, `nextAttemptAt`, `autoRetry`).
 * - Envío: multipart/form-data (XMLHttpRequest para tener progreso de subida)
 *   con `Authorization: Bearer` y `Idempotency-Key`. El cuerpo se aplana en
 *   notación de corchetes (`cliente[nombre]`, `materiales[0][cantidad]`), que
 *   Laravel convierte en arreglos; los archivos van en su `field` (p. ej. `fotos[]`).
 * - Auto-envío: al recuperar la red (NetInfo), al volver a primer plano
 *   (AppState) y con backoff exponencial para errores transitorios.
 * - 404/405 → el endpoint aún no existe: queda en `error` con
 *   "El servidor aún no acepta reportes desde la app" y sólo se reintenta a mano.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { Directory, File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { getApiBaseUrl, getServerUrl } from './config';

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export type OutboxMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type OutboxStatus = 'pending' | 'sending' | 'sent' | 'error';

export interface OutboxFile {
  /** URI local (copiada dentro de documentDirectory). */
  uri: string;
  /** Nombre del archivo en el multipart. */
  name: string;
  /** MIME type. */
  type: string;
  /** Campo del multipart (default `fotos[]`). */
  field: string;
  size?: number;
}

export interface OutboxEntry {
  id: string;
  /** Tipo lógico de operación, p. ej. `service_report.create`. */
  type: string;
  idempotencyKey: string;
  method: OutboxMethod;
  /** Ruta relativa a /api/mobile/v1, p. ej. `/reportes`. */
  endpoint: string;
  body?: unknown;
  files: OutboxFile[];
  /** Título para la bandeja ("Reporte · Lácteos del Bajío"). */
  label?: string;
  /** Subtítulo para la bandeja ("Caldera · 4 fotos"). */
  subtitle?: string;
  status: OutboxStatus;
  attempts: number;
  /** 0–100 mientras `sending`. */
  progress: number;
  lastError?: string;
  lastStatusCode?: number;
  /** Si es false, sólo se reintenta manualmente (404/405/422…). */
  autoRetry: boolean;
  nextAttemptAt?: number;
  createdAt: number;
  updatedAt: number;
  sentAt?: number;
  /** Respuesta JSON del servidor al enviarse. */
  response?: unknown;
  /** Tamaño total aproximado (bytes) de cuerpo + archivos. */
  sizeBytes?: number;
}

export type EnqueueFile = string | { uri: string; name?: string; type?: string; field?: string };

export interface EnqueueInput {
  type: string;
  endpoint: string;
  method?: OutboxMethod;
  body?: unknown;
  /** URIs locales (o descriptores). Se copian a documentDirectory. */
  files?: EnqueueFile[];
  idempotencyKey?: string;
  label?: string;
  subtitle?: string;
  /** Intentar enviar de inmediato si hay red (default true). */
  flush?: boolean;
}

/**
 * Vista "legada" que usa `src/context/OutboxContext.tsx` (insignias): sólo los
 * items no enviados; `error` se expone como `failed`.
 */
export interface OutboxItem extends Omit<OutboxEntry, 'status'> {
  status: 'pending' | 'sending' | 'failed';
  /** Alias de `endpoint`. */
  path: string;
}

export interface FlushResult {
  sent: number;
  failed: number;
  remaining: number;
}

export interface OutboxSnapshot {
  items: OutboxEntry[];
  loaded: boolean;
  flushing: boolean;
}

/* ------------------------------------------------------------------ */
/* Constantes                                                          */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'equiterm.outbox.v1';
const TOKEN_KEY = 'equiterm_token'; // mismo que AuthContext
const UPLOAD_TIMEOUT_MS = 120000;
const BACKOFF_BASE_MS = 5000;
const BACKOFF_MAX_MS = 15 * 60 * 1000;
/** Los enviados se conservan para mostrarlos en la bandeja durante 3 días (máx. 30). */
const SENT_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const SENT_MAX = 30;

export const OUTBOX_MSG = {
  notAccepted: 'El servidor aún no acepta reportes desde la app',
  session: 'Tu sesión expiró. Inicia sesión de nuevo para enviar.',
  network: 'No se pudo conectar con el servidor.',
  timeout: 'No se pudo conectar con el servidor (tiempo agotado).',
  server: 'Error en el servidor. Se reintentará automáticamente.',
  tooLarge: 'Los archivos son demasiado grandes para el servidor.',
  invalidResponse: 'Respuesta inválida del servidor.',
  missingFiles: 'Faltan archivos del envío en el teléfono.',
  noServer: 'No hay servidor configurado.',
};

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

/** UUID v4 (usa crypto.randomUUID si existe). */
export function createIdempotencyKey(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) {
    try {
      return c.randomUUID();
    } catch {
      // usar respaldo
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
export const uuid = createIdempotencyKey;

function guessMime(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'heic':
      return 'image/heic';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    case 'pdf':
      return 'application/pdf';
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
}

function fileNameFromUri(uri: string, fallback: string): string {
  const raw = decodeURIComponent(uri.split('?')[0].split('/').pop() || '');
  return raw && raw.includes('.') ? raw : fallback;
}

function backoffMs(attempts: number): number {
  const exp = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, attempts - 1));
  return Math.round(exp * (0.8 + Math.random() * 0.4));
}

/** Aplana un objeto en pares [clave, valor] con notación de corchetes. */
function flatten(value: unknown, prefix: string, out: [string, string][]) {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
    return;
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      flatten(v, prefix ? `${prefix}[${k}]` : k, out);
    }
    return;
  }
  if (typeof value === 'boolean') {
    out.push([prefix, value ? '1' : '0']);
    return;
  }
  out.push([prefix, String(value)]);
}

function outboxDir(): Directory {
  return new Directory(Paths.document, 'outbox');
}

function safeDelete(target: File | Directory) {
  try {
    if (target.exists) target.delete();
  } catch {
    // ignorar
  }
}

/** Copia un archivo a un directorio persistente; devuelve el File destino. */
export async function persistFile(uri: string, dir: Directory, name: string): Promise<File> {
  dir.create({ intermediates: true, idempotent: true });
  const dest = new File(dir, name);
  const src = new File(uri);
  if (src.uri === dest.uri) return dest;
  safeDelete(dest);
  await src.copy(dest);
  return dest;
}

/* ------------------------------------------------------------------ */
/* Estado en memoria + persistencia                                    */
/* ------------------------------------------------------------------ */

let snapshot: OutboxSnapshot = { items: [], loaded: false, flushing: false };
const listeners = new Set<(s: OutboxSnapshot) => void>();
let loadPromise: Promise<void> | null = null;
let writeChain: Promise<void> = Promise.resolve();
let flushPromise: Promise<FlushResult> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let initialized = false;
let lastProgressEmit = 0;

function emit() {
  for (const l of listeners) {
    try {
      l(snapshot);
    } catch {
      // ignorar
    }
  }
}

function setItems(items: OutboxEntry[], opts: { persist?: boolean } = {}) {
  snapshot = { ...snapshot, items };
  emit();
  if (opts.persist !== false) persist();
}

function setFlushing(flushing: boolean) {
  if (snapshot.flushing === flushing) return;
  snapshot = { ...snapshot, flushing };
  emit();
}

function persist() {
  const items = snapshot.items;
  writeChain = writeChain
    .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)))
    .catch(() => {
      // Si falla la escritura se reintentará en el siguiente cambio.
    });
}

function patch(id: string, changes: Partial<OutboxEntry>, opts: { persist?: boolean } = {}) {
  let found = false;
  const items = snapshot.items.map((it) => {
    if (it.id !== id) return it;
    found = true;
    return { ...it, ...changes, updatedAt: Date.now() };
  });
  if (found) setItems(items, opts);
}

function pruneSent(items: OutboxEntry[]): OutboxEntry[] {
  const now = Date.now();
  const sent = items.filter((i) => i.status === 'sent').sort((a, b) => (b.sentAt ?? 0) - (a.sentAt ?? 0));
  const keep = new Set(sent.filter((i, idx) => idx < SENT_MAX && now - (i.sentAt ?? now) < SENT_TTL_MS).map((i) => i.id));
  return items.filter((i) => i.status !== 'sent' || keep.has(i.id));
}

/** Carga la cola desde AsyncStorage (idempotente). */
export function loadOutbox(): Promise<void> {
  if (!loadPromise) {
    loadPromise = (async () => {
      let items: OutboxEntry[] = [];
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as OutboxEntry[]) : [];
        items = Array.isArray(parsed) ? parsed : [];
      } catch {
        items = [];
      }
      // Si la app se cerró a mitad de un envío, volver a `pending`.
      items = items.map((i) =>
        i.status === 'sending' ? { ...i, status: 'pending' as const, progress: 0, files: i.files ?? [] } : { ...i, files: i.files ?? [] },
      );
      // Puede haber items encolados mientras se cargaba.
      const existing = new Set(items.map((i) => i.id));
      const merged = [...items, ...snapshot.items.filter((i) => !existing.has(i.id))];
      snapshot = { ...snapshot, items: pruneSent(merged), loaded: true };
      emit();
      persist();
      scheduleRetry();
    })();
  }
  return loadPromise;
}

/* ------------------------------------------------------------------ */
/* API pública                                                         */
/* ------------------------------------------------------------------ */

/** Estado actual (sincrónico). */
export function getOutboxSnapshot(): OutboxSnapshot {
  return snapshot;
}

/** Suscribirse a cambios (items, progreso, flushing). Devuelve la función para cancelar. */
export function subscribe(listener: (s: OutboxSnapshot) => void): () => void {
  initOutbox();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Todos los items (incluye enviados recientes), más nuevos primero. */
export async function getOutbox(): Promise<OutboxEntry[]> {
  initOutbox();
  await loadOutbox();
  return sortItems(snapshot.items);
}

function sortItems(items: OutboxEntry[]): OutboxEntry[] {
  return [...items].sort((a, b) => b.createdAt - a.createdAt);
}

/** Compatibilidad con OutboxContext: items no enviados, `error` → `failed`. */
export async function listOutbox(): Promise<OutboxItem[]> {
  const items = await getOutbox();
  return items
    .filter((i) => i.status !== 'sent')
    .map((i) => ({ ...i, path: i.endpoint, status: i.status === 'error' ? ('failed' as const) : i.status }) as OutboxItem);
}

/** Cantidad de items sin enviar (pending + sending + error). */
export function countUnsent(items: OutboxEntry[] = snapshot.items): number {
  return items.filter((i) => i.status !== 'sent').length;
}

/** Agrega una operación a la cola. Copia los archivos a documentDirectory. */
export async function enqueue(input: EnqueueInput): Promise<OutboxEntry> {
  initOutbox();
  await loadOutbox();
  const id = createIdempotencyKey();
  const dir = new Directory(outboxDir(), id);
  const files: OutboxFile[] = [];
  const list = input.files ?? [];
  for (let i = 0; i < list.length; i++) {
    const f = list[i];
    const desc = typeof f === 'string' ? { uri: f } : f;
    const baseName = desc.name || fileNameFromUri(desc.uri, `archivo-${i + 1}.jpg`);
    const name = `${String(i + 1).padStart(2, '0')}-${baseName}`.replace(/[^\w.\-]+/g, '_');
    const dest = await persistFile(desc.uri, dir, name);
    let size: number | undefined;
    try {
      size = dest.size ?? undefined;
    } catch {
      size = undefined;
    }
    files.push({ uri: dest.uri, name: baseName, type: desc.type || guessMime(baseName), field: desc.field || 'fotos[]', size });
  }
  let bodySize = 0;
  try {
    bodySize = input.body !== undefined ? JSON.stringify(input.body).length : 0;
  } catch {
    bodySize = 0;
  }
  const now = Date.now();
  const entry: OutboxEntry = {
    id,
    type: input.type,
    idempotencyKey: input.idempotencyKey || createIdempotencyKey(),
    method: input.method ?? 'POST',
    endpoint: input.endpoint,
    body: input.body,
    files,
    label: input.label,
    subtitle: input.subtitle,
    status: 'pending',
    attempts: 0,
    progress: 0,
    autoRetry: true,
    createdAt: now,
    updatedAt: now,
    sizeBytes: bodySize + files.reduce((s, f) => s + (f.size ?? 0), 0),
  };
  setItems([...snapshot.items, entry]);
  // Asegurar que quede escrito antes de devolver.
  await writeChain;
  if (input.flush !== false) void flushOutbox();
  return entry;
}

/** Elimina un item (y sus archivos) de la cola. */
export async function removeOutboxItem(id: string): Promise<void> {
  await loadOutbox();
  const item = snapshot.items.find((i) => i.id === id);
  if (!item) return;
  if (item.status === 'sending') currentXhr.get(id)?.abort();
  safeDelete(new Directory(outboxDir(), id));
  setItems(snapshot.items.filter((i) => i.id !== id));
  await writeChain;
}

/** Quita de la lista los ya enviados. */
export async function clearSent(): Promise<void> {
  await loadOutbox();
  setItems(snapshot.items.filter((i) => i.status !== 'sent'));
}

/** Reintento manual de un item (ignora backoff y `autoRetry`). */
export async function retryOutboxItem(id: string): Promise<FlushResult> {
  await loadOutbox();
  const it = snapshot.items.find((i) => i.id === id);
  if (it && it.status === 'error') patch(id, { status: 'pending', nextAttemptAt: undefined, autoRetry: true, progress: 0 });
  return flushOutbox({ force: true, onlyIds: [id] });
}

/** "Enviar todo ahora": envía pendientes y errores sin esperar el backoff. */
export function sendAllNow(): Promise<FlushResult> {
  return flushOutbox({ force: true });
}

/* ------------------------------------------------------------------ */
/* Envío                                                               */
/* ------------------------------------------------------------------ */

const currentXhr = new Map<string, XMLHttpRequest>();

interface SendOutcome {
  ok: boolean;
  status: number;
  data: unknown;
  message?: string;
  timeout?: boolean;
  aborted?: boolean;
}

function sendOne(item: OutboxEntry, token: string): Promise<SendOutcome> {
  return new Promise((resolve) => {
    const url = `${getApiBaseUrl()}${item.endpoint.startsWith('/') ? item.endpoint : `/${item.endpoint}`}`;
    const form = new FormData();
    const pairs: [string, string][] = [];
    flatten(item.body, '', pairs);
    for (const [k, v] of pairs) form.append(k, v);
    form.append('idempotency_key', item.idempotencyKey);
    for (const f of item.files) {
      // React Native acepta { uri, name, type } como parte de archivo.
      form.append(f.field, { uri: f.uri, name: f.name, type: f.type } as unknown as Blob);
    }

    const xhr = new XMLHttpRequest();
    currentXhr.set(item.id, xhr);
    xhr.open(item.method, url);
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Idempotency-Key', item.idempotencyKey);
    xhr.setRequestHeader('X-Outbox-Type', item.type);

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable || !e.total) return;
      const pct = Math.min(99, Math.round((e.loaded / e.total) * 100));
      const now = Date.now();
      if (now - lastProgressEmit < 150 && pct < 99) return;
      lastProgressEmit = now;
      patch(item.id, { progress: pct }, { persist: false });
    };

    const done = (o: SendOutcome) => {
      currentXhr.delete(item.id);
      resolve(o);
    };
    xhr.onload = () => {
      let data: unknown = null;
      const text = xhr.responseText;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }
      const message =
        data && typeof data === 'object' && typeof (data as { message?: unknown }).message === 'string'
          ? (data as { message: string }).message
          : undefined;
      done({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data, message });
    };
    xhr.onerror = () => done({ ok: false, status: 0, data: null });
    xhr.ontimeout = () => done({ ok: false, status: 0, data: null, timeout: true });
    xhr.onabort = () => done({ ok: false, status: 0, data: null, aborted: true });
    xhr.send(form);
  });
}

function firstValidationError(data: unknown): string | undefined {
  const errors = data && typeof data === 'object' ? (data as { errors?: Record<string, string[]> }).errors : undefined;
  if (!errors) return undefined;
  for (const v of Object.values(errors)) if (Array.isArray(v) && v[0]) return v[0];
  return undefined;
}

async function readToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function isOnline(): Promise<boolean> {
  try {
    const s = await NetInfo.fetch();
    return s.isConnected !== false;
  } catch {
    return true;
  }
}

export interface FlushOptions {
  /** Ignora backoff y `autoRetry` (botón "Enviar todo ahora"/"Reintentar"). */
  force?: boolean;
  /** Limitar a estos ids. */
  onlyIds?: string[];
}

/** Envía los items listos (FIFO, uno a la vez). Single-flight. */
export function flushOutbox(opts: FlushOptions = {}): Promise<FlushResult> {
  initOutbox();
  if (flushPromise) {
    // Si llega un envío forzado mientras corre uno automático, encadenarlo.
    if (!opts.force) return flushPromise;
    return flushPromise.then(() => flushOutbox(opts));
  }
  flushPromise = doFlush(opts).finally(() => {
    flushPromise = null;
    setFlushing(false);
    scheduleRetry();
  });
  return flushPromise;
}

async function doFlush(opts: FlushOptions): Promise<FlushResult> {
  await loadOutbox();
  const result: FlushResult = { sent: 0, failed: 0, remaining: 0 };
  const finish = () => {
    result.remaining = countUnsent();
    return result;
  };

  const ready = (i: OutboxEntry) => {
    if (opts.onlyIds && !opts.onlyIds.includes(i.id)) return false;
    if (i.status === 'pending') return opts.force || !i.nextAttemptAt || i.nextAttemptAt <= Date.now();
    if (i.status === 'error') return opts.force || (i.autoRetry && (!i.nextAttemptAt || i.nextAttemptAt <= Date.now()));
    return false;
  };

  const queue = sortItems(snapshot.items).reverse().filter(ready).map((i) => i.id);
  if (!queue.length) return finish();
  if (!getServerUrl()) return finish();
  const token = await readToken();
  if (!token) return finish(); // sin sesión: se enviará después de iniciar sesión
  if (!(await isOnline())) return finish();

  setFlushing(true);
  for (const id of queue) {
    const item = snapshot.items.find((i) => i.id === id);
    if (!item || !ready(item)) continue;

    // Verificar que los archivos sigan existiendo (nunca enviar incompleto).
    const missing = item.files.filter((f) => {
      try {
        return !new File(f.uri).exists;
      } catch {
        return true;
      }
    });
    if (missing.length) {
      patch(id, { status: 'error', lastError: OUTBOX_MSG.missingFiles, autoRetry: false, nextAttemptAt: undefined, progress: 0 });
      result.failed++;
      continue;
    }

    patch(id, { status: 'sending', progress: 0, attempts: item.attempts + 1 });
    const attempts = item.attempts + 1;
    const out = await sendOne(item, token);

    if (!snapshot.items.some((i) => i.id === id)) continue; // eliminado mientras se enviaba

    if (out.aborted) {
      patch(id, { status: 'pending', progress: 0 });
      continue;
    }

    if (out.ok) {
      if (out.data !== null && typeof out.data !== 'object') {
        patch(id, { status: 'error', lastError: OUTBOX_MSG.invalidResponse, lastStatusCode: out.status, autoRetry: false, progress: 0 });
        result.failed++;
        continue;
      }
      patch(id, {
        status: 'sent',
        progress: 100,
        sentAt: Date.now(),
        response: out.data,
        lastError: undefined,
        lastStatusCode: out.status,
        nextAttemptAt: undefined,
      });
      // Ya está en el servidor: liberar espacio.
      safeDelete(new Directory(outboxDir(), id));
      result.sent++;
      continue;
    }

    result.failed++;
    const s = out.status;
    let lastError: string;
    let autoRetry = true;
    let stop = false;
    if (s === 0) {
      lastError = out.timeout ? OUTBOX_MSG.timeout : OUTBOX_MSG.network;
      stop = true; // sin red: no tiene caso seguir con los demás
    } else if (s === 404 || s === 405) {
      lastError = OUTBOX_MSG.notAccepted;
      autoRetry = false;
    } else if (s === 401 || s === 419) {
      lastError = OUTBOX_MSG.session;
      stop = true;
    } else if (s === 413) {
      lastError = OUTBOX_MSG.tooLarge;
      autoRetry = false;
    } else if (s === 422 || s === 400 || s === 403) {
      lastError = firstValidationError(out.data) || out.message || `El servidor rechazó el envío (${s}).`;
      autoRetry = false;
    } else if (s === 408 || s === 409 || s === 425 || s === 429 || s >= 500) {
      lastError = s >= 500 ? OUTBOX_MSG.server : out.message || `El servidor no pudo procesarlo (${s}). Se reintentará.`;
    } else {
      lastError = out.message || `Error inesperado (${s}).`;
      autoRetry = false;
    }
    patch(id, {
      status: 'error',
      progress: 0,
      lastError,
      lastStatusCode: s || undefined,
      autoRetry,
      nextAttemptAt: autoRetry ? Date.now() + backoffMs(attempts) : undefined,
    });
    if (stop) break;
  }
  return finish();
}

function scheduleRetry() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  const next = snapshot.items
    .filter((i) => (i.status === 'error' && i.autoRetry) || i.status === 'pending')
    .map((i) => i.nextAttemptAt ?? 0)
    .filter((t) => t > 0)
    .sort((a, b) => a - b)[0];
  if (!next) return;
  const delay = Math.max(1000, next - Date.now());
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flushOutbox();
  }, delay);
}

/* ------------------------------------------------------------------ */
/* Disparadores automáticos                                            */
/* ------------------------------------------------------------------ */

/**
 * Instala los listeners de NetInfo (al reconectar) y AppState (primer plano).
 * Idempotente; se llama solo al usar cualquier función del módulo.
 */
export function initOutbox() {
  if (initialized) return;
  initialized = true;
  let wasConnected: boolean | null = null;
  NetInfo.addEventListener((s: NetInfoState) => {
    const now = s.isConnected;
    if (now && wasConnected === false) void flushOutbox();
    wasConnected = now;
  });
  let lastState: string | null | undefined = AppState.currentState;
  AppState.addEventListener('change', (s) => {
    if (s === 'active' && lastState !== 'active') void flushOutbox();
    lastState = s;
  });
  void loadOutbox().then(() => {
    // Primer intento al abrir la app (espera a que AuthContext cargue la config).
    setTimeout(() => void flushOutbox(), 2500);
  });
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export interface UseOutboxResult {
  /** Todos los items, más nuevos primero (incluye enviados recientes). */
  items: OutboxEntry[];
  loaded: boolean;
  flushing: boolean;
  /** Sin enviar (pending + sending + error): para la insignia de Bandeja. */
  pendingCount: number;
  errorCount: number;
  sendingCount: number;
  flush: () => Promise<FlushResult>;
  sendAllNow: () => Promise<FlushResult>;
  retry: (id: string) => Promise<FlushResult>;
  remove: (id: string) => Promise<void>;
  clearSent: () => Promise<void>;
}

const subscribeStore = (cb: () => void) => subscribe(cb);
const getSnap = () => snapshot;

/** Hook reactivo de la bandeja de salida. */
export function useOutbox(): UseOutboxResult {
  const s = useSyncExternalStore(subscribeStore, getSnap, getSnap);
  const items = sortItems(s.items);
  return {
    items,
    loaded: s.loaded,
    flushing: s.flushing,
    pendingCount: countUnsent(s.items),
    errorCount: s.items.filter((i) => i.status === 'error').length,
    sendingCount: s.items.filter((i) => i.status === 'sending').length,
    flush: () => flushOutbox(),
    sendAllNow,
    retry: retryOutboxItem,
    remove: removeOutboxItem,
    clearSent,
  };
}

/** Sólo el número de pendientes (para insignias). */
export function useOutboxPendingCount(): number {
  const s = useSyncExternalStore(subscribeStore, getSnap, getSnap);
  return countUnsent(s.items);
}
