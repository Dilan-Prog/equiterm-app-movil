import React, { forwardRef } from 'react';
import { View, type StyleProp, type TextInputInstance, type ViewStyle } from 'react-native';
import { Icon } from '../atoms/Icon';
import { Text } from '../atoms/Text';
import { TextField, type TextFieldProps } from '../atoms/TextField';

export interface LabeledFieldProps extends TextFieldProps {
  /** Etiqueta 14/600 sobre el campo. */
  label: string;
  /** Ayuda 13 muted bajo el campo (se oculta si hay error). */
  hint?: string;
  /** Mensaje de error 13 err con ícono; también pinta el borde de error. */
  error?: string | null;
  /** Estilo del contenedor externo. */
  containerStyle?: StyleProp<ViewStyle>;
  /** Reemplaza el TextField por otro control (chips, selector…) manteniendo etiqueta/ayuda/error. */
  children?: React.ReactNode;
}

/** Campo con etiqueta (M·01): Etiqueta 14/600 + Campo (A·11) + ayuda o error 13. Gap 6. */
export const LabeledField = forwardRef<TextInputInstance, LabeledFieldProps>(function LabeledField(
  { label, hint, error, containerStyle, children, invalid, ...field },
  ref,
) {
  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      <Text variant="label">{label}</Text>
      {children ?? <TextField ref={ref} invalid={invalid || !!error} accessibilityLabel={label} {...field} />}
      {error ? (
        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }} accessibilityRole="alert">
          <Icon name="error" filled={false} size={16} color="err" />
          <Text variant="caption" color="err" style={{ flex: 1 }}>
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text variant="caption" color="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
