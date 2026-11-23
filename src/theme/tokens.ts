/**
 * Tokens de diseño de Equiterm (fuente: "Sistema de diseño · App de campo",
 * sección "Tokens para React Native"). Los bloques `light`, `dark`, `space`,
 * `radius`, `size`, `font` y `shadow` se copian TAL CUAL del diseño.
 *
 * Lo que va debajo de "Extensiones" son valores que el diseño usa en las
 * pantallas/componentes (variables CSS `--neu`, `--field`, `--overlay`,
 * estados presionado/cargando de botones, etc.) pero que no estaban en el
 * bloque de tokens. No cambies los valores verbatim sin actualizar el diseño.
 */

/* ------------------------------------------------------------------ */
/* Verbatim del diseño                                                 */
/* ------------------------------------------------------------------ */

export const light = {
  brand: '#ff6213', brandInk: '#c2410c', brandSoft: '#fff1e8',
  ink: '#141516', ink2: '#374151', muted: '#6b7280',
  bg: '#f9fafb', card: '#ffffff', line: '#e5e7eb', soft: '#f3f4f6',
  ok: '#15803d', okBg: '#dcfce7', warn: '#b45309', warnBg: '#fef3c7',
  err: '#b91c1c', errBg: '#fee2e2', info: '#1d4ed8', infoBg: '#dbeafe',
};
export const dark = {
  ...light, bg: '#0f1011', card: '#1a1b1d', soft: '#242528', line: '#2c2e31',
  ink: '#f3f4f6', ink2: '#d1d5db', muted: '#9ca3af', brandInk: '#ff8a4c',
  brandSoft: 'rgba(255,98,19,0.16)', ok: '#4ade80', okBg: 'rgba(22,163,74,0.20)',
  warn: '#fbbf24', warnBg: 'rgba(217,119,6,0.22)', err: '#f87171', errBg: 'rgba(220,38,38,0.22)',
  info: '#60a5fa', infoBg: 'rgba(37,99,235,0.22)',
};
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 };
export const radius = { field: 10, card: 12, sheet: 22, pill: 999 };
export const size = { touch: 48, button: 52, buttonLg: 56, input: 52, tabBar: 86 };
export const font = { regular: 'Inter_400Regular', medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold', bold: 'Inter_700Bold' }; // @expo-google-fonts/inter
export const shadow = { sm: { shadowColor: '#141516', shadowOpacity: 0.06,
  shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 } };

/* ------------------------------------------------------------------ */
/* Extensiones (usadas en pantallas/componentes del diseño)            */
/* ------------------------------------------------------------------ */

/** Colores adicionales por tema (variables CSS del diseño de pantallas). */
const lightExtra = {
  /** Chip neutro (Borrador, Pendiente, Programado, Técnico). */
  neu: '#4b5563',
  neuBg: '#f3f4f6',
  /** Fondo de campos de texto. */
  field: '#ffffff',
  /** Fondo de campo deshabilitado / texto deshabilitado. */
  fieldDisabled: '#f3f4f6',
  textDisabled: '#9ca3af',
  /** Velo detrás de diálogos. */
  overlay: 'rgba(20,21,22,0.45)',
  /** Superficie oscura fija (tarjeta "Nuevo reporte", menú lateral, botón oscuro). */
  inverse: '#141516',
  inversePressed: '#000000',
  onInverse: '#ffffff',
  onInverseMuted: '#c7cad1',
  /** Texto sobre naranja. */
  onBrand: '#ffffff',
  brandPressed: '#e5550c',
  /** Primario en estado "cargando". */
  brandLoading: '#ff8a4c',
  /** Fondo tonal presionado. */
  brandSoftPressed: '#ffe2cf',
  /** Botón de peligro sólido. */
  danger: '#b91c1c',
  dangerPressed: '#991b1b',
  /** Borde del botón secundario presionado. */
  linePressed: '#d1d5db',
  /** Barras de progreso / acentos sólidos. */
  infoSolid: '#2563eb',
  okSolid: '#16a34a',
  warnSolid: '#d97706',
};

const darkExtra: typeof lightExtra = {
  neu: '#d1d5db',
  neuBg: '#2c2e31',
  field: '#141516',
  fieldDisabled: '#242528',
  textDisabled: '#6b7280',
  overlay: 'rgba(0,0,0,0.62)',
  inverse: '#141516',
  inversePressed: '#000000',
  onInverse: '#ffffff',
  onInverseMuted: '#c7cad1',
  onBrand: '#ffffff',
  brandPressed: '#e5550c',
  brandLoading: '#ff8a4c',
  brandSoftPressed: 'rgba(255,98,19,0.26)',
  danger: '#dc2626',
  dangerPressed: '#b91c1c',
  linePressed: '#3a3c40',
  infoSolid: '#3b82f6',
  okSolid: '#22c55e',
  warnSolid: '#f59e0b',
};

export const palettes = {
  light: { ...light, ...lightExtra },
  dark: { ...dark, ...darkExtra },
};

export type ColorScheme = keyof typeof palettes;
export type ThemeColors = typeof palettes.light;
export type ColorToken = keyof ThemeColors;

/** Menú lateral (tablet): siempre oscuro en ambos temas. */
export const sideNav = {
  bg: '#141516',
  itemActiveBg: '#2a2b2e',
  text: '#c7cad1',
  textActive: '#ffffff',
  icon: '#9ca3af',
  userCardBg: '#1f2022',
  muted: '#9ca3af',
};

/** Pesos de Inter cargados en la app (incluye 800 para el logotipo). */
export const fontFamily = {
  ...font,
  extrabold: 'Inter_800ExtraBold',
};
export type FontWeightName = keyof typeof fontFamily;

/**
 * Escala tipográfica (Inter). `letterSpacing` en dp (CSS em × tamaño).
 * Display 28/700/-0.02em · Título 1 22/700 · Título 2 19/700 · Título 3 17/600 ·
 * Cuerpo 16/400-500 · Cuerpo chico 14-15/400 · Etiqueta 14/600 · Leyenda 12-13/500-600.
 */
export const typography = {
  display: { fontSize: 28, lineHeight: 34, fontFamily: fontFamily.bold, letterSpacing: -0.56 },
  title1: { fontSize: 22, lineHeight: 28, fontFamily: fontFamily.bold, letterSpacing: -0.22 },
  title2: { fontSize: 19, lineHeight: 25, fontFamily: fontFamily.bold },
  title3: { fontSize: 17, lineHeight: 23, fontFamily: fontFamily.semibold },
  body: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily.regular },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily.semibold },
  bodySm: { fontSize: 15, lineHeight: 21, fontFamily: fontFamily.regular },
  small: { fontSize: 14, lineHeight: 20, fontFamily: fontFamily.regular },
  label: { fontSize: 14, lineHeight: 19, fontFamily: fontFamily.semibold },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.regular },
  legend: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.semibold },
  tiny: { fontSize: 11, lineHeight: 14, fontFamily: fontFamily.medium },
} as const;
export type TypographyVariant = keyof typeof typography;

