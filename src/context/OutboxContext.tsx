import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { flushOutbox, listOutbox, subscribe, type OutboxItem } from '../lib/outbox';

interface OutboxContextValue {
  items: OutboxItem[];
  /** Pendientes + enviando (lo que muestra la insignia de Bandeja). */
  pendingCount: number;
  failedCount: number;
  /** Vuelve a leer la cola (llamar después de `enqueue`). */
  refresh: () => Promise<void>;
  /** Envía la cola y refresca. */
  flush: () => Promise<void>;
}

const OutboxContext = createContext<OutboxContextValue | null>(null);

/** Resumen de la bandeja de salida compartido (insignias de pestaña/menú/Inicio). */
export function OutboxProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<OutboxItem[]>([]);

  const refresh = useCallback(async () => {
    try {
      setItems(await listOutbox());
    } catch {
      // ignorar
    }
  }, []);

  const flush = useCallback(async () => {
    try {
      await flushOutbox();
    } finally {
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    // Cambios en vivo de la cola (enqueue, progreso, enviados) en lugar de
    // releer cada 15 s; el intervalo queda como respaldo.
    const unsubscribe = subscribe(() => { refresh(); });
    const id = setInterval(refresh, 60000);
    return () => {
      sub.remove();
      unsubscribe();
      clearInterval(id);
    };
  }, [refresh]);

  const value = useMemo<OutboxContextValue>(
    () => ({
      items,
      // Todo lo no enviado (pendiente, enviando o con error), como la insignia del diseño.
      pendingCount: items.length,
      failedCount: items.filter((i) => i.status === 'failed').length,
      refresh,
      flush,
    }),
    [items, refresh, flush],
  );
  return <OutboxContext.Provider value={value}>{children}</OutboxContext.Provider>;
}

export function useOutbox(): OutboxContextValue {
  const ctx = useContext(OutboxContext);
  if (!ctx) throw new Error('useOutbox debe usarse dentro de <OutboxProvider>');
  return ctx;
}
