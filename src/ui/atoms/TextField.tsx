import React, { forwardRef, useState } from 'react';
import {
  Pressable,
  TextInput,
  View,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { fontFamily, focusRing, radius, useTheme } from '../../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style' | 'editable'> {
  /** Borde de error (1.5 err). Usa `LabeledField` para mostrar el mensaje. */
  invalid?: boolean;
  disabled?: boolean;
  /** Ícono a la izquierda (22, muted), p. ej. `mail`, `lock`, `search`. */
  leftIcon?: IconName;
  /** Ícono a la derecha (botón de 48 si hay `onRightIconPress`). */
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  rightIconLabel?: string;
  /** Unidad a la derecha ("kg/cm²"). */
  unit?: string;
  /** Contraseña con botón mostrar/ocultar (ícono `visibility`). */
  password?: boolean;
  /** `md` 52 (default) · `sm` 48 (búsqueda). Con `multiline` la altura mínima es 96. */
  size?: 'md' | 'sm';
  /** Estilo del contenedor. */
  style?: StyleProp<ViewStyle>;
  /** Estilo del TextInput interno. */
  inputStyle?: TextInputProps['style'];
}

/**
 * Campo de texto (A·11): alto 52, radio 10, texto 16 (evita zoom en iOS).
 * Estados: normal · enfocado (borde brand 1.5 + anillo 3 brandSoft) · error · deshabilitado.
 */
export const TextField = forwardRef<TextInputInstance, TextFieldProps>(function TextField(
  {
    invalid,
    disabled,
    leftIcon,
    rightIcon,
    onRightIconPress,
    rightIconLabel,
    unit,
    password,
    size = 'md',
    multiline,
    style,
    inputStyle,
    onFocus,
    onBlur,
    secureTextEntry,
    ...rest
  },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const h = size === 'sm' ? 48 : 52;
  const borderColor = invalid ? colors.err : focused ? colors.brand : colors.line;
  const thick = invalid || focused ? 1.5 : 1;
  const rIcon: IconName | undefined = password ? (hidden ? 'visibility' : 'visibility_off') : rightIcon;
  const rPress = password ? () => setHidden((x) => !x) : onRightIconPress;

  return (
    <View
      style={[
        {
          minHeight: multiline ? 96 : h,
          height: multiline ? undefined : h,
          borderRadius: radius.field,
          borderWidth: thick,
          borderColor,
          backgroundColor: disabled ? colors.fieldDisabled : colors.field,
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          paddingLeft: leftIcon ? 12 : 14 - (thick - 1),
          paddingRight: rIcon ? 2 : unit ? 12 : 14 - (thick - 1),
          gap: 10,
        },
        focused && !invalid ? { boxShadow: focusRing(colors.brandSoft) } : null,
        style,
      ]}
    >
      {leftIcon ? <Icon name={leftIcon} size={22} color={colors.muted} style={multiline ? { marginTop: 14 } : null} /> : null}
      <TextInput
        ref={ref}
        {...rest}
        multiline={multiline}
        editable={!disabled}
        secureTextEntry={password ? hidden : secureTextEntry}
        placeholderTextColor={colors.muted}
        selectionColor={colors.brand}
        cursorColor={colors.brand}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          {
            flex: 1,
            alignSelf: 'stretch',
            fontFamily: fontFamily.regular,
            fontSize: 16,
            color: disabled ? colors.textDisabled : colors.ink,
            paddingVertical: multiline ? 13 : 0,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          password && hidden && rest.value ? { letterSpacing: 2 } : null,
          inputStyle,
        ]}
      />
      {unit ? (
        <Text variant="small" color="muted">
          {unit}
        </Text>
      ) : null}
      {rIcon ? (
        rPress ? (
          <Pressable
            onPress={rPress}
            accessibilityRole="button"
            accessibilityLabel={password ? (hidden ? 'Mostrar contraseña' : 'Ocultar contraseña') : rightIconLabel}
            style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name={rIcon} size={22} color={colors.muted} />
          </Pressable>
        ) : (
          <View style={{ width: 48, alignItems: 'center' }}>
            <Icon name={rIcon} size={22} color={colors.muted} />
          </View>
        )
      ) : null}
    </View>
  );
});
