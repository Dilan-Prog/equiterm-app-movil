import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { useResponsive } from '../../../hooks/useResponsive';
import { Text, useToast } from '../../../ui';
import { deleteDraftPhoto, persistDraftPhoto } from '../draft';
import { PhotoActionButton, PhotoTile, StepTitle } from '../components';
import { MAX_PHOTOS, type DraftPhoto } from '../types';
import type { StepProps } from './StepCliente';

/** Calidad JPEG: "Se comprimen para ahorrar datos". */
const QUALITY = 0.6;

export function StepFotos({ draft, update }: StepProps) {
  const toast = useToast();
  const { isTablet } = useResponsive();
  const [width, setWidth] = useState(0);
  const [busy, setBusy] = useState(false);
  const photos = draft.fotos;
  const remaining = MAX_PHOTOS - photos.length;
  const cols = isTablet ? 4 : 3;
  const gap = 10;
  const tile = width ? Math.floor((width - gap * (cols - 1)) / cols) : 0;

  const addAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    const added: DraftPhoto[] = [];
    for (const a of assets.slice(0, MAX_PHOTOS - photos.length)) {
      try {
        const saved = await persistDraftPhoto(a.uri);
        added.push({ id: saved.id, uri: saved.uri, caption: '', width: a.width, height: a.height });
      } catch {
        toast.show({ kind: 'error', title: 'No se pudo guardar la foto', message: 'Intenta de nuevo.' });
      }
    }
    if (added.length) update((d) => ({ ...d, fotos: [...d.fotos, ...added].slice(0, MAX_PHOTOS) }));
  };

  const denied = (what: string) =>
    Alert.alert('Permiso necesario', `Activa el acceso a ${what} en Ajustes para adjuntar fotos al reporte.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Abrir Ajustes', onPress: () => void Linking.openSettings() },
    ]);

  const takePhoto = async () => {
    if (remaining <= 0 || busy) return;
    setBusy(true);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        denied('la cámara');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: QUALITY, exif: false });
      if (!res.canceled) await addAssets(res.assets);
    } catch (e) {
      toast.show({ kind: 'error', title: 'No se pudo abrir la cámara', message: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  const pickFromGallery = async () => {
    if (remaining <= 0 || busy) return;
    setBusy(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted && perm.accessPrivileges !== 'limited') {
        denied('tus fotos');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: QUALITY,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        orderedSelection: true,
        exif: false,
      });
      if (!res.canceled) await addAssets(res.assets);
    } catch (e) {
      toast.show({ kind: 'error', title: 'No se pudo abrir la galería', message: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  const remove = (p: DraftPhoto) => {
    update((d) => ({ ...d, fotos: d.fotos.filter((x) => x.id !== p.id) }));
    deleteDraftPhoto(p.uri);
  };

  return (
    <View style={{ gap: 16 }}>
      <StepTitle>Fotos del servicio</StepTitle>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <PhotoActionButton icon="photo_camera" label="Tomar foto" primary onPress={takePhoto} disabled={remaining <= 0 || busy} />
        <PhotoActionButton icon="photo_library" label="Elegir de la galería" onPress={pickFromGallery} disabled={remaining <= 0 || busy} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <Text size={13} color="muted" tabular>
          {photos.length} de {MAX_PHOTOS} fotos
        </Text>
        <Text size={13} color="muted" align="right" style={{ flex: 1 }}>
          Se comprimen para ahorrar datos
        </Text>
      </View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
        {tile > 0
          ? photos.map((p) => (
              <PhotoTile
                key={p.id}
                photo={p}
                size={tile}
                onRemove={() => remove(p)}
                onCaption={(t) => update((d) => ({ ...d, fotos: d.fotos.map((x) => (x.id === p.id ? { ...x, caption: t } : x)) }))}
              />
            ))
          : null}
      </View>
      {photos.length === 0 ? (
        <Text size={14} color="muted">
          Las fotos son opcionales. Agrega evidencia del antes y después del servicio.
        </Text>
      ) : null}
    </View>
  );
}
