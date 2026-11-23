import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { fontFamily, useTheme } from '../../theme';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { ProgressBar } from '../atoms/ProgressBar';
import { Text } from '../atoms/Text';
import { DialogFrame } from './ConfirmDialog';

export interface InactivityDialogProps {
  visible: boolean;
  /** Segundos para responder (default 60). La cuenta regresiva arranca al hacerse visible. */
  seconds?: number;
  /** "Seguir aquí". */
  onStay: () => void;
  /** "Cerrar sesión". */
  onLogout: () => void;
  /** Se llama al llegar a 0 (default: `onLogout`). */
  onTimeout?: () => void;
  message?: string;
}

function mmss(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** Aviso de inactividad (O·08) "¿Sigues ahí?": diálogo + contador + barra ámbar. Aparece a los 15 min sin uso (lógica aparte). */
export function InactivityDialog({
  visible,
  seconds = 60,
  onStay,
  onLogout,
  onTimeout,
  message = 'Por seguridad, tu sesión se cerrará por inactividad. Tus borradores y la bandeja de salida se conservan en este teléfono.',
}: InactivityDialogProps) {
  const { colors } = useTheme();
  const [left, setLeft] = useState(seconds);
  const timeoutRef = useRef(onTimeout ?? onLogout);
  timeoutRef.current = onTimeout ?? onLogout;

  useEffect(() => {
    if (!visible) return;
    setLeft(seconds);
    const started = Date.now();
    const id = setInterval(() => {
      const remaining = Math.max(0, seconds - Math.floor((Date.now() - started) / 1000));
      setLeft(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        timeoutRef.current();
      }
    }, 250);
    return () => clearInterval(id);
  }, [visible, seconds]);

  return (
    <DialogFrame visible={visible} onRequestClose={onStay} maxWidth={400}>
      <View style={{ gap: 18, alignItems: 'center', alignSelf: 'stretch', paddingTop: 4 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.warnBg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="timer" size={34} color="warn" />
        </View>
        <View style={{ gap: 8 }}>
          <Text size={21} style={{ fontFamily: fontFamily.bold, letterSpacing: -0.2 }} align="center" accessibilityRole="header">
            ¿Sigues ahí?
          </Text>
          <Text size={15} color="muted" align="center" style={{ lineHeight: 22 }}>
            {message}
          </Text>
        </View>
        <View style={{ alignSelf: 'stretch', gap: 8 }}>
          <Text size={40} style={{ fontFamily: fontFamily.bold, letterSpacing: -0.8, lineHeight: 44 }} align="center" tabular accessibilityLiveRegion="polite">
            {mmss(left)}
          </Text>
          <ProgressBar value={(left / seconds) * 100} tone="warn" trackColor={colors.soft} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
          <Button title="Cerrar sesión" variant="secondary" onPress={onLogout} style={{ flex: 1 }} />
          <Button title="Seguir aquí" onPress={onStay} style={{ flex: 1 }} />
        </View>
      </View>
    </DialogFrame>
  );
}
