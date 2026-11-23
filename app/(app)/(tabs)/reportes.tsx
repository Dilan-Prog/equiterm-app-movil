import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReportSummary } from '../../../src/api/types';
import { CachedNotice, EmptyReports } from '../../../src/features/reportes/components/States';
import { ReportDetail } from '../../../src/features/reportes/ReportDetail';
import { REPORT_FILTERS, applyFilter, countByFilter, type ReportFilter } from '../../../src/features/reportes/status';
import { useReportList } from '../../../src/features/reportes/useReportList';
import { useOnline } from '../../../src/hooks/useOnline';
import { useResponsive } from '../../../src/hooks/useResponsive';
import { useTheme } from '../../../src/theme';
import { Button, EmptyState, FilterChip, Header, ReportCard, ReportCardSkeleton, SearchBar, Spinner, Text } from '../../../src/ui';

/**
 * Reportes de servicio (1c). Teléfono: lista → /reportes/[id].
 * Tablet (≥ 768): lista 40 % a la izquierda y detalle a la derecha (3c).
 */
export default function ReportesScreen() {
  const { isTablet } = useResponsive();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const online = useOnline();
  const list = useReportList();
  const [filter, setFilter] = useState<ReportFilter>('todos');
  const [selected, setSelected] = useState<{ id: number; folio?: string } | null>(null);

  const counts = useMemo(() => countByFilter(list.items), [list.items]);
  const visible = useMemo(() => applyFilter(list.items, filter), [list.items, filter]);

  // Tablet: seleccionar el primero para que el panel derecho no quede vacío.
  useEffect(() => {
    if (isTablet && !selected && visible.length) setSelected({ id: visible[0].id, folio: visible[0].folio ?? undefined });
  }, [isTablet, selected, visible]);

  const onPressReport = useCallback(
    (rep: ReportSummary) => {
      if (isTablet) setSelected({ id: rep.id, folio: rep.folio ?? undefined });
      else router.push({ pathname: '/reportes/[id]', params: { id: String(rep.id), folio: rep.folio ?? '' } });
    },
    [isTablet],
  );

  const clearFilters = () => {
    list.setQuery('');
    setFilter('todos');
  };
  const newReport = () => router.push('/reporte-nuevo');

  /* Buscador + chips ------------------------------------------------ */
  const controls = (
    <View style={{ paddingTop: 12, paddingHorizontal: 16, paddingBottom: 8, gap: 12 }}>
      <SearchBar
        value={list.query}
        onChangeText={list.setQuery}
        placeholder="Buscar por folio, cliente o técnico"
        loading={list.query.trim() !== list.search || (list.loading && !!list.search)}
        onSubmitEditing={list.submitSearch}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -16, flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 2, gap: 8 }}
        keyboardShouldPersistTaps="handled"
      >
        {REPORT_FILTERS.map((f) => (
          <FilterChip key={f.key} label={f.label} count={counts[f.key]} selected={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </ScrollView>
    </View>
  );

  /* Estados vacíos --------------------------------------------------- */
  let empty: React.ReactElement;
  if (list.loading) {
    empty = (
      <View style={{ gap: 12 }} accessibilityLabel="Cargando reportes">
        {[0, 1, 2, 3].map((i) => (
          <ReportCardSkeleton key={i} />
        ))}
      </View>
    );
  } else if (list.error && !list.fromCache && !list.items.length) {
    const forbidden = list.error.status === 403;
    empty = (
      <EmptyState
        icon={forbidden ? 'lock' : 'cloud_off'}
        title={forbidden ? 'Sin permiso' : 'No se pudieron cargar los reportes'}
        text={forbidden ? 'Tu rol no tiene acceso a los reportes de servicio.' : list.error.message || 'Revisa tu conexión e inténtalo de nuevo.'}
        action={forbidden ? undefined : { label: 'Reintentar', icon: 'refresh', onPress: list.reload }}
      />
    );
  } else if (!list.items.length && !list.search) {
    empty = <EmptyReports onNew={newReport} />;
  } else {
    empty = (
      <EmptyState
        icon="search_off"
        title="Sin resultados"
        text="No encontramos reportes con esa búsqueda o filtro."
        action={{ label: 'Limpiar filtros', icon: 'filter_alt_off', onPress: clearFilters }}
      />
    );
  }

  const listView = (
    <FlatList
      data={visible}
      keyExtractor={(it) => String(it.id)}
      renderItem={({ item }) => <ReportCard report={item} onPress={onPressReport} selected={isTablet && item.id === selected?.id} />}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={
        list.fromCache && online !== false ? (
          <CachedNotice savedAt={list.savedAt} message={list.error?.message} style={{ marginBottom: 12 }} />
        ) : undefined
      }
      ListEmptyComponent={empty}
      ListFooterComponent={
        list.loadingMore ? (
          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
            <Spinner size="sm" />
          </View>
        ) : undefined
      }
      contentContainerStyle={{ paddingTop: 4, paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
      onEndReached={list.hasMore ? list.loadMore : undefined}
      onEndReachedThreshold={0.4}
      refreshControl={
        <RefreshControl
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          tintColor={colors.brand}
          colors={[colors.brand]}
          progressBackgroundColor={colors.card}
          title="Actualizando…"
          titleColor={colors.muted}
        />
      }
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    />
  );

  if (!isTablet) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Reportes de servicio" />
        {controls}
        {listView}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
      <View style={{ width: '40%', borderRightWidth: 1, borderRightColor: colors.line, backgroundColor: colors.bg }}>
        <View
          style={{
            paddingTop: insets.top + 22,
            paddingHorizontal: 20,
            paddingBottom: 4,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <Text size={22} weight="bold" style={{ flex: 1, letterSpacing: -0.22 }} numberOfLines={1} accessibilityRole="header">
            Reportes de servicio
          </Text>
          <Button title="Nuevo" icon="add" size="sm" block={false} onPress={newReport} style={{ borderRadius: 10 }} />
        </View>
        {controls}
        {listView}
      </View>
      <View style={{ flex: 1 }}>
        {selected ? (
          <ReportDetail key={selected.id} id={selected.id} initialFolio={selected.folio} variant="pane" />
        ) : (
          <View style={{ flex: 1, paddingTop: insets.top }}>
            <EmptyState
              icon="description"
              title={list.loading ? 'Cargando reportes…' : 'Selecciona un reporte'}
              text={list.loading ? undefined : 'El detalle aparecerá aquí.'}
            />
          </View>
        )}
      </View>
    </View>
  );
}

function Separator() {
  return <View style={{ height: 12 }} />;
}
