import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { fontFamily, useTheme } from '../../theme';
import { Icon, type IconName } from '../atoms/Icon';
import { Text } from '../atoms/Text';

export interface DataRowProps {
  label: string;
  /** Valor a la derecha (15/500). Puede ser un nodo (Switch, chip…). */
  value?: React.ReactNode;
  /** Ícono 22 muted a la izquierda. */
  icon?: IconName;
  onPress?: () => void;
  chevron?: boolean;
  divider?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Fila de dato horizontal (M·06, InfoRow): ícono + etiqueta + valor. Alto mín. 60 (ajustes, perfil). */
export function DataRow({ label, value, icon, onPress, chevron, divider = true, style }: DataRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [
        {
          minHeight: 60,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: pressed ? colors.soft : 'transparent',
        },
        divider ? { borderBottomWidth: 1, borderBottomColor: colors.line } : null,
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={22} color={colors.muted} /> : null}
      <Text variant="bodySm" style={{ flex: 1 }} numberOfLines={2}>
        {label}
      </Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text size={15} style={{ fontFamily: fontFamily.medium, flexShrink: 1 }} numberOfLines={2} align="right">
          {String(value)}
        </Text>
      ) : (
        value
      )}
      {chevron ? <Icon name="chevron_right" size={20} color={colors.muted} /> : null}
    </Pressable>
  );
}

export interface DataGridProps {
  items: { label: string; value?: string | null }[];
  /** Columnas (default 2). */
  columns?: number;
  style?: StyleProp<ViewStyle>;
}

/** Fila de dato apilada en cuadrícula (M·06): etiqueta 12 muted + valor 15/600 (datos de equipo, detalle). */
export function DataGrid({ items, columns = 2, style }: DataGridProps) {
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingVertical: 14, rowGap: 12 }, style]}>
      {items.map((it, i) => (
        <View key={`${it.label}-${i}`} style={{ width: `${100 / columns}%`, paddingRight: 12 }}>
          <Text variant="legend" weight="regular" color="muted">
            {it.label}
          </Text>
          <Text size={15} weight="semibold">
            {it.value || '—'}
          </Text>
        </View>
      ))}
    </View>
  );
}
