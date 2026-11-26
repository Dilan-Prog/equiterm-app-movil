import { useCallback, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { OutboxEntry } from '../../lib/outbox';
import { useToast } from '../../ui';
import { getOrCreateLocalReportPdf, localPdfViewerParams } from './localPdf';
import { openPdfViewer } from './storage';

export interface OpenLocalPdfOptions {
  /** Mostrar un aviso «Generando PDF…» (cuando no hay botón con indicador). */
  announce?: boolean;
  /** Se llama justo antes de abrir el visor (p. ej. cerrar un diálogo modal, que quedaría encima). */
  beforeOpen?: () => void;
}

/**
 * Acción «Ver PDF» para reportes de la bandeja: genera (o reutiliza) el PDF
 * provisional y abre el visor. `busyId` = entrada que se está generando, para
 * mostrar el indicador de carga en su botón.
 */
export function useLocalReportPdf() {
  const { user } = useAuth();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const busy = useRef(false);

  const open = useCallback(
    async (entry: OutboxEntry, opts: OpenLocalPdfOptions = {}): Promise<boolean> => {
      if (busy.current) return false;
      busy.current = true;
      setBusyId(entry.id);
      if (opts.announce) toast.show({ kind: 'info', title: 'Generando PDF…', message: 'Puede tardar unos segundos con varias fotos.', duration: 0 });
      try {
        const file = await getOrCreateLocalReportPdf(entry, { userName: user?.name });
        if (opts.announce) toast.hide();
        opts.beforeOpen?.();
        openPdfViewer(localPdfViewerParams(entry, file.uri));
        return true;
      } catch (e) {
        toast.show({
          kind: 'error',
          title: 'No se pudo generar el PDF',
          message: e instanceof Error && e.message ? e.message : 'Intenta de nuevo.',
        });
        return false;
      } finally {
        busy.current = false;
        setBusyId(null);
      }
    },
    [toast, user?.name],
  );

  return { open, busyId };
}
