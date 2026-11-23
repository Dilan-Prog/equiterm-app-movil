import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, SectionList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CachedNotice } from '../../../src/components/CachedNotice';
import { useAuth } from '../../../src/context/AuthContext';
import { agendaCacheKeys, fetchAgenda } from '../../../src/features/agenda/api';
import { AgendaServiceCard } from '../../../src/features/agenda/AgendaServiceCard';
import { AgendaError, AgendaSkeleton, DayHeader } from '../../../src/features/agenda/components';
import type { AgendaService, AgendaView } from '../../../src/features/agenda/types';
import { addDays, dayHeading, groupByDay, startOfDay, startOfWeek } from '../../../src/features/agenda/utils';
import { WeekGrid } from '../../../src/features/agenda/WeekGrid';
import { WeekNav, WeekStrip } from '../../../src/features/agenda/WeekStrip';
import { useCachedFetch } from '../../../src/hooks/useCachedFetch';
import { useResponsive } from '../../../src/hooks/useResponsive';
import { toYmd } from '../../../src/lib/format';
import { boxShadow, useTheme } from '../../../src/theme';
import { Button, EmptyState, Header, SegmentedControl, Text, type SegmentOption } from '../../../src/ui';

const LIST_DAYS = 14;

const VIEW_OPTIONS: SegmentOption<AgendaView>[] = [
  { value: 'list', label: 'Lista', icon: 'view_agenda' },
  { value: 'week', label: 'Semana', icon: 'calendar_view_week' },
];

const goSchedule = () => router.push('/servicio-nuevo');

/**
 * Agenda de servicios.
 * - Teléfono: Lista (próximos 14 días agrupados Hoy/Mañana/fecha) o Semana (tira de 7 días + lista del día).
 * - Tablet: Semana en columnas (default) o Lista; botón flotante "Programar servicio".
 * Deslizar para actualizar, caché sin conexión y 403 → sin acceso.
 */
