import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontFamily, useTheme } from '../../theme';
import { Badge } from '../atoms/Badge';
import { Icon, type IconName } from '../atoms/Icon';
import { IconButton } from '../atoms/IconButton';
import { Text } from '../atoms/Text';

export interface TabBarItem {
  key: string;
  label: string;
  icon: IconName;
  badge?: number;
}

export interface TabBarProps {
  /** 4 pestañas: las 2 primeras van a la izquierda del "+", las 2 últimas a la derecha. */
  items: TabBarItem[];
  activeKey?: string;
  onSelect: (key: string) => void;
  /** Botón central "+": siempre abre Nuevo reporte. */
  onFabPress: () => void;
  fabLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Barra de pestañas (O·01, sólo teléfono): 4 pestañas (ícono 26 + etiqueta 11) + botón central 60. */
export function TabBar({ items, activeKey, onSelect, onFabPress, fabLabel = 'Nuevo reporte', style }: TabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const half = Math.ceil(items.length / 2);
  const renderTab = (it: TabBarItem) => {
    const active = it.key === activeKey;
    const color = active ? colors.brandInk : colors.muted;
    return (
      <Pressable
        key={it.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={it.badge ? `${it.label}, ${it.badge} pendientes` : it.label}
        onPress={() => onSelect(it.key)}
        style={{ flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 3 }}
      >
        <Icon name={it.icon} size={26} color={color} filled={active} />
        <Text size={11} style={{ fontFamily: active ? fontFamily.bold : fontFamily.medium, color, lineHeight: 14 }} numberOfLines={1}>
          {it.label}
        </Text>
        {it.badge ? (
          <View style={{ position: 'absolute', top: 2, left: '50%', marginLeft: 6 }}>
            <Badge count={it.badge} size="sm" />
          </View>
        ) : null}
      </Pressable>
    );
  };
  return (
    <View
      accessibilityRole="tablist"
      style={[
        {
          flexDirection: 'row',
          paddingTop: 6,
          paddingHorizontal: 4,
          paddingBottom: Math.max(insets.bottom, 10),
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.line,
        },
        style,
      ]}
    >
      {items.slice(0, half).map(renderTab)}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <IconButton variant="fab" icon="add" accessibilityLabel={fabLabel} onPress={onFabPress} style={{ marginTop: -26 }} />
      </View>
      {items.slice(half).map(renderTab)}
    </View>
  );
}
