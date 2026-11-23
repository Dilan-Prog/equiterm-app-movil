import React from 'react';
import { Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SIDE_NAV_WIDTH, fontFamily, sideNav, useTheme } from '../../theme';
import { Avatar } from '../atoms/Avatar';
import { Badge } from '../atoms/Badge';
import { Icon, type IconName } from '../atoms/Icon';
import { Logo } from '../atoms/Logo';
import { Text } from '../atoms/Text';

export interface SideMenuItem {
  key: string;
  label: string;
  icon: IconName;
  badge?: number;
  /** Muestra candado y lo atenúa. */
  locked?: boolean;
}

export interface SideMenuProps {
  items: SideMenuItem[];
  activeKey?: string;
  onSelect: (key: string) => void;
  /** Tarjeta de usuario al pie (→ Perfil). */
  user?: { name: string; role?: string };
  onUserPress?: () => void;
  /** Usuario activo resaltado (cuando la pantalla actual es Perfil). */
  userActive?: boolean;
  /** Estado de conexión al pie: "Conectado · 192.168.1.50". */
  connection?: { online: boolean | null; server?: string };
  style?: StyleProp<ViewStyle>;
}

/** Menú lateral (O·03, sólo tablet): reemplaza la barra de pestañas. Siempre oscuro, 248 de ancho, ítem 48 radio 10. */
export function SideMenu({ items, activeKey, onSelect, user, onUserPress, userActive, connection, style }: SideMenuProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const online = connection?.online !== false;
  return (
    <View
      accessibilityRole="menu"
      style={[
        {
          width: SIDE_NAV_WIDTH,
          backgroundColor: sideNav.bg,
          paddingTop: insets.top + 18,
          paddingBottom: Math.max(insets.bottom, 16),
          paddingLeft: 12 + insets.left,
          paddingRight: 12,
        },
        style,
      ]}
    >
      <Logo size="sm" onDark style={{ paddingHorizontal: 10, paddingTop: 4, paddingBottom: 22 }} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 4 }} showsVerticalScrollIndicator={false}>
        {items.map((it) => {
          const active = it.key === activeKey;
          return (
            <Pressable
              key={it.key}
              accessibilityRole="menuitem"
              accessibilityState={{ selected: active }}
              accessibilityLabel={it.badge ? `${it.label}, ${it.badge} pendientes` : it.label}
              onPress={() => onSelect(it.key)}
              style={({ pressed }) => ({
                height: 48,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: active || pressed ? sideNav.itemActiveBg : 'transparent',
                opacity: it.locked ? 0.6 : 1,
              })}
            >
              <Icon name={it.icon} size={22} color={active ? colors.brand : sideNav.icon} filled={active} />
              <Text
                size={15}
                style={{ flex: 1, fontFamily: active ? fontFamily.semibold : fontFamily.medium, color: active ? sideNav.textActive : sideNav.text }}
                numberOfLines={1}
              >
                {it.label}
              </Text>
              {it.badge ? <Badge count={it.badge} size="md" /> : null}
              {it.locked ? <Icon name="lock" size={18} color={sideNav.icon} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
      {connection ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: online ? colors.okSolid : colors.warnSolid }} />
          <Text size={12} style={{ color: sideNav.muted }} numberOfLines={1}>
            {online ? 'Conectado' : 'Sin conexión'}
            {connection.server ? ` · ${connection.server.replace(/^https?:\/\//, '')}` : ''}
          </Text>
        </View>
      ) : null}
      {user ? (
        <Pressable
          onPress={onUserPress}
          accessibilityRole="button"
          accessibilityLabel={`Perfil de ${user.name}`}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            padding: 10,
            minHeight: 56,
            borderRadius: 12,
            backgroundColor: userActive || pressed ? sideNav.itemActiveBg : sideNav.userCardBg,
          })}
        >
          <Avatar name={user.name} size={38} color={colors.brand} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text size={14} style={{ fontFamily: fontFamily.semibold, color: '#ffffff' }} numberOfLines={1}>
              {user.name}
            </Text>
            {user.role ? (
              <Text size={12} style={{ color: sideNav.muted }} numberOfLines={1}>
                {user.role}
              </Text>
            ) : null}
          </View>
          <Icon name="chevron_right" size={20} color={sideNav.icon} />
        </Pressable>
      ) : null}
    </View>
  );
}
