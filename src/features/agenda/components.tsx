import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { EmptyState, Skeleton, Text } from '../../ui';
import type { ApiError } from '../../api/client';
import { dayHeading, plural } from './utils';

/** Encabezado de grupo: "Hoy  lunes 23 de noviembre ······ 3 servicios". */
export function DayHeader({ ymd, count, style }: { ymd: string; count: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const h = ymd === 'sin-fecha' ? { title: 'Sin fecha', subtitle: '' } : dayHeading(ymd);
  return (
    <View
      accessibilityRole="header"
      style={[{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingTop: 14, paddingBottom: 10, backgroundColor: colors.bg }, style]}
    >
      <Text variant="title3">{h.title}</Text>
      <Text variant="small" color="muted" style={{ flex: 1 }} numberOfLines={1}>
        {h.subtitle}
      </Text>
      <Text variant="caption" color="muted">
        {plural(count, 'servicio', 'servicios')}
      </Text>
    </View>
  );
}

/** Esqueleto de tarjeta de servicio (agenda cargando). */
export function ServiceCardSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 16, gap: 14 }, style]}>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <View style={{ width: 52, gap: 6 }}>
          <Skeleton w={48} h={18} tone="line" />
          <Skeleton w={28} h={10} />
        </View>
        <View style={{ flex: 1, gap: 9 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Skeleton w="55%" h={16} tone="line" />
            <Skeleton w={78} h={22} r={11} />
          </View>
          <Skeleton w="80%" h={12} />
          <Skeleton w="65%" h={12} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Skeleton w="49%" h={44} r={12} />
        <Skeleton w="49%" h={44} r={12} />
      </View>
    </View>
  );
}

export function AgendaSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View accessibilityLabel="Cargando agenda" style={{ gap: 12 }}>
      <View style={{ paddingTop: 14, paddingBottom: 4 }}>
        <Skeleton w={180} h={16} tone="line" />
      </View>
      {Array.from({ length: count }, (_, i) => (
        <ServiceCardSkeleton key={i} />
      ))}
    </View>
  );
}

/** Estado sin datos por error: 403 (sin acceso) o error de carga con reintento. */
export function AgendaError({ error, onRetry }: { error: ApiError | null; onRetry: () => void }) {
  if (error?.status === 403) {
    return (
      <EmptyState
        icon="lock"
        title="Sin acceso a la agenda"
        text="Tu rol no tiene acceso a la agenda. Pide al administrador que te asigne el permiso."
      />
    );
  }
  return (
    <EmptyState
      icon="cloud_off"
      title="No se pudo cargar la agenda"
      text={error?.message ?? 'Revisa tu conexión e inténtalo de nuevo.'}
      action={{ label: 'Reintentar', icon: 'refresh', onPress: onRetry }}
    />
  );
}
