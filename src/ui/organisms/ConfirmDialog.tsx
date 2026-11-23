import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { boxShadow, fontFamily, useTheme } from '../../theme';
import { Button, type ButtonVariant } from '../atoms/Button';
import { Icon, type IconName } from '../atoms/Icon';
import { toneColors, type ChipTone } from '../atoms/StatusChip';
import { Text } from '../atoms/Text';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  /** Ícono en círculo de 52 (default `logout` si danger, `help` si no). */
  icon?: IconName;
  /** Acción destructiva: botón rojo + ícono en errBg. Default true. */
  danger?: boolean;
  /** Tono del ícono cuando no es danger (default brand). */
  tone?: ChipTone;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Variante del botón de confirmar cuando no es danger (default primary). */
  confirmVariant?: ButtonVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Contenido extra bajo el mensaje. */
  children?: React.ReactNode;
}

/**
 * Diálogo modal base (lo usan ConfirmDialog e InactivityDialog). Velo `overlay`,
 * tarjeta máx. 360-400, radio 16, contenido centrado.
 */
export function DialogFrame({
  visible,
  onRequestClose,
  maxWidth = 360,
  children,
}: {
  visible: boolean;
  onRequestClose: () => void;
  maxWidth?: number;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose} statusBarTranslucent supportedOrientations={['portrait', 'landscape']}>
      <View style={{ flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onRequestClose} accessibilityLabel="Cerrar" />
        <View
          accessibilityViewIsModal
          style={{
            width: '100%',
            maxWidth,
            backgroundColor: colors.card,
            borderRadius: 16,
            paddingTop: 24,
            paddingHorizontal: 20,
            paddingBottom: 20,
            alignItems: 'center',
            gap: 10,
            boxShadow: boxShadow.dialog,
          }}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}

/** Diálogo de confirmación (O·07): sólo para acciones que pierden datos o salen de un flujo. Cancelar siempre a la izquierda. */
export function ConfirmDialog({
  visible,
  title,
  message,
  icon,
  danger = true,
  tone = 'brand',
  confirmLabel = 'Aceptar',
  cancelLabel = 'Cancelar',
  confirmVariant = 'primary',
  loading,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const { colors } = useTheme();
  const c = toneColors(danger ? 'err' : tone, colors);
  return (
    <DialogFrame visible={visible} onRequestClose={onCancel}>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon ?? (danger ? 'logout' : 'help')} size={26} color={c.fg} />
      </View>
      <Text size={19} style={{ fontFamily: fontFamily.bold }} align="center" accessibilityRole="header">
        {title}
      </Text>
      {message ? (
        <Text size={15} color="muted" align="center" style={{ lineHeight: 22 }}>
          {message}
        </Text>
      ) : null}
      {children}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, alignSelf: 'stretch' }}>
        <Button title={cancelLabel} variant="secondary" onPress={onCancel} disabled={loading} style={{ flex: 1 }} />
        <Button title={confirmLabel} variant={danger ? 'danger' : confirmVariant} onPress={onConfirm} loading={loading} style={{ flex: 1 }} />
      </View>
    </DialogFrame>
  );
}
