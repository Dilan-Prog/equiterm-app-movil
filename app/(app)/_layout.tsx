import { Stack, router, usePathname } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useOutbox } from '../../src/context/OutboxContext';
import { useOnline } from '../../src/hooks/useOnline';
import { useResponsive } from '../../src/hooks/useResponsive';
import { getServerUrl } from '../../src/lib/config';
import { DEST, destinationFromPath, type DestinationKey } from '../../src/navigation/destinations';
import { useTheme } from '../../src/theme';
import { SideMenu, type SideMenuItem } from '../../src/ui';

/** Grupo autenticado. En tablet (≥ 768) el menú lateral envuelve todas las pantallas. */
export default function AppLayout() {
  const { isTablet } = useResponsive();
  const { colors } = useTheme();
  const stack = (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="reportes/[id]" />
      <Stack.Screen name="pdf" />
      <Stack.Screen name="reporte-nuevo" options={{ gestureEnabled: false }} />
      <Stack.Screen name="servicio-nuevo" options={{ presentation: isTablet ? 'transparentModal' : 'card' }} />
    </Stack>
  );
  if (!isTablet) return stack;
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
      <TabletSideMenu />
      <View style={{ flex: 1 }}>{stack}</View>
    </View>
  );
}

function TabletSideMenu() {
  const { user } = useAuth();
  const { pendingCount } = useOutbox();
  const online = useOnline();
  const active = destinationFromPath(usePathname());
  const keys: DestinationKey[] = ['inicio', 'reportes', 'nuevo', 'agenda', 'bandeja'];
  if (user?.is_admin) keys.push('usuarios');
  const items: SideMenuItem[] = keys.map((k) => ({
    key: k,
    label: DEST[k].label,
    icon: DEST[k].icon,
    badge: k === 'bandeja' ? pendingCount : undefined,
  }));
  const go = (k: string) => {
    const key = k as DestinationKey;
    if (key === active) return;
    if (key === 'nuevo') router.push(DEST.nuevo.href);
    else router.navigate(DEST[key].href);
  };
  return (
    <SideMenu
      items={items}
      activeKey={active}
      onSelect={go}
      user={user ? { name: user.name, role: user.role?.name || (user.is_admin ? 'Administrador' : undefined) } : undefined}
      userActive={active === 'perfil'}
      onUserPress={() => go('perfil')}
      connection={{ online, server: getServerUrl() }}
    />
  );
}
