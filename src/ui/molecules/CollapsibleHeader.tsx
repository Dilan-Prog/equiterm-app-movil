import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { fontFamily, useTheme } from '../../theme';
import { Icon, type IconName } from '../atoms/Icon';
import { Text } from '../atoms/Text';

export interface CollapsibleHeaderProps {
  title: string;
  /** Resumen a la derecha ("3 hallazgos") para leer sin abrir. */
  summary?: string;
  /** Ícono 22 brandInk a la izquierda. */
  icon?: IconName;
  /** Controlado. */
  expanded?: boolean;
  /** No controlado (default false). */
  defaultExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  /** Contenido que se muestra al abrir. */
  children?: React.ReactNode;
  divider?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Encabezado colapsable (M·11): fila de 60, flecha gira 180° al abrir. Úsalo dentro de una tarjeta. */
export function CollapsibleHeader({
  title,
  summary,
  icon,
  expanded,
  defaultExpanded = false,
  onToggle,
  children,
  divider = true,
  style,
}: CollapsibleHeaderProps) {
  const { colors } = useTheme();
  const [inner, setInner] = useState(defaultExpanded);
  const open = expanded ?? inner;
  const rot = useRef(new Animated.Value(open ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(rot, { toValue: open ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [open, rot]);
  const toggle = () => {
    setInner(!open);
    onToggle?.(!open);
  };
  return (
    <View style={[divider ? { borderBottomWidth: 1, borderBottomColor: colors.line } : null, style]}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => ({
          minHeight: 60,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: pressed ? colors.soft : 'transparent',
        })}
      >
        {icon ? <Icon name={icon} size={22} color="brandInk" /> : null}
        <Text size={16} style={{ flex: 1, fontFamily: fontFamily.semibold }} numberOfLines={1}>
          {title}
        </Text>
        {summary ? (
          <Text variant="caption" color="muted">
            {summary}
          </Text>
        ) : null}
        <Animated.View style={{ transform: [{ rotate: rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
          <Icon name="expand_more" size={22} color="muted" />
        </Animated.View>
      </Pressable>
      {open && children ? <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>{children}</View> : null}
    </View>
  );
}
