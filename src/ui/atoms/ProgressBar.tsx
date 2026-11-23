import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { fontFamily, useTheme } from '../../theme';
import { Text } from './Text';

export interface ProgressBarProps {
  /** Porcentaje 0–100. */
  value: number;
  /** info (azul = envío en curso) · warn (ámbar = tiempo restante) · brand · ok. Default info. */
  tone?: 'info' | 'warn' | 'brand' | 'ok';
  /** Muestra "64 %" a la derecha. */
  showLabel?: boolean;
  /** Color del riel (default line; el diálogo de inactividad usa soft). */
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
}

/** Barra de progreso (A·10): 6 alto, radio 3. */
export function ProgressBar({ value, tone = 'info', showLabel, trackColor, style }: ProgressBarProps) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(100, value));
  const fill = tone === 'info' ? colors.infoSolid : tone === 'warn' ? colors.warn : tone === 'ok' ? colors.okSolid : colors.brand;
  const textColor = tone === 'info' ? colors.info : tone === 'warn' ? colors.warn : tone === 'ok' ? colors.ok : colors.brandInk;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, style]}
    >
      <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: trackColor ?? colors.line, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: '100%', borderRadius: 3, backgroundColor: fill }} />
      </View>
      {showLabel ? (
        <Text size={13} style={{ fontFamily: fontFamily.semibold, color: textColor }} tabular>
          {Math.round(pct)} %
        </Text>
      ) : null}
    </View>
  );
}
