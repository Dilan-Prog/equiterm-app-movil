import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from './Icon';
import { Text } from './Text';

interface BaseProps {
  selected: boolean;
  onPress?: () => void;
  /** Texto a la derecha; con texto toda la fila es tocable (mín. 48 alto). */
  label?: string;
  /** Texto secundario bajo el label. */
  description?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

function SelectionBase({ kind, selected, onPress, label, description, disabled, style }: BaseProps & { kind: 'radio' | 'checkbox' }) {
  const { colors } = useTheme();
  const icon =
    kind === 'radio'
      ? selected
        ? 'radio_button_checked'
        : 'radio_button_unchecked'
      : selected
        ? 'check_box'
        : 'check_box_outline_blank';
  return (
    <Pressable
      accessibilityRole={kind}
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[{ minHeight: 48, minWidth: 48, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: disabled ? 0.45 : 1 }, style]}
    >
      <Icon name={icon} size={24} color={selected ? colors.brand : colors.muted} />
      {label ? (
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{label}</Text>
          {description ? (
            <Text variant="caption" color="muted">
              {description}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

/** Radio (A·08): una opción entre varias. */
export function Radio(props: BaseProps) {
  return <SelectionBase kind="radio" {...props} />;
}

/** Casilla (A·08): varias opciones. */
export function Checkbox(props: BaseProps) {
  return <SelectionBase kind="checkbox" {...props} />;
}
