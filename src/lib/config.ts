import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Configuración del servidor.
 *
 * Prioridad:
 *  1. URL guardada manualmente en la app ("Configurar servidor") → AsyncStorage.
 *  2. EXPO_PUBLIC_API_URL del archivo .env (se incrusta al arrancar `npx expo start`).
 */
const SERVER_KEY = 'equiterm.serverUrl';

export const API_PREFIX = '/api/mobile/v1';

export const ENV_API_URL = normalizeUrl(process.env.EXPO_PUBLIC_API_URL ?? '');

let current: string = ENV_API_URL;
let override: string | null = null;

export function normalizeUrl(url: string): string {
  let u = (url ?? '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = `http://${u}`;
  return u.replace(/\/+$/, '');
}

/** Carga el override guardado (llamar una vez al iniciar la app). */
export async function loadServerConfig(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(SERVER_KEY);
    override = saved ? normalizeUrl(saved) : null;
  } catch {
    override = null;
  }
  current = override || ENV_API_URL;
  return current;
}

export function getServerUrl(): string {
  return current;
}

export function hasServerOverride(): boolean {
  return !!override;
}

export function getApiBaseUrl(): string {
  return `${current}${API_PREFIX}`;
}

/** Guarda una URL personalizada; pasar '' o null para volver a la del .env. */
export async function setServerUrl(url: string | null): Promise<string> {
  const n = normalizeUrl(url ?? '');
  if (n) {
    await AsyncStorage.setItem(SERVER_KEY, n);
    override = n;
  } else {
    await AsyncStorage.removeItem(SERVER_KEY);
    override = null;
  }
  current = override || ENV_API_URL;
  return current;
}
