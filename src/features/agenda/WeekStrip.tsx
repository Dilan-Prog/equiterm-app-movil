import React from 'react';
import { Pressable, View } from 'react-native';
import { toYmd } from '../../lib/format';
import { fontFamily, useTheme } from '../../theme';
import { IconButton, Text } from '../../ui';
import { WEEKDAYS, WEEKDAYS_SHORT, MONTHS, addDays, formatRange, sameDay, startOfDay, startOfWeek } from './utils';

export interface WeekNavProps {
  weekStart: Date;
  /** Días visibles (6 = lun–sáb, 7 = lun–dom). */
  days?: number;
  onPrev: () => void;
  onNext: () => void;
  onToday?: () => void;
  compact?: boolean;
}

/** Navegación de semana: ‹ 23 – 28 nov 2026 › (+ "Hoy" si no es la semana actual). */
export function WeekNav({ weekStart, days = 7, onPrev, onNext, onToday, compact }: WeekNavProps) {
  const isCurrent = sameDay(weekStart, startOfWeek(new Date()));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: compact ? 0 : 4 }}>
      <IconButton icon="chevron_left" accessibilityLabel="Semana anterior" onPress={onPrev} />
      <Text
        size={compact ? 15 : 16}
        weight="semibold"
        tabular
        align="center"
        style={compact ? { flex: 1 } : { minWidth: 150 }}
        accessibilityLiveRegion="polite"
      >
        {formatRange(weekStart, addDays(weekStart, days - 1))}
      </Text>
      <IconButton icon="chevron_right" accessibilityLabel="Semana siguiente" onPress={onNext} />
      {onToday && !isCurrent ? (
        <Pressable
          onPress={onToday}
          accessibilityRole="button"
          accessibilityLabel="Ir a hoy"
          style={({ pressed }) => ({ height: 48, paddingHorizontal: 10, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
        >
          <Text size={15} weight="semibold" color="brandInk">
            Hoy
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export interface WeekStripProps {
  weekStart: Date;
  selected: Date;
  onSelect: (d: Date) => void;
  /** Días con servicios (YYYY-MM-DD → cantidad). */
  counts: Map<string, number>;
}

/** Tira de 7 días (teléfono, vista Semana). Seleccionado = naranja; hoy = número naranja. */
export function WeekStrip({ weekStart, selected, onSelect, counts }: WeekStripProps) {
  const { colors } = useTheme();
  const today = startOfDay(new Date());
  return (
    <View style={{ flexDirection: 'row', gap: 4 }} accessibilityRole="tablist">
      {Array.from({ length: 7 }, (_, i) => {
        const d = addDays(weekStart, i);
        const sel = sameDay(d, selected);
        const isToday = sameDay(d, today);
        const n = counts.get(toYmd(d)) ?? 0;
        const fg = sel ? colors.onBrand : isToday ? colors.brandInk : colors.ink;
        return (
          <Pressable
            key={i}
            onPress={() => onSelect(d)}
            accessibilityRole="tab"
            accessibilityState={{ selected: sel }}
            accessibilityLabel={`${WEEKDAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}${isToday ? ', hoy' : ''}, ${n} ${n === 1 ? 'servicio' : 'servicios'}`}
            style={({ pressed }) => ({
              flex: 1,
              height: 68,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              backgroundColor: sel ? colors.brand : pressed ? colors.soft : colors.card,
              borderWidth: sel ? 0 : 1,
              borderColor: isToday ? colors.brand : colors.line,
            })}
          >
            <Text size={11} style={{ fontFamily: fontFamily.semibold, color: sel ? colors.onBrand : colors.muted, letterSpacing: 0.4 }}>
              {WEEKDAYS_SHORT[d.getDay()]}
            </Text>
            <Text size={18} style={{ fontFamily: fontFamily.bold, color: fg }} tabular>
              {d.getDate()}
            </Text>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: n ? (sel ? colors.onBrand : colors.brand) : 'transparent' }} />
          </Pressable>
        );
      })}
    </View>
  );
}
