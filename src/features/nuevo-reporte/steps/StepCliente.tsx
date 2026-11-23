import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, LabeledField, SearchBar, Skeleton, Text } from '../../../ui';
import { searchClients } from '../clients';
import { ClientRow, FieldError, InfoBanner, StepTitle } from '../components';
import type { ClientOption, ReportDraft, StepErrors } from '../types';

export interface StepProps {
  draft: ReportDraft;
  update: (fn: (d: ReportDraft) => ReportDraft) => void;
  errors: StepErrors;
}

type Source = 'loading' | 'list' | 'unavailable' | 'offline' | 'error';

export function StepCliente({ draft, update, errors }: StepProps) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ClientOption[]>([]);
  const [source, setSource] = useState<Source>('loading');
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const reqId = useRef(0);
  const c = draft.cliente;

  useEffect(() => {
    const id = ++reqId.current;
    setSearching(true);
    const t = setTimeout(
      async () => {
        const res = await searchClients(query);
        if (id !== reqId.current) return;
        setSearching(false);
        if (res.kind === 'ok') {
          setItems(res.items);
          setSource('list');
        } else if (res.kind === 'offline') {
          setItems(res.items);
          setSource('offline');
          if (!res.items.length && !query) update((d) => (d.cliente.mode === 'manual' ? d : { ...d, cliente: { ...d.cliente, mode: 'manual', id: undefined } }));
        } else if (res.kind === 'unavailable') {
          setItems([]);
          setSource('unavailable');
          update((d) => (d.cliente.mode === 'manual' ? d : { ...d, cliente: { ...d.cliente, mode: 'manual', id: undefined } }));
        } else {
          setErrorMsg(res.message);
          setSource('error');
        }
      },
      query ? 300 : 0,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const select = (cl: ClientOption) =>
    update((d) => ({
      ...d,
      cliente: { ...d.cliente, mode: 'list', id: cl.id, nombre: cl.nombre, contacto: cl.contacto ?? '', ubicacion: cl.ubicacion ?? '', empresa: '' },
      // Prellenar quién firma con el contacto del cliente.
      firma: d.firma.nombre ? d.firma : { ...d.firma, nombre: cl.contacto ?? '' },
    }));

  const setManual = (manual: boolean) =>
    update((d) => ({ ...d, cliente: manual ? { ...d.cliente, mode: 'manual', id: undefined } : { mode: 'list', nombre: '', empresa: '', contacto: '', ubicacion: '' } }));

  const shown =
    c.mode === 'list' && c.id !== undefined && !items.some((x) => String(x.id) === String(c.id))
      ? [{ id: c.id, nombre: c.nombre, contacto: c.contacto, ubicacion: c.ubicacion }, ...items]
      : items;

  const manualHint =
    source === 'unavailable'
      ? 'El catálogo de clientes aún no está disponible en el servidor. Escribe los datos del cliente.'
      : source === 'offline'
        ? 'Sin conexión: escribe los datos del cliente o elige uno de los guardados.'
        : null;

  return (
    <View style={{ gap: 16 }}>
      <StepTitle>¿Para qué cliente es el servicio?</StepTitle>

      {c.mode === 'manual' ? (
        <>
          {manualHint ? <InfoBanner icon="info" tone="warn" text={manualHint} /> : null}
          <LabeledField
            label="Nombre del cliente"
            placeholder="Ej. Lácteos del Bajío S.A. de C.V."
            value={c.nombre}
            onChangeText={(t) => update((d) => ({ ...d, cliente: { ...d.cliente, nombre: t } }))}
            error={errors.nombre}
            autoCapitalize="words"
          />
          <LabeledField
            label="Empresa"
            hint="Opcional: razón social o planta."
            value={c.empresa}
            onChangeText={(t) => update((d) => ({ ...d, cliente: { ...d.cliente, empresa: t } }))}
            autoCapitalize="words"
          />
          <LabeledField
            label="Ubicación"
            placeholder="Ciudad, estado"
            value={c.ubicacion}
            onChangeText={(t) => update((d) => ({ ...d, cliente: { ...d.cliente, ubicacion: t } }))}
          />
          {source === 'list' || (source === 'offline' && items.length) ? (
            <Button title="Elegir de la lista de clientes" icon="list" variant="ghost" block={false} onPress={() => setManual(false)} />
          ) : null}
        </>
      ) : (
        <>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar cliente o empresa" loading={searching && source !== 'loading'} />
          {source === 'offline' ? <InfoBanner icon="cloud_off" tone="warn" text="Sin conexión: mostrando clientes guardados." /> : null}
          {source === 'error' && errorMsg ? <InfoBanner icon="error" tone="warn" text={errorMsg} /> : null}
          <FieldError message={errors.cliente} />
          <View style={{ gap: 8 }} accessibilityRole="radiogroup">
            {source === 'loading' ? (
              [0, 1, 2, 3].map((i) => <Skeleton key={i} h={64} r={12} />)
            ) : shown.length ? (
              shown.map((cl) => <ClientRow key={String(cl.id)} client={cl} selected={c.id !== undefined && String(c.id) === String(cl.id)} onPress={() => select(cl)} />)
            ) : (
              <Text size={14} color="muted" style={{ paddingVertical: 8 }}>
                {query ? `No se encontraron clientes para «${query}».` : 'No hay clientes para mostrar.'}
              </Text>
            )}
          </View>
          <Button title="¿No está en la lista? Escribir datos" icon="edit" variant="ghost" block={false} onPress={() => setManual(true)} />
        </>
      )}
    </View>
  );
}
