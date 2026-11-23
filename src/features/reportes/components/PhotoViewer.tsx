import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Image, Modal, Pressable, Share, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReportImage } from '../../../api/types';
import { Icon, Text } from '../../../ui';

/** El visor es siempre oscuro (diseño 2l), en ambos temas. */
const V = {
  bg: '#000000',
  fg: '#ffffff',
  muted: '#9ca3af',
  navBg: 'rgba(255,255,255,0.14)',
  frame: '#1f2022',
};

export interface PhotoViewerProps {
  images: ReportImage[];
  /** Índice abierto (null = cerrado). */
  index: number | null;
  onClose: () => void;
  /** Línea secundaria bajo el pie de foto (p. ej. "EQ-2026-0418 · 20 nov 2026, 10:14"). */
  meta?: string;
}

/** Galería a pantalla completa: deslizar o flechas para cambiar, contador "3 de 6", compartir. */
export function PhotoViewer({ images, index, onClose, meta }: PhotoViewerProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(0);
  const listRef = useRef<FlatList<ReportImage>>(null);
  const visible = index !== null;

  useEffect(() => {
    if (index !== null) setCurrent(index);
  }, [index]);

  const go = (i: number) => {
    const next = Math.max(0, Math.min(images.length - 1, i));
    setCurrent(next);
    listRef.current?.scrollToIndex({ index: next, animated: true });
  };

  const img = images[current];
  const share = () => {
    if (!img) return;
    Share.share({ url: img.url, message: [img.caption, meta, img.url].filter(Boolean).join('\n') }).catch(() => undefined);
  };

  const topH = insets.top + 56;
  const bottomH = insets.bottom + 92;
  const areaH = Math.max(200, height - topH - bottomH);
  const frameW = Math.min(width - 24, 820);
  const frameH = Math.min(areaH - 24, (frameW * 3) / 4);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: V.bg }}>
        <View style={{ paddingTop: insets.top, height: topH, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar" style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={26} color={V.fg} />
          </Pressable>
          <Text size={15} weight="semibold" color={V.fg} align="center" style={{ flex: 1 }}>
            {images.length ? `${Math.min(current + 1, images.length)} de ${images.length}` : ''}
          </Text>
          <Pressable onPress={share} accessibilityRole="button" accessibilityLabel="Compartir foto" style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="ios_share" size={24} color={V.fg} />
          </Pressable>
        </View>

        <View style={{ height: areaH, justifyContent: 'center' }}>
          {visible ? (
            <FlatList
              ref={listRef}
              key={`${width}x${height}`}
              data={images}
              horizontal
              pagingEnabled
              initialScrollIndex={index ?? 0}
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              keyExtractor={(it, i) => String(it.id ?? i)}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
              renderItem={({ item }) => (
                <View style={{ width, height: areaH, alignItems: 'center', justifyContent: 'center' }}>
                  <Image
                    source={{ uri: item.url }}
                    style={{ width: frameW, height: frameH, borderRadius: 6, backgroundColor: V.frame }}
                    resizeMode="contain"
                    accessibilityLabel={item.caption || 'Foto del servicio'}
                  />
                </View>
              )}
            />
          ) : null}
          {current > 0 ? (
            <NavButton side="left" onPress={() => go(current - 1)} />
          ) : null}
          {current < images.length - 1 ? (
            <NavButton side="right" onPress={() => go(current + 1)} />
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 24 }}>
          <Text size={15} weight="semibold" color={V.fg} numberOfLines={2}>
            {img?.caption || 'Foto del servicio'}
          </Text>
          {meta ? (
            <Text size={13} color={V.muted} style={{ marginTop: 2 }} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function NavButton({ side, onPress }: { side: 'left' | 'right'; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={side === 'left' ? 'Foto anterior' : 'Foto siguiente'}
      style={{
        position: 'absolute',
        [side]: 8,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: V.navBg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={side === 'left' ? 'chevron_left' : 'chevron_right'} size={26} color={V.fg} />
    </Pressable>
  );
}
