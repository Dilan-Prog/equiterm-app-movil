import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Ancho máximo de las fotos del reporte. Es el mismo con el que el servidor
 * las guarda (ServiceReportService::saveImages → 1800 px), así que subir más
 * píxeles solo gasta datos y tiempo de envío sin mejorar el PDF.
 */
export const PHOTO_MAX_WIDTH = 1800;
/** Calidad JPEG final (0–1). */
export const PHOTO_QUALITY = 0.7;

export interface PreparedPhoto {
  uri: string;
  width: number;
  height: number;
}

/**
 * Reduce la foto a {@link PHOTO_MAX_WIDTH} px de ancho (sin agrandar las
 * pequeñas) y la vuelve a guardar como JPEG. También convierte HEIC/PNG a
 * JPEG, que es lo que acepta el servidor. Una foto de iPhone pasa de ~2–3 MB
 * a ~300–500 KB. Si algo falla, devuelve la original para no perder la foto.
 */
export async function preparePhoto(uri: string, width?: number, height?: number): Promise<PreparedPhoto> {
  try {
    const context = ImageManipulator.manipulate(uri);
    // Sin ancho conocido no se redimensiona (resize agrandaría una foto chica).
    if (width && width > PHOTO_MAX_WIDTH) context.resize({ width: PHOTO_MAX_WIDTH });
    const image = await context.renderAsync();
    try {
      const result = await image.saveAsync({ compress: PHOTO_QUALITY, format: SaveFormat.JPEG });
      return { uri: result.uri, width: result.width, height: result.height };
    } finally {
      image.release();
      context.release();
    }
  } catch {
    return { uri, width: width ?? 0, height: height ?? 0 };
  }
}
