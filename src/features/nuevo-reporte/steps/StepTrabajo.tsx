import React, { useState } from 'react';
import { View } from 'react-native';
import { createIdempotencyKey } from '../../../lib/outbox';
import { Button, LabeledField, OptionChip, Text } from '../../../ui';
import { FieldError, MaterialForm, MaterialList, StepTitle } from '../components';
import { SERVICE_TYPES, type DraftReadings, type DraftWork } from '../types';
import type { StepProps } from './StepCliente';

export function StepTrabajo({ draft, update, errors }: StepProps) {
  const w = draft.trabajo;
  const [adding, setAdding] = useState(false);
  const set = (k: keyof Omit<DraftWork, 'materiales' | 'lecturas'>) => (t: string) => update((d) => ({ ...d, trabajo: { ...d.trabajo, [k]: t } }));
  const setReading = (k: keyof DraftReadings) => (t: string) =>
    update((d) => ({ ...d, trabajo: { ...d.trabajo, lecturas: { ...d.trabajo.lecturas, [k]: t } } }));

  return (
    <View style={{ gap: 16 }}>
      <StepTitle>Trabajo realizado</StepTitle>

      <View style={{ gap: 8 }}>
        <Text variant="label">Tipo de servicio</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Tipo de servicio">
          {SERVICE_TYPES.map((t) => (
            <OptionChip key={t} label={t} selected={w.tipoServicio === t} onPress={() => set('tipoServicio')(t)} />
          ))}
        </View>
        <FieldError message={errors.tipoServicio} />
      </View>

      <LabeledField label="Hallazgos" placeholder="Lo que encontraste al revisar el equipo" value={w.hallazgos} onChangeText={set('hallazgos')} multiline />
      <LabeledField
        label="Trabajos realizados"
        placeholder="Actividades realizadas durante el servicio"
        value={w.trabajos}
        onChangeText={set('trabajos')}
        error={errors.trabajos}
        multiline
      />
      <LabeledField label="Recomendaciones" placeholder="Siguientes pasos para el cliente" value={w.recomendaciones} onChangeText={set('recomendaciones')} multiline />

      <View style={{ gap: 8 }}>
        <Text variant="label">Materiales</Text>
        <MaterialList
          items={w.materiales}
          onRemove={(id) => update((d) => ({ ...d, trabajo: { ...d.trabajo, materiales: d.trabajo.materiales.filter((m) => m.id !== id) } }))}
        />
        {adding ? (
          <MaterialForm
            onCancel={() => setAdding(false)}
            onAdd={(m) => {
              update((d) => ({ ...d, trabajo: { ...d.trabajo, materiales: [...d.trabajo.materiales, { ...m, id: createIdempotencyKey() }] } }));
              setAdding(false);
            }}
          />
        ) : (
          <Button title="Agregar material" icon="add" variant="ghost" block={false} onPress={() => setAdding(true)} />
        )}
      </View>

      <View style={{ gap: 12 }}>
        <Text variant="title3">Lecturas</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <LabeledField label="Presión de operación" value={w.lecturas.presion} onChangeText={setReading('presion')} unit="kg/cm²" keyboardType="decimal-pad" containerStyle={{ flex: 1 }} />
          <LabeledField label="Temperatura de chimenea" value={w.lecturas.temperatura} onChangeText={setReading('temperatura')} unit="°C" keyboardType="decimal-pad" containerStyle={{ flex: 1 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <LabeledField label="TDS en caldera" value={w.lecturas.tds} onChangeText={setReading('tds')} unit="ppm" keyboardType="decimal-pad" containerStyle={{ flex: 1 }} />
          <LabeledField label="pH" value={w.lecturas.ph} onChangeText={setReading('ph')} keyboardType="decimal-pad" containerStyle={{ flex: 1 }} />
        </View>
      </View>
    </View>
  );
}
