import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import React from 'react';
import { useOutbox } from '../../../src/context/OutboxContext';
import { useResponsive } from '../../../src/hooks/useResponsive';
import { DEST } from '../../../src/navigation/destinations';
import { useTheme } from '../../../src/theme';
import { TabBar, type TabBarItem } from '../../../src/ui';

/** Rutas de pestaña visibles en la barra (el "+" central no es ruta: abre /reporte-nuevo). */
const TAB_ROUTES = ['index', 'reportes', 'agenda', 'bandeja'] as const;

/**
 * Pestañas. Teléfono: barra inferior personalizada (O·01). Tablet: sin barra
 * (el menú lateral vive en app/(app)/_layout.tsx). `perfil` y `usuarios` son
 * pestañas ocultas para conservar la barra/menú.
 */
export default function TabsLayout() {
  const { isTablet } = useResponsive();
  const { colors } = useTheme();
  const { pendingCount } = useOutbox();

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      tabBar={
        isTablet
          ? () => null
          : ({ state, navigateToTab }) => {
              const current = state.routes[state.index]?.name;
              const activeKey = (TAB_ROUTES as readonly string[]).includes(current) ? current : 'index';
              const items: TabBarItem[] = [
                { key: 'index', label: DEST.inicio.tabLabel, icon: DEST.inicio.icon },
                { key: 'reportes', label: DEST.reportes.tabLabel, icon: DEST.reportes.icon },
                { key: 'agenda', label: DEST.agenda.tabLabel, icon: DEST.agenda.icon },
                { key: 'bandeja', label: DEST.bandeja.tabLabel, icon: DEST.bandeja.icon, badge: pendingCount },
              ];
              return (
                <TabBar
                  items={items}
                  activeKey={activeKey}
                  onSelect={(key) => {
                    const route = state.routes.find((rt) => rt.name === key);
                    if (route && key !== current) navigateToTab(route.key);
                  }}
                  onFabPress={() => router.push(DEST.nuevo.href)}
                />
              );
            }
      }
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="reportes" />
      <Tabs.Screen name="agenda" />
      <Tabs.Screen name="bandeja" />
      <Tabs.Screen name="perfil" options={{ href: null }} />
      <Tabs.Screen name="usuarios" options={{ href: null }} />
    </Tabs>
  );
}
