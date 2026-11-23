import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { fontFamily, useTheme } from '../../../theme';
import { Button, Icon, IconButton, SearchBar, Text } from '../../../ui';
import { MONTHS, WEEKDAYS, addDays, cap, pad2, sameDay, startOfDay } from '../utils';
import type { CustomerOption } from './options';
import { Sheet } from './Sheet';

/* ------------------------------------------------------------------ */
/* Fecha                                                               */
/* ------------------------------------------------------------------ */

const DOW_HEAD = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export function DatePickerSheet({
  visible,
  value,
  minDate,
  onChange,
  onClose,
}: {
  visible: boolean;
  value: Date;
  minDate?: Date;
  onChange: (d: Date) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const [month, setMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  useEffect(() => {
    if (visible) setMonth(new Date(value.getFullYear(), value.getMonth(), 1));
  }, [visible, value]);

  const today = startOfDay(new Date());
  const min = minDate ? startOfDay(minDate) : undefined;
  const firstDow = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
  while (cells.length % 7) cells.push(null);
  const canPrev = !min || new Date(month.getFullYear(), month.getMonth(), 0) >= min;

  return (
    <Sheet visible={visible} title="Fecha del servicio" onClose={onClose}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconButton
            icon="chevron_left"
            accessibilityLabel="Mes anterior"
            disabled={!canPrev}
            onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          />
          <Text variant="title3" align="center" style={{ flex: 1 }} accessibilityLiveRegion="polite">
            {cap(MONTHS[month.getMonth()])} {month.getFullYear()}
          </Text>
          <IconButton icon="chevron_right" accessibilityLabel="Mes siguiente" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} />
        </View>
        <View style={{ flexDirection: 'row', marginTop: 4 }}>
          {DOW_HEAD.map((d, i) => (
            <Text key={i} size={12} color="muted" align="center" style={{ flex: 1, fontFamily: fontFamily.semibold }}>
              {d}
            </Text>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
          {cells.map((d, i) => {
            if (!d) return <View key={i} style={{ width: `${100 / 7}%`, height: 48 }} />;
            const sel = sameDay(d, value);
            const isToday = sameDay(d, today);
            const disabled = !!min && d < min;
            return (
              <View key={i} style={{ width: `${100 / 7}%`, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                <Pressable
                  disabled={disabled}
                  onPress={() => {
                    onChange(d);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel, disabled }}
                  accessibilityLabel={`${WEEKDAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}${isToday ? ', hoy' : ''}`}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: sel ? colors.brand : pressed ? colors.soft : 'transparent',
                    borderWidth: isToday && !sel ? 1 : 0,
                    borderColor: colors.brand,
                    opacity: disabled ? 0.35 : 1,
                  })}
                >
                  <Text size={16} tabular style={{ fontFamily: sel || isToday ? fontFamily.bold : fontFamily.regular, color: sel ? colors.onBrand : isToday ? colors.brandInk : colors.ink }}>
                    {d.getDate()}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          {[
            { label: 'Hoy', d: today },
            { label: 'Mañana', d: addDays(today, 1) },
          ].map((q) => (
            <Button
              key={q.label}
              title={q.label}
              variant="secondary"
              size="sm"
              style={{ flex: 1 }}
              disabled={!!min && q.d < min}
              onPress={() => {
                onChange(q.d);
                onClose();
              }}
            />
          ))}
        </View>
      </View>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Hora                                                                */
/* ------------------------------------------------------------------ */

const SLOTS = Array.from({ length: (21 - 6) * 2 }, (_, i) => `${pad2(6 + Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`);

export function TimePickerSheet({
  visible,
  value,
  onChange,
  onClose,
}: {
  visible: boolean;
  value: string;
  onChange: (t: string) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const slots = SLOTS.includes(value) || !value ? SLOTS : [...SLOTS, value].sort();
  return (
    <Sheet visible={visible} title="Hora del servicio" subtitle="Horario de 06:00 a 20:30" onClose={onClose}>
      <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
        {slots.map((t) => {
          const sel = t === value;
          return (
            <View key={t} style={{ width: '25%', padding: 4 }}>
              <Pressable
                onPress={() => {
                  onChange(t);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={t}
                style={({ pressed }) => ({
                  height: 48,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: sel ? colors.brand : colors.line,
                  backgroundColor: sel ? colors.brandSoft : pressed ? colors.soft : colors.card,
                })}
              >
                <Text size={15} tabular style={{ fontFamily: fontFamily.semibold, color: sel ? colors.brandInk : colors.ink2 }}>
                  {t}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Cliente                                                             */
/* ------------------------------------------------------------------ */

export function CustomerPickerSheet({
  visible,
  options,
  value,
  onChange,
  onClose,
}: {
  visible: boolean;
  options: CustomerOption[];
  value?: CustomerOption | null;
  onChange: (c: CustomerOption) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const [q, setQ] = useState('');
  useEffect(() => {
    if (visible) setQ('');
  }, [visible]);
  const term = q.trim().toLowerCase();
  const filtered = useMemo(() => (term ? options.filter((o) => o.name.toLowerCase().includes(term)) : options), [options, term]);
  const exact = options.some((o) => o.name.toLowerCase() === term);
  const pick = (c: CustomerOption) => {
    onChange(c);
    onClose();
  };

  return (
    <Sheet visible={visible} title="Cliente" subtitle="Elige un cliente o escribe uno nuevo" onClose={onClose} maxHeight={0.9}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Buscar o escribir cliente" autoFocus returnKeyType="done" onSubmitEditing={() => term && !exact && pick({ name: q.trim() })} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(o, i) => `${o.id ?? o.name}-${i}`}
        keyboardShouldPersistTaps="handled"
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
        ListHeaderComponent={
          term && !exact ? (
            <Pressable
              onPress={() => pick({ name: q.trim() })}
              accessibilityRole="button"
              style={({ pressed }) => ({
                minHeight: 56,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: pressed ? colors.brandSoftPressed : colors.brandSoft,
                marginBottom: 8,
              })}
            >
              <Icon name="add_business" size={22} color="brandInk" />
              <Text size={15} weight="semibold" color="brandInk" style={{ flex: 1 }} numberOfLines={2}>
                Usar «{q.trim()}» como cliente nuevo
              </Text>
            </Pressable>
          ) : undefined
        }
        ListEmptyComponent={
          !term ? (
            <Text variant="caption" color="muted" align="center" style={{ paddingVertical: 20, paddingHorizontal: 12 }}>
              Aún no hay clientes guardados en el teléfono. Escribe el nombre del cliente.
            </Text>
          ) : undefined
        }
        renderItem={({ item }) => {
          const sel = !!value && value.name === item.name;
          return (
            <Pressable
              onPress={() => pick(item)}
              accessibilityRole="radio"
              accessibilityState={{ checked: sel }}
              style={({ pressed }) => ({
                minHeight: 60,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: sel ? colors.brandSoft : pressed ? colors.soft : 'transparent',
              })}
            >
              <Icon name="apartment" size={22} color={sel ? 'brandInk' : 'muted'} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text size={15} weight="semibold" numberOfLines={1}>
                  {item.name}
                </Text>
                {item.address ? (
                  <Text variant="caption" color="muted" numberOfLines={1}>
                    {item.address}
                  </Text>
                ) : null}
              </View>
              {sel ? <Icon name="check" size={22} color="brandInk" /> : null}
            </Pressable>
          );
        }}
      />
    </Sheet>
  );
}
