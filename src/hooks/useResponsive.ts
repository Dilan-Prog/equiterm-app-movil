import { useWindowDimensions } from 'react-native';
import { getScale, type Scale } from '../theme/responsive';

export type Responsive = Scale & { width: number; height: number; isLandscape: boolean };

/** Dimensiones de la ventana + `isTablet` (ancho ≥ 768). */
export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  return { ...getScale(width), width, height, isLandscape: width > height };
}
