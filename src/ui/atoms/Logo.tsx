import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { fontFamily, useTheme } from '../../theme';
import { Icon } from './Icon';
import { Text } from './Text';

export interface LogoProps {
  /** `lg` marca 48 (login teléfono) · `md` 44 (login tablet) · `sm` 34 (menú lateral). Default lg. */
  size?: 'lg' | 'md' | 'sm';
  /** Texto blanco (sobre fondos oscuros). Default: según tema. */
  onDark?: boolean;
  style?: StyleProp<ViewStyle>;
}

const DIM = {
  lg: { box: 48, r: 12, icon: 28, name: 22, sub: 11, gap: 12 },
  md: { box: 44, r: 11, icon: 26, name: 20, sub: 11, gap: 12 },
  sm: { box: 34, r: 9, icon: 21, name: 15, sub: 10, gap: 10 },
};

/** Logotipo tipográfico provisional (cuadro naranja con flama + EQUITERM / INDUSTRIES). */
export function Logo({ size = 'lg', onDark, style }: LogoProps) {
  const { colors } = useTheme();
  const d = DIM[size];
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: d.gap }, style]} accessibilityLabel="Equiterm Industries">
      <View style={{ width: d.box, height: d.box, borderRadius: d.r, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="mode_heat" size={d.icon} color="#ffffff" />
      </View>
      <View>
        <Text
          size={d.name}
          style={{ fontFamily: fontFamily.extrabold, letterSpacing: d.name * 0.08, lineHeight: d.name * 1.15 }}
          color={onDark ? '#ffffff' : colors.ink}
        >
          EQUITERM
        </Text>
        <Text size={d.sub} style={{ fontFamily: fontFamily.semibold, letterSpacing: d.sub * 0.2 }} color={onDark ? '#9ca3af' : colors.muted}>
          INDUSTRIES
        </Text>
      </View>
    </View>
  );
}
