import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useColorScheme, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { boxShadow, palettes, type ColorScheme, type ThemeColors } from './tokens';

/** Preferencia del usuario: seguir al sistema o forzar claro/oscuro. */
export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'equiterm.themeMode';

export interface Theme {
  /** Preferencia guardada. */
  mode: ThemeMode;
  /** Esquema efectivo. */
  scheme: ColorScheme;
  isDark: boolean;
  colors: ThemeColors;
  /** Sombra de tarjeta adecuada al esquema (`boxShadow`). */
  cardShadow: string;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<Theme | null>(null);

/**
 * Proveedor de tema. Guarda la preferencia en AsyncStorage
 * (`equiterm.themeMode`). Requiere `userInterfaceStyle: "automatic"` en app.json
 * para que el modo "system" detecte el oscuro.
 */
export function ThemeProvider({ children, initialMode }: { children: React.ReactNode; initialMode?: ThemeMode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(initialMode ?? 'system');

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (alive && (v === 'light' || v === 'dark' || v === 'system')) setModeState(v);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => undefined);
  }, []);

  const scheme: ColorScheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;

  const value = useMemo<Theme>(
    () => ({
      mode,
      scheme,
      isDark: scheme === 'dark',
      colors: palettes[scheme],
      cardShadow: scheme === 'dark' ? boxShadow.smDark : boxShadow.sm,
      setMode,
    }),
    [mode, scheme, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Tema actual: `{ colors, scheme, isDark, mode, setMode, cardShadow }`. */
export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}

/**
 * Crea estilos dependientes del tema, memorizados por esquema.
 *
 * ```ts
 * const useStyles = makeStyles((c) => ({ box: { backgroundColor: c.card } }));
 * function X() { const s = useStyles(); ... }
 * ```
 */
export function makeStyles<T extends Record<string, ViewStyle | TextStyle | ImageStyle>>(factory: (colors: ThemeColors, theme: Theme) => T) {
  return function useStyles(): T {
    const theme = useTheme();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => StyleSheet.create(factory(theme.colors, theme)), [theme.scheme]);
  };
}
