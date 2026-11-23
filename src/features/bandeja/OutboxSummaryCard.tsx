import React from 'react';
import { View } from 'react-native';
import { fontFamily, useTheme } from '../../theme';
import { Button, Icon, Text } from '../../ui';

export interface OutboxSummaryCardProps {
  pending: number;
  online: boolean | null;
  sending: boolean;
  onSendAll: () => void;
}

/** Tarjeta resumen de la bandeja: "3 pendientes por enviar" + "Enviar todo ahora". */
export function OutboxSummaryCard({ pending, online, sending, onSendAll }: OutboxSummaryCardProps) {
  const { colors } = useTheme();
  const done = pending === 0;
  const title = done ? 'Todo enviado' : `${pending} ${pending === 1 ? 'pendiente' : 'pendientes'} por enviar`;
  const text = done
    ? 'No hay nada pendiente por enviar al servidor.'
    : online === false
      ? 'Sin conexión: se enviarán automáticamente al reconectar.'
      : 'Se envían automáticamente con Wi-Fi o datos móviles.';
  return (
    <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: done ? colors.okBg : colors.brandSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={done ? 'cloud_done' : 'outbox'} size={26} color={done ? colors.ok : colors.brandInk} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text size={18} style={{ fontFamily: fontFamily.bold }} accessibilityRole="header">
            {title}
          </Text>
          <Text size={14} color={online === false && !done ? 'warn' : 'muted'}>
            {text}
          </Text>
        </View>
      </View>
      {!done ? <Button title="Enviar todo ahora" icon="send" onPress={onSendAll} loading={sending} loadingTitle="Enviando…" /> : null}
    </View>
  );
}
