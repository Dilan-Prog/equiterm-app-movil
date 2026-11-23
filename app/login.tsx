import Constants from 'expo-constants';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { ApiError } from '../src/api/client';
import { useAuth } from '../src/context/AuthContext';
import { useOnline } from '../src/hooks/useOnline';
import { useResponsive } from '../src/hooks/useResponsive';
import { fontFamily, useTheme, type ColorToken } from '../src/theme';
import { Button, Icon, LabeledField, Logo, Text, type IconName } from '../src/ui';

const VERSION = Constants.expoConfig?.version ?? '1.0.0';

type Alert = { kind: 'error' | 'offline' | 'notice'; title: string; text?: string } | null;

/** Inicio de sesión (pantallas 1a / 2a-2c / 2k / 3a / 4a). */
export default function LoginScreen() {
  const { login, notice, clearNotice } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const r = useResponsive();
  const online = useOnline();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<Alert>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; both?: boolean }>({});
  const passRef = useRef<TextInputInstance>(null);
  const taps = useRef<{ n: number; t: number }>({ n: 0, t: 0 });

  // 5 toques al logo → Configurar servidor (atajo oculto de la fase 1).
  const onLogoPress = () => {
    const now = Date.now();
    taps.current = now - taps.current.t < 1500 ? { n: taps.current.n + 1, t: now } : { n: 1, t: now };
    if (taps.current.n >= 5) {
      taps.current = { n: 0, t: 0 };
      router.push('/servidor');
    }
  };

  const submit = async () => {
    const fe: typeof fieldErrors = {};
    if (!email.trim()) fe.email = 'Escribe tu correo.';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) fe.email = 'Escribe un correo válido.';
    if (!password) fe.password = 'Escribe tu contraseña.';
    setFieldErrors(fe);
    setAlert(null);
    clearNotice();
    if (fe.email || fe.password) return;

    setLoading(true);
    try {
      await login(email, password);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.isNetwork) {
          setAlert({
            kind: 'offline',
            title: 'Sin conexión con el servidor',
            text: 'Revisa tu Wi-Fi o datos, o verifica la dirección en «Configurar servidor».',
          });
        } else if (e.status === 401 || e.status === 422) {
          const errs = e.errors;
          setFieldErrors({ email: errs?.email?.[0], password: errs?.password?.[0], both: !errs?.email && !errs?.password });
          setAlert({ kind: 'error', title: 'Correo o contraseña incorrectos', text: 'Verifica tus datos e inténtalo de nuevo.' });
        } else {
          setAlert({ kind: 'error', title: 'No se pudo iniciar sesión', text: e.message });
        }
      } else {
        setAlert({ kind: 'error', title: 'No se pudo iniciar sesión', text: 'Inténtalo de nuevo.' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Aviso a mostrar: error del intento > sin red > aviso de sesión (401, inactividad, servidor cambiado).
  const shown: Alert =
    alert ??
    (online === false
      ? { kind: 'offline', title: 'Sin conexión con el servidor', text: 'Revisa tu Wi-Fi o datos, o verifica la dirección en «Configurar servidor».' }
      : notice
        ? { kind: 'notice', title: notice }
        : null);

  const form = (
    <View style={{ width: '100%', maxWidth: 400, flex: 1, justifyContent: 'center', gap: 22 }}>
      {!r.isTablet ? (
        <Pressable onPress={onLogoPress} accessibilityLabel="Equiterm Industries" style={{ marginBottom: 12, alignSelf: 'flex-start' }}>
          <Logo size="lg" />
        </Pressable>
      ) : null}
      <View>
        <Text variant="display" accessibilityRole="header" style={{ marginBottom: 6 }}>
          Inicia sesión
        </Text>
        <Text size={15} color="muted" style={{ lineHeight: 22 }}>
          Usa tu cuenta de Equiterm para consultar reportes y tu agenda.
        </Text>
      </View>

      {shown ? <LoginAlert alert={shown} /> : null}

      <View style={{ gap: 16 }}>
        <LabeledField
          label="Correo electrónico"
          leftIcon="mail"
          value={email}
          onChangeText={setEmail}
          placeholder="usuario@equiterm.mx"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
          returnKeyType="next"
          onSubmitEditing={() => passRef.current?.focus()}
          error={fieldErrors.email}
          invalid={fieldErrors.both}
          disabled={loading}
        />
        <LabeledField
          ref={passRef}
          label="Contraseña"
          leftIcon="lock"
          password
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          error={fieldErrors.password}
          invalid={fieldErrors.both}
          disabled={loading}
        />
      </View>

      <Button title="Iniciar sesión" loadingTitle="Iniciando sesión…" size="lg" onPress={submit} loading={loading} />
    </View>
  );

  const footer = (
    <View style={{ width: '100%', maxWidth: 400, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 }}>
      <Button title="Configurar servidor" icon="dns" variant="ghostMuted" block={false} onPress={() => router.push('/servidor')} style={{ paddingHorizontal: 0 }} />
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text size={12} color="muted">
          Versión {VERSION}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: 0.75 }}>
          <Text size={11} color="muted">
            Desarrollado por
          </Text>
          <Text size={11} color="muted" style={{ fontFamily: fontFamily.bold }}>
            RankPro
          </Text>
        </View>
      </View>
    </View>
  );

  const formColumn = (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          paddingHorizontal: r.isTablet ? 48 : 24,
          paddingTop: r.isTablet ? 48 : insets.top + 20,
          paddingBottom: Math.max(insets.bottom, 12) + (r.isTablet ? 24 : 18),
        }}
        keyboardShouldPersistTaps="handled"
      >
        {form}
        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (!r.isTablet) return <View style={{ flex: 1, backgroundColor: colors.card }}>{formColumn}</View>;

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.card }}>
      <LoginHero onLogoPress={onLogoPress} />
      <View style={{ flex: 1, paddingTop: insets.top }}>{formColumn}</View>
    </View>
  );
}

