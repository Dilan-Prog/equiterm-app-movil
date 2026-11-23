import { getApiBaseUrl, getServerUrl } from '../lib/config';
import type { LoginResponse, Paginated, ReportDetail, ReportSummary, ServiceItem, User } from './types';

/**
 * Cliente HTTP del API móvil.
 * - Agrega base URL, `Accept: application/json` y `Authorization: Bearer`.
 * - Convierte errores en `ApiError` con mensaje en español.
 * - En 401 llama al manejador global (cierra sesión).
 */

const TIMEOUT_MS = 20000;

let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn;
}

export class ApiError extends Error {
  status: number; // 0 = error de red / timeout
  data: unknown;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    if (data && typeof data === 'object' && 'errors' in data) {
      this.errors = (data as { errors?: Record<string, string[]> }).errors;
    }
  }

  get isNetwork() {
    return this.status === 0;
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
  headers?: Record<string, string>;
  /** No disparar logout global en 401 (p. ej. en /login). */
  skipAuthHandler?: boolean;
}

function buildQuery(q?: Query): string {
  if (!q) return '';
  const parts = Object.entries(q)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

function defaultMessage(status: number): string {
  switch (status) {
    case 401:
      return 'Tu sesión expiró. Inicia sesión de nuevo.';
    case 403:
      return 'No tienes permiso para ver esta sección.';
    case 404:
      return 'No se encontró la información solicitada.';
    case 419:
      return 'La sesión expiró.';
    case 422:
      return 'Los datos enviados no son válidos.';
    case 429:
      return 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.';
    default:
      if (status >= 500) return 'Error en el servidor. Intenta más tarde.';
      return `Error inesperado (${status}).`;
  }
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  if (!getServerUrl()) {
    throw new ApiError(
      'No hay servidor configurado. Define EXPO_PUBLIC_API_URL en .env o usa "Configurar servidor".',
      0,
    );
  }

  const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}${buildQuery(opts.query)}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(opts.headers ?? {}),
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    const aborted = (e as { name?: string })?.name === 'AbortError';
    throw new ApiError(
      aborted
        ? 'El servidor tardó demasiado en responder.'
        : `No se pudo conectar con el servidor (${getServerUrl()}). Revisa tu conexión y la dirección del servidor.`,
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text().catch(() => '');
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const msg =
      data && typeof data === 'object' && typeof (data as { message?: unknown }).message === 'string' &&
      (data as { message: string }).message
        ? (data as { message: string }).message
        : defaultMessage(res.status);
    if (res.status === 401 && !opts.skipAuthHandler && unauthorizedHandler) {
      unauthorizedHandler();
    }
    throw new ApiError(msg, res.status, data);
  }

  if (data !== null && typeof data !== 'object') {
    throw new ApiError('Respuesta inválida del servidor (no es JSON). ¿La URL del servidor es correcta?', res.status, data);
  }

  return data as T;
}

/* ------------------------------------------------------------------ */
/* Endpoints                                                           */
/* ------------------------------------------------------------------ */

export const api = {
  login(email: string, password: string, deviceName: string) {
    return apiRequest<LoginResponse>('/login', {
      method: 'POST',
      body: { email, password, device_name: deviceName },
      skipAuthHandler: true,
    });
  },

  logout() {
    return apiRequest<unknown>('/logout', { method: 'POST', skipAuthHandler: true });
  },

  async me(): Promise<User> {
    const res = await apiRequest<{ user?: User; data?: User }>('/me');
    const user = res?.user ?? res?.data;
    if (!user) throw new ApiError('Respuesta inválida de /me', 200, res);
    return user;
  },

  reports(params: { search?: string; page?: number; per_page?: number }) {
    return apiRequest<Paginated<ReportSummary>>('/reportes', { query: params });
  },

  async report(id: number | string): Promise<ReportDetail> {
    const res = await apiRequest<{ data?: ReportDetail } & Partial<ReportDetail>>(`/reportes/${id}`);
    return (res?.data ?? (res as ReportDetail)) as ReportDetail;
  },

  async services(params: { from?: string; to?: string }): Promise<ServiceItem[]> {
    const res = await apiRequest<{ data?: ServiceItem[] } | ServiceItem[]>('/servicios', { query: params });
    if (Array.isArray(res)) return res;
    return Array.isArray(res?.data) ? res.data : [];
  },
};
