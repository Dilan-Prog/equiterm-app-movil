import { TABLET_BREAKPOINT } from './tokens';

/** Escalas heredadas (pantallas de la fase 1). Las nuevas usan `space`/`typography`. */
export type Scale = {
  isTablet: boolean;
  pad: number;
  gap: number;
  font: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number };
  radius: number;
};

export function getScale(width: number): Scale {
  const isTablet = width >= TABLET_BREAKPOINT;
  return {
    isTablet,
    // Margen de pantalla: 16 teléfono, 24-32 tablet (diseño).
    pad: isTablet ? 24 : 16,
    gap: 12,
    radius: 12,
    font: { xs: 12, sm: 13, md: 15, lg: 17, xl: 19, xxl: 28 },
  };
}
