import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { boxShadow, useTheme } from '../../theme';

export interface SwitchProps {
  value: boolean;
  onValueChange?: (v: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Interruptor (A·07): 44 × 26 dentro de un área táctil de 48. Cambia al instante. */
export function Switch({ value, onValueChange, disabled, accessibilityLabel, style }: SwitchProps) {
  const { colors } = useTheme();
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: value ? 1 : 0, duration: 160, useNativeDriver: true }).start();
  }, [value, x]);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => onValueChange?.(!value)}
      style={[{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : 1 }, style]}
    >
      <Animated.View
        style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: value ? colors.brand : colors.line, justifyContent: 'center' }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            top: 2,
            left: 2,
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: '#ffffff',
            boxShadow: boxShadow.knob,
            transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) }],
          }}
        />
      </Animated.View>
    </Pressable>
  );
}
