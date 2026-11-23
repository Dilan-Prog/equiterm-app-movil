import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import type { ReportImage } from '../../../api/types';
import { useTheme } from '../../../theme';
import { Icon, Text } from '../../../ui';
import { PhotoViewer } from './PhotoViewer';

const GAP = 6;
const COLS = 3;

/** Tarjeta "Fotos": cuadrícula de 3 columnas (radio 8); al tocar abre el visor a pantalla completa. */
export function PhotoGrid({ images, meta }: { images: ReportImage[]; meta?: string }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  if (!images.length) return null;
  const size = width ? Math.floor((width - GAP * (COLS - 1)) / COLS) : 0;

  return (
    <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Icon name="photo_library" size={22} color="brandInk" />
        <Text size={16} weight="semibold" style={{ flex: 1 }} accessibilityRole="header">
          Fotos
        </Text>
        <Text variant="caption" color="muted">
          {images.length} {images.length === 1 ? 'foto' : 'fotos'}
        </Text>
      </View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
        {size > 0
          ? images.map((img, i) => (
              <Pressable
                key={String(img.id ?? i)}
                onPress={() => setOpen(i)}
                accessibilityRole="imagebutton"
                accessibilityLabel={img.caption || `Foto ${i + 1}`}
                style={({ pressed }) => ({ width: size, height: size, opacity: pressed ? 0.8 : 1 })}
              >
                <View
                  style={{
                    flex: 1,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.line,
                    backgroundColor: colors.soft,
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="photo_camera" size={26} color="muted" style={{ position: 'absolute' }} />
                  <Image source={{ uri: img.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </View>
              </Pressable>
            ))
          : null}
      </View>
      <PhotoViewer images={images} index={open} onClose={() => setOpen(null)} meta={meta} />
    </View>
  );
}