function LoginAlert({ alert }: { alert: NonNullable<Alert> }) {
  const { colors } = useTheme();
  const map: Record<NonNullable<Alert>['kind'], { bg: string; fg: ColorToken; icon: IconName; iconColor: ColorToken }> = {
    error: { bg: colors.errBg, fg: 'err', icon: 'error', iconColor: 'err' },
    offline: { bg: colors.warnBg, fg: 'warn', icon: 'cloud_off', iconColor: 'warn' },
    notice: { bg: colors.soft, fg: 'ink2', icon: 'lock_clock', iconColor: 'muted' },
  };
  const m = map[alert.kind];
  return (
    <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, backgroundColor: m.bg }}>
      <Icon name={m.icon} size={20} color={m.iconColor} />
      <View style={{ flex: 1 }}>
        <Text size={14} color={alert.kind === 'notice' ? 'ink' : m.fg} style={{ fontFamily: fontFamily.semibold, lineHeight: 20 }}>
          {alert.title}
        </Text>
        {alert.text ? (
          <Text size={14} color={m.fg} style={{ lineHeight: 20 }}>
            {alert.text}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Panel izquierdo de tablet (46 %): fondo oscuro con anillos naranjas, lema y logo. */
function LoginHero({ onLogoPress }: { onLogoPress: () => void }) {
  const insets = useSafeAreaInsets();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const cx = box.w * 1.05;
  const cy = -box.h * 0.05;
  const maxR = Math.hypot(box.w + Math.abs(cx), box.h + Math.abs(cy));
  const rings: number[] = [];
  for (let rr = 30; rr < maxR; rr += 30) rings.push(rr);
  return (
    <View
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={{
        flexBasis: '46%',
        backgroundColor: '#141516',
        paddingTop: insets.top + 40,
        paddingHorizontal: 48,
        paddingBottom: Math.max(insets.bottom, 0) + 48,
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
    >
      {box.w ? (
        <Svg pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0 }} width={box.w} height={box.h}>
          {rings.map((rr) => (
            <Circle key={rr} cx={cx} cy={cy} r={rr} stroke="rgba(255,98,19,0.22)" strokeWidth={1} fill="none" />
          ))}
        </Svg>
      ) : null}
      <Pressable onPress={onLogoPress} accessibilityLabel="Equiterm Industries" style={{ alignSelf: 'flex-start' }}>
        <Logo size="md" onDark />
      </Pressable>
      <View style={{ gap: 16 }}>
        <Text size={40} style={{ fontFamily: fontFamily.bold, lineHeight: 45, letterSpacing: -0.8, color: '#f9fafb' }}>
          Reportes de servicio y agenda, en campo y sin papel.
        </Text>
        <Text size={16} style={{ color: '#9ca3af' }}>
          Calderas · Calentadores · Tratamiento de agua
        </Text>
      </View>
    </View>
  );
}
