import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useResponsive } from '../../../hooks/useResponsive';
import { fontFamily, useTheme } from '../../../theme';
import { Button, Icon, LabeledField, SignaturePad, Text } from '../../../ui';
import { FieldError, StepTitle, SummaryRow } from '../components';
import type { StepProps } from './StepCliente';

export function StepFirma({ draft, update, errors, onDrawingChange }: StepProps & { onDrawingChange: (drawing: boolean) => void }) {
  const { colors } = useTheme();
  const { isTablet } = useResponsive();
  const f = draft.firma;
  const padHeight = isTablet ? 300 : 220;
  const tipoEquipo = draft.equipo.tipo === 'Otro' ? draft.equipo.tipoOtro : draft.equipo.tipo;
  const equipo = [tipoEquipo, draft.equipo.marca, draft.equipo.modelo, draft.equipo.capacidad && `${draft.equipo.capacidad}${draft.equipo.tipo === 'Caldera' ? ' CC' : ''}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={{ gap: 16 }}>
      <StepTitle>Firma del cliente</StepTitle>

      <LabeledField
        label="Nombre de quien firma"
        placeholder="Ej. Ing. Ramón Treviño"
        value={f.nombre}
        onChangeText={(t) => update((d) => ({ ...d, firma: { ...d.firma, nombre: t } }))}
        error={errors.firmaNombre}
        autoCapitalize="words"
      />

      {f.aceptada && f.path ? (
        // Firma recuperada del borrador: el pad no puede reconstruir sus trazos, se muestra la vista previa.
        <View style={{ gap: 10 }}>
          <View
            style={{ height: padHeight, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.ok, backgroundColor: colors.card, overflow: 'hidden' }}
            accessibilityLabel="Firma capturada"
          >
            <Svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${Math.max(1, Math.round(f.width))} ${Math.max(1, Math.round(f.height))}`}
              preserveAspectRatio="xMidYMid meet"
            >
              <Path d={f.path} stroke={colors.ink} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="verified" size={20} color="ok" />
            <Text size={14} color="ok" style={{ fontFamily: fontFamily.semibold, flex: 1 }}>
              Firma aceptada
            </Text>
          </View>
          <Button
            title="Firmar de nuevo"
            icon="ink_eraser"
            variant="secondary"
            onPress={() => update((d) => ({ ...d, firma: { ...d.firma, path: '', width: 0, height: 0, aceptada: false } }))}
          />
        </View>
      ) : (
        <SignaturePad
          height={padHeight}
          accepted={f.aceptada}
          onDrawingChange={onDrawingChange}
          onClear={() => update((d) => ({ ...d, firma: { ...d.firma, path: '', aceptada: false } }))}
          onAccept={(r) => update((d) => ({ ...d, firma: { ...d.firma, path: r.path, width: r.width, height: r.height, aceptada: true } }))}
        />
      )}
      <FieldError message={errors.firma} />

      <Text size={13} color="muted">
        Al firmar, el cliente confirma los trabajos descritos en este reporte.
      </Text>

      <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.card, padding: 14, gap: 2 }}>
        <Text variant="title3" style={{ marginBottom: 6 }}>
          Resumen
        </Text>
        <SummaryRow label="Cliente" value={[draft.cliente.nombre, draft.cliente.empresa].filter(Boolean).join(' · ')} />
        <SummaryRow label="Equipo" value={equipo} />
        <SummaryRow label="Serie" value={draft.equipo.serie} />
        <SummaryRow label="Servicio" value={draft.trabajo.tipoServicio} />
        <SummaryRow label="Trabajos" value={draft.trabajo.trabajos} />
        <SummaryRow
          label="Materiales"
          value={draft.trabajo.materiales.length ? `${draft.trabajo.materiales.length} ${draft.trabajo.materiales.length === 1 ? 'material' : 'materiales'}` : undefined}
        />
        <SummaryRow label="Fotos" value={draft.fotos.length ? `${draft.fotos.length} ${draft.fotos.length === 1 ? 'foto' : 'fotos'}` : 'Sin fotos'} />
      </View>
    </View>
  );
}
