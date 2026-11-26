import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Share, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import type { ReportDetail as ReportDetailData } from '../../api/types';
import { useCachedFetch } from '../../hooks/useCachedFetch';
import { useOnline } from '../../hooks/useOnline';
import { cacheKeys } from '../../lib/cache';
import { OfficialPdfError, OFFICIAL_PDF_MSG, PDF_NOT_SAVED_OFFLINE, useOfficialPdf } from '../pdf/officialPdf';
import { openPdfViewer, sharePdf } from '../pdf/storage';
import { useTheme } from '../../theme';
import { Button, EmptyState, Header, Icon, IconButton, StatusChip, Text } from '../../ui';
import { DetailSectionCard } from './components/DetailSectionCard';
import { PhotoGrid } from './components/PhotoGrid';
import { SignatureBlock } from './components/SignatureBlock';
import { CachedNotice, DetailSkeleton } from './components/States';
import { buildReportViewModel, type ReportViewModel } from './reportData';

export interface ReportDetailProps {
  id: number | string;
  /** Folio conocido (de la lista) para el encabezado mientras carga. */
  initialFolio?: string;
  /**
   * `screen` (teléfono, ruta /reportes/[id]): encabezado compacto con regresar y
   * compartir + barra inferior fija "Ver PDF". `pane` (tablet, panel derecho):
   * encabezado con "Reporte de servicio" + botones Compartir / Ver PDF.
   */
  variant?: 'screen' | 'pane';
  onBack?: () => void;
}

