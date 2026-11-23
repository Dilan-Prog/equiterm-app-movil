import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type RefreshControlProps,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '../../hooks/useResponsive';
import { useTheme, type ColorToken } from '../../theme';

export interface ScreenProps {
  children: React.ReactNode;
  /** Encabezado fijo arriba (normalmente `<Header />`, que ya incluye el inset superior). */
  header?: React.ReactNode;
  /** Pie fijo abajo (p. ej. botones Anterior/Siguiente del asistente). */
  footer?: React.ReactNode;
  /** Contenido con scroll (default true). */
  scroll?: boolean;
  /** Padding del contenido (default 16 teléfono / 32 tablet). `0` para listas a todo el ancho. */
  padding?: number;
  /** Ancho máximo del contenido centrado (p. ej. 760 en formularios). */
  maxWidth?: number;
  /** Color de fondo (default `bg`). */
  background?: ColorToken;
  /** Si no hay `header`, agrega el inset superior (default true). */
  safeTop?: boolean;
  /** Agrega inset inferior (pantallas sin barra de pestañas). Default false. */
  safeBottom?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /** Evitar el teclado (formularios). Default true cuando `scroll`. */
  keyboard?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  scrollProps?: Omit<ScrollViewProps, 'children' | 'refreshControl' | 'contentContainerStyle'>;
}

/**
 * Plantilla de pantalla. Usa `useSafeAreaInsets()` (no `SafeAreaView`) para que
 * el banner de conexión global pueda "consumir" el inset superior.
 */
export function Screen({
  children,
  header,
  footer,
  scroll = true,
  padding,
  maxWidth,
  background = 'bg',
  safeTop = true,
  safeBottom = false,
  refreshControl,
  keyboard,
  contentStyle,
  scrollProps,
}: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const r = useResponsive();
  const pad = padding ?? (r.isTablet ? 32 : 16);
  const inner: StyleProp<ViewStyle> = [
    { padding: pad, paddingTop: !header && safeTop ? insets.top + (pad ? 20 : 0) : pad },
    safeBottom && !footer ? { paddingBottom: pad + insets.bottom } : null,
    maxWidth ? { width: '100%', maxWidth, alignSelf: 'center' } : null,
    contentStyle,
  ];
  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[{ flexGrow: 1 }, inner]}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="handled"
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, inner]}>{children}</View>
  );
  const content = (
    <>
      {header}
      {body}
      {footer}
    </>
  );
  const useKb = keyboard ?? scroll;
  return (
    <View style={{ flex: 1, backgroundColor: (colors as Record<string, string>)[background] }}>
      {useKb ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </View>
  );
}

/** Pie fijo (asistentes, formularios): fondo card, borde superior, padding 12 16 + inset inferior. */
export function ScreenFooter({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          paddingTop: 12,
          paddingHorizontal: 16,
          paddingBottom: Math.max(insets.bottom, 12) + 4,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.line,
        },
        style,
      ]}
    >
      <View style={{ width: '100%', maxWidth: 760, alignSelf: 'center', flexDirection: 'row', gap: 10 }}>{children}</View>
    </View>
  );
}
