import type { Permissions } from '../../api/types';
import { humanizeKey } from '../../lib/format';
import type { IconName } from '../../ui';

export type PermAction = 'view' | 'create' | 'edit' | 'delete';

export const ACTIONS: { key: PermAction; label: string; aliases: string[] }[] = [
  { key: 'view', label: 'Ver', aliases: ['view', 'ver', 'read', 'index', 'show', 'list', 'viewany', 'view_any'] },
  { key: 'create', label: 'Crear', aliases: ['create', 'crear', 'store', 'add'] },
  { key: 'edit', label: 'Editar', aliases: ['edit', 'editar', 'update', 'actualizar'] },
  { key: 'delete', label: 'Eliminar', aliases: ['delete', 'eliminar', 'destroy', 'remove', 'borrar'] },
];

interface ModuleDef {
  match: RegExp;
  label: string;
  icon: IconName;
  order: number;
}

/** Módulos del diseño (orden y textos de la matriz de permisos). */
const MODULES: ModuleDef[] = [
  { match: /report/i, label: 'Reportes de servicio', icon: 'description', order: 0 },
  { match: /(agenda|technical|servicio|service)/i, label: 'Agenda de servicios', icon: 'calendar_month', order: 1 },
  { match: /(client|customer)/i, label: 'Clientes', icon: 'apartment', order: 2 },
  { match: /(bandeja|outbox|sync)/i, label: 'Bandeja de salida', icon: 'outbox', order: 3 },
  { match: /(usuario|user|role|rol)/i, label: 'Usuarios y roles', icon: 'group', order: 4 },
];

export const DEFAULT_MODULE_KEYS = ['service-reports', 'technical-services', 'clients', 'outbox', 'users'];

export interface ModuleRow {
  key: string;
  label: string;
  icon: IconName;
  order: number;
}

export function describeModule(key: string): ModuleRow {
  const def = MODULES.find((m) => m.match.test(key));
  if (def) return { key, label: def.label, icon: def.icon, order: def.order };
  return { key, label: humanizeKey(key), icon: 'apps', order: 99 };
}

/** Normaliza las acciones de un módulo a Ver/Crear/Editar/Eliminar. */
export function normalizeActions(actions: string[] | undefined | null): Set<PermAction> {
  const out = new Set<PermAction>();
  for (const raw of actions ?? []) {
    const a = String(raw).toLowerCase().replace(/[\s-]+/g, '_');
    if (a === '*' || a === 'all' || a === 'manage') ACTIONS.forEach((x) => out.add(x.key));
    for (const x of ACTIONS) if (x.aliases.includes(a)) out.add(x.key);
  }
  return out;
}

export type Matrix = Record<string, Set<PermAction>>;

/** Construye la matriz de permisos. Admin sin mapa → todo activo en los módulos del diseño. */
export function buildMatrix(perms: Permissions | null | undefined, isAdmin?: boolean): { rows: ModuleRow[]; matrix: Matrix } {
  const keys = Object.keys(perms ?? {});
  const all = keys.length ? keys : DEFAULT_MODULE_KEYS;
  const matrix: Matrix = {};
  for (const k of all) {
    matrix[k] = isAdmin && !keys.length ? new Set(ACTIONS.map((a) => a.key)) : normalizeActions(perms?.[k]);
  }
  // Un módulo por fila del diseño: si varias claves caen en el mismo, se conservan todas.
  const rows = all.map(describeModule).sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'es'));
  return { rows, matrix };
}

export function matrixToPermissions(matrix: Matrix): Permissions {
  const out: Permissions = {};
  for (const [k, set] of Object.entries(matrix)) out[k] = ACTIONS.filter((a) => set.has(a.key)).map((a) => a.key);
  return out;
}
