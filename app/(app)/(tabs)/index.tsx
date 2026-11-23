import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { api } from '../../../src/api/client';
import type { Paginated, ReportSummary, ServiceItem } from '../../../src/api/types';
import { useAuth } from '../../../src/context/AuthContext';
import { useOutbox } from '../../../src/context/OutboxContext';
import { useCachedFetch } from '../../../src/hooks/useCachedFetch';
import { useResponsive } from '../../../src/hooks/useResponsive';
import { cacheKeys } from '../../../src/lib/cache';
import { customerName, formatTime, toYmd } from '../../../src/lib/format';
import { fontFamily, useTheme } from '../../../src/theme';
import {
  AccessCard,
  Avatar,
  Icon,
  Screen,
  Skeleton,
  StatusChip,
  Text,
  roleTone,
  useToast,
  type IconName,
} from '../../../src/ui';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "Lunes 23 de noviembre" (es-MX, sin depender de Intl). */
function longDate(d: Date) {
  return `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

function greeting(d: Date) {
  const h = d.getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Inicio (pantallas 1b / 3b / 4b). */
export default function HomeScreen() {
  const { user, can, refreshUser } = useAuth();
  const { colors, cardShadow, isDark } = useTheme();
  const r = useResponsive();
  const toast = useToast();
  const { pendingCount, refresh: refreshOutbox } = useOutbox();
  const [now] = useState(() => new Date());
  const today = toYmd(now);
  const canReports = can('service-reports', 'view');

  const reportsFetcher = useCallback(() => api.reports({ page: 1, per_page: 50 }), []);
  const reports = useCachedFetch<Paginated<ReportSummary>>(canReports ? cacheKeys.homeReports : null, reportsFetcher);
  const servicesFetcher = useCallback(() => api.services({ from: today, to: today }), [today]);
  const services = useCachedFetch<ServiceItem[]>(cacheKeys.agendaToday(today), servicesFetcher);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshUser().catch(() => undefined), canReports ? reports.refresh() : null, services.refresh(), refreshOutbox()]);
    } finally {
      setRefreshing(false);
    }
  };

  const firstName = (user?.name ?? '').trim().split(/\s+/)[0] || 'Usuario';
  const roleName = user?.role?.name || (user?.is_admin ? 'Administrador' : 'Sin rol asignado');
  const tone = roleTone(roleName, user?.is_admin);

  // Reportes
  const reportList = reports.data?.data ?? [];
  const reportTotal = reports.data ? Number(reports.data.meta?.total ?? reportList.length) : null;
  const hasSignField = reportList.some((x) => typeof x.is_signed === 'boolean');
  const unsigned = reportList.filter((x) => x.is_signed === false);
  const reportsSub = !canReports
    ? 'Sin permiso'
    : reportTotal === null
      ? reports.error
        ? 'Sin datos'
        : undefined
      : [plural(reportTotal, 'reporte', 'reportes'), hasSignField ? `${unsigned.length} por firmar` : null].filter(Boolean).join(' · ');

  // Agenda
  const todayServices = [...(services.data ?? [])].sort((a, b) => String(a.scheduled_at ?? '').localeCompare(String(b.scheduled_at ?? '')));
  const agendaSub = services.data
    ? plural(todayServices.length, 'servicio hoy', 'servicios hoy')
    : services.error?.status === 403
      ? 'Sin permiso'
      : services.error
        ? 'Sin datos'
        : undefined;

  const isAdmin = !!user?.is_admin;
  const cols = r.isTablet ? 4 : 2;

  return (
    <Screen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />}
      contentStyle={{ paddingBottom: 28 }}
    >
      <View style={{ gap: 26 }}>
        {/* Saludo */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ gap: 6, flex: 1 }}>
            <Text size={14} color="muted" style={{ fontFamily: fontFamily.medium }}>
              {longDate(now)}
            </Text>
            <Text variant="display" accessibilityRole="header">
              {greeting(now)}, {firstName}
            </Text>
            <StatusChip label={roleName} tone={tone} dot={false} icon={tone === 'brand' ? 'shield_person' : undefined} size="md" />
          </View>
          {!r.isTablet ? <Avatar name={user?.name} size={48} color={colors.brand} onPress={() => router.navigate('/perfil')} /> : null}
        </View>

        {/* Nuevo reporte */}
        <Pressable
          onPress={() => router.push('/reporte-nuevo')}
          accessibilityRole="button"
          accessibilityLabel="Nuevo reporte. Registra un servicio aunque no tengas internet."
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            padding: 18,
            borderRadius: 12,
            backgroundColor: pressed ? colors.inversePressed : colors.inverse,
            borderWidth: 1,
            borderColor: isDark ? colors.line : colors.inverse,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <View style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="note_add" size={28} color="#ffffff" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text size={18} style={{ fontFamily: fontFamily.bold, color: '#ffffff' }}>
              Nuevo reporte
            </Text>
            <Text size={14} style={{ color: colors.onInverseMuted, marginTop: 2, lineHeight: 19.6 }}>
              Registra un servicio aunque no tengas internet.
            </Text>
          </View>
          <Icon name="arrow_forward" size={24} color={colors.brand} />
        </Pressable>

        {/* Accesos */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {[
            <AccessCard
              key="reportes"
              icon="description"
              title="Reportes de servicio"
              subtitle={reportsSub}
              loading={canReports && reports.loading && !reports.data}
              locked={!canReports}
              onPress={() => (canReports ? router.navigate('/reportes') : toast.show({ kind: 'error', title: 'Sin permiso', message: 'Tu rol no tiene acceso a Reportes de servicio.' }))}
            />,
            <AccessCard
              key="agenda"
              icon="calendar_month"
              title="Agenda de servicios"
              subtitle={agendaSub}
              loading={services.loading && !services.data}
              onPress={() => router.navigate('/agenda')}
            />,
            <AccessCard
              key="bandeja"
              icon="outbox"
              title="Bandeja de salida"
              subtitle={pendingCount ? `${pendingCount} ${pendingCount === 1 ? 'pendiente' : 'pendientes'} por enviar` : 'Todo enviado'}
              badge={pendingCount}
              onPress={() => router.navigate('/bandeja')}
            />,
            <AccessCard
              key="usuarios"
              icon="group"
              title="Usuarios y roles"
              subtitle={isAdmin ? 'Administra accesos' : 'Solo administradores'}
              locked={!isAdmin}
              onPress={() =>
                isAdmin
                  ? router.navigate('/usuarios')
                  : toast.show({ kind: 'error', title: 'Solo administradores', message: 'Pide acceso a un administrador.' })
              }
            />,
          ].map((card) => (
            <View key={card.key} style={{ width: cols === 4 ? '23.5%' : '48.2%', flexGrow: 1 }}>
              {card}
            </View>
          ))}
        </View>

        {/* Resumen del día */}
        <View style={{ gap: 12 }}>
          <Text variant="title2" accessibilityRole="header">
            Resumen del día
          </Text>
          <View style={{ flexDirection: r.isTablet ? 'row' : 'column', gap: 12, alignItems: 'flex-start' }}>
            <SummaryCard
              icon="event"
              iconColor={colors.info}
              title="Servicios de hoy"
              count={services.data ? todayServices.length : undefined}
              loading={services.loading && !services.data}
              empty={services.error && !services.data ? 'No se pudo cargar la agenda.' : 'Sin servicios programados hoy.'}
              cardShadow={cardShadow}
            >
              {todayServices.slice(0, 4).map((s) => (
                <SummaryRow key={s.id} onPress={() => router.navigate('/agenda')}>
                  <Text size={15} style={{ fontFamily: fontFamily.bold, width: 48 }} tabular>
                    {formatTime(s.scheduled_at) || '—'}
                  </Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text size={15} style={{ fontFamily: fontFamily.semibold }} numberOfLines={1}>
                      {customerName(s.customer) || s.title || `Servicio #${s.id}`}
                    </Text>
                    {customerName(s.customer) && s.title ? (
                      <Text size={13} color="muted" numberOfLines={1}>
                        {s.title}
                      </Text>
                    ) : null}
                  </View>
                  <StatusChip status={s.status} label={s.status_label} />
                </SummaryRow>
              ))}
            </SummaryCard>
            {canReports && hasSignField ? (
              <SummaryCard
                icon="signature"
                iconColor={colors.warn}
                title="Pendientes de firma"
                count={reports.data ? unsigned.length : undefined}
                loading={reports.loading && !reports.data}
                empty="No hay reportes pendientes de firma."
                cardShadow={cardShadow}
              >
                {unsigned.slice(0, 3).map((rep) => (
                  <SummaryRow
                    key={rep.id}
                    onPress={() => router.push({ pathname: '/reportes/[id]', params: { id: String(rep.id), folio: rep.folio ?? '' } })}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text size={12} color="muted" style={{ fontFamily: fontFamily.semibold }} tabular>
                        {rep.folio || `Reporte #${rep.id}`}
                      </Text>
                      <Text size={15} style={{ fontFamily: fontFamily.semibold }} numberOfLines={1}>
                        {customerName(rep.customer) || 'Sin cliente'}
                      </Text>
                    </View>
                    <Text size={14} color="brandInk" style={{ fontFamily: fontFamily.semibold }}>
                      Recabar firma
                    </Text>
                    <Icon name="chevron_right" size={20} color="muted" />
                  </SummaryRow>
                ))}
              </SummaryCard>
            ) : null}
          </View>
        </View>
      </View>
    </Screen>
  );
}

