import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useState } from 'react';
import { Alert, Image, RefreshControl, ScrollView, Text, View } from 'react-native';
import { api } from '../api/client';
import type { ReportDetail, ReportImage } from '../api/types';
import { useCachedFetch } from '../hooks/useCachedFetch';
import { useResponsive } from '../hooks/useResponsive';
import { cacheKeys } from '../lib/cache';
import {
  customerName,
  describeObject,
  formatDate,
  formatDateTime,
  formatScalar,
  humanizeKey,
  isScalar,
  personName,
} from '../lib/format';
import { fontFamily, makeStyles, useTheme } from '../theme';
import { Button, EmptyState, SectionLoader, StatusChip } from '../ui';
import { CachedNotice } from './CachedNotice';
import { ImageGallery } from './ImageGallery';

/** Campos que se muestran en el encabezado (no se repiten abajo). */
const KNOWN_KEYS = new Set([
  'id',
  'folio',
  'status',
  'status_label',
  'service_date',
  'customer',
  'technician',
  'service_type',
  'is_signed',
  'updated_at',
  'images',
  'pdf_url',
]);

const IMAGE_URL = /^https?:\/\/.+\.(png|jpe?g|gif|webp)(\?.*)?$/i;
const LONG_TEXT = 90;

export function ReportDetailView({ id }: { id: number | string }) {
  const r = useResponsive();
  const styles = useStyles();
  const { colors } = useTheme();
  const fetcher = useCallback(() => api.report(id), [id]);
  const state = useCachedFetch<ReportDetail>(cacheKeys.report(id), fetcher);
  const [openingPdf, setOpeningPdf] = useState(false);
  const { data, loading, refreshing, error, fromCache, savedAt, refresh, reload } = state;

  if (!data && loading) return <SectionLoader text="Cargando reporte…" />;
  if (!data) {
    return (
      <EmptyState
        icon={error?.status === 403 ? 'lock' : 'cloud_off'}
        title={error?.status === 403 ? 'Sin permiso' : 'No se pudo cargar el reporte'}
        text={error?.message ?? undefined}
        action={{ label: 'Reintentar', icon: 'refresh', onPress: reload }}
      />
    );
  }

  const openPdf = async () => {
    if (!data.pdf_url) return;
    setOpeningPdf(true);
    try {
      await WebBrowser.openBrowserAsync(data.pdf_url);
    } catch {
      Alert.alert('No se pudo abrir el PDF', 'Verifica tu conexión e intenta de nuevo.');
    } finally {
      setOpeningPdf(false);
    }
  };

  const images: ReportImage[] = Array.isArray(data.images)
    ? data.images.filter((i): i is ReportImage => !!i && typeof i.url === 'string' && !!i.url)
    : [];

  // Clasificar el resto de campos para renderizarlos genéricamente.
  const rows: { key: string; value: string }[] = [];
  const longTexts: { key: string; value: string }[] = [];
  const imageFields: { key: string; url: string }[] = [];
  const lists: { key: string; items: unknown[] }[] = [];
  const groups: { key: string; obj: Record<string, unknown> }[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (KNOWN_KEYS.has(key)) continue;
    if (value === null || value === undefined || value === '') continue;
    if (/_id$/.test(key) && typeof value === 'number') continue;
    if (isScalar(value)) {
      if (typeof value === 'string' && IMAGE_URL.test(value)) imageFields.push({ key, url: value });
      else if (typeof value === 'string' && (value.length > LONG_TEXT || value.includes('\n')))
        longTexts.push({ key, value });
      else rows.push({ key, value: formatScalar(key, value) });
    } else if (Array.isArray(value)) {
      if (value.length) lists.push({ key, items: value });
    } else if (typeof value === 'object') {
      groups.push({ key, obj: value as Record<string, unknown> });
    }
  }

  const customer = customerName(data.customer);
  const tech = personName(data.technician);

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{ padding: r.pad, paddingBottom: r.pad + 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} />}
    >
      {fromCache ? <CachedNotice savedAt={savedAt} message={error?.message} style={{ marginBottom: 12 }} /> : null}

      {/* Encabezado */}
      <View style={[styles.header, { padding: r.pad, borderRadius: r.radius }]}>
        <Text style={[styles.folio, { fontSize: r.font.xxl }]}>{data.folio || `Reporte #${data.id}`}</Text>
        <View style={styles.chips}>
          <StatusChip status={data.status} label={data.status_label} />
          {data.is_signed ? <StatusChip status="firmado" label="Firmado" /> : null}
        </View>
        <HeaderRow label="Cliente" value={customer} />
        <HeaderRow label="Técnico" value={tech} />
        <HeaderRow label="Fecha de servicio" value={formatDate(data.service_date, '')} />
        <HeaderRow label="Tipo de servicio" value={data.service_type ?? ''} />
        {data.updated_at ? <HeaderRow label="Actualizado" value={formatDateTime(data.updated_at)} /> : null}
      </View>

      {data.pdf_url ? (
        <Button title="Ver PDF" icon="picture_as_pdf" onPress={openPdf} loading={openingPdf} style={{ marginTop: r.gap }} />
      ) : null}

      {rows.length ? (
        <Section title="Información general">
          {rows.map((row) => (
            <KV key={row.key} label={humanizeKey(row.key)} value={row.value} />
          ))}
        </Section>
      ) : null}

      {groups.map((g) => {
        const entries = Object.entries(g.obj).filter(
          ([k, v]) => k !== 'id' && isScalar(v) && String(v).trim() !== '',
        );
        if (!entries.length) return null;
        return (
          <Section key={g.key} title={humanizeKey(g.key)}>
            {entries.map(([k, v]) => (
              <KV key={k} label={humanizeKey(k)} value={formatScalar(k, v)} />
            ))}
          </Section>
        );
      })}

      {longTexts.map((t) => (
        <Section key={t.key} title={humanizeKey(t.key)}>
          <Text style={[styles.body, { fontSize: r.font.md }]}>{t.value}</Text>
        </Section>
      ))}

      {lists.map((l) => (
        <Section key={l.key} title={`${humanizeKey(l.key)} (${l.items.length})`}>
          {l.items.map((item, i) => (
            <ListItem key={i} item={item} last={i === l.items.length - 1} />
          ))}
        </Section>
      ))}

      {imageFields.map((f) => (
        <Section key={f.key} title={humanizeKey(f.key)}>
          <Image source={{ uri: f.url }} style={styles.fieldImage} resizeMode="contain" />
        </Section>
      ))}

      {images.length ? (
        <Section title={`Fotografías (${images.length})`}>
          <ImageGallery images={images} />
        </Section>
      ) : null}
    </ScrollView>
  );
}

