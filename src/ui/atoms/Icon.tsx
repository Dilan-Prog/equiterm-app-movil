import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { useTheme, type ColorToken } from '../../theme';

type GlyphName = keyof typeof MaterialIcons.glyphMap;
type KebabToSnake<S extends string> = S extends `${infer A}-${infer B}` ? `${A}_${KebabToSnake<B>}` : S;

/**
 * Nombres de Material Symbols usados en el diseño que no existen en
 * MaterialIcons → equivalente más cercano.
 */
const ALIASES = {
  mode_heat: 'local-fire-department',
  shield_person: 'admin-panel-settings',
  signature: 'draw',
  ink_eraser: 'cleaning-services',
  progress_activity: 'autorenew',
  calendar_add_on: 'edit-calendar',
} as const satisfies Record<string, GlyphName>;

/** Variantes "outline" disponibles en MaterialIcons (para `filled={false}`). */
const OUTLINE: Partial<Record<GlyphName, GlyphName>> = {
  error: 'error-outline',
  'check-circle': 'check-circle-outline',
  lock: 'lock-outline',
  mail: 'mail-outline',
  person: 'person-outline',
  group: 'people-outline',
  info: 'info-outline',
  help: 'help-outline',
  star: 'star-outline',
  delete: 'delete-outline',
};

/** Nombre de ícono: Material Symbols en snake_case (`calendar_month`) o MaterialIcons en kebab (`calendar-month`). */
export type IconName = GlyphName | KebabToSnake<GlyphName> | keyof typeof ALIASES;

export function resolveIconName(name: IconName, filled = true): GlyphName {
  const alias = (ALIASES as Record<string, GlyphName>)[name];
  const glyph = (alias ?? name.replace(/_/g, '-')) as GlyphName;
  if (!filled && OUTLINE[glyph]) return OUTLINE[glyph]!;
  return glyph;
}

export interface IconProps {
  name: IconName;
  /** 17 metadatos · 20 listas/botones · 22 campos · 24 navegación (default 24). */
  size?: number;
  /** Token de color o color literal (default `ink`). */
  color?: ColorToken | (string & {});
  /** MaterialIcons es relleno por defecto; `false` usa la variante outline cuando existe. */
  filled?: boolean;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

/** Ícono (Material Symbols Rounded ≈ MaterialIcons de @expo/vector-icons). */
export function Icon({ name, size = 24, color = 'ink', filled = true, style, accessibilityLabel }: IconProps) {
  const { colors } = useTheme();
  const c = (colors as Record<string, string>)[color] ?? color;
  return (
    <MaterialIcons
      name={resolveIconName(name, filled)}
      size={size}
      color={c}
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessible={!!accessibilityLabel}
    />
  );
}
