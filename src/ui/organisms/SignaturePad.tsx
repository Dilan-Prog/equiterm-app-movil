import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useResponsive } from '../../hooks/useResponsive';
import { fontFamily, useTheme } from '../../theme';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { Text } from '../atoms/Text';

export interface SignatureResult {
  /** Datos de trazo SVG (`d`), p. ej. "M10 20 L12 22 …", coordenadas en dp del lienzo. */
  path: string;
  width: number;
  height: number;
}

export interface SignaturePadProps {
  /** Se llama con el trazo al tocar "Aceptar". */
  onAccept: (result: SignatureResult) => void;
  /** Se llama al tocar "Limpiar". */
  onClear?: () => void;
  /** Estado aceptado (borde verde + «Firma aceptada»). Si no se pasa, se maneja internamente. */
  accepted?: boolean;
  /** Avisa cuando el dedo está dibujando (para desactivar el scroll del padre). */
  onDrawingChange?: (drawing: boolean) => void;
  /** Alto del lienzo (default 220 teléfono / 300 tablet). */
  height?: number;
  strokeWidth?: number;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

/** Pad de firma (O·09): Vacío (gris) · con trazo · aceptada (borde verde). Trazo 2.6. Devuelve path SVG. */
export function SignaturePad({
  onAccept,
  onClear,
  accepted: acceptedProp,
  onDrawingChange,
  height,
  strokeWidth = 2.6,
  placeholder = 'Firme aquí con el dedo',
  style,
}: SignaturePadProps) {
  const { colors } = useTheme();
  const r = useResponsive();
  const h = height ?? (r.isTablet ? 300 : 220);
  const [paths, setPaths] = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const [acceptedInner, setAcceptedInner] = useState(false);
  const accepted = acceptedProp ?? acceptedInner;
  const cur = useRef('');
  const size = useRef({ width: 0, height: h });
  const cbs = useRef({ onDrawingChange });
  cbs.current = { onDrawingChange };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const { locationX: x, locationY: y } = e.nativeEvent;
          cur.current = `M${x.toFixed(1)} ${y.toFixed(1)}`;
          setCurrent(cur.current);
          setAcceptedInner(false);
          cbs.current.onDrawingChange?.(true);
        },
        onPanResponderMove: (e) => {
          const { locationX: x, locationY: y } = e.nativeEvent;
          cur.current += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
          setCurrent(cur.current);
        },
        onPanResponderRelease: () => {
          const done = cur.current;
          cur.current = '';
          setCurrent('');
          if (done) setPaths((p) => [...p, done.includes('L') ? done : `${done} l0.1 0.1`]);
          cbs.current.onDrawingChange?.(false);
        },
        onPanResponderTerminate: () => {
          cbs.current.onDrawingChange?.(false);
        },
      }),
    [],
  );

  const empty = paths.length === 0 && !current;
  const clear = () => {
    setPaths([]);
    setCurrent('');
    setAcceptedInner(false);
    onClear?.();
  };
  const accept = () => {
    setAcceptedInner(true);
    onAccept({ path: paths.join(' '), width: size.current.width, height: size.current.height });
  };

  return (
    <View style={[{ gap: 10 }, style]}>
      <View
        onLayout={(e: LayoutChangeEvent) => {
          size.current = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
        }}
        accessibilityLabel="Área de firma"
        style={{
          height: h,
          borderRadius: 12,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: accepted ? colors.ok : colors.line,
          backgroundColor: colors.card,
          overflow: 'hidden',
        }}
        {...pan.panHandlers}
      >
        <View pointerEvents="none" style={{ position: 'absolute', left: 24, right: 24, bottom: 28, height: 1, backgroundColor: colors.line }} />
        <Text pointerEvents="none" size={14} color="muted" style={{ position: 'absolute', left: 24, bottom: 32 }}>
          ×
        </Text>
        {empty ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Text size={14} color="muted">
              {placeholder}
            </Text>
          </View>
        ) : null}
        <Svg pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          {[...paths, current].filter(Boolean).map((d, i) => (
            <Path key={i} d={d} stroke={colors.ink} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </Svg>
      </View>
      {accepted ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="check_circle" size={20} color="ok" />
          <Text size={14} color="ok" style={{ fontFamily: fontFamily.semibold }}>
            Firma aceptada
          </Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="Limpiar" icon="ink_eraser" variant="secondary" size="md" onPress={clear} disabled={empty} style={{ flex: 1, height: 48 }} />
        <Button title="Aceptar" icon="check" variant="dark" size="md" onPress={accept} disabled={empty} style={{ flex: 1, height: 48 }} />
      </View>
    </View>
  );
}
