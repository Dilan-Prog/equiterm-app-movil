import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { boxShadow, fontFamily, useTheme } from '../../theme';
import { Icon, type IconName } from '../atoms/Icon';
import { Text } from '../atoms/Text';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  kind?: ToastKind;
  title: string;
  /** Texto secundario 13 muted. */
  message?: string;
  /** Muestra la ✕ para cerrar. */
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
}

const KIND: Record<ToastKind, { icon: IconName; bg: 'okBg' | 'errBg' | 'infoBg' | 'warnBg'; fg: 'ok' | 'err' | 'info' | 'warn' }> = {
  success: { icon: 'check_circle', bg: 'okBg', fg: 'ok' },
  error: { icon: 'error', bg: 'errBg', fg: 'err' },
  info: { icon: 'info', bg: 'infoBg', fg: 'info' },
  warning: { icon: 'warning', bg: 'warnBg', fg: 'warn' },
};

/** Aviso (M·09), presentacional. Para mostrarlo usa `useToast().show(...)`. */
export function Toast({ kind = 'success', title, message, onClose, style }: ToastProps) {
  const { colors } = useTheme();
  const k = KIND[kind];
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        {
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: 12,
          boxShadow: boxShadow.lg,
          paddingVertical: 12,
          paddingLeft: 14,
          paddingRight: onClose ? 6 : 14,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
        },
        style,
      ]}
    >
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors[k.bg], alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={k.icon} size={20} color={colors[k.fg]} />
      </View>
      <View style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
        <Text size={15} style={{ fontFamily: fontFamily.semibold }}>
          {title}
        </Text>
        {message ? (
          <Text variant="caption" color="muted" style={{ marginTop: 2, lineHeight: 18 }}>
            {message}
          </Text>
        ) : null}
      </View>
      {onClose ? (
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar aviso"
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginTop: -4 }}
        >
          <Icon name="close" size={20} color="muted" />
        </Pressable>
      ) : null}
    </View>
  );
}

export interface ShowToastOptions {
  kind?: ToastKind;
  title: string;
  message?: string;
  /** Milisegundos (default 3400; 0 = hasta cerrar). */
  duration?: number;
}

interface ToastContextValue {
  show: (opts: ShowToastOptions) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Proveedor de avisos. Muestra un aviso a la vez, arriba (bajo el encabezado /
 * barra de estado), se va solo a los 3.4 s.
 */
export function ToastProvider({ children, topOffset = 8 }: { children: React.ReactNode; topOffset?: number }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<(ShowToastOptions & { id: number }) | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setToast(null));
  }, [anim]);

  const show = useCallback(
    (opts: ShowToastOptions) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ ...opts, id: Date.now() });
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      const d = opts.duration ?? 3400;
      if (d > 0) timer.current = setTimeout(hide, d);
    },
    [anim, hide],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const value = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: insets.top + topOffset,
            left: 12,
            right: 12,
            alignItems: 'center',
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
          }}
        >
          <Toast
            key={toast.id}
            kind={toast.kind}
            title={toast.title}
            message={toast.message}
            onClose={hide}
            style={{ width: '100%', maxWidth: 560 }}
          />
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

/** `const toast = useToast(); toast.show({ kind: 'success', title: 'Reporte guardado' })`. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
