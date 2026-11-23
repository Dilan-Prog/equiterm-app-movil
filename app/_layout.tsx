import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaInsetsContext, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { OutboxProvider, useOutbox } from '../src/context/OutboxContext';
import { useOnline } from '../src/hooks/useOnline';
import { ThemeProvider, useTheme } from '../src/theme';
import { ConnectionBanner, Logo, SectionLoader, ToastProvider, useConnectionBanner } from '../src/ui';

function RootNavigator() {
  const { status } = useAuth();
  const { colors } = useTheme();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <Logo />
        <SectionLoader text="Iniciando…" height={120} />
      </View>
    );
  }

  const signedIn = status === 'signedIn';
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Screen name="servidor" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

/**
 * Banner de conexión global bajo la barra de estado. Cuando está visible
 * "consume" el inset superior: las pantallas (Header/Screen usan
 * `useSafeAreaInsets`) reciben top = 0.
 */
function AppShell() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const online = useOnline();
  const { pendingCount, flush } = useOutbox();
  const banner = useConnectionBanner(online, { onReconnect: flush });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {banner ? (
        <View style={{ paddingTop: insets.top, backgroundColor: colors.card }}>
          <ConnectionBanner state={banner} pendingCount={pendingCount} />
        </View>
      ) : null}
      <SafeAreaInsetsContext.Provider value={banner ? { ...insets, top: 0 } : insets}>
        <ToastProvider>
          <RootNavigator />
        </ToastProvider>
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: '#141516' }} />;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <OutboxProvider>
            <AppShell />
          </OutboxProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
