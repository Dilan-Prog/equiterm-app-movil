import React from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { fontFamily, useTheme } from '../../theme';
import { Icon, type IconName } from '../atoms/Icon';
import { Text } from '../atoms/Text';

export interface FilterChipProps {
  label: string;
  /** Contador opcional (opacidad .7 / muted). */
  count?: number;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Chip de filtro (M·03): píldora de 40 alto. Seleccionado = fondo ink (negro en claro, claro en oscuro). */
export function FilterChip({ label, count, selected, onPress, style }: FilterChipProps) {
  const { colors } = useTheme();
  const fg = selected ? colors.bg : colors.ink2;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={count !== undefined ? `${label}, ${count}` : label}
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: 40,
          paddingHorizontal: 14,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: selected ? colors.ink : colors.line,
          backgroundColor: selected ? colors.ink : pressed ? colors.soft : colors.card,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        style,
      ]}
    >
      <Text size={14} style={{ fontFamily: fontFamily.semibold, color: fg }} numberOfLines={1}>
        {label}
      </Text>
      {count !== undefined ? (
        <Text size={12} style={{ fontFamily: fontFamily.semibold, color: selected ? fg : colors.muted, opacity: selected ? 0.7 : 1 }} tabular>
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
}

export interface OptionChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Chip de opción / ChoiceChip (M·03): 48 alto, radio 10. Seleccionado = brandSoft + borde brand + texto brandInk. */
export function OptionChip({ label, selected, onPress, icon, disabled, style }: OptionChipProps) {
  const { colors } = useTheme();
  const fg = selected ? colors.brandInk : colors.ink2;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: !!selected, disabled: !!disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: 48,
          paddingHorizontal: 16,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: selected ? colors.brand : colors.line,
          backgroundColor: selected ? colors.brandSoft : pressed ? colors.soft : colors.card,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={20} color={fg} /> : null}
      <Text size={15} style={{ fontFamily: fontFamily.semibold, color: fg }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
