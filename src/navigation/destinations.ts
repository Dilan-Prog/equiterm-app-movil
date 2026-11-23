import type { Href } from 'expo-router';
import type { IconName } from '../ui';

/** Destinos principales de la app (pestañas en teléfono, menú lateral en tablet). */
export type DestinationKey = 'inicio' | 'reportes' | 'nuevo' | 'agenda' | 'bandeja' | 'usuarios' | 'perfil';

export const DEST: Record<DestinationKey, { href: Href; label: string; tabLabel: string; icon: IconName }> = {
  inicio: { href: '/', label: 'Inicio', tabLabel: 'Inicio', icon: 'home' },
  reportes: { href: '/reportes', label: 'Reportes de servicio', tabLabel: 'Reportes', icon: 'description' },
  nuevo: { href: '/reporte-nuevo', label: 'Nuevo reporte', tabLabel: 'Nuevo', icon: 'note_add' },
  agenda: { href: '/agenda', label: 'Agenda de servicios', tabLabel: 'Agenda', icon: 'calendar_month' },
  bandeja: { href: '/bandeja', label: 'Bandeja de salida', tabLabel: 'Bandeja', icon: 'outbox' },
  usuarios: { href: '/usuarios', label: 'Usuarios y roles', tabLabel: 'Usuarios', icon: 'group' },
  perfil: { href: '/perfil', label: 'Perfil', tabLabel: 'Perfil', icon: 'person' },
};

/** Destino activo a partir de la ruta actual (`usePathname()`). */
export function destinationFromPath(path: string): DestinationKey {
  if (path === '/' || path === '') return 'inicio';
  if (path.startsWith('/reporte-nuevo')) return 'nuevo';
  if (path.startsWith('/reportes')) return 'reportes';
  if (path.startsWith('/agenda') || path.startsWith('/servicio-nuevo')) return 'agenda';
  if (path.startsWith('/bandeja')) return 'bandeja';
  if (path.startsWith('/usuarios')) return 'usuarios';
  if (path.startsWith('/perfil')) return 'perfil';
  return 'inicio';
}
