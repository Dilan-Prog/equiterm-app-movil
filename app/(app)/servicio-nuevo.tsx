import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { useOutbox } from '../../src/context/OutboxContext';
import { useKnownOptions, type CustomerOption, type TechnicianOption } from '../../src/features/agenda/form/options';
import { PickerField } from '../../src/features/agenda/form/PickerField';
import { CustomerPickerSheet, DatePickerSheet, TimePickerSheet } from '../../src/features/agenda/form/Pickers';
import { SERVICE_TYPES, enqueueService, type ServiceType } from '../../src/features/agenda/form/schedule';
import { TechnicianGrid } from '../../src/features/agenda/form/TechnicianGrid';
import { addDays, formatShortDate, startOfDay } from '../../src/features/agenda/utils';
import { useResponsive } from '../../src/hooks/useResponsive';
import { boxShadow, useTheme } from '../../src/theme';
import { Button, ConfirmDialog, Header, IconButton, LabeledField, OptionChip, Screen, ScreenFooter, Text, useToast } from '../../src/ui';

/**
 * Programar servicio (1k / 3h). Pantalla completa en teléfono; modal centrado
 * de 620 en tablet (la ruta se presenta como `transparentModal`).
 * El servidor aún no tiene `POST /servicios`: se guarda en la bandeja de salida.
 */
export default function ServicioNuevoScreen() {
  const { colors } = useTheme();
  const { isTablet } = useResponsive();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { user } = useAuth();
  const outbox = useOutbox();
  const { customers, technicians } = useKnownOptions(user);

  const [customer, setCustomer] = useState<CustomerOption | null>(null);
  const [serviceType, setServiceType] = useState<ServiceType>('Preventivo');
  const [date, setDate] = useState(() => addDays(new Date(), 1));
  const [time, setTime] = useState('09:00');
  const [technician, setTechnician] = useState<TechnicianOption | null>(null);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [picker, setPicker] = useState<'customer' | 'date' | 'time' | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const dirty = !!customer || !!technician || !!address.trim() || !!notes.trim();
  const customerError = submitted && !customer ? 'Elige o escribe el cliente.' : null;
  const techOptions = useMemo(() => technicians, [technicians]);

  const close = () => (router.canGoBack() ? router.back() : router.navigate('/agenda'));
  const requestClose = () => (dirty && !saving ? setConfirmDiscard(true) : close());

  const save = async () => {
    setSubmitted(true);
    if (!customer) return;
    setSaving(true);
    try {
      await enqueueService({ customer, serviceType, date, time, technician, address, notes });
      outbox.refresh().catch(() => undefined);
      toast.show({ kind: 'success', title: 'Servicio guardado en el teléfono', message: 'Se enviará cuando el servidor lo permita.' });
      close();
    } catch (e) {
      toast.show({
        kind: 'error',
        title: 'No se pudo guardar el servicio',
        message: e instanceof Error ? e.message : 'Inténtalo de nuevo.',
      });
    } finally {
      setSaving(false);
    }
  };

  const form = (
    <View style={{ gap: 20 }}>
      <LabeledField label="Cliente" error={customerError}>
        <PickerField
          icon="apartment"
          value={customer?.name}
          placeholder="Selecciona un cliente"
          invalid={!!customerError}
          accessibilityLabel="Cliente"
          onPress={() => setPicker('customer')}
        />
      </LabeledField>

      <LabeledField label="Tipo de servicio">
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SERVICE_TYPES.map((t) => (
            <OptionChip key={t} label={t} selected={serviceType === t} onPress={() => setServiceType(t)} />
          ))}
        </View>
      </LabeledField>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <LabeledField label="Fecha" containerStyle={{ flex: 1.45 }}>
          <PickerField icon="calendar_today" value={formatShortDate(date)} trailingIcon={null} accessibilityLabel="Fecha" onPress={() => setPicker('date')} />
        </LabeledField>
        <LabeledField label="Hora" containerStyle={{ flex: 1 }}>
          <PickerField icon="schedule" value={time} trailingIcon={null} accessibilityLabel="Hora" onPress={() => setPicker('time')} />
        </LabeledField>
      </View>

      <LabeledField label="Técnico asignado" hint={techOptions.length <= 1 ? 'Aparecerán más técnicos cuando la agenda se sincronice.' : undefined}>
        <TechnicianGrid options={techOptions} value={technician} onChange={setTechnician} />
      </LabeledField>

      <LabeledField
        label="Dirección"
        value={address}
        onChangeText={setAddress}
        placeholder="Calle, número, colonia, ciudad"
        multiline
        inputStyle={{ minHeight: 70 }}
        style={{ minHeight: 74 }}
      />

      <LabeledField
        label="Notas"
        value={notes}
        onChangeText={setNotes}
        placeholder="Equipo, falla reportada, contacto en sitio…"
        multiline
      />

      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: 10, backgroundColor: colors.infoBg }}>
        <Text size={13} color="info" style={{ flex: 1, lineHeight: 18 }}>
          Se guardará en el teléfono y se enviará cuando el servidor permita programar servicios desde la app.
        </Text>
      </View>
    </View>
  );

  const footerButtons = (
    <>
      <Button title="Cancelar" variant="secondary" onPress={requestClose} disabled={saving} style={{ flex: 1 }} />
      <Button title="Programar" onPress={save} loading={saving} loadingTitle="Guardando…" style={{ flex: 1 }} />
    </>
  );

  const sheets = (
    <>
      <CustomerPickerSheet
        visible={picker === 'customer'}
        options={customers}
        value={customer}
        onChange={(c) => {
          setCustomer(c);
          if (c.address && !address.trim()) setAddress(c.address);
        }}
        onClose={() => setPicker(null)}
      />
      <DatePickerSheet visible={picker === 'date'} value={date} minDate={startOfDay(new Date())} onChange={setDate} onClose={() => setPicker(null)} />
      <TimePickerSheet visible={picker === 'time'} value={time} onChange={setTime} onClose={() => setPicker(null)} />
      <ConfirmDialog
        visible={confirmDiscard}
        title="¿Descartar servicio?"
        message="Se perderán los datos que capturaste."
        icon="delete"
        confirmLabel="Descartar"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          close();
        }}
      />
    </>
  );

  if (isTablet) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={requestClose} accessibilityLabel="Cerrar" />
        <View
          accessibilityViewIsModal
          style={{
            width: '100%',
            maxWidth: 620,
            maxHeight: '100%',
            backgroundColor: colors.card,
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: boxShadow.dialog,
            marginTop: insets.top,
          }}
        >
          <View style={{ height: 60, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <IconButton icon="close" accessibilityLabel="Cerrar" onPress={requestClose} />
            <Text variant="title3" accessibilityRole="header">
              Programar servicio
            </Text>
          </View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            {form}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 10, padding: 16, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: colors.line }}>{footerButtons}</View>
        </View>
        {sheets}
      </View>
    );
  }

  return (
    <Screen
      header={<Header variant="compact" title="Programar servicio" alignLeft backIcon="close" onBack={requestClose} />}
      footer={<ScreenFooter>{footerButtons}</ScreenFooter>}
      maxWidth={760}
    >
      {form}
      {sheets}
    </Screen>
  );
}
