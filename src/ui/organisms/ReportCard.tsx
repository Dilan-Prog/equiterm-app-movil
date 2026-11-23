import React, { memo } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReportSummary } from '../../api/types';
import { customerName, formatDate, formatTime, personName } from '../../lib/format';
import { focusRing, fontFamily, useTheme } from '../../theme';
import { Icon } from '../atoms/Icon';
import { StatusChip } from '../atoms/StatusChip';
import { Text } from '../atoms/Text';

export interface ReportCardProps {
  report: ReportSummary;
  onPress?: (r: ReportSummary) => void;
  /** Seleccionada en tablet: borde brand + anillo brandSoft. */
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}

function contactOf(c: ReportSummary['customer']): string {
  if (!c || typeof c !== 'object') return '';
  return c.company && c.name && c.company !== c.name ? c.name : '';
}

/**
 * Tarjeta de reporte (O·04): folio + chip de estado (+ ícono de firma) ·
 * empresa 16/600 · contacto 14 muted · metadatos con ícono 17 (técnico, fecha).
 */
export const ReportCard = memo(function ReportCard({ report, onPress, selected, style }: ReportCardProps) {
  const { colors, cardShadow } = useTheme();
  const company = (report.customer && typeof report.customer === 'object' && (report.customer.company || report.customer.name)) || customerName(report.customer);
  const contact = contactOf(report.customer);
  const tech = personName(report.technician);
  const date = formatDate(report.service_date, '');
  const time = formatTime(report.service_date);
  return (
    <Pressable
      onPress={onPress ? () => onPress(report) : undefined}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [
        {
          padding: 16,
          gap: 8,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: selected ? colors.brand : colors.line,
          backgroundColor: pressed ? colors.soft : colors.card,
          boxShadow: selected ? focusRing(colors.brandSoft) : cardShadow,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text size={13} color="muted" style={{ flex: 1, fontFamily: fontFamily.semibold }} tabular numberOfLines={1}>
          {report.folio || `Reporte #${report.id}`}
        </Text>
        {report.is_signed ? <Icon name="signature" size={20} color="ok" accessibilityLabel="Firmado" /> : null}
        <StatusChip status={report.is_signed && !report.status ? 'firmado' : report.status} label={report.status_label} />
      </View>
      <View>
        <Text size={16} style={{ fontFamily: fontFamily.semibold }} numberOfLines={2}>
          {company || 'Sin cliente'}
        </Text>
        {contact ? (
          <Text size={14} color="muted" style={{ marginTop: 2 }} numberOfLines={1}>
            {contact}
          </Text>
        ) : report.service_type ? (
          <Text size={14} color="muted" style={{ marginTop: 2 }} numberOfLines={1}>
            {report.service_type}
          </Text>
        ) : null}
      </View>
      {tech || date ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4 }}>
          {tech ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon name="engineering" size={17} color="muted" />
              <Text size={13} color="ink2">
                {tech}
              </Text>
            </View>
          ) : null}
          {date ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon name="calendar_today" size={17} color="muted" />
              <Text size={13} color="ink2">
                {time ? `${date} · ${time}` : date}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
});