function HeaderRow({ label, value }: { label: string; value?: string | null }) {
  const r = useResponsive();
  const styles = useStyles();
  if (!value) return null;
  return (
    <View style={styles.headerRow}>
      <Text style={[styles.headerLabel, { fontSize: r.font.xs }]}>{label}</Text>
      <Text style={[styles.headerValue, { fontSize: r.font.md }]}>{value}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const r = useResponsive();
  const styles = useStyles();
  return (
    <View style={[styles.section, { padding: r.pad, borderRadius: r.radius, marginTop: r.gap }]}>
      <Text style={[styles.sectionTitle, { fontSize: r.font.lg }]}>{title}</Text>
      {children}
    </View>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  const r = useResponsive();
  const styles = useStyles();
  return (
    <View style={[styles.kv, r.isTablet && styles.kvRow]}>
      <Text style={[styles.kvLabel, { fontSize: r.font.sm }, r.isTablet && { width: '35%' }]}>{label}</Text>
      <Text style={[styles.kvValue, { fontSize: r.font.md }, r.isTablet && { flex: 1 }]} selectable>
        {value}
      </Text>
    </View>
  );
}

function ListItem({ item, last }: { item: unknown; last: boolean }) {
  const r = useResponsive();
  const styles = useStyles();
  if (isScalar(item)) {
    return <Text style={[styles.body, { fontSize: r.font.md, marginBottom: 4 }]}>• {String(item)}</Text>;
  }
  if (!item || typeof item !== 'object') return null;
  const obj = item as Record<string, unknown>;
  const title = describeObject(obj);
  const titleKeys = new Set(['id', 'name', 'title', 'label']);
  const details = Object.entries(obj).filter(
    ([k, v]) => !titleKeys.has(k) && !/_id$/.test(k) && isScalar(v) && String(v).trim() !== '',
  );
  return (
    <View style={[styles.listItem, !last && styles.listItemBorder]}>
      {title ? <Text style={[styles.listTitle, { fontSize: r.font.md }]}>{title}</Text> : null}
      {details.map(([k, v]) => (
        <Text key={k} style={[styles.listDetail, { fontSize: r.font.sm }]}>
          <Text style={styles.listDetailLabel}>{humanizeKey(k)}: </Text>
          {formatScalar(k, v)}
        </Text>
      ))}
    </View>
  );
}

const useStyles = makeStyles((colors, theme) => ({
  flex: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, boxShadow: theme.cardShadow },
  folio: { color: colors.ink, fontFamily: fontFamily.bold, letterSpacing: -0.4 },
  chips: { flexDirection: 'row', gap: 6, marginTop: 8, marginBottom: 6, flexWrap: 'wrap' },
  headerRow: { marginTop: 10 },
  headerLabel: { color: colors.muted, fontFamily: fontFamily.regular },
  headerValue: { color: colors.ink, fontFamily: fontFamily.semibold, marginTop: 1 },
  section: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  sectionTitle: { fontFamily: fontFamily.semibold, color: colors.ink, marginBottom: 10 },
  kv: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  kvRow: { flexDirection: 'row', gap: 12 },
  kvLabel: { color: colors.muted, fontFamily: fontFamily.regular },
  kvValue: { color: colors.ink, fontFamily: fontFamily.semibold, marginTop: 2 },
  body: { color: colors.ink, fontFamily: fontFamily.regular, lineHeight: 22 },
  listItem: { paddingVertical: 8 },
  listItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  listTitle: { fontFamily: fontFamily.semibold, color: colors.ink },
  listDetail: { color: colors.muted, fontFamily: fontFamily.regular, marginTop: 2 },
  listDetailLabel: { fontFamily: fontFamily.semibold, color: colors.ink2 },
  fieldImage: { width: '100%', height: 180, backgroundColor: colors.soft, borderRadius: 8 },
}));
