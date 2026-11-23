import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { fontFamily } from '../../theme';
import { Spinner } from '../atoms/Spinner';
import { Text } from '../atoms/Text';

export interface SectionLoaderProps {
  /** Default "Cargando…". */
  text?: string;
  /** Alto fijo; sin él ocupa todo el espacio disponible (flex 1). */
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/** Carga entre secciones (O·11): cubre sólo el área de contenido; encabezado y barra siguen visibles. */
export function SectionLoader({ text = 'Cargando…', height, style }: SectionLoaderProps) {
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }, height ? { height } : { flex: 1, minHeight: 180 }, style]}>
      <Spinner size="lg" />
      <Text size={14} color="muted" style={{ fontFamily: fontFamily.medium }}>
        {text}
      </Text>
    </View>
  );
}
