import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { fontFamily, useTheme } from '../../theme';
import { Text } from './Text';

export interface BadgeProps {
  /** Se oculta en 0 (o null); más de 99 muestra «99+». */
  count?: number | null;
  /** `sm` 18-19 (sobre ícono, con borde) · `md` 22 (menú/lista) · `lg` 26 (tarjeta de acceso). Default md. */
  size?: 'sm' | 'md' | 'lg';
  /** Borde de 2 dp del color de la superficie (default true en `sm`). */
  bordered?: boolean;
  /** Color del borde (default card). */
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
}

/** Insignia de pendientes (A·06), fondo brand. */
export function Badge({ count, size = 'md', bordered, borderColor, style }: BadgeProps) {
  const { colors } = useTheme();
  if (!count || count <= 0) return null;
  const h = size === 'sm' ? 19 : size === 'lg' ? 26 : 22;
  const fs = size === 'sm' ? 11 : size === 'lg' ? 13 : 12;
  const withBorder = bordered ?? size === 'sm';
  return (
    <View
      accessibilityLabel={`${count} pendientes`}
      style={[
        {
          minWidth: h,
          height: h,
          borderRadius: h / 2,
          paddingHorizontal: size === 'sm' ? 5 : size === 'lg' ? 8 : 7,
          backgroundColor: colors.brand,
          alignItems: 'center',
          justifyContent: 'center',
        },
        withBorder ? { borderWidth: 2, borderColor: borderColor ?? colors.card } : null,
        style,
      ]}
    >
      <Text size={fs} style={{ fontFamily: fontFamily.bold, color: '#ffffff', lineHeight: fs + 3 }} tabular>
        {count > 99 ? '99+' : String(count)}
      </Text>
    </View>
  );
}