/** Detalle del reporte (1d / 3c). Usado por la ruta de teléfono y el panel derecho de tablet. */
export function ReportDetail({ id, initialFolio, variant = 'screen', onBack }: ReportDetailProps) {
  const { colors } = useTheme();
  const online = useOnline();
  const insets = useSafeAreaInsets();
  const fetcher = useCallback(() => api.report(id), [id]);
  const { data, loading, refreshing, error, fromCache, savedAt, refresh, reload } = useCachedFetch<ReportDetailData>(cacheKeys.report(id), fetcher);
  const vm = useMemo<ReportViewModel | null>(() => (data ? buildReportViewModel(data) : null), [data]);
  const [openingPdf, setOpeningPdf] = useState(false);
  const [sharing, setSharing] = useState(false);
  // PDF oficial guardado en el teléfono. Se auto-guarda en segundo plano sólo
  // cuando el detalle llegó del servidor (no de la caché): ahí `pdf_url` está vigente.
  const freshFromServer = !!data && !loading && !refreshing && !fromCache;
  const pdf = useOfficialPdf(data, { autoSave: freshFromServer && online !== false, refetch: fetcher });
  const pdfSaved = !!pdf.uri;

  const folio = vm?.folio ?? initialFolio ?? 'Reporte';
  const pane = variant === 'pane';

  const shareText = useCallback(() => {
    if (!vm) return;
    const lines = [`Reporte de servicio ${vm.folio}`, [vm.client, vm.title].filter(Boolean).join(' · '), vm.pdfUrl ?? ''].filter(Boolean);
    Share.share({ title: `Reporte ${vm.folio}`, message: lines.join('\n') }).catch(() => undefined);
  }, [vm]);

  /** Comparte el archivo PDF (descargándolo si hace falta); si no se puede, comparte el texto con la URL. */
  const share = useCallback(async () => {
    if (!vm || sharing) return;
    const canDownload = !!vm.pdfUrl && online !== false;
    if (!pdf.uri && !canDownload) {
      shareText();
      return;
    }
    setSharing(true);
    try {
      const file = pdf.uri ? { uri: pdf.uri } : await pdf.ensure();
      const ok = await sharePdf(file.uri, `Reporte ${vm.folio}`);
      if (!ok) shareText();
    } catch {
      shareText();
    } finally {
      setSharing(false);
    }
  }, [vm, sharing, online, pdf, shareText]);

  /** «Ver PDF»: abre el guardado (sin conexión) o lo descarga y abre. */
  const openPdf = useCallback(async () => {
    if (!vm || openingPdf) return;
    const open = (uri: string) => openPdfViewer({ uri, title: vm.folio, subtitle: vm.client || undefined });
    if (pdf.uri && !pdf.downloading) {
      open(pdf.uri);
      return;
    }
    if (online === false) {
      if (pdf.uri) open(pdf.uri);
      else Alert.alert('PDF no disponible sin conexión', PDF_NOT_SAVED_OFFLINE);
      return;
    }
    setOpeningPdf(true);
    try {
      const file = await pdf.ensure();
      open(file.uri);
    } catch (e) {
      const err = e instanceof OfficialPdfError ? e : null;
      Alert.alert(
        'No se pudo abrir el PDF',
        err?.kind === 'network' ? `${OFFICIAL_PDF_MSG.network}\n\n${PDF_NOT_SAVED_OFFLINE}` : err?.message ?? OFFICIAL_PDF_MSG.network,
      );
    } finally {
      setOpeningPdf(false);
    }
  }, [vm, openingPdf, online, pdf]);

  const pdfAvailable = pdfSaved || !!vm?.pdfUrl;

  /* Encabezado ------------------------------------------------------ */
  const header = pane ? (
    <View
      style={{
        paddingTop: 18 + insets.top,
        paddingBottom: 18,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size={13} weight="semibold" color="muted">
          Reporte de servicio
        </Text>
        <Text size={20} weight="bold" tabular numberOfLines={1} accessibilityRole="header">
          {folio}
        </Text>
        {pdfSaved ? <OfflineBadge style={{ marginTop: 2 }} /> : null}
      </View>
      <Button
        title="Compartir"
        variant="secondary"
        size="sm"
        icon="ios_share"
        block={false}
        disabled={!vm}
        loading={sharing}
        onPress={share}
        style={{ height: 48, paddingHorizontal: 16 }}
      />
      <Button
        title="Ver PDF"
        size="sm"
        icon="picture_as_pdf"
        block={false}
        disabled={!pdfAvailable}
        loading={openingPdf}
        onPress={openPdf}
        style={{ height: 48, paddingHorizontal: 18 }}
      />
    </View>
  ) : (
    <Header
      variant="compact"
      title={folio}
      subtitle={vm?.client || undefined}
      onBack={onBack}
      right={<IconButton icon="ios_share" accessibilityLabel="Compartir PDF del reporte" onPress={share} disabled={!vm || sharing} />}
    />
  );

  /* Cuerpo ---------------------------------------------------------- */
  let body: React.ReactNode;
  if (!vm && loading) {
    body = (
      <View style={{ padding: pane ? 24 : 16, paddingTop: 16 }}>
        <DetailSkeleton />
      </View>
    );
  } else if (!vm) {
    const forbidden = error?.status === 403;
    const notFound = error?.status === 404;
    body = (
      <EmptyState
        icon={forbidden ? 'lock' : notFound ? 'search_off' : 'cloud_off'}
        title={forbidden ? 'Sin permiso' : notFound ? 'Reporte no encontrado' : 'No se pudo cargar el reporte'}
        text={notFound ? 'Es posible que se haya eliminado.' : error?.message ?? 'Revisa tu conexión e inténtalo de nuevo.'}
        action={forbidden || notFound ? undefined : { label: 'Reintentar', icon: 'refresh', onPress: reload }}
      />
    );
  } else {
    const photoMeta = [vm.folio, vm.dateText].filter(Boolean).join(' · ');
    body = (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: pane ? 24 : 16, paddingTop: 16, paddingBottom: pane ? 32 : 24, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
      >
        {fromCache && online !== false ? <CachedNotice savedAt={savedAt} message={error?.message} /> : null}
        <SummaryCard vm={vm} />
        {vm.sections.map((s) => (
          <DetailSectionCard key={s.key} section={s} />
        ))}
        <PhotoGrid images={vm.images} meta={photoMeta} />
        {vm.signature ? <SignatureBlock signature={vm.signature} /> : null}
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {header}
      {body}
      {!pane && vm ? (
        <View
          style={{
            paddingTop: pdfSaved ? 8 : 12,
            paddingHorizontal: 16,
            paddingBottom: Math.max(insets.bottom, 12) + 4,
            backgroundColor: colors.card,
            borderTopWidth: 1,
            borderTopColor: colors.line,
            gap: 8,
          }}
        >
          {pdfSaved ? <OfflineBadge style={{ alignSelf: 'center' }} /> : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={share}
              disabled={sharing}
              accessibilityRole="button"
              accessibilityLabel="Compartir PDF del reporte"
              accessibilityState={{ busy: sharing, disabled: sharing }}
              style={({ pressed }) => ({
                opacity: sharing ? 0.5 : 1,
                width: 56,
                height: 56,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: pressed ? colors.linePressed : colors.line,
                backgroundColor: pressed ? colors.soft : colors.card,
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <Icon name="ios_share" size={24} />
            </Pressable>
            <Button
              title="Ver PDF"
              size="lg"
              icon="picture_as_pdf"
              loading={openingPdf}
              loadingTitle={pdfSaved ? 'Abriendo PDF…' : 'Descargando PDF…'}
              disabled={!pdfAvailable}
              onPress={openPdf}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** «Disponible sin conexión»: el PDF oficial está guardado en el teléfono. */
function OfflineBadge({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 4 }, style]}
      accessible
      accessibilityLabel="PDF disponible sin conexión"
    >
      <Icon name="offline_pin" size={16} color="ok" />
      <Text size={12} weight="medium" color="ok">
        Disponible sin conexión
      </Text>
    </View>
  );
}

/** Tarjeta resumen: folio, equipo/título, estado y cuadrícula Cliente/Técnico/Fecha/Ubicación. */
function SummaryCard({ vm }: { vm: ReportViewModel }) {
  const { colors, cardShadow } = useTheme();
  const cells: { label: string; value: string; sub?: string }[] = [
    { label: 'Cliente', value: vm.client, sub: vm.contact },
    { label: 'Técnico', value: vm.technician },
    { label: 'Fecha', value: vm.dateText },
  ];
  if (vm.location) cells.push({ label: 'Ubicación', value: vm.location });
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: 12,
        boxShadow: cardShadow,
        padding: 18,
        gap: 16,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text size={13} weight="semibold" color="muted" tabular>
            {vm.folio}
          </Text>
          <Text size={20} weight="bold" style={{ lineHeight: 25, marginTop: 4 }}>
            {vm.title}
          </Text>
        </View>
        {vm.isSigned ? (
          <StatusChip status="firmado" size="md" />
        ) : (
          <StatusChip status={vm.status} label={vm.statusLabel} size="md" />
        )}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }}>
        {cells.map((c, i) => (
          <View key={c.label} style={{ width: '50%', paddingRight: i % 2 === 0 ? 16 : 0 }}>
            <Text size={12} weight="medium" color="muted">
              {c.label}
            </Text>
            <Text size={15} weight="semibold" style={{ marginTop: 2 }} selectable>
              {c.value || '—'}
            </Text>
            {c.sub ? (
              <Text size={13} color="ink2">
                {c.sub}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}
