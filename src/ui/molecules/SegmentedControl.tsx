import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { boxShadow, fontFamily, useTheme } from '../../theme';
import { Icon, type IconName } from '../atoms/Icon';
import { Text } from '../atoms/Text';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
}

/** Control segmentado (M·04): 2–3 vistas del mismo contenido. Riel line, padding 4, segmento 44 radio 9. */
export function SegmentedControl<T extends string>({ options, value, onChange, style }: SegmentedControlProps<T>) {
  const { colors, isDark } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={[{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 12, backgroundColor: isDark ? colors.soft : colors.line }, style]}
    >
      {options.map((o) => {
        const sel = o.value === value;
        const fg = sel ? colors.ink : colors.muted;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: sel }}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 9,
              backgroundColor: sel ? colors.card : 'transparent',
              boxShadow: sel ? boxShadow.segment : undefined,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {o.icon ? <Icon name={o.icon} size={20} color={fg} /> : null}
            <Text size={15} style={{ fontFamily: fontFamily.semibold, color: fg }} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
