import type { ReportDraft, StepErrors } from './types';

/** Validación por paso (índice 0-based). Devuelve errores por campo; vacío = válido. */
export function validateStep(step: number, d: ReportDraft): StepErrors {
  const e: StepErrors = {};
  switch (step) {
    case 0:
      if (d.cliente.mode === 'list') {
        if (d.cliente.id === undefined || !d.cliente.nombre) e.cliente = 'Elige el cliente del servicio.';
      } else if (!d.cliente.nombre.trim()) {
        e.nombre = 'Escribe el nombre del cliente.';
      }
      break;
    case 1:
      if (!d.equipo.tipo) e.tipo = 'Elige el tipo de equipo.';
      else if (d.equipo.tipo === 'Otro' && !d.equipo.tipoOtro.trim()) e.tipoOtro = 'Describe el tipo de equipo.';
      break;
    case 2:
      if (!d.trabajo.tipoServicio) e.tipoServicio = 'Elige el tipo de servicio.';
      if (!d.trabajo.trabajos.trim()) e.trabajos = 'Describe los trabajos realizados.';
      break;
    case 3:
      break;
    case 4:
      if (!d.firma.nombre.trim()) e.firmaNombre = 'Escribe el nombre de quien firma.';
      if (!d.firma.aceptada || !d.firma.path) e.firma = 'Pide al cliente que firme y toca «Aceptar».';
      break;
  }
  return e;
}

export function hasErrors(e: StepErrors): boolean {
  return Object.values(e).some(Boolean);
}

function num(v: string): number | string | undefined {
  const t = v.trim().replace(',', '.');
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : v.trim();
}

function opt(v: string): string | undefined {
  const t = v.trim();
  return t ? t : undefined;
}

/**
 * Cuerpo de POST /reportes (se manda como multipart; ver `src/lib/outbox.ts`).
 * Las fotos van como archivos `fotos[]` en el mismo orden que `fotos_meta`;
 * la firma como archivo `firma` (SVG) además del trazo en `firma.trazo`.
 */
export function buildReportBody(d: ReportDraft, extra: { capturedAt: string; tecnicoId?: number }) {
  const equipoTipo = d.equipo.tipo === 'Otro' ? d.equipo.tipoOtro.trim() || 'Otro' : d.equipo.tipo;
  return {
    origen: 'app_movil',
    capturado_en: extra.capturedAt,
    tecnico_id: extra.tecnicoId,
    servicio_id: d.servicioId,
    cliente:
      d.cliente.mode === 'list'
        ? { id: d.cliente.id, nombre: d.cliente.nombre }
        : {
            nombre: d.cliente.nombre.trim(),
            empresa: opt(d.cliente.empresa),
            ubicacion: opt(d.cliente.ubicacion),
          },
    cliente_id: d.cliente.mode === 'list' ? d.cliente.id : undefined,
    equipo: {
      tipo: equipoTipo,
      marca: opt(d.equipo.marca),
      modelo: opt(d.equipo.modelo),
      numero_serie: opt(d.equipo.serie),
      capacidad: opt(d.equipo.capacidad),
      ubicacion: opt(d.equipo.ubicacion),
    },
    tipo_servicio: d.trabajo.tipoServicio,
    hallazgos: opt(d.trabajo.hallazgos),
    trabajos_realizados: opt(d.trabajo.trabajos),
    recomendaciones: opt(d.trabajo.recomendaciones),
    materiales: d.trabajo.materiales
      .filter((m) => m.descripcion.trim())
      .map((m) => ({ descripcion: m.descripcion.trim(), cantidad: num(m.cantidad) ?? 1, unidad: opt(m.unidad) })),
    lecturas: {
      presion_operacion: num(d.trabajo.lecturas.presion),
      temperatura_chimenea: num(d.trabajo.lecturas.temperatura),
      tds: num(d.trabajo.lecturas.tds),
      ph: num(d.trabajo.lecturas.ph),
    },
    fotos_meta: d.fotos.map((p, i) => ({ orden: i + 1, descripcion: opt(p.caption) })),
    firma: {
      nombre: d.firma.nombre.trim(),
      trazo: d.firma.path,
      ancho: Math.round(d.firma.width),
      alto: Math.round(d.firma.height),
      firmado_en: extra.capturedAt,
    },
  };
}

/** Subtítulo para la bandeja: "Caldera · Cleaver-Brooks · 4 fotos". */
export function outboxSubtitle(d: ReportDraft): string {
  const parts: string[] = [];
  const tipo = d.equipo.tipo === 'Otro' ? d.equipo.tipoOtro.trim() || 'Otro' : d.equipo.tipo;
  const eq = [tipo, d.equipo.capacidad.trim()].filter(Boolean).join(' ');
  if (eq) parts.push(eq);
  if (d.trabajo.tipoServicio) parts.push(d.trabajo.tipoServicio);
  if (d.fotos.length) parts.push(`${d.fotos.length} ${d.fotos.length === 1 ? 'foto' : 'fotos'}`);
  return parts.join(' · ');
}
