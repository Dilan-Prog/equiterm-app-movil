import { createIdempotencyKey, enqueue } from '../../../lib/outbox';
import { toYmd } from '../../../lib/format';
import { formatShortDate } from '../utils';
import type { CustomerOption, TechnicianOption } from './options';

/** Deben existir en el catálogo service_types del panel (el servidor acepta coincidencia parcial). */
export const SERVICE_TYPES = ['Preventivo', 'Correctivo', 'Diagnóstico', 'Reparación', 'Instalación', 'Revisión general'] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export interface ScheduleDraft {
  customer: CustomerOption;
  serviceType: ServiceType;
  date: Date;
  /** "HH:MM". */
  time: string;
  technician?: TechnicianOption | null;
  address: string;
  notes: string;
}

/** Cuerpo para `POST /servicios`. */
export function buildServiceBody(d: ScheduleDraft) {
  return {
    title: `Servicio ${d.serviceType.toLowerCase()}`,
    service_type: d.serviceType,
    customer_id: d.customer.id ?? null,
    customer_name: d.customer.name,
    scheduled_at: `${toYmd(d.date)} ${d.time}:00`,
    technician_id: d.technician?.id ?? null,
    technician_name: d.technician?.name ?? null,
    address: d.address.trim() || null,
    description: d.notes.trim() || null,
  };
}

/**
 * Guarda el servicio en la bandeja de salida (se envía cuando el servidor
 * acepte `POST /servicios`). Devuelve el id de la operación.
 */
export async function enqueueService(d: ScheduleDraft): Promise<string> {
  const entry = await enqueue({
    type: 'technical_service.create',
    endpoint: '/servicios',
    method: 'POST',
    body: buildServiceBody(d),
    idempotencyKey: createIdempotencyKey(),
    label: `Servicio · ${d.customer.name}`,
    subtitle: `${d.serviceType} · ${formatShortDate(d.date)} · ${d.time}`,
  });
  return entry.id;
}
