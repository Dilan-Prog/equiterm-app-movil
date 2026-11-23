import React from 'react';
import { Pressable, View } from 'react-native';
import { fontFamily, useTheme } from '../../../theme';
import { Avatar, Text } from '../../../ui';
import type { TechnicianOption } from './options';

/** Selector de técnico: tarjetas de 2 columnas con avatar 32 + nombre (seleccionada = brandSoft + borde brand). */
export function TechnicianGrid({
  options,
  value,
  onChange,
}: {
  options: TechnicianOption[];
  value?: TechnicianOption | null;
  onChange: (t: TechnicianOption | null) => void;
}) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 }}>
      {options.map((t) => {
        const sel = !!value && value.name === t.name;
        return (
          <View key={`${t.id ?? ''}-${t.name}`} style={{ width: '50%', padding: 5 }}>
            <Pressable
              onPress={() => onChange(sel ? null : t)}
              accessibilityRole="radio"
              accessibilityState={{ checked: sel }}
              accessibilityLabel={t.name}
              style={({ pressed }) => ({
                minHeight: 56,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: sel ? colors.brand : colors.line,
                backgroundColor: sel ? colors.brandSoft : pressed ? colors.soft : colors.card,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingHorizontal: 12,
                paddingVertical: 8,
              })}
            >
              <Avatar name={t.name} size={32} />
              <Text size={14} style={{ flex: 1, fontFamily: fontFamily.semibold, color: sel ? colors.ink : colors.ink }} numberOfLines={2}>
                {t.name}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
