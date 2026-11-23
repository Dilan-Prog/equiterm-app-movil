import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { fontFamily, useTheme } from '../../theme';
import { Badge } from '../atoms/Badge';
import { Icon, type IconName } from '../atoms/Icon';
import { Skeleton } from '../atoms/Skeleton';
import { Text } from '../atoms/Text';

export interface AccessCardProps {
  icon: IconName;
  title: string;
  /** Resumen vivo ("3 servicios hoy"). */
  subtitle?: string;
  /** Muestra un esqueleto en lugar del resumen. */
  loading?: boolean;
  /** Insignia (arriba a la derecha) con pendientes. */
  badge?: number;
  /** Candado arriba a la derecha (sin permiso). */
  locked?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Tarjeta de acceso (M·08): ícono en cuadro 44 + título + resumen vivo + Insignia. Alto mín. 132. */
export function AccessCard({ icon, title, subtitle, loading, badge, locked, onPress, style }: AccessCardProps) {
  const { colors, cardShadow } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, locked ? 'bloqueado' : null].filter(Boolean).join(', ')}
      style={({ pressed }) => [
        {
          minHeight: 132,
          padding: 16,
          gap: 14,
          borderRadius: 12,
          backgroundColor: pressed ? colors.soft : colors.card,
          borderWidth: 1,
          borderColor: colors.line,
          boxShadow: cardShadow,
          alignItems: 'flex-start',
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={24} color="brandInk" />
      </View>
      <View style={{ gap: 3, alignSelf: 'stretch' }}>
        <Text size={16} style={{ fontFamily: fontFamily.semibold, lineHeight: 20 }}>
          {title}
        </Text>
        {loading ? (
          <Skeleton w="70%" h={12} style={{ marginTop: 3 }} />
        ) : subtitle ? (
          <Text size={13} color="muted" style={{ lineHeight: 17.5 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {badge ? <Badge count={badge} size="lg" style={{ position: 'absolute', top: 14, right: 14 }} /> : null}
      {locked ? (
        <View style={{ position: 'absolute', top: 14, right: 14 }}>
          <Icon name="lock" size={20} color="muted" />
        </View>
      ) : null}
    </Pressable>
  );
}
