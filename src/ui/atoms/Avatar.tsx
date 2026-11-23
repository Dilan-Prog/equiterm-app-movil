import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { avatarColors, fontFamily, useTheme } from '../../theme';
import { Text } from './Text';

/** Dos iniciales en mayúscula ("Luis Hernández" → "LH"). */
export function initials(name?: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : parts[0][1] ?? '';
  return (first + last).toUpperCase();
}

/** Color fijo por persona (lista de 6) a partir del nombre. */
export function avatarColor(name?: string | null): string {
  let h = 0;
  for (const ch of name ?? '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return avatarColors[h % avatarColors.length];
}

export interface AvatarProps {
  name?: string | null;
  /** 32 · 44 (listas) · 48 (perfil/Inicio) · 80 (detalle). Default 44. */
  size?: number;
  /** Color de fondo fijo (default: derivado del nombre). */
  color?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Avatar de iniciales (A·05). */
export function Avatar({ name, size = 44, color, onPress, style }: AvatarProps) {
  const { isDark } = useTheme();
  let bg = color ?? avatarColor(name);
  if (isDark && bg === '#141516') bg = '#4b5563';
  const fs = size >= 80 ? 28 : size >= 48 ? 16 : size >= 44 ? 15 : size >= 38 ? 14 : 12;
  const body = (
    <View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      <Text size={fs} style={{ fontFamily: fontFamily.bold, color: '#ffffff' }}>
        {initials(name)}
      </Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={name ? `Perfil de ${name}` : 'Perfil'}
      hitSlop={Math.max(0, (48 - size) / 2)}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      {body}
    </Pressable>
  );
}
