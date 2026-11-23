import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ServiceItem } from '../../api/types';
import { customerName, formatTime, personName } from '../../lib/format';
import { fontFamily, useTheme } from '../../theme';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { StatusChip } from '../atoms/StatusChip';
import { Text } from '../atoms/Text';

export interface ServiceCardProps {
  service: ServiceItem;
  /** Duración ("2 h", "1 h 30 min") bajo la hora. */
  duration?: string;
  /** Línea descriptiva ("Correctivo · Calentador de paso"); default: `service.title` si hay cliente. */
  description?: string;
  onPress?: () => void;
  /** Botón secundario "Cómo llegar" (se oculta si no se pasa). */
  onDirections?: () => void;
  /** Botón tonal "Crear reporte" (se oculta si no se pasa). */
  onCreateReport?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Tarjeta de servicio (O·05): hora + duración · datos + chip · 2 botones sm (secundario + tonal). */
export function ServiceCard({ service, duration, description, onPress, onDirections, onCreateReport, style }: ServiceCardProps) {
  const { colors } = useTheme();
  const customer = customerName(service.customer);
  const heading = customer || service.title || `Servicio #${service.id}`;
  const desc = description ?? (customer ? service.title : undefined);
  const tech = personName(service.technician);
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        { backgroundColor: pressed ? colors.soft : colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 16, gap: 14 },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <View style={{ width: 52 }}>
          <Text size={19} style={{ fontFamily: fontFamily.bold }} tabular>
            {formatTime(service.scheduled_at) || '—'}
          </Text>
          {duration ? (
            <Text size={12} color="muted">
              {duration}
            </Text>
          ) : null}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <Text size={16} style={{ flex: 1, fontFamily: fontFamily.semibold }} numberOfLines={2}>
              {heading}
            </Text>
            <StatusChip status={service.status} label={service.status_label} />
          </View>
          {desc ? (
            <Text size={14} color="ink2">
              {desc}
            </Text>
          ) : null}
          {service.address ? (
            <View style={{ flexDirection: 'row', gap: 5 }}>
              <Icon name="location_on" size={17} color="muted" />
              <Text size={13} color="muted" style={{ flex: 1 }}>
                {service.address}
              </Text>
            </View>
          ) : null}
          {tech ? (
            <View style={{ flexDirection: 'row', gap: 5 }}>
              <Icon name="engineering" size={17} color="muted" />
              <Text size={13} color="muted" style={{ flex: 1 }}>
                {tech}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      {onDirections || onCreateReport ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {onDirections ? <Button title="Cómo llegar" icon="directions" variant="secondary" size="sm" onPress={onDirections} style={{ flex: 1 }} /> : null}
          {onCreateReport ? <Button title="Crear reporte" icon="note_add" variant="tonal" size="sm" onPress={onCreateReport} style={{ flex: 1 }} /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}
