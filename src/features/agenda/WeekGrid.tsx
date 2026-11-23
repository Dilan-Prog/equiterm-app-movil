import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { customerName, parseDate, toYmd } from '../../lib/format';
import { boxShadow, fontFamily, useTheme } from '../../theme';
import { IconButton, Text, statusTone, toneColors } from '../../ui';
import { AgendaServiceCard } from './AgendaServiceCard';
import type { AgendaService } from './types';
import { WEEKDAYS, WEEKDAYS_SHORT, MONTHS, addDays, durationMinutes, pad2, sameDay, startOfDay, timeOf } from './utils';

const HOUR_H = 56;
const GUTTER = 60;
const DEFAULT_START = 8;
const DEFAULT_END = 19; // última línea 18:00

interface Placed {
  s: AgendaService;
  top: number;
  height: number;
  lane: number;
  lanes: number;
}

/** Coloca los servicios del día en carriles para que no se encimen. */
function layoutDay(items: AgendaService[], startHour: number): Placed[] {
  const evs = items
    .map((s) => {
      const d = parseDate(s.scheduled_at);
      const startMin = d && timeOf(s.scheduled_at) ? d.getHours() * 60 + d.getMinutes() : startHour * 60;
      const dur = durationMinutes(s.estimated_duration) ?? 60;
      return { s, start: startMin, end: startMin + Math.max(dur, 45) };
    })
    .sort((a, b) => a.start - b.start);
  const out: Placed[] = [];
  let cluster: { e: (typeof evs)[number]; lane: number }[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1));
    for (const c of cluster) {
      out.push({
        s: c.e.s,
        top: ((c.e.start - startHour * 60) / 60) * HOUR_H,
        height: Math.max(((c.e.end - c.e.start) / 60) * HOUR_H - 4, 44),
        lane: c.lane,
        lanes,
      });
    }
    cluster = [];
  };
  for (const e of evs) {
    if (cluster.length && e.start >= clusterEnd) flush();
    const laneEnds: number[] = [];
    for (const c of cluster) laneEnds[c.lane] = Math.max(laneEnds[c.lane] ?? 0, c.e.end);
    let lane = laneEnds.findIndex((end) => end <= e.start);
    if (lane === -1) lane = laneEnds.length;
    cluster.push({ e, lane });
    clusterEnd = Math.max(clusterEnd, e.end);
  }
  if (cluster.length) flush();
  return out;
}

export interface WeekGridProps {
  weekStart: Date;
  services: AgendaService[];
  refreshing: boolean;
  onRefresh: () => void;
  canCreateReport?: boolean;
  /** Espacio libre al final (FAB). */
  bottomInset?: number;
}

/**
 * Vista de semana en columnas (tablet): lun–sáb (domingo sólo si tiene servicios),
 * horas 08:00–18:00 (se amplía si hay servicios fuera), bloques por estado,
 * línea de la hora actual y tarjeta de detalle del servicio seleccionado.
 */
