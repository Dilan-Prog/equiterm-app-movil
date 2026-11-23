import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { fontFamily, useTheme } from '../../theme';
import { Button } from '../atoms/Button';
import { Icon, type IconName } from '../atoms/Icon';
import { ProgressBar } from '../atoms/ProgressBar';
import { StatusChip } from '../atoms/StatusChip';
import { Text } from '../atoms/Text';

export type OutboxItemStatus = 'pending' | 'sending' | 'sent' | 'failed';

export interface OutboxItemProps {
  /** "Reporte EQ-2026-0421". */
  title: string;
  /** "Lácteos del Bajío · 1.1 MB". */
  subtitle?: string;
  status: OutboxItemStatus;
  /** 0–100 mientras `sending`. */
  progress?: number;
  /** Mensaje cuando `failed`. */
  errorMessage?: string;
  /** Ícono del cuadro (default `description`; fotos `photo_library`, firma `signature`). */
  icon?: IconName;
  onRetry?: () => void;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const LABEL: Record<OutboxItemStatus, string> = { pending: 'Pendiente', sending: 'Enviando', sent: 'Enviado', failed: 'Error' };

/** Elemento de bandeja (O·06): Pendiente · Enviando (barra) · Enviado · Error (mensaje + Reintentar). */
export function OutboxItem({ title, subtitle, status, progress = 0, errorMessage, icon = 'description', onRetry, onPress, style }: OutboxItemProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={[{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, gap: 10 }, style]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={22} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text size={15} style={{ fontFamily: fontFamily.semibold }} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text size={13} color="muted" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <StatusChip status={status} label={LABEL[status]} />
      </View>
      {status === 'sending' ? <ProgressBar value={progress} tone="info" showLabel /> : null}
      {status === 'failed' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
            <Icon name="error" size={18} color="err" />
            <Text size={13} color="err" style={{ flex: 1 }}>
              {errorMessage || 'No se pudo enviar.'}
            </Text>
          </View>
          {onRetry ? <Button title="Reintentar" icon="refresh" variant="secondary" size="sm" block={false} onPress={onRetry} /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}
