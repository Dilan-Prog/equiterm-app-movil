import Constants from 'expo-constants';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { cacheKeys, getCache } from '../../lib/cache';
import { toYmd } from '../../lib/format';
import { useTheme } from '../../theme';
import { Icon, Text, type IconName } from '../../ui';

/** Título de sección 13/600 muted ("Conexión", "Preferencias y aplicación"). */
export function SectionLabel({ children }: { children: string }) {
  return (
    <Text variant="caption" weight="semibold" color="muted" accessibilityRole="header" style={{ marginTop: 4, marginBottom: -4, paddingHorizontal: 4 }}>
      {children}
    </Text>
  );
}

/** Tarjeta de grupo de ajustes. */
export function SettingsCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 12, overflow: 'hidden' }, style]}>{children}</View>;
}

export interface SettingRowProps {
  icon: IconName;
  title: string;
  /** Segunda línea 13 muted (p. ej. URL del servidor). */
  subtitle?: string;
  /** Texto o nodo a la derecha. */
  value?: React.ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  divider?: boolean;
  /** Contenido bajo el renglón (p. ej. control segmentado). */
  children?: React.ReactNode;
  accessibilityLabel?: string;
}

/** Renglón de ajustes (M·06 con subtítulo): ícono 22 + título/sub + valor + chevron. Alto mín. 60. */
export function SettingRow({ icon, title, subtitle, value, onPress, chevron, divider = true, children, accessibilityLabel }: SettingRowProps) {
  const { colors } = useTheme();
  return (
    <View style={divider ? { borderBottomWidth: 1, borderBottomColor: colors.line } : null}>
      <Pressable
        disabled={!onPress}
        onPress={onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => ({
          minHeight: 60,
          paddingHorizontal: 16,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: pressed ? colors.soft : 'transparent',
        })}
      >
        <Icon name={icon} size={22} color={colors.muted} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="bodySm" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color="muted" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {typeof value === 'string' || typeof value === 'number' ? (
          <Text size={15} weight="medium" align="right" style={{ flexShrink: 1 }} numberOfLines={1}>
            {String(value)}
          </Text>
        ) : (
          value
        )}
        {chevron ? <Icon name="chevron_right" size={20} color={colors.muted} /> : null}
      </Pressable>
      {children ? <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>{children}</View> : null}
    </View>
  );
}

/** "1.4.2 (87)" con la versión de app.json y, si existe, el número de compilación. */
export function appVersion(): string {
  const cfg = Constants.expoConfig;
  const version = cfg?.version ?? '—';
  const build = Platform.OS === 'ios' ? cfg?.ios?.buildNumber : Platform.OS === 'android' ? cfg?.android?.versionCode : undefined;
  return build != null && build !== '' ? `${version} (${build})` : version;
}

/** Bytes → "0.4 MB" · "12 MB". */
export function formatMb(bytes: number): string {
  const mb = Math.max(0, bytes) / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/** "Hoy, 11:32" · "Ayer, 18:05" · "21 nov, 09:10". */
export function formatSync(ts: number | null): string {
  if (!ts) return 'Sin sincronizar';
  const d = new Date(ts);
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const today = new Date();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (toYmd(d) === toYmd(today)) return `Hoy, ${hm}`;
  if (toYmd(d) === toYmd(y)) return `Ayer, ${hm}`;
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d.getDate()} ${months[d.getMonth()]}, ${hm}`;
}

/** Fecha de la última sincronización: lo más reciente guardado en la caché (agenda, inicio, reportes). */
export function useLastSync(): { lastSync: number | null; reload: () => void } {
  const [lastSync, setLastSync] = useState<number | null>(null);
  const reload = useCallback(() => {
    const keys = [cacheKeys.agenda, cacheKeys.homeReports, cacheKeys.reportList(''), cacheKeys.agendaToday(toYmd(new Date())), cacheKeys.user];
    Promise.all(keys.map((k) => getCache<unknown>(k)))
      .then((entries) => {
        const ts = entries.map((e) => e?.savedAt ?? 0).filter(Boolean);
        setLastSync(ts.length ? Math.max(...ts) : null);
      })
      .catch(() => setLastSync(null));
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  return { lastSync, reload };
}
