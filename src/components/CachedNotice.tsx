import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { formatSavedAt } from '../lib/cache';
import { useTheme } from '../theme';
import { Icon, Text } from '../ui';

/** Aviso dentro de una pantalla que muestra datos de la caché (sin conexión). */
export function CachedNotice({ savedAt, message, style }: { savedAt?: number | null; message?: string | null; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', gap: 10, padding: 12, paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.warnBg }, style]}>
      <Icon name="cloud_off" size={20} color="warn" />
      <View style={{ flex: 1 }}>
        <Text variant="label" color="warn">
          Mostrando datos guardados{savedAt ? ` (${formatSavedAt(savedAt)})` : ''}
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
