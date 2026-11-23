import React, { useState } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReportImage } from '../api/types';
import { useResponsive } from '../hooks/useResponsive';
import { fontFamily, useTheme } from '../theme';

/** Galería en miniaturas; al tocar se abre el visor a pantalla completa. */
export function ImageGallery({ images }: { images: ReportImage[] }) {
  const r = useResponsive();
  const [index, setIndex] = useState<number | null>(null);
  const { colors } = useTheme();
  const size = r.isTablet ? 140 : 104;
  if (!images.length) return null;

  return (
    <View>
      <View style={styles.grid}>
        {images.map((img, i) => (
          <Pressable
            key={String(img.id ?? i)}
            onPress={() => setIndex(i)}
            accessibilityRole="imagebutton"
            accessibilityLabel={img.caption || `Imagen ${i + 1}`}
            style={({ pressed }) => [{ width: size, opacity: pressed ? 0.8 : 1 }]}
          >
            <Image source={{ uri: img.url }} style={[styles.thumb, { width: size, height: size, backgroundColor: colors.soft }]} />
            {img.caption ? (
              <Text style={[styles.caption, { fontSize: r.font.xs, color: colors.muted }]} numberOfLines={2}>
                {img.caption}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </View>
      <ImageViewer images={images} index={index} onClose={() => setIndex(null)} />
    </View>
  );
}

function ImageViewer({
  images,
  index,
  onClose,
}: {
  images: ReportImage[];
  index: number | null;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(0);
  const visible = index !== null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
      onShow={() => setCurrent(index ?? 0)}
    >
      <View style={styles.viewer}>
        {visible ? (
          <FlatList
            key={`${width}x${height}`}
            data={images}
            horizontal
            pagingEnabled
            initialScrollIndex={index ?? 0}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={(img, i) => String(img.id ?? i)}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <View style={{ width, height, justifyContent: 'center' }}>
                <Image source={{ uri: item.url }} style={{ width, height: height * 0.8 }} resizeMode="contain" />
              </View>
            )}
          />
        ) : null}
        <View style={[styles.viewerTop, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.counter}>
            {Math.min(current + 1, images.length)} / {images.length}
          </Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cerrar">
            <Text style={styles.close}>Cerrar ✕</Text>
          </Pressable>
        </View>
        {images[current]?.caption ? (
          <View style={[styles.viewerBottom, { paddingBottom: insets.bottom + 12 }]}>
            <Text style={styles.viewerCaption}>{images[current]?.caption}</Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumb: { borderRadius: 10 },
  caption: { marginTop: 4, fontFamily: fontFamily.regular },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  viewerTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  counter: { color: '#ffffff', fontFamily: fontFamily.bold, fontSize: 15 },
  close: { color: '#ffffff', fontFamily: fontFamily.bold, fontSize: 16 },
  viewerBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16 },
  viewerCaption: { color: '#ffffff', textAlign: 'center', fontSize: 15, fontFamily: fontFamily.regular },
});
