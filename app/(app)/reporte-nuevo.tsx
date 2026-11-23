import React from 'react';
import { NuevoReporteWizard } from '../../src/features/nuevo-reporte/NuevoReporteWizard';

/** Asistente "Nuevo reporte" (5 pasos: Cliente, Equipo, Trabajo, Fotos, Firma). */
export default function NuevoReporteScreen() {
  return <NuevoReporteWizard />;
}