export default function AgendaScreen() {
  const { colors } = useTheme();
  const { isTablet } = useResponsive();
  const insets = useSafeAreaInsets();
  const { can, user } = useAuth();
  const [view, setView] = useState<AgendaView>(isTablet ? 'week' : 'list');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  // "Crear reporte" sólo si el rol puede crear reportes (sin mapa de permisos no se bloquea).
  const noPerms = !user?.permissions || Object.keys(user.permissions).length === 0;
  const canCreateReport = noPerms || can('service-reports', 'create') || can('service-reports', 'view');

  const range = useMemo(() => {
    if (view === 'week') return { from: toYmd(weekStart), to: toYmd(addDays(weekStart, 6)), key: agendaCacheKeys.week(toYmd(weekStart)) };
    const today = startOfDay(new Date());
    return { from: toYmd(today), to: toYmd(addDays(today, LIST_DAYS)), key: agendaCacheKeys.list };
  }, [view, weekStart]);

  const fetcher = useCallback(() => fetchAgenda(range.from, range.to), [range.from, range.to]);
  const { data, loading, refreshing, error, fromCache, savedAt, refresh, reload } = useCachedFetch<AgendaService[]>(range.key, fetcher);

  const groups = useMemo(() => groupByDay(data ?? []), [data]);

  const changeWeek = (delta: number) => {
    const next = addDays(weekStart, delta * 7);
    setWeekStart(next);
    // Conserva el día de la semana seleccionado.
    const dow = (selectedDay.getDay() + 6) % 7;
    setSelectedDay(addDays(next, dow));
  };
  const goToday = () => {
    setWeekStart(startOfWeek(new Date()));
    setSelectedDay(startOfDay(new Date()));
  };

  const notice = fromCache ? <CachedNotice savedAt={savedAt} message={error?.message} style={{ marginTop: 12 }} /> : undefined;
  const refreshControl = <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />;
  const pad = isTablet ? 24 : 16;
  const fabSpace = isTablet ? 96 : 24;

  /* ------------------------------- Cuerpo ------------------------------- */
  let body: React.ReactNode;
  if (!data && loading) {
    body = (
      <ScrollView contentContainerStyle={{ padding: pad, paddingTop: 0 }} scrollEnabled={false}>
        <AgendaSkeleton />
      </ScrollView>
    );
  } else if (!data) {
    body = <AgendaError error={error} onRetry={reload} />;
  } else if (view === 'list') {
    const sections = [...groups.entries()]
      .sort(([a], [b]) => (a === 'sin-fecha' ? 1 : b === 'sin-fecha' ? -1 : a.localeCompare(b)))
      .map(([key, items]) => ({ key, data: items }));
    body = (
      <SectionList
        sections={sections}
        keyExtractor={(it) => String(it.id)}
        stickySectionHeadersEnabled
        refreshControl={refreshControl}
        contentContainerStyle={{ paddingHorizontal: pad, paddingBottom: fabSpace + 16, maxWidth: 820, width: '100%', alignSelf: 'center', flexGrow: 1 }}
        ListHeaderComponent={notice}
        ListEmptyComponent={
          <EmptyState
            icon="event"
            title="Sin servicios programados"
            text={`No hay servicios en los próximos ${LIST_DAYS} días.`}
            action={{ label: 'Programar servicio', icon: 'calendar_add_on', onPress: goSchedule }}
          />
        }
        renderSectionHeader={({ section }) => <DayHeader ymd={section.key} count={section.data.length} />}
        renderItem={({ item }) => <AgendaServiceCard service={item} canCreateReport={canCreateReport} style={{ marginBottom: 12 }} />}
      />
    );
  } else if (isTablet) {
    body = (
      <View style={{ flex: 1, paddingHorizontal: pad, paddingBottom: pad }}>
        {notice ? <View style={{ marginTop: -12, marginBottom: 12 }}>{notice}</View> : null}
        <WeekGrid
          weekStart={weekStart}
          services={data}
          refreshing={refreshing}
          onRefresh={refresh}
          canCreateReport={canCreateReport}
          bottomInset={fabSpace}
        />
      </View>
    );
  } else {
    const dayKey = toYmd(selectedDay);
    const dayItems = groups.get(dayKey) ?? [];
    const counts = new Map([...groups.entries()].map(([k, v]) => [k, v.length]));
    const h = dayHeading(dayKey);
    body = (
      <ScrollView refreshControl={refreshControl} contentContainerStyle={{ padding: pad, paddingTop: 4, paddingBottom: 32, flexGrow: 1 }}>
        {notice ? <View style={{ marginTop: -8, marginBottom: 8 }}>{notice}</View> : null}
        <WeekNav weekStart={weekStart} onPrev={() => changeWeek(-1)} onNext={() => changeWeek(1)} onToday={goToday} compact />
        <WeekStrip weekStart={weekStart} selected={selectedDay} onSelect={setSelectedDay} counts={counts} />
        <DayHeader ymd={dayKey} count={dayItems.length} style={{ paddingTop: 18 }} />
        {dayItems.length ? (
          <View style={{ gap: 12 }}>
            {dayItems.map((s) => (
              <AgendaServiceCard key={s.id} service={s} canCreateReport={canCreateReport} />
            ))}
          </View>
        ) : (
          <EmptyState
            fill
            icon="event_available"
            title="Sin servicios este día"
            text={`No hay servicios programados para ${h.title === 'Hoy' || h.title === 'Mañana' ? h.title.toLowerCase() : h.subtitle ? `el ${h.subtitle}` : 'este día'}.`}
          />
        )}
      </ScrollView>
    );
  }

  /* ------------------------------ Encabezado ----------------------------- */
  const header = isTablet ? (
    <View style={{ paddingTop: insets.top + 20, paddingHorizontal: pad, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <Text variant="title1" accessibilityRole="header" style={{ flex: 1 }} numberOfLines={1}>
        Agenda de servicios
      </Text>
      {view === 'week' ? <WeekNav weekStart={weekStart} days={6} onPrev={() => changeWeek(-1)} onNext={() => changeWeek(1)} onToday={goToday} /> : null}
      <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={setView} style={{ width: 220 }} />
    </View>
  ) : (
    <Header title="Agenda" action={{ label: 'Programar', icon: 'calendar_add_on', onPress: goSchedule }}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={setView} />
      </View>
    </Header>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {header}
      {body}
      {isTablet ? (
        <Button
          title="Programar servicio"
          icon="add"
          size="lg"
          block={false}
          onPress={goSchedule}
          style={{ position: 'absolute', right: 24, bottom: insets.bottom + 24, borderRadius: 16, paddingHorizontal: 22, boxShadow: boxShadow.fab }}
        />
      ) : null}
    </View>
  );
}