export function WeekGrid({ weekStart, services, refreshing, onRefresh, canCreateReport, bottomInset = 0 }: WeekGridProps) {
  const { colors, isDark } = useTheme();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => setSelectedId(null), [weekStart]);

  const { days, byDay, startHour, endHour } = useMemo(() => {
    const map = new Map<string, AgendaService[]>();
    let minH = DEFAULT_START;
    let maxH = DEFAULT_END;
    for (const s of services) {
      const d = parseDate(s.scheduled_at);
      if (!d) continue;
      const key = toYmd(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
      if (timeOf(s.scheduled_at)) {
        minH = Math.min(minH, d.getHours());
        const end = d.getHours() + Math.ceil(((durationMinutes(s.estimated_duration) ?? 60) + d.getMinutes()) / 60);
        maxH = Math.max(maxH, Math.min(24, end + 1));
      }
    }
    const sunday = addDays(weekStart, 6);
    const n = map.has(toYmd(sunday)) ? 7 : 6;
    return { days: Array.from({ length: n }, (_, i) => addDays(weekStart, i)), byDay: map, startHour: minH, endHour: maxH };
  }, [services, weekStart]);

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const today = startOfDay(now);
  const selected = selectedId != null ? services.find((s) => s.id === selectedId) : undefined;
  const nowTop = ((now.getHours() * 60 + now.getMinutes() - startHour * 60) / 60) * HOUR_H;
  const showNow = nowTop >= 0 && nowTop <= hours.length * HOUR_H;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 12, overflow: 'hidden' }}>
        {/* Encabezado de días */}
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line }}>
          <View style={{ width: GUTTER }} />
          {days.map((d) => {
            const isToday = sameDay(d, today);
            return (
              <View
                key={toYmd(d)}
                accessibilityRole="header"
                accessibilityLabel={`${WEEKDAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}${isToday ? ', hoy' : ''}`}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 10, gap: 4, borderLeftWidth: 1, borderLeftColor: colors.line }}
              >
                <Text size={12} style={{ fontFamily: fontFamily.semibold, letterSpacing: 0.4 }} color={isToday ? 'brandInk' : 'muted'}>
                  {WEEKDAYS_SHORT[d.getDay()]}
                </Text>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isToday ? colors.brand : 'transparent',
                  }}
                >
                  <Text size={18} style={{ fontFamily: fontFamily.bold, color: isToday ? colors.onBrand : colors.ink }} tabular>
                    {d.getDate()}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Cuadrícula de horas */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: (selected ? 240 : 0) + bottomInset }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />}
        >
          <View style={{ flexDirection: 'row', height: hours.length * HOUR_H }}>
            <View style={{ width: GUTTER }}>
              {hours.map((h, i) => (
                <Text
                  key={h}
                  size={12}
                  color="muted"
                  tabular
                  style={{ position: 'absolute', top: i * HOUR_H + 4, right: 10, fontFamily: fontFamily.medium }}
                >
                  {pad2(h)}:00
                </Text>
              ))}
            </View>
            {days.map((d) => {
              const key = toYmd(d);
              const placed = layoutDay(byDay.get(key) ?? [], startHour);
              const isToday = sameDay(d, today);
              return (
                <View key={key} style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: colors.line }}>
                  {hours.map((h, i) => (
                    <View key={h} style={{ position: 'absolute', top: i * HOUR_H, left: 0, right: 0, height: 1, backgroundColor: colors.line }} />
                  ))}
                  {placed.map((p) => (
                    <EventBlock
                      key={p.s.id}
                      placed={p}
                      selected={p.s.id === selectedId}
                      onPress={() => setSelectedId((cur) => (cur === p.s.id ? null : p.s.id))}
                    />
                  ))}
                  {isToday && showNow ? (
                    <View pointerEvents="none" style={{ position: 'absolute', top: nowTop - 1, left: 0, right: 0, height: 2, backgroundColor: colors.brand }}>
                      <View style={{ position: 'absolute', left: -5, top: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand }} />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {selected ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: 400,
            maxWidth: '70%',
            borderRadius: 12,
            boxShadow: isDark ? boxShadow.smDark : boxShadow.lg,
          }}
        >
          <AgendaServiceCard service={selected} canCreateReport={canCreateReport} />
          <IconButton
            icon="close"
            variant="soft"
            accessibilityLabel="Cerrar detalle"
            iconSize={20}
            onPress={() => setSelectedId(null)}
            style={{ position: 'absolute', top: -20, right: -12, width: 36, height: 36, borderWidth: 1, borderColor: colors.line }}
          />
        </View>
      ) : null}
    </View>
  );
}

function EventBlock({ placed, selected, onPress }: { placed: Placed; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const { s, top, height, lane, lanes } = placed;
  const tone = statusTone(s.status ?? s.status_label).tone;
  const neutral = tone === 'neutral' || tone === 'brand';
  const c = toneColors(tone, colors);
  const bg = neutral ? colors.soft : c.bg;
  const timeColor = neutral ? colors.ink2 : c.fg;
  const name = customerName(s.customer) || s.title || `Servicio #${s.id}`;
  const desc = customerName(s.customer) ? s.title || s.description : s.description;
  const time = timeOf(s.scheduled_at);
  const widthPct = 100 / lanes;
  const lines = Math.max(1, Math.floor((height - 44) / 14));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${time ? `${time}, ` : ''}${name}${s.status_label ? `, ${s.status_label}` : ''}`}
      style={({ pressed }) => ({
        position: 'absolute',
        top: top + 2,
        height,
        left: `${lane * widthPct}%`,
        width: `${widthPct}%`,
        paddingHorizontal: 4,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          flex: 1,
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 6,
          backgroundColor: bg,
          borderWidth: selected ? 1.5 : 0,
          borderColor: colors.brand,
          overflow: 'hidden',
        }}
      >
        {time ? (
          <Text size={12} style={{ fontFamily: fontFamily.bold, color: timeColor }} tabular>
            {time}
          </Text>
        ) : null}
        <Text size={13} style={{ fontFamily: fontFamily.semibold, lineHeight: 16 }} numberOfLines={height > 80 ? 2 : 1}>
          {name}
        </Text>
        {desc && height > 70 ? (
          <Text size={11} color="ink2" style={{ lineHeight: 14, marginTop: 1 }} numberOfLines={lines}>
            {desc}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
