import React from 'react';
import { Image, View } from 'react-native';
import { useTheme } from '../../../theme';
import { Icon, Text } from '../../../ui';
import type { SignatureInfo } from '../reportData';

/**
 * Tarjeta "Firma del cliente": la firma va sobre papel blanco (también en
 * oscuro, como en el diseño) con línea base; debajo, ✔ nombre · fecha.
 */
export function SignatureBlock({ signature }: { signature: SignatureInfo }) {
  const { colors } = useTheme();
  const caption = [signature.name, signature.signedAt ? `Firmado el ${signature.signedAt}` : 'Firmado'].filter(Boolean).join(' · ');
  return (
    <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Icon name="signature" size={22} color="brandInk" />
        <Text size={16} weight="semibold" style={{ flex: 1 }} accessibilityRole="header">
          Firma del cliente
        </Text>
      </View>
      {signature.uri ? (
        <View
          style={{
            borderRadius: 10,
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderColor: colors.line,
            paddingVertical: 12,
            paddingHorizontal: 16,
            alignItems: 'center',
          }}
        >
          <Image
            source={{ uri: signature.uri }}
            style={{ width: '100%', height: 110 }}
            resizeMode="contain"
            accessibilityLabel={signature.name ? `Firma de ${signature.name}` : 'Firma del cliente'}
          />
          <View style={{ width: '100%', height: 1, backgroundColor: '#d1d5db' }} />
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="verified" size={20} color="ok" />
        <Text size={14} weight="semibold" style={{ flex: 1 }}>
          {caption}
        </Text>
      </View>
    </View>
  );
}
