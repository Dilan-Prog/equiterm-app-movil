import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { useResponsive } from '../src/hooks/useResponsive';
import { API_PREFIX, ENV_API_URL, getServerUrl, hasServerOverride, normalizeUrl, setServerUrl } from '../src/lib/config';
import { fontFamily, useTheme } from '../src/theme';
import { Button, Header, Icon, LabeledField, Screen, Text } from '../src/ui';

type TestResult = { ok: boolean; text: string } | null;

/** Configurar servidor (pantallas 2d / 3n): cambia la URL del API sin recompilar. */
export default function ServerScreen() {
  const r = useResponsive();
  const { colors } = useTheme();
  const { status, logout } = useAuth();
  const [url, setUrl] = useState(getServerUrl());
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult>(null);
  const [saving, setSaving] = useState(false);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/login'));

  const test = async () => {
    const base = normalizeUrl(url);
    if (!base) {
      setResult({ ok: false, text: 'Escribe una dirección.' });
      return;
    }
    setTesting(true);
    setResult(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const started = Date.now();
    try {
      const res = await fetch(`${base}${API_PREFIX}/me`, { headers: { Accept: 'application/json' }, signal: controller.signal });
      // 401 = el API respondió (sin sesión), que es lo esperado aquí.
      if (res.status === 401 || res.ok) {
        setResult({ ok: true, text: `Conexión exitosa · respuesta en ${Date.now() - started} ms` });
      } else if (res.status === 404) {
        setResult({ ok: false, text: 'El servidor respondió, pero no encontró el API móvil (404). ¿Está actualizado el proyecto Laravel?' });
      } else {
        setResult({ ok: false, text: `El servidor respondió con error ${res.status}.` });
      }
    } catch (e) {
      const timedOut = (e as { name?: string })?.name === 'AbortError';
      const isLocal = /^http:\/\/(\d{1,3}\.){3}\d{1,3}|localhost/i.test(base);
      setResult({
        ok: false,
        text: timedOut
          ? `El servidor no respondió en 15 s (${base}). Revisa tu internet e intenta de nuevo.`
          : isLocal
            ? 'No se pudo conectar. Revisa la IP, que el servidor esté corriendo con --host=0.0.0.0, el firewall y que estés en la misma red Wi‑Fi.'
            : `No se pudo conectar con ${base}. Verifica que la dirección sea correcta (ej. https://equitermindustries.com.mx), que el teléfono tenga internet y ábrela en Safari/Chrome: ${base}${API_PREFIX}/me debe mostrar un mensaje "Unauthenticated".`,
      });
    } finally {
      clearTimeout(timer);
      setTesting(false);
    }
  };

  const apply = async (value: string | null) => {
    setSaving(true);
    const before = getServerUrl();
    try {
      const after = await setServerUrl(value);
      setUrl(after);
      if (status === 'signedIn' && after !== before) {
        // El token pertenece al servidor anterior.
        await logout({ notice: 'Servidor cambiado. Inicia sesión de nuevo.' });
        router.replace('/login');
        return;
      }
      close();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      background="card"
      maxWidth={620}
      safeBottom
      header={<Header variant="compact" title="Configurar servidor" subtitle="Dirección de la API de Equiterm en tu red" backIcon="close" onBack={close} />}
    >
      <View style={{ gap: 16, paddingTop: r.isTablet ? 8 : 0 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="dns" size={24} color="brandInk" />
          </View>
          <Text variant="small" color="muted" style={{ flex: 1 }}>
            Producción: https://equitermindustries.com.mx · Pruebas en la PC: http://IP:8000
          </Text>
        </View>

        <LabeledField
          label="URL del servidor"
          hint="Ejemplo: https://equitermindustries.com.mx"
          value={url}
          onChangeText={(t) => {
            setUrl(t);
            setResult(null);
          }}
          placeholder="http://192.168.1.50:8000"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        {result ? (
          <View
            accessibilityRole="alert"
            style={{ flexDirection: 'row', gap: 10, padding: 12, paddingHorizontal: 14, borderRadius: 10, backgroundColor: result.ok ? colors.okBg : colors.errBg }}
          >
            <Icon name={result.ok ? 'check_circle' : 'error'} size={20} color={result.ok ? 'ok' : 'err'} />
            <Text size={14} color={result.ok ? 'ok' : 'err'} style={{ flex: 1, fontFamily: fontFamily.semibold }}>
              {result.text}
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="Probar conexión" icon="network_check" variant="secondary" onPress={test} loading={testing} style={{ flex: 1 }} />
          <Button title="Guardar" onPress={() => apply(url)} loading={saving} style={{ flex: 1 }} />
        </View>
        {hasServerOverride() ? <Button title="Usar valor del .env" variant="ghost" onPress={() => apply(null)} disabled={saving} /> : null}

        <View style={{ gap: 6, marginTop: 8 }}>
          <Text variant="caption" color="muted">
            Actual: {getServerUrl() || 'sin configurar'}
            {hasServerOverride() ? ' (personalizado)' : ' (del .env)'}
          </Text>
          <Text variant="caption" color="muted">
            Valor del .env (EXPO_PUBLIC_API_URL): {ENV_API_URL || 'no definido'}
          </Text>
          <Text variant="caption" color="muted">
            Ruta del API: {API_PREFIX}
          </Text>
          {status === 'signedIn' ? (
            <Text variant="caption" color="warn" style={{ fontFamily: fontFamily.semibold }}>
              Si cambias el servidor se cerrará tu sesión.
            </Text>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
