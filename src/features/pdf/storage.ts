import { Directory, File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';

/**
 * PDFs guardados en el teléfono para verlos sin conexión.
 *
 * - `report-<id>.pdf`: PDF oficial del servidor (se descarga al abrir el
 *   detalle con internet). Ver `officialPdf.ts`.
 * - `local-<outboxId>.pdf`: PDF provisional generado en el teléfono para un
 *   reporte que aún no se envía («Pendiente de folio»). Ver `localPdf.ts`.
 *
 * Viven en Documents (no en caché) para que iOS no los borre.
 */
export function pdfDir(): Directory {
  const dir = new Directory(Paths.document, 'pdfs');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export function officialPdfFile(reportId: number | string): File {
  return new File(pdfDir(), `report-${String(reportId).replace(/[^0-9a-zA-Z_-]/g, '')}.pdf`);
}

export function localPdfFile(outboxId: string): File {
  return new File(pdfDir(), `local-${outboxId.replace(/[^0-9a-zA-Z_-]/g, '')}.pdf`);
}

/** Devuelve el archivo si existe y no está vacío. */
export function existingPdf(file: File): File | null {
  try {
    return file.exists && (file.size ?? 0) > 0 ? file : null;
  } catch {
    return null;
  }
}

export function deletePdf(file: File): void {
  try {
    if (file.exists) file.delete();
  } catch {
    // ignorar
  }
}

/**
 * Abre la hoja de compartir de iOS/Android con el PDF: desde ahí se puede
 * «Guardar en Archivos», mandar por WhatsApp/correo o imprimir. Funciona sin
 * conexión porque el archivo ya está en el teléfono.
 */
export async function sharePdf(uri: string, title?: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: title ?? 'Compartir PDF' });
  return true;
}

/**
 * Abre el visor de la app (`app/(app)/pdf.tsx`) con un PDF local.
 * `provisional` muestra el aviso de «PDF provisional, pendiente de folio».
 */
export function openPdfViewer(params: { uri: string; title: string; subtitle?: string; provisional?: boolean }): void {
  router.push({
    pathname: '/pdf',
    params: {
      uri: params.uri,
      title: params.title,
      subtitle: params.subtitle ?? '',
      provisional: params.provisional ? '1' : '',
    },
  });
}
