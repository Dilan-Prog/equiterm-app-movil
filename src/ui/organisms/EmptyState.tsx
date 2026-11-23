import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { fontFamily, useTheme } from '../../theme';
import { Button, type ButtonVariant } from '../atoms/Button';
import { Icon, type IconName } from '../atoms/Icon';
import { Text } from '../atoms/Text';

export interface EmptyStateProps {
  /** Ícono en círculo soft de 64 (default `inbox`). */
  icon?: IconName;
  title: string;
  text?: string;
  /** Acción: "Nuevo reporte" (sin datos) o "Limpiar filtros" (sin resultados). */
  action?: { label: string; onPress: () => void; icon?: IconName; variant?: ButtonVariant };
  /** Centra en todo el espacio disponible (default true). */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Estado vacío (O·10). */
export function EmptyState({ icon = 'inbox', title, text, action, fill = true, style }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 28, paddingHorizontal: 20 }, fill ? { flex: 1 } : null, style]}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={32} color="muted" />
      </View>
      <Text size={18} style={{ fontFamily: fontFamily.bold }} align="center" accessibilityRole="header">
        {title}
      </Text>
      {text ? (
        <Text size={14} color="muted" align="center" style={{ maxWidth: 280, lineHeight: 21 }}>
          {text}
        </Text>
      ) : null}
      {action ? (
        <Button
          title={action.label}
          icon={action.icon}
          variant={action.variant ?? 'secondary'}
          size="sm"
          block={false}
          onPress={action.onPress}
          style={{ alignSelf: 'center', paddingHorizontal: 18 }}
        />
      ) : null}
    </View>
  );
}