function SummaryCard({
  icon,
  iconColor,
  title,
  count,
  loading,
  empty,
  cardShadow,
  children,
}: {
  icon: IconName;
  iconColor: string;
  title: string;
  count?: number;
  loading?: boolean;
  empty: string;
  cardShadow: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const hasRows = React.Children.count(children) > 0;
  return (
    <View
      style={{
        flex: 1,
        alignSelf: 'stretch',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: 12,
        boxShadow: cardShadow,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderBottomWidth: hasRows || loading ? 1 : 0,
          borderBottomColor: colors.line,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name={icon} size={20} color={iconColor} />
          <Text size={15} style={{ fontFamily: fontFamily.semibold }}>
            {title}
          </Text>
        </View>
        {count !== undefined ? (
          <Text size={22} style={{ fontFamily: fontFamily.bold }} tabular>
            {count}
          </Text>
        ) : null}
      </View>
      {loading ? (
        <View style={{ padding: 16, gap: 10 }}>
          <Skeleton w="80%" h={14} tone="line" />
          <Skeleton w="55%" h={12} />
        </View>
      ) : hasRows ? (
        children
      ) : (
        <Text size={14} color="muted" style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          {empty}
        </Text>
      )}
    </View>
  );
}

function SummaryRow({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        minHeight: 64,
        borderTopWidth: 1,
        borderTopColor: colors.line,
        marginTop: -1,
        backgroundColor: pressed ? colors.soft : 'transparent',
      })}
    >
      {children}
    </Pressable>
  );
}
