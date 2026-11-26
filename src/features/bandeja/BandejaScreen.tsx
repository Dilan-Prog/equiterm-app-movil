import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useOutbox as useOutboxContext } from '../../context/OutboxContext';
import { useOnline } from '../../hooks/useOnline';
import { useResponsive } from '../../hooks/useResponsive';
import { getOutboxSnapshot, OUTBOX_MSG, useOutbox, type FlushResult, type OutboxEntry } from '../../lib/outbox';
import { useTheme } from '../../theme';
import { Button, ConfirmDialog, EmptyState, Header, OutboxItem, SectionLoader, useToast } from '../../ui';
import { canGenerateLocalPdf } from '../pdf/localPdf';
import { useLocalReportPdf } from '../pdf/useLocalReportPdf';
import { entryIcon, entrySubtitle, entryTitle, uiStatus } from './format';
import { OutboxDetailDialog } from './OutboxDetailDialog';
import { OutboxSummaryCard } from './OutboxSummaryCard';

/** Bandeja de salida: lo guardado en el teléfono pendiente de enviar al servidor. */
export function BandejaScreen() {
  const { colors } = useTheme();
  const { isTablet } = useResponsive();
  const toast = useToast();
  const online = useOnline();
  const ob = useOutbox();
  const ctx = useOutboxContext();
  const [sendingAll, setSendingAll] = useState(false);
  const [detail, setDetail] = useState<OutboxEntry | null>(null);
  const [toDelete, setToDelete] = useState<OutboxEntry | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const localPdf = useLocalReportPdf();

  // Mantener sincronizada la insignia de la pestaña (OutboxContext lee la cola cada 15 s).
  const unsentKey = ob.items.map((i) => `${i.id}:${i.status}`).join('|');
  useEffect(() => {
    void ctx.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unsentKey]);

  // El detalle abierto refleja cambios de estado en vivo.
  const liveDetail = detail ? (ob.items.find((i) => i.id === detail.id) ?? null) : null;

  const report = (r: FlushResult, single?: string) => {
    if (r.failed > 0) {
      // Leer el estado actual (no el del render anterior al envío).
      const failed = getOutboxSnapshot().items.filter((i) => i.status === 'error' && (!single || i.id === single));
      const notAccepted = failed.length > 0 && failed.every((i) => i.lastError === OUTBOX_MSG.notAccepted);
      toast.show({
        kind: 'error',
        title: 'No se pudo enviar el reporte',
        message: notAccepted ? OUTBOX_MSG.notAccepted : 'Revisa tu conexión e inténtalo de nuevo.',
      });
    } else if (r.sent > 0) {
      toast.show({ kind: 'success', title: r.sent === 1 ? 'Enviado al servidor' : `${r.sent} elementos enviados` });
    } else if (r.remaining > 0 && online === false) {
      toast.show({ kind: 'warning', title: 'Sin conexión', message: 'Se enviarán automáticamente al reconectar.' });
    }
  };

  const sendAll = async () => {
    if (online === false) {
      toast.show({ kind: 'warning', title: 'Sin conexión', message: 'Se enviarán automáticamente al reconectar.' });
      return;
    }
    setSendingAll(true);
    try {
      report(await ob.sendAllNow());
    } finally {
      setSendingAll(false);
    }
  };

  const retry = async (e: OutboxEntry) => {
    setDetail(null);
    if (online === false) {
      toast.show({ kind: 'warning', title: 'Sin conexión', message: 'Se enviará automáticamente al reconectar.' });
      return;
    }
    report(await ob.retry(e.id), e.id);
  };

  const confirmDelete = async () => {
    const e = toDelete;
    setToDelete(null);
    if (!e) return;
    await ob.remove(e.id);
    toast.show({ kind: 'info', title: e.status === 'sent' ? 'Quitado de la lista' : 'Eliminado de la bandeja' });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await ob.flush();
    } finally {
      setRefreshing(false);
    }
  };

  const pad = isTablet ? 32 : 16;
  const hasSent = ob.items.some((i) => i.status === 'sent');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Bandeja de salida" />
      {!ob.loaded ? (
        <SectionLoader />
      ) : ob.items.length === 0 ? (
        <EmptyState
          icon="outbox"
          title="No hay nada por enviar"
          text="Cuando guardes un reporte, aparecerá aquí hasta que se envíe al servidor, aunque no tengas internet."
        />
      ) : (
        <FlatList
          data={ob.items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: pad, gap: 10, width: '100%', maxWidth: 760 + pad * 2, alignSelf: 'center' }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />}
          ListHeaderComponent={
            <View style={{ marginBottom: 4 }}>
              <OutboxSummaryCard pending={ob.pendingCount} online={online} sending={sendingAll || (ob.flushing && ob.sendingCount > 0)} onSendAll={sendAll} />
            </View>
          }
          renderItem={({ item }) => (
            <OutboxItem
              title={entryTitle(item)}
              subtitle={entrySubtitle(item)}
              status={uiStatus(item)}
              progress={item.progress}
              errorMessage={item.lastError}
              icon={entryIcon(item)}
              onRetry={item.status === 'error' ? () => void retry(item) : undefined}
              action={
                canGenerateLocalPdf(item)
                  ? {
                      label: 'Ver PDF',
                      icon: 'picture_as_pdf',
                      loading: localPdf.busyId === item.id,
                      loadingLabel: 'Generando…',
                      disabled: !!localPdf.busyId && localPdf.busyId !== item.id,
                      accessibilityLabel: 'Ver PDF provisional del reporte',
                      onPress: () => void localPdf.open(item),
                    }
                  : undefined
              }
              onPress={() => setDetail(item)}
            />
          )}
          ListFooterComponent={
            hasSent ? (
              <Button title="Quitar enviados de la lista" icon="playlist_remove" variant="ghostMuted" block={false} onPress={() => void ob.clearSent()} style={{ alignSelf: 'center', marginTop: 4 }} />
            ) : undefined
          }
        />
      )}
      <OutboxDetailDialog
        entry={liveDetail}
        onClose={() => setDetail(null)}
        onRetry={(e) => void retry(e)}
        pdfLoading={!!liveDetail && localPdf.busyId === liveDetail.id}
        onViewPdf={(e) => {
          // El diálogo es modal: cerrarlo antes de abrir el visor o quedaría encima.
          // Si falla, también cerrarlo para que se vea el aviso de error.
          void localPdf.open(e, { beforeOpen: () => setDetail(null) }).then((ok) => {
            if (!ok) setDetail(null);
          });
        }}
        onDelete={(e) => {
          setDetail(null);
          if (e.status === 'sent') void ob.remove(e.id);
          else setToDelete(e);
        }}
      />
      <ConfirmDialog
        visible={!!toDelete}
        icon="delete"
        title="¿Eliminar de la bandeja?"
        message="Este elemento aún no se ha enviado. Si lo eliminas se perderán sus datos, fotos y firma, y no se podrá recuperar."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onCancel={() => setToDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </View>
  );
}
