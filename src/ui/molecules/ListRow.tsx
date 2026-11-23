import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { fontFamily, useTheme, type ColorToken } from '../../theme';
import { Avatar } from '../atoms/Avatar';
import { Icon, type IconName } from '../atoms/Icon';
import { Text } from '../atoms/Text';

export interface ListRowProps {
  title: string;
  /** Texto secundario 13. */
  subtitle?: string;
  /** Pinta el subtítulo con punto de estado (p. ej. `ok` = "Activo", `muted` = "Inactivo"). */
  subtitleDot?: ColorToken;
  /** Avatar de iniciales a la izquierda (44). */
  avatarName?: string;
  /** Ícono en cuadro 44 (radio 10, fondo card/brandSoft, color brandInk). */
  icon?: IconName;
  /** Nodo libre a la izquierda (gana sobre avatar/icon). */
  leading?: React.ReactNode;
  /** Nodo a la derecha (chip, texto…). */
  trailing?: React.ReactNode;
  /** Muestra chevron_right al final. */
  chevron?: boolean;
  onPress?: () => void;
  /** Seleccionada en tablet (fondo brandSoft). */
  selected?: boolean;
  /** Separador inferior de 1 dp (default true). */
  divider?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Fila de lista (M·05): avatar o ícono + título/sub + chip o chevron. Alto mín. 68. */
export function ListRow({
  title,
  subtitle,
  subtitleDot,
  avatarName,
  icon,
  leading,
  trailing,
  chevron,
  onPress,
  selected,
  divider = true,
  style,
}: ListRowProps) {
  const { colors } = useTheme();
  const dotColor = subtitleDot ? (colors as Record<string, string>)[subtitleDot] : undefined;
  const lead =
    leading ??
    (avatarName ? (
      <Avatar name={avatarName} size={44} />
    ) : icon ? (
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          backgroundColor: selected ? colors.card : colors.brandSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={24} color="brandInk" />
      </View>
    ) : null);
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [
        {
          minHeight: 68,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: selected ? colors.brandSoft : pressed ? colors.soft : 'transparent',
        },
        divider ? { borderBottomWidth: 1, borderBottomColor: colors.line } : null,
        style,
      ]}
    >
      {lead}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size={icon && !avatarName ? 16 : 15} style={{ fontFamily: fontFamily.semibold }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            {dotColor ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: dotColor }} /> : null}
            <Text variant="caption" color={dotColor ?? 'muted'} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        ) : null}
      </View>
      {trailing}
      {chevron ? <Icon name="chevron_right" size={22} color={colors.muted} /> : null}
    </Pressable>
  );
}
