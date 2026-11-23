import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, View, type ScrollViewInstance } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useOutbox as useOutboxContext } from '../../context/OutboxContext';
import { useResponsive } from '../../hooks/useResponsive';
import { enqueue } from '../../lib/outbox';
import { useTheme } from '../../theme';
import { Button, ConfirmDialog, Header, ScreenFooter, SectionLoader, StepIndicator, useToast } from '../../ui';
import { InfoBanner } from './components';
import { clearDraft, loadDraft, saveDraftDebounced, saveDraftNow, writeSignatureSvg } from './draft';
import { buildReportBody, hasErrors, outboxSubtitle, validateStep } from './payload';
import { StepCliente } from './steps/StepCliente';
import { StepEquipo } from './steps/StepEquipo';
import { StepFirma } from './steps/StepFirma';
import { StepFotos } from './steps/StepFotos';
import { StepTrabajo } from './steps/StepTrabajo';
import { emptyDraft, isDraftDirty, STEP_NAMES, STEP_SHORT, type ReportDraft, type StepErrors } from './types';

const LAST = STEP_NAMES.length - 1;

/** Asistente "Nuevo reporte" (5 pasos). Funciona sin conexión: guarda en la bandeja de salida. */
export function NuevoReporteWizard() {
  const { colors } = useTheme();
  const { isTablet } = useResponsive();
  const toast = useToast();
  const { user } = useAuth();
  const outboxCtx = useOutboxContext();
  const [draft, setDraft] = useState<ReportDraft>(emptyDraft);
  const [loaded, setLoaded] = useState(false);
  const [errors, setErrors] = useState<StepErrors>({});
  const [attempted, setAttempted] = useState<Record<number, boolean>>({});
  const [confirmClose, setConfirmClose] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const finished = useRef(false);
  const step = draft.step;
  // "Crear reporte" desde la Agenda manda el cliente y el servicio.
  const params = useLocalSearchParams<{ customerName?: string; customerId?: string; serviceId?: string }>();

  // Reanudar borrador.
  useEffect(() => {
    let cancelled = false;
    loadDraft().then((d) => {
      if (cancelled) return;
      if (d && isDraftDirty(d) && !params.customerName) {
        setDraft(d);
        toast.show({ kind: 'info', title: 'Continuamos tu borrador', message: 'Se recuperó el reporte que no terminaste.' });
      } else if (params.customerName) {
        // Viene de la Agenda: cliente ya elegido y ligado al servicio.
        const base = emptyDraft();
        const id = params.customerId ? (Number(params.customerId) || params.customerId) : undefined;
        setDraft({
          ...base,
          servicioId: params.serviceId ? (Number(params.serviceId) || params.serviceId) : undefined,
          cliente: { ...base.cliente, mode: id !== undefined ? 'list' : 'manual', id, nombre: String(params.customerName) },
        });
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autoguardado.
  useEffect(() => {
    if (!loaded || finished.current) return;
    if (isDraftDirty(draft)) saveDraftDebounced(draft);
  }, [draft, loaded]);

  // Revalidar en vivo después de un intento fallido.
  useEffect(() => {
    if (attempted[step]) setErrors(validateStep(step, draft));
  }, [draft, step, attempted]);

  const update = useCallback((fn: (d: ReportDraft) => ReportDraft) => setDraft((prev) => fn(prev)), []);

  const goTo = (s: number) => {
    setDraft((d) => ({ ...d, step: s }));
    setErrors(attempted[s] ? validateStep(s, draft) : {});
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
  };

  const next = () => {
    const e = validateStep(step, draft);
    setAttempted((a) => ({ ...a, [step]: true }));
    setErrors(e);
    if (hasErrors(e)) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    goTo(Math.min(LAST, step + 1));
  };

  const requestClose = useCallback(() => {
    if (saving) return;
    if (isDraftDirty(draft)) setConfirmClose(true);
    else {
      finished.current = true;
      void clearDraft();
      router.back();
    }
  }, [draft, saving]);

  const prev = () => (step === 0 ? requestClose() : goTo(step - 1));

  // Botón atrás de Android: paso anterior / confirmar salida.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (confirmClose) {
        setConfirmClose(false);
        return true;
      }
      if (step > 0) goTo(step - 1);
      else requestClose();
      return true;
    });
    return () => sub.remove();
  });

  const discard = async () => {
    finished.current = true;
    setConfirmClose(false);
    await clearDraft();
    router.back();
  };

  const save = async () => {
    // Validar todo; si algo falta, ir al primer paso inválido.
    for (let s = 0; s <= LAST; s++) {
      const e = validateStep(s, draft);
      if (hasErrors(e)) {
        setAttempted((a) => ({ ...a, [s]: true }));
        if (s !== step) goTo(s);
        setErrors(e);
        return;
      }
    }
    setSaving(true);
    try {
      await saveDraftNow(draft); // por si algo falla abajo
      const capturedAt = new Date().toISOString();
      const firmaUri = await writeSignatureSvg(draft.firma.path, draft.firma.width, draft.firma.height);
      await enqueue({
        type: 'service_report.create',
        endpoint: '/reportes',
        method: 'POST',
        body: buildReportBody(draft, { capturedAt, tecnicoId: user?.id }),
        files: [
          ...draft.fotos.map((p, i) => ({ uri: p.uri, name: `foto-${i + 1}.jpg`, type: 'image/jpeg', field: 'fotos[]' })),
          { uri: firmaUri, name: 'firma.svg', type: 'image/svg+xml', field: 'firma' },
        ],
        label: `Reporte · ${draft.cliente.nombre.trim()}`,
        subtitle: outboxSubtitle(draft),
      });
      finished.current = true;
      await clearDraft();
      void outboxCtx.refresh();
      toast.show({ kind: 'success', title: 'Reporte guardado en el teléfono', message: 'Se enviará automáticamente cuando haya internet.' });
      router.dismissTo('/bandeja');
    } catch (e) {
      setSaving(false);
      toast.show({
        kind: 'error',
        title: 'No se pudo guardar el reporte',
        message: e instanceof Error ? e.message : 'Intenta de nuevo. Tu borrador sigue guardado.',
      });
    }
  };

  const pad = isTablet ? 32 : 16;
  const stepProps = { draft, update, errors };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        variant="compact"
        title="Nuevo reporte"
        subtitle={`Paso ${step + 1} de ${STEP_NAMES.length} · ${STEP_NAMES[step]}`}
        backIcon="close"
        onBack={requestClose}
        alignLeft={isTablet}
      >
        <StepIndicator
          steps={[...(isTablet ? STEP_NAMES : STEP_SHORT)]}
          current={step}
          style={{ paddingHorizontal: isTablet ? 24 : 16, paddingTop: 4, paddingBottom: 12 }}
        />
      </Header>
      {!loaded ? (
        <SectionLoader />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            scrollEnabled={!drawing}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: pad, paddingBottom: pad + 8, width: '100%', maxWidth: 760 + pad * 2, alignSelf: 'center', gap: 16 }}
          >
            <InfoBanner text="Se guardará en el teléfono y se enviará cuando haya internet." />
            {step === 0 ? <StepCliente {...stepProps} /> : null}
            {step === 1 ? <StepEquipo {...stepProps} /> : null}
            {step === 2 ? <StepTrabajo {...stepProps} /> : null}
            {step === 3 ? <StepFotos {...stepProps} /> : null}
            {step === 4 ? <StepFirma {...stepProps} onDrawingChange={setDrawing} /> : null}
          </ScrollView>
          <ScreenFooter>
            <Button title="Anterior" icon="arrow_back" variant="secondary" onPress={prev} disabled={step === 0 || saving} style={{ flex: 1 }} />
            {step < LAST ? (
              <Button title="Siguiente" iconRight="arrow_forward" onPress={next} style={{ flex: 1 }} />
            ) : (
              <Button title="Guardar reporte" iconRight="save" onPress={save} loading={saving} loadingTitle="Guardando…" style={{ flex: 1 }} />
            )}
          </ScreenFooter>
        </KeyboardAvoidingView>
      )}
      <ConfirmDialog
        visible={confirmClose}
        icon="delete"
        title="¿Descartar este reporte?"
        message="Se borrarán los datos, fotos y firma que capturaste. Esta acción no se puede deshacer."
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
        onCancel={() => setConfirmClose(false)}
        onConfirm={discard}
      />
    </View>
  );
}