/**
 * Sombras en formato CSS (`boxShadow`, soportado por RN ≥ 0.76 en iOS y
 * Android). Reproducen exactamente las del diseño.
 */
export const boxShadow = {
  /** Tarjetas (sm). */
  sm: '0px 1px 2px rgba(20,21,22,0.04), 0px 4px 14px rgba(20,21,22,0.05)',
  /** Avisos, popovers (lg). */
  lg: '0px 12px 32px rgba(20,21,22,0.18)',
  /** Diálogos. */
  dialog: '0px 24px 60px rgba(0,0,0,0.25)',
  /** Botón central "+" de la barra de pestañas. */
  fab: '0px 6px 16px rgba(255,98,19,0.35)',
  /** Segmento seleccionado. */
  segment: '0px 1px 2px rgba(20,21,22,0.08)',
  /** Perilla del interruptor. */
  knob: '0px 1px 3px rgba(0,0,0,0.25)',
  /** Sombra de tarjeta en modo oscuro. */
  smDark: '0px 1px 2px rgba(0,0,0,0.35)',
};

/** Anillo de enfoque/selección (3 dp en brandSoft). */
export const focusRing = (color: string) => `0px 0px 0px 3px ${color}`;

/** Ancho mínimo (dp) a partir del cual se usa la distribución de tablet. */
export const TABLET_BREAKPOINT = 768;

/** Ancho del menú lateral de tablet. */
export const SIDE_NAV_WIDTH = 248;

/** Colores fijos de avatar (lista de 6, uno por persona). */
export const avatarColors = ['#ff6213', '#2563eb', '#16a34a', '#d97706', '#141516', '#6b7280'];
