import React from 'react';
import { View } from 'react-native';
import type { OutboxEntry } from '../../lib/outbox';
import { canGenerateLocalPdf } from '../pdf/localPdf';
import { fontFamily, useTheme } from '../../theme';
import { Button, DialogFrame, Icon, StatusChip, Text } from '../../ui';
import { entryIcon, entryTitle, formatBytes, relativeWhen, uiStatus } from './format';

const LABEL = { pending: 'Pendiente', sending: 'Enviando', sent: 'Enviado', failed: 'Error' } as const;

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 4, alignSelf: 'stretch' }}>
      <Text size={14} color="muted" style={{ width: 104 }}>
        {label}
      </Text>
      <Text size={14} style={{ flex: 1, fontFamily: fontFamily.medium }}>
        {value}
      </Text>
    </View>
  );
}

/** Detalle de un elemento de la bandeja con acciones Ver PDF (reportes) / Reintentar / Eliminar. */
export function OutboxDetailDialog({
  entry,
  onClose,
  onRetry,
  onDelete,
  onViewPdf,
  pdfLoading,
}: {
  entry: OutboxEntry | null;
  onClose: () => void;
  onRetry: (e: OutboxEntry) => void;
  onDelete: (e: OutboxEntry) => void;
  /** «Ver PDF» provisional; solo se muestra en reportes sin enviar. */
  onViewPdf?: (e: OutboxEntry) => void;
  pdfLoading?: boolean;
}) {
  const { colors } = useTheme();
  if (!entry) return null;
  const st = uiStatus(entry);
  const photos = entry.files.filter((f) => f.field.startsWith('fotos')).length;
  return (
    <DialogFrame visible onRequestClose={onClose} maxWidth={420}>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={entryIcon(entry)} size={26} />
      </View>
      <Text size={19} style={{ fontFamily: fontFamily.bold }} align="center" accessibilityRole="header">
        {entryTitle(entry)}
      </Text>
      <StatusChip status={st} label={LABEL[st]} />
      <View style={{ alignSelf: 'stretch', marginTop: 6 }}>
        <Row label="Detalle" value={entry.subtitle} />
        <Row label="Guardado" value={relativeWhen(entry.createdAt)} />
        {entry.sentAt ? <Row label="Enviado" value={relativeWhen(entry.sentAt)} /> : null}
        <Row label="Fotos" value={photos ? String(photos) : undefined} />
        <Row label="Tamaño" value={formatBytes(entry.sizeBytes)} />
        <Row label="Intentos" value={entry.attempts ? String(entry.attempts) : undefined} />
        {entry.status === 'error' ? <Row label="Último error" value={entry.lastError} /> : null}
        {entry.status === 'error' && entry.autoRetry && entry.nextAttemptAt ? (
          <Row label="Reintento" value={`Automático ${relativeWhen(entry.nextAttemptAt)}`} />
        ) : null}
      </View>
      {onViewPdf && canGenerateLocalPdf(entry) && entry.status !== 'sending' ? (
        <Button
          title="Ver PDF provisional"
          icon="picture_as_pdf"
          variant="secondary"
          loading={pdfLoading}
          loadingTitle="Generando PDF…"
          onPress={() => onViewPdf(entry)}
          style={{ alignSelf: 'stretch', marginTop: 8 }}
        />
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, alignSelf: 'stretch' }}>
        {entry.status !== 'sending' ? (
          <Button
            title={entry.status === 'sent' ? 'Quitar' : 'Eliminar'}
            icon="delete"
            variant="dangerSoft"
            onPress={() => onDelete(entry)}
            style={{ flex: 1 }}
          />
        ) : null}
        {entry.status === 'error' || entry.status === 'pending' ? (
          <Button title={entry.status === 'error' ? 'Reintentar' : 'Enviar'} icon="refresh" variant="dark" onPress={() => onRetry(entry)} style={{ flex: 1 }} />
        ) : (
          <Button title="Cerrar" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
        )}
      </View>
    </DialogFrame>
  );
}
