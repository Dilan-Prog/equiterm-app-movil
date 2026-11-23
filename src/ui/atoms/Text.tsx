import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { fontFamily, typography, useTheme, type ColorToken, type FontWeightName, type TypographyVariant } from '../../theme';

export interface TextProps extends RNTextProps {
  /** Estilo tipográfico del sistema (default `body`). */
  variant?: TypographyVariant;
  /** Sobrescribe el peso (familia Inter correspondiente). Nunca uses `fontWeight` con Inter. */
  weight?: FontWeightName;
  /** Token de color del tema (`ink`, `muted`, `brandInk`…) o color literal. Default `ink`. */
  color?: ColorToken | (string & {});
  /** Tamaño en dp (sobrescribe el de la variante; ajusta lineHeight ×1.35). */
  size?: number;
  align?: 'left' | 'center' | 'right';
  /** Números tabulares (horas, folios, contadores). */
  tabular?: boolean;
}

/**
 * Texto base con Inter. Todos los textos de la app deben usarlo
 * (o aplicar `fontFamily.*` a mano en `TextInput`).
 */
export function Text({ variant = 'body', weight, color = 'ink', size, align, tabular, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  const v = typography[variant];
  const resolved = (colors as Record<string, string>)[color] ?? color;
  return (
    <RNText
      {...rest}
      style={[
        v,
        size ? { fontSize: size, lineHeight: Math.round(size * 1.35) } : null,
        weight ? { fontFamily: fontFamily[weight] } : null,
        { color: resolved },
        align ? { textAlign: align } : null,
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
    />
  );
}
