import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { sharePdf } from '../../src/features/pdf/storage';
import { useTheme } from '../../src/theme';
import { EmptyState, Header, Icon, IconButton, Spinner, Text, useToast } from '../../src/ui';

/**
 * Visor de PDF dentro de la app. Solo abre archivos locales (`file://`), así que
 * funciona sin conexión. El botón de compartir abre la hoja del sistema para
 * guardarlo en Archivos, enviarlo o imprimirlo.
 */
export default function PdfViewerScreen() {
  const { uri, title, subtitle, provisional } = useLocalSearchParams<{
    uri?: string;
    title?: string;
    subtitle?: string;
    provisional?: string;
  }>();
  const { colors } = useTheme();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const back = () => (router.canGoBack() ? router.back() : router.navigate('/reportes'));
  const fileUri = typeof uri === 'string' && uri.startsWith('file://') ? uri : '';
  const name = (typeof title === 'string' && title) || 'Reporte de servicio';

  const share = async () => {
    if (!fileUri) return;
    try {
      const ok = await sharePdf(fileUri, name);
      if (!ok) toast.show({ kind: 'error', title: 'No se puede compartir en este dispositivo' });
    } catch (e) {
      toast.show({ kind: 'error', title: 'No se pudo compartir el PDF', message: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        variant="compact"
        title={name}
        subtitle={typeof subtitle === 'string' && subtitle ? subtitle : undefined}
        onBack={back}
        right={fileUri ? <IconButton icon="ios_share" accessibilityLabel="Compartir o guardar PDF" onPress={share} /> : undefined}
      />
      {provisional ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: colors.brandSoft,
          }}
        >
          <Icon name="schedule" size={18} color="brandInk" />
          <Text size={13} color="brandInk" style={{ flex: 1 }}>
            PDF provisional generado en el teléfono. El folio oficial se asigna al enviar el reporte.
          </Text>
        </View>
      ) : null}
      {!fileUri || failed ? (
        <EmptyState icon="picture_as_pdf" title="No se pudo abrir el PDF" text="Vuelve a generarlo desde el reporte." />
      ) : (
        <View style={{ flex: 1 }}>
          <WebView
            source={{ uri: fileUri }}
            originWhitelist={['file://*']}
            allowFileAccess
            allowingReadAccessToURL={fileUri}
            onLoadEnd={() => setLoading(false)}
            onError={() => setFailed(true)}
            style={{ flex: 1, backgroundColor: colors.bg }}
          />
          {loading ? (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              <Spinner />
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}
