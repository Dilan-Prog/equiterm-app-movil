import React from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { fontFamily, radius, useTheme, type ThemeColors } from '../../theme';
import { Icon, type IconName } from './Icon';
import { Spinner } from './Spinner';
import { Text } from './Text';

export type ButtonVariant =
  | 'primary'
  | 'dark'
  | 'secondary'
  | 'tonal'
  | 'danger'
  | 'dangerSoft'
  | 'ghost'
  | 'ghostMuted';
export type ButtonSize = 'lg' | 'md' | 'sm';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  /** primary (naranja, 1 por pantalla) · dark (confirmar dentro de un paso) · secondary (borde) ·
   * tonal (acción en tarjeta) · danger (sólo diálogos) · dangerSoft (perfil) · ghost (naranja sin fondo) ·
   * ghostMuted (gris, p. ej. "Configurar servidor"). Default primary. */
  variant?: ButtonVariant;
  /** lg 56 · md 52 · sm 44 de alto. Default md. */
  size?: ButtonSize;
  /** Ícono a la izquierda (20, a 8 del texto). */
  icon?: IconName;
  /** Ícono a la derecha (p. ej. `arrow_forward` en "Siguiente"). */
  iconRight?: IconName;
  /** Muestra spinner y deshabilita. */
  loading?: boolean;
  /** Texto mientras carga (p. ej. "Guardando…"). */
  loadingTitle?: string;
  disabled?: boolean;
  /** Ocupa todo el ancho disponible (default true). */
  block?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

const HEIGHT: Record<ButtonSize, number> = { lg: 56, md: 52, sm: 44 };
const FONT: Record<ButtonSize, number> = { lg: 17, md: 16, sm: 15 };

function palette(v: ButtonVariant, c: ThemeColors, pressed: boolean, loading: boolean) {
  switch (v) {
    case 'primary':
      return { bg: loading ? c.brandLoading : pressed ? c.brandPressed : c.brand, fg: c.onBrand, border: 'transparent' };
    case 'dark':
      return { bg: pressed ? c.inversePressed : c.inverse, fg: c.onInverse, border: c.inverse === c.card ? c.line : 'transparent' };
    case 'secondary':
      return { bg: pressed ? c.soft : c.card, fg: c.ink, border: pressed ? c.linePressed : c.line };
    case 'tonal':
      return { bg: pressed ? c.brandSoftPressed : c.brandSoft, fg: c.brandInk, border: 'transparent' };
    case 'danger':
      return { bg: pressed ? c.dangerPressed : c.danger, fg: '#ffffff', border: 'transparent' };
    case 'dangerSoft':
      return { bg: c.errBg, fg: c.err, border: 'transparent' };
    case 'ghost':
      return { bg: pressed ? c.brandSoft : 'transparent', fg: c.brandInk, border: 'transparent' };
    case 'ghostMuted':
      return { bg: pressed ? c.soft : 'transparent', fg: c.muted, border: 'transparent' };
  }
}

/** Botón (A·02). Radio 12, texto 16/600, presionado = color más oscuro + escala 0.97, deshabilitado opacidad .45. */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  loadingTitle,
  disabled,
  block = true,
  style,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const { colors } = useTheme();
  const inactive = disabled || loading;
  const muted = variant === 'ghostMuted';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => {
        const p = palette(variant, colors, pressed && !inactive, !!loading);
        return [
          {
            height: variant.startsWith('ghost') ? Math.min(HEIGHT[size], 48) : HEIGHT[size],
            borderRadius: radius.card,
            backgroundColor: p.bg,
            borderWidth: p.border === 'transparent' ? 0 : 1,
            borderColor: p.border,
            paddingHorizontal: size === 'sm' ? 14 : 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: variant.startsWith('ghost') || size === 'sm' ? 6 : 8,
            alignSelf: block ? 'stretch' : 'flex-start',
            opacity: disabled && !loading ? 0.45 : 1,
            transform: [{ scale: pressed && !inactive ? 0.97 : 1 }],
          } as ViewStyle,
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const p = palette(variant, colors, pressed && !inactive, !!loading);
        return (
          <>
            {loading ? (
              <Spinner size={18} thickness={2.5} color={p.fg} trackColor="rgba(255,255,255,0.4)" />
            ) : icon ? (
              <Icon name={icon} size={20} color={p.fg} />
            ) : null}
            <Text
              size={muted ? 15 : FONT[size]}
              style={{ fontFamily: muted ? fontFamily.medium : fontFamily.semibold, color: p.fg }}
              numberOfLines={1}
            >
              {loading && loadingTitle ? loadingTitle : title}
            </Text>
            {iconRight && !loading ? <Icon name={iconRight} size={20} color={p.fg} /> : null}
          </>
        );
      }}
    </Pressable>
  );
}
