/** Modelo del borrador del asistente "Nuevo reporte" (se guarda en AsyncStorage). */

export const STEP_NAMES = ['Cliente', 'Equipo', 'Trabajo realizado', 'Fotos', 'Firma'] as const;
/** Etiquetas cortas del indicador de pasos en teléfono. */
export const STEP_SHORT = ['Cliente', 'Equipo', 'Trabajo', 'Fotos', 'Firma'] as const;

export const EQUIPMENT_TYPES = ['Caldera', 'Calentador', 'Suavizador', 'Ósmosis inversa', 'Otro'] as const;
export const SERVICE_TYPES = ['Preventivo', 'Correctivo', 'Arranque', 'Inspección'] as const;

export const MAX_PHOTOS = 12;

export interface ClientOption {
  id: number | string;
  nombre: string;
  contacto?: string;
  ubicacion?: string;
}

export interface DraftClient {
  /** `list` = elegido del catálogo del servidor · `manual` = texto libre (sin endpoint /clientes). */
  mode: 'list' | 'manual';
  id?: number | string;
  nombre: string;
  empresa: string;
  contacto: string;
  ubicacion: string;
}

export interface DraftEquipment {
  tipo: string;
  tipoOtro: string;
  marca: string;
  modelo: string;
  serie: string;
  capacidad: string;
  ubicacion: string;
}

export interface DraftMaterial {
  id: string;
  descripcion: string;
  cantidad: string;
  unidad: string;
}

export interface DraftReadings {
  presion: string;
  temperatura: string;
  tds: string;
  ph: string;
}

export interface DraftWork {
  tipoServicio: string;
  hallazgos: string;
  trabajos: string;
  recomendaciones: string;
  materiales: DraftMaterial[];
  lecturas: DraftReadings;
}

export interface DraftPhoto {
  id: string;
  /** URI persistente (documentDirectory/report-draft/…). */
  uri: string;
  caption: string;
  width?: number;
  height?: number;
}

export interface DraftSignature {
  nombre: string;
  path: string;
  width: number;
  height: number;
  aceptada: boolean;
}

export interface ReportDraft {
  version: 1;
  step: number;
  createdAt: number;
  updatedAt: number;
  /** Servicio técnico de la agenda del que nace el reporte (opcional). */
  servicioId?: number | string;
  cliente: DraftClient;
  equipo: DraftEquipment;
  trabajo: DraftWork;
  fotos: DraftPhoto[];
  firma: DraftSignature;
}

export function emptyDraft(): ReportDraft {
  const now = Date.now();
  return {
    version: 1,
    step: 0,
    createdAt: now,
    updatedAt: now,
    cliente: { mode: 'list', nombre: '', empresa: '', contacto: '', ubicacion: '' },
    equipo: { tipo: '', tipoOtro: '', marca: '', modelo: '', serie: '', capacidad: '', ubicacion: '' },
    trabajo: {
      tipoServicio: '',
      hallazgos: '',
      trabajos: '',
      recomendaciones: '',
      materiales: [],
      lecturas: { presion: '', temperatura: '', tds: '', ph: '' },
    },
    fotos: [],
    firma: { nombre: '', path: '', width: 0, height: 0, aceptada: false },
  };
}

/** ¿El usuario ya capturó algo? (para confirmar al cerrar y para reanudar). */
export function isDraftDirty(d: ReportDraft): boolean {
  const e = emptyDraft();
  const strip = (x: ReportDraft) => JSON.stringify({ ...x, step: 0, createdAt: 0, updatedAt: 0, cliente: { ...x.cliente, mode: 'list' } });
  return strip(d) !== strip(e);
}

export type StepErrors = Record<string, string | undefined>;
