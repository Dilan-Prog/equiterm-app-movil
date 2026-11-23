import { ApiError, apiRequest } from '../../api/client';
import type { Permissions, Role } from '../../api/types';

/** Usuario administrable (`GET /usuarios`). Campos opcionales: el endpoint aún no existe. */
export interface ManagedUser {
  id: number;
  name: string;
  email?: string | null;
  role?: Role | null;
  is_admin?: boolean;
  is_active?: boolean | null;
  active?: boolean | null;
  phone?: string | null;
  last_login_at?: string | null;
  last_seen_at?: string | null;
}

/** Rol con permisos por módulo (`GET /roles`). */
export interface ManagedRole {
  id: number | string;
  name: string;
  description?: string | null;
  users_count?: number | null;
  permissions?: Permissions | null;
  is_admin?: boolean;
}

/** Resultado de un endpoint que el servidor puede no tener todavía. */
export type Availability<T> = { available: true; data: T } | { available: false; reason: 'not_found' | 'forbidden' };

function unwrapList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  const d = (res as { data?: unknown })?.data;
  return Array.isArray(d) ? (d as T[]) : [];
}

/** 404/405/501 → el servidor aún no habilita el endpoint; 403 → sin permiso. Otros errores se propagan. */
async function optional<T>(path: string): Promise<Availability<T[]>> {
  try {
    const res = await apiRequest<unknown>(path, { query: { per_page: 100 } });
    return { available: true, data: unwrapList<T>(res) };
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 405 || e.status === 501)) return { available: false, reason: 'not_found' };
    if (e instanceof ApiError && e.status === 403) return { available: false, reason: 'forbidden' };
    throw e;
  }
}

export const usuariosApi = {
  users: () => optional<ManagedUser>('/usuarios'),
  roles: () => optional<ManagedRole>('/roles'),
  /** Guarda permisos de un rol (`PUT /roles/{id}`); el servidor aún no lo implementa. */
  saveRole(id: ManagedRole['id'], permissions: Permissions) {
    return apiRequest<unknown>(`/roles/${id}`, { method: 'PUT', body: { permissions } });
  },
};

export const usuariosCacheKeys = {
  users: 'usuarios.list',
  roles: 'roles.list',
};

export function isUserActive(u: ManagedUser): boolean {
  if (typeof u.is_active === 'boolean') return u.is_active;
  if (typeof u.active === 'boolean') return u.active;
  return true;
}

export function roleName(r?: Role | null, isAdmin?: boolean): string {
  return r?.name || (isAdmin ? 'Administrador' : 'Sin rol');
}
