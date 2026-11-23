import React from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { radius, useTheme } from '../../../theme';
import { Icon, Text, type IconName } from '../../../ui';

export interface PickerFieldProps {
  /** Texto mostrado (vacío → placeholder). */
  value?: string;
  placeholder?: string;
  icon?: IconName;
  /** Ícono a la derecha (default `expand_more`; `null` para ocultarlo). */
  trailingIcon?: IconName | null;
  onPress: () => void;
  invalid?: boolean;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

/** Campo de selección con el mismo aspecto que el campo de texto (A·11): alto 52, radio 10. */
export function PickerField({ value, placeholder, icon, trailingIcon = 'expand_more', onPress, invalid, accessibilityLabel, style }: PickerFieldProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityLabel}: ${value || placeholder || 'sin seleccionar'}`}
      style={({ pressed }) => [
        {
          height: 52,
          borderRadius: radius.field,
          borderWidth: invalid ? 1.5 : 1,
          borderColor: invalid ? colors.err : pressed ? colors.linePressed : colors.line,
          backgroundColor: pressed ? colors.soft : colors.field,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: icon ? 12 : 14,
          paddingRight: 12,
          gap: 10,
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={22} color={colors.muted} /> : null}
      <Text size={16} color={value ? 'ink' : 'muted'} style={{ flex: 1 }} numberOfLines={1}>
        {value || placeholder}
      </Text>
      {trailingIcon ? <Icon name={trailingIcon} size={22} color={colors.muted} /> : null}
    </Pressable>
  );
}
