import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '../../../src/context/AuthContext';
import { useOutbox } from '../../../src/context/OutboxContext';
import { SectionLabel, SettingRow, SettingsCard, appVersion, formatSync, useLastSync } from '../../../src/features/perfil/components';
import { useOnline } from '../../../src/hooks/useOnline';
import { useResponsive } from '../../../src/hooks/useResponsive';
import { cacheKeys, clearCache, setCache } from '../../../src/lib/cache';
import { getServerUrl } from '../../../src/lib/config';
import { useTheme, type ThemeMode } from '../../../src/theme';
import { Avatar, Button, ConfirmDialog, Header, Screen, SegmentedControl, StatusChip, Text, roleTone, useToast } from '../../../src/ui';

/** Perfil (1q / 3l): datos del usuario, conexión, apariencia, datos sin conexión, versión y cerrar sesión. */
export default function PerfilScreen() {
  const { user, logout } = useAuth();
  const { mode, setMode, colors, cardShadow } = useTheme();
  const { pendingCount } = useOutbox();
  const { isTablet } = useResponsive();
  const online = useOnline();
  const toast = useToast();
  const { lastSync, reload: reloadSync } = useLastSync();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);
  const [clearing, setClearing] = useState(false);

  const role = user?.role?.name || (user?.is_admin ? 'Administrador' : 'Sin rol');
  const server = getServerUrl();

  const clearOffline = async () => {
    setClearing(true);
    try {
      await clearCache();
      // Conservar el usuario para poder abrir la app sin conexión.
      if (user) await setCache(cacheKeys.user, user);
      reloadSync();
      toast.show({ kind: 'success', title: 'Datos guardados borrados', message: 'Se descargarán de nuevo al abrir cada sección.' });
    } finally {
      setClearing(false);
      setConfirmClear(false);
    }
  };

  return (
    <Screen header={isTablet ? undefined : <Header title="Perfil" />} maxWidth={isTablet ? 684 : 760}>
      <View style={{ gap: 16 }}>
        {isTablet ? (
          <Text variant="title1" accessibilityRole="header" style={{ marginBottom: 4 }}>
            Perfil
          </Text>
        ) : null}

        {/* Tarjeta de usuario */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            padding: 18,
            borderRadius: 12,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.line,
            boxShadow: cardShadow,
          }}
        >
          <Avatar name={user?.name} size={64} color={colors.brand} />
          <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
            <Text variant="title1" numberOfLines={2}>
              {user?.name ?? 'Usuario'}
            </Text>
            {user?.email ? (
              <Text variant="small" color="muted" numberOfLines={1}>
                {user.email}
              </Text>
            ) : null}
            <StatusChip
              label={role}
              tone={roleTone(role, user?.is_admin)}
              dot={false}
              icon={user?.is_admin ? 'shield_person' : undefined}
              style={{ marginTop: 2 }}
            />
          </View>
        </View>

        {/* Conexión */}
        <SectionLabel>Conexión</SectionLabel>
        <SettingsCard>
          <SettingRow
            icon="dns"
            title="Servidor"
            subtitle={server || 'Sin configurar'}
            accessibilityLabel={`Servidor ${server || 'sin configurar'}. Configurar servidor`}
            value={
              online === null ? undefined : (
                <StatusChip label={online && server ? 'Conectado' : 'Sin conexión'} tone={online && server ? 'ok' : 'warn'} />
              )
            }
            chevron
            onPress={() => router.push('/servidor')}
          />
          <SettingRow icon="sync" title="Última sincronización" value={formatSync(lastSync)} />
          <SettingRow
            icon="outbox"
            title="Bandeja de salida"
            value={pendingCount ? `${pendingCount} ${pendingCount === 1 ? 'pendiente' : 'pendientes'}` : 'Al día'}
            chevron
            divider={false}
            onPress={() => router.navigate('/bandeja')}
          />
        </SettingsCard>

        {/* Preferencias y aplicación */}
        <SectionLabel>Preferencias y aplicación</SectionLabel>
        <SettingsCard>
          <SettingRow icon="dark_mode" title="Apariencia" subtitle="Tema de la app">
            <SegmentedControl<ThemeMode>
              value={mode}
              onChange={setMode}
              options={[
                { value: 'system', label: 'Sistema', icon: 'brightness_auto' },
                { value: 'light', label: 'Claro', icon: 'light_mode' },
                { value: 'dark', label: 'Oscuro', icon: 'dark_mode' },
              ]}
            />
          </SettingRow>
          <SettingRow
            icon="cloud_download"
            title="Datos sin conexión"
            subtitle="Reportes y agenda guardados en el teléfono"
            value={<Button title="Borrar" variant="secondary" size="sm" block={false} onPress={() => setConfirmClear(true)} />}
          />
          <SettingRow icon="info" title="Versión de la app" value={appVersion()} divider={false} />
        </SettingsCard>

        <Button title="Cerrar sesión" icon="logout" variant="dangerSoft" onPress={() => setConfirmLogout(true)} style={{ marginTop: 4 }} />
      </View>

      <ConfirmDialog
        visible={confirmClear}
        title="¿Borrar datos guardados?"
        message="Se borrarán los reportes y la agenda guardados para usar sin conexión. Tus borradores y la bandeja de salida se conservan."
        icon="delete"
        confirmLabel="Borrar"
        loading={clearing}
        onCancel={() => setConfirmClear(false)}
        onConfirm={clearOffline}
      />
      <ConfirmDialog
        visible={confirmLogout}
        title="¿Cerrar sesión?"
        message={
          pendingCount
            ? `Los ${pendingCount} elementos de la bandeja de salida se conservarán en este teléfono y se enviarán al volver a iniciar sesión.`
            : 'Tus borradores y la bandeja de salida se conservan en este teléfono.'
        }
        confirmLabel="Cerrar sesión"
        loading={busy}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={async () => {
          setBusy(true);
          try {
            await logout();
          } finally {
            setBusy(false);
          }
        }}
      />
    </Screen>
  );
}
