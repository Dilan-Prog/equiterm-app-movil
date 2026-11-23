import React from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { boxShadow, useTheme } from '../../theme';
import { Icon, type IconName } from './Icon';

export interface IconButtonProps {
  icon: IconName;
  /** Obligatorio: lectores de pantalla. */
  accessibilityLabel: string;
  onPress?: () => void;
  /** ghost (48, transparente; presionado soft) · soft (48 círculo soft) · outline (48, radio 12, borde) ·
   * fab (60 naranja, borde 4 y sombra naranja; sólo barra de pestañas). Default ghost. */
  variant?: 'ghost' | 'soft' | 'outline' | 'fab';
  /** Tamaño del ícono (default 24; outline 22; fab 32). */
  iconSize?: number;
  /** Color del ícono (token o literal). */
  color?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
}

/** Botón de ícono (A·03). Área táctil mínima 48. */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'ghost',
  iconSize,
  color,
  disabled,
  style,
  hitSlop,
}: IconButtonProps) {
  const { colors } = useTheme();
  const fab = variant === 'fab';
  const dim = fab ? 60 : 48;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={hitSlop}
      style={({ pressed }) => [
        {
          width: dim,
          height: dim,
          borderRadius: variant === 'outline' ? 12 : dim / 2,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.45 : 1,
        } as ViewStyle,
        variant === 'ghost' && pressed ? { backgroundColor: colors.soft } : null,
        variant === 'soft' ? { backgroundColor: pressed ? colors.line : colors.soft } : null,
        variant === 'outline'
          ? { backgroundColor: pressed ? colors.soft : colors.card, borderWidth: 1, borderColor: colors.line }
          : null,
        fab
          ? {
              backgroundColor: pressed ? colors.brandPressed : colors.brand,
              borderWidth: 4,
              borderColor: colors.card,
              boxShadow: boxShadow.fab,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            }
          : null,
        style,
      ]}
    >
      <Icon
        name={icon}
        size={iconSize ?? (fab ? 32 : variant === 'outline' ? 22 : 24)}
        color={color ?? (fab ? colors.onBrand : variant === 'outline' ? colors.muted : colors.ink)}
      />
    </Pressable>
  );
}
