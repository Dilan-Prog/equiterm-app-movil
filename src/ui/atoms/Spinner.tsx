import React, { useEffect, useRef } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

export interface SpinnerProps {
  /** `lg` 44 (pantalla) · `sm` 20 (en línea) · o número en dp. Default `lg`. */
  size?: 'lg' | 'sm' | number;
  /** Color del arco (default brand). */
  color?: string;
  /** Color del anillo (default line). */
  trackColor?: string;
  /** Grosor del trazo (default 4 en lg, 3 en sm). */
  thickness?: number;
  style?: StyleProp<ViewStyle>;
}

/** Indicador de carga: anillo `line` + arco `brand`, 0.8 s por vuelta. */
export function Spinner({ size = 'lg', color, trackColor, thickness, style }: SpinnerProps) {
  const { colors } = useTheme();
  const px = size === 'lg' ? 44 : size === 'sm' ? 20 : size;
  const bw = thickness ?? (px >= 36 ? 4 : px >= 20 ? 3 : 2.5);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const track = trackColor ?? colors.line;
  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando"
      style={[
        {
          width: px,
          height: px,
          borderRadius: px / 2,
          borderWidth: bw,
          borderColor: track,
          borderTopColor: color ?? colors.brand,
          transform: [{ rotate }],
        },
        style,
      ]}
    />
  );
}
