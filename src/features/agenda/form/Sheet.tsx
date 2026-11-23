import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '../../../hooks/useResponsive';
import { boxShadow, useTheme } from '../../../theme';
import { IconButton, Text } from '../../../ui';

export interface SheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Pie fijo (botones). */
  footer?: React.ReactNode;
  /** Alto máximo como fracción de la pantalla (default 0.85). */
  maxHeight?: number;
}

/**
 * Hoja inferior en teléfono / diálogo centrado (máx. 480) en tablet.
 * Asa superior, título 19/700 y botón cerrar.
 */
export function Sheet({ visible, title, subtitle, onClose, children, footer, maxHeight = 0.85 }: SheetProps) {
  const { colors } = useTheme();
  const { isTablet, height } = useResponsive();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType={isTablet ? 'fade' : 'slide'}
      onRequestClose={onClose}
      statusBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: isTablet ? 'center' : 'flex-end', alignItems: 'center', padding: isTablet ? 24 : 0 }}
      >
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} accessibilityLabel="Cerrar" />
        <View
          accessibilityViewIsModal
          style={{
            width: '100%',
            maxWidth: isTablet ? 480 : undefined,
            maxHeight: height * maxHeight,
            backgroundColor: colors.card,
            borderRadius: isTablet ? 16 : 0,
            borderTopLeftRadius: isTablet ? 16 : 22,
            borderTopRightRadius: isTablet ? 16 : 22,
            paddingBottom: isTablet ? 16 : Math.max(insets.bottom, 12),
            boxShadow: boxShadow.dialog,
          }}
        >
          {!isTablet ? <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginTop: 8 }} /> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 8, paddingTop: isTablet ? 12 : 6, gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text variant="title2" accessibilityRole="header">
                {title}
              </Text>
              {subtitle ? (
                <Text variant="caption" color="muted">
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <IconButton icon="close" accessibilityLabel="Cerrar" onPress={onClose} />
          </View>
          <View style={{ flexShrink: 1 }}>{children}</View>
          {footer ? <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12 }}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
