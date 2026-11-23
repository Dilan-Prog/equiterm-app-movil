import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { ReportDetail } from '../../../src/features/reportes/ReportDetail';
import { useTheme } from '../../../src/theme';
import { EmptyState, Header } from '../../../src/ui';

/** Detalle de reporte (teléfono, 1d). En tablet el detalle vive en el panel derecho de la lista. */
export default function ReporteDetalleScreen() {
  const { id, folio } = useLocalSearchParams<{ id: string; folio?: string }>();
  const { colors } = useTheme();
  const back = () => (router.canGoBack() ? router.back() : router.navigate('/reportes'));

  if (!id) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header variant="compact" title="Reporte" onBack={back} />
        <EmptyState icon="description" title="Reporte no encontrado" />
      </View>
    );
  }
  return <ReportDetail id={String(id)} initialFolio={folio ? String(folio) : undefined} variant="screen" onBack={back} />;
}
