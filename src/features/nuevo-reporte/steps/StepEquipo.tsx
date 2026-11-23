import React from 'react';
import { View } from 'react-native';
import { LabeledField, OptionChip, Text } from '../../../ui';
import { FieldError, StepTitle } from '../components';
import { EQUIPMENT_TYPES, type DraftEquipment } from '../types';
import type { StepProps } from './StepCliente';

export function StepEquipo({ draft, update, errors }: StepProps) {
  const e = draft.equipo;
  const set = (k: keyof DraftEquipment) => (t: string) => update((d) => ({ ...d, equipo: { ...d.equipo, [k]: t } }));
  return (
    <View style={{ gap: 16 }}>
      <StepTitle>Datos del equipo</StepTitle>

      <View style={{ gap: 8 }}>
        <Text variant="label">Tipo de equipo</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Tipo de equipo">
          {EQUIPMENT_TYPES.map((t) => (
            <OptionChip key={t} label={t} selected={e.tipo === t} onPress={() => set('tipo')(t)} />
          ))}
        </View>
        <FieldError message={errors.tipo} />
      </View>

      {e.tipo === 'Otro' ? (
        <LabeledField label="¿Qué equipo es?" placeholder="Ej. Bomba de alta presión" value={e.tipoOtro} onChangeText={set('tipoOtro')} error={errors.tipoOtro} />
      ) : null}

      <LabeledField label="Marca" placeholder="Ej. Cleaver-Brooks" value={e.marca} onChangeText={set('marca')} autoCapitalize="words" />
      <LabeledField label="Modelo" placeholder="Ej. CBLE 700-150" value={e.modelo} onChangeText={set('modelo')} autoCapitalize="characters" />
      <LabeledField label="Número de serie" placeholder="Ej. L-48213" value={e.serie} onChangeText={set('serie')} autoCapitalize="characters" autoCorrect={false} />
      <LabeledField label="Capacidad" placeholder="Ej. 150" value={e.capacidad} onChangeText={set('capacidad')} unit={e.tipo === 'Caldera' || !e.tipo ? 'CC' : undefined} />
      <LabeledField label="Ubicación en planta" placeholder="Ej. Cuarto de máquinas" value={e.ubicacion} onChangeText={set('ubicacion')} />
    </View>
  );
}
