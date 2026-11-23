import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View, type StyleProp, type ViewStyle } from 'react-native';
import { fontFamily, useTheme } from '../../theme';
import { Icon } from '../atoms/Icon';
import { Text } from '../atoms/Text';

export type ConnectionState = 'offline' | 'reconnected';

export interface ConnectionBannerProps {
  state: ConnectionState;
  /** Pendientes que se están enviando (sólo `reconnected`). */
  pendingCount?: number;
  /** Texto personalizado. */
  message?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Banner de conexión (M·10): fijo bajo la barra de estado, 40 alto, ancho
 * completo, sin radio. Ámbar = sin conexión; verde = conexión restablecida.
 * La app ya lo muestra globalmente (ver `useConnectionBanner`); no lo repitas en pantallas.
 */
export function ConnectionBanner({ state, pendingCount = 0, message, style }: ConnectionBannerProps) {
  const { colors } = useTheme();
  const offline = state === 'offline';
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (offline) return;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [offline, spin]);
  const text =
    message ??
    (offline
      ? 'Sin conexión — mostrando datos guardados'
      : pendingCount > 0
        ? `Conexión restablecida — enviando ${pendingCount} ${pendingCount === 1 ? 'pendiente' : 'pendientes'}`
        : 'Conexión restablecida');
  const fg = offline ? colors.warn : colors.ok;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        {
          height: 40,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 16,
          backgroundColor: offline ? colors.warnBg : colors.okBg,
          borderBottomWidth: 1,
          borderBottomColor: colors.line,
        },
        style,
      ]}
    >
      {offline ? (
        <Icon name="cloud_off" size={20} color={fg} />
      ) : (
        <Animated.View style={{ transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
          <Icon name="sync" size={20} color={fg} />
        </Animated.View>
      )}
      <Text size={14} style={{ fontFamily: fontFamily.semibold, color: fg, flex: 1 }} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

/**
 * Estado del banner a partir de la conectividad: `offline` mientras no hay red;
 * al reconectar muestra `reconnected` durante `reconnectedMs` y luego `null`.
 * `onReconnect` se llama una vez al recuperar la red (p. ej. `flushOutbox`).
 */
export function useConnectionBanner(
  online: boolean | null,
  opts: { reconnectedMs?: number; onReconnect?: () => void } = {},
): ConnectionState | null {
  const { reconnectedMs = 3500, onReconnect } = opts;
  const [state, setState] = useState<ConnectionState | null>(null);
  const wasOffline = useRef(false);
  const cb = useRef(onReconnect);
  cb.current = onReconnect;

  useEffect(() => {
    if (online === false) {
      wasOffline.current = true;
      setState('offline');
      return;
    }
    if (online === true && wasOffline.current) {
      wasOffline.current = false;
      setState('reconnected');
      cb.current?.();
      const t = setTimeout(() => setState(null), reconnectedMs);
      return () => clearTimeout(t);
    }
  }, [online, reconnectedMs]);

  return state;
}
