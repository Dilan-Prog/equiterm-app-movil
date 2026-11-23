import type { CustomerRef, ServiceItem, TechnicianRef } from '../../api/types';

/**
 * Servicio de la agenda tal como lo devuelve `GET /servicios?from&to`.
 * Extiende el `ServiceItem` compartido con los campos extra del endpoint
 * (todos opcionales para tolerar cambios del backend).
 */
export interface AgendaService extends ServiceItem {
  service_number?: string | null;
  priority?: string | null;
  priority_label?: string | null;
  /** Minutos (número) u horas/texto ("2", "01:30", "2 h"). */
  estimated_duration?: number | string | null;
  customer?: CustomerRef | string | null;
  technician?: TechnicianRef | string | null;
  technicians?: (TechnicianRef | string)[] | null;
  reference?: string | null;
  description?: string | null;
}

export type AgendaView = 'list' | 'week';
