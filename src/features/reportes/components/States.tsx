import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { formatSavedAt } from '../../../lib/cache';
import { boxShadow, useTheme } from '../../../theme';
import { Button, Icon, Skeleton, Text } from '../../../ui';

/**
 * Aviso dentro de la pantalla cuando lo mostrado viene de la caché y el
 * teléfono SÍ tiene red (servidor caído). Sin red, el banner global ya lo dice.
 */
export function CachedNotice({ savedAt, message, style }: { savedAt?: number | null; message?: string | null; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.warnBg }, style]} accessibilityRole="alert">
      <Icon name="cloud_off" size={20} color="warn" />
      <View style={{ flex: 1 }}>
        <Text variant="label" color="warn">
          Mostrando datos guardados{savedAt ? ` · ${formatSavedAt(savedAt)}` : ''}
        </Text>
        {message ? (
          <Text variant="caption" color="warn">
            {message}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Estado vacío de la lista sin reportes (2g): ilustración de hojas + botón "Nuevo reporte". */
export function EmptyReports({ onNew }: { onNew: () => void }) {
  const { colors, isDark } = useTheme();
  const line = { height: 6, borderRadius: 3, backgroundColor: colors.line };
  return (
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 20 }}>
      <View style={{ width: 128, height: 108, marginBottom: 10 }}>
        <View
          style={{
            position: 'absolute',
            left: 14,
            top: 10,
            width: 76,
            height: 94,
            borderRadius: 10,
            backgroundColor: colors.soft,
            borderWidth: 1,
            borderColor: colors.line,
            transform: [{ rotate: '-9deg' }],
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: 34,
            top: 4,
            width: 76,
            height: 94,
            borderRadius: 10,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.line,
            boxShadow: isDark ? boxShadow.smDark : boxShadow.sm,
            paddingVertical: 14,
            paddingHorizontal: 12,
            gap: 8,
          }}
        >
          <View style={[line, { width: '70%' }]} />
          <View style={[line, { width: '90%' }]} />
          <View style={[line, { width: '55%' }]} />
        </View>
        <View
          style={{
            position: 'absolute',
            right: 4,
            bottom: 0,
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.brand,
            borderWidth: 4,
            borderColor: colors.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="note_add" size={22} color={colors.onBrand} />
        </View>
      </View>
      <Text size={18} weight="bold" align="center" accessibilityRole="header">
        Aún no hay reportes
      </Text>
      <Text size={15} color="muted" align="center" style={{ lineHeight: 22, maxWidth: 280 }}>
        Cuando registres tu primer servicio aparecerá aquí, aunque no tengas internet.
      </Text>
      <Button title="Nuevo reporte" size="sm" block={false} onPress={onNew} style={{ marginTop: 8, height: 48, paddingHorizontal: 20 }} />
    </View>
  );
}

/** Esqueleto del detalle (tarjeta resumen + secciones). */
export function DetailSkeleton() {
  const { colors } = useTheme();
  const card = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 12 } as const;
  return (
    <View style={{ gap: 12 }} accessibilityLabel="Cargando reporte">
      <View style={[card, { padding: 18, gap: 16 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ gap: 8, flex: 1 }}>
            <Skeleton w={100} h={12} />
            <Skeleton w="70%" h={20} tone="line" />
          </View>
          <Skeleton w={80} h={26} r={13} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ width: '50%', gap: 6, paddingRight: 16 }}>
              <Skeleton w={60} h={10} />
              <Skeleton w="80%" h={14} tone="line" />
            </View>
          ))}
        </View>
      </View>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[card, { height: 60, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <Skeleton w={22} h={22} r={11} />
          <Skeleton w="45%" h={14} tone="line" />
        </View>
      ))}
    </View>
  );
}
