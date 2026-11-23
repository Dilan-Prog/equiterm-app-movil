import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../atoms/Text';

export interface StepIndicatorProps {
  /** Nombres de los pasos ("Cliente", "Equipo", "Trabajo", "Fotos", "Firma"). */
  steps: string[];
  /** Índice (0-based) del paso actual. */
  current: number;
  style?: StyleProp<ViewStyle>;
}

/** Indicador de pasos (M·07): barra naranja = paso hecho o actual; negrita = paso actual. */
export function StepIndicator({ steps, current, style }: StepIndicatorProps) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Paso ${current + 1} de ${steps.length}: ${steps[current] ?? ''}`}
      style={[{ flexDirection: 'row', gap: 6 }, style]}
    >
      {steps.map((s, i) => {
        const done = i <= current;
        const isCur = i === current;
        return (
          <View key={`${s}-${i}`} style={{ flex: 1, gap: 6, minWidth: 0 }}>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: done ? colors.brand : colors.line }} />
            <Text
              variant="legend"
              weight={isCur ? 'bold' : 'medium'}
              color={isCur ? 'ink' : done ? 'ink2' : 'muted'}
              numberOfLines={1}
            >
              {s}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
