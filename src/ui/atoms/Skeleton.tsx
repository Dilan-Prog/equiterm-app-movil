import React, { useEffect, useRef } from 'react';
import { Animated, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

export interface SkeletonProps {
  /** Ancho (dp o %). Default '100%'. */
  w?: DimensionValue;
  /** Alto (default 12). */
  h?: number;
  /** Radio (default 6). */
  r?: number;
  /** `soft` (default) o `line` (un poco más oscuro, para el título). */
  tone?: 'soft' | 'line';
  style?: StyleProp<ViewStyle>;
}

/** Esqueleto (A·12): imita la forma del contenido; pulso suave 1.2 s. */
export function Skeleton({ w = '100%', h = 12, r = 6, tone = 'soft', style }: SkeletonProps) {
  const { colors } = useTheme();
  const o = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 0.5, duration: 600, useNativeDriver: true }),
        Animated.timing(o, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [o]);
  return (
    <Animated.View
      style={[{ width: w, height: h, borderRadius: r, backgroundColor: tone === 'line' ? colors.line : colors.soft, opacity: o }, style]}
    />
  );
}

/** Esqueleto de una tarjeta de reporte (lista cargando). */
export function ReportCardSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 16, gap: 10 },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Skeleton w={90} h={12} />
        <Skeleton w={70} h={20} r={10} />
      </View>
      <Skeleton w="70%" h={16} tone="line" />
      <Skeleton w="45%" h={12} />
    </View>
  );
}
