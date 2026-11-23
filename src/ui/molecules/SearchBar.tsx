import React from 'react';
import { Pressable, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { fontFamily, useTheme } from '../../theme';
import { Icon } from '../atoms/Icon';
import { Spinner } from '../atoms/Spinner';

export interface SearchBarProps extends Omit<TextInputProps, 'style'> {
  value: string;
  onChangeText: (t: string) => void;
  /** Default "Buscar folio, cliente o técnico". */
  placeholder?: string;
  /** Se llama al tocar ✕ (default: `onChangeText('')`). */
  onClear?: () => void;
  /** Spinner chico mientras se busca. */
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Buscador (M·02): alto 48, radio 12, ícono `search` 22 + botón ✕ de 40 para borrar. */
export function SearchBar({ value, onChangeText, placeholder = 'Buscar folio, cliente o técnico', onClear, loading, style, ...rest }: SearchBarProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          height: 48,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.card,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingLeft: 14,
          paddingRight: value ? 4 : 6,
        },
        style,
      ]}
    >
      <Icon name="search" size={22} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        selectionColor={colors.brand}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel={placeholder}
        {...rest}
        style={{ flex: 1, alignSelf: 'stretch', fontFamily: fontFamily.regular, fontSize: 16, color: colors.ink, paddingVertical: 0 }}
      />
      {loading ? <Spinner size="sm" /> : null}
      {value ? (
        <Pressable
          onPress={onClear ?? (() => onChangeText(''))}
          accessibilityRole="button"
          accessibilityLabel="Limpiar búsqueda"
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? colors.soft : 'transparent',
          })}
        >
          <Icon name="close" size={20} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}
