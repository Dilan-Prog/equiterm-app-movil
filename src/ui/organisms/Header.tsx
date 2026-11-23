import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontFamily, useTheme } from '../../theme';
import { Icon, type IconName } from '../atoms/Icon';
import { IconButton } from '../atoms/IconButton';
import { Text } from '../atoms/Text';

export interface HeaderAction {
  label: string;
  icon?: IconName;
  onPress: () => void;
}

export interface HeaderProps {
  /** `large` (secciones principales: título 28/700 + acción tonal) · `compact` (pantallas hijas: 60 alto, título centrado). */
  variant?: 'large' | 'compact';
  title: string;
  /** Subtítulo 12 muted (sólo compact). */
  subtitle?: string;
  /** Botón regresar a la izquierda (compact). */
  onBack?: () => void;
  /** Ícono de regresar: `arrow_back` (default) o `close` (asistentes/modales). */
  backIcon?: 'arrow_back' | 'close';
  /** Acción tonal tipo píldora (large) — p. ej. "Programar". */
  action?: HeaderAction;
  /** Nodo libre a la derecha (compact: normalmente un IconButton). */
  right?: React.ReactNode;
  /** Agrega el inset superior (barra de estado). Default true. */
  safeTop?: boolean;
  /** Título alineado a la izquierda en compact (p. ej. "Programar servicio"). */
  alignLeft?: boolean;
  /** Contenido extra bajo el título (buscador, filtros, pasos). */
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Encabezado (O·02). Fondo card con borde inferior. */
export function Header({
  variant = 'large',
  title,
  subtitle,
  onBack,
  backIcon = 'arrow_back',
  action,
  right,
  safeTop = true,
  alignLeft,
  children,
  style,
}: HeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.line, paddingTop: safeTop ? insets.top : 0 },
        style,
      ]}
    >
      {variant === 'large' ? (
        <View style={{ paddingTop: 6, paddingHorizontal: 20, paddingBottom: 14, minHeight: 60, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          {onBack ? <IconButton icon={backIcon} accessibilityLabel="Regresar" onPress={onBack} style={{ marginLeft: -14 }} /> : null}
          <Text variant="display" accessibilityRole="header" style={{ flex: 1 }} numberOfLines={2}>
            {title}
          </Text>
          {action ? (
            <Pressable
              onPress={action.onPress}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              style={({ pressed }) => ({
                height: 44,
                paddingLeft: action.icon ? 12 : 16,
                paddingRight: 16,
                borderRadius: 22,
                backgroundColor: pressed ? colors.brandSoftPressed : colors.brandSoft,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              })}
            >
              {action.icon ? <Icon name={action.icon} size={22} color="brandInk" /> : null}
              <Text size={15} style={{ fontFamily: fontFamily.semibold }} color="brandInk">
                {action.label}
              </Text>
            </Pressable>
          ) : null}
          {right}
        </View>
      ) : (
        <View style={{ height: 60, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6 }}>
          {onBack ? (
            <IconButton icon={backIcon} accessibilityLabel={backIcon === 'close' ? 'Cerrar' : 'Regresar'} onPress={onBack} />
          ) : (
            <View style={{ width: alignLeft ? 10 : 48 }} />
          )}
          <View style={{ flex: 1, minWidth: 0, alignItems: alignLeft ? 'flex-start' : 'center' }}>
            <Text variant="title3" accessibilityRole="header" numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text variant="legend" weight="regular" color="muted" numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {right ?? (alignLeft ? null : <View style={{ width: 48 }} />)}
        </View>
      )}
      {children}
    </View>
  );
}
