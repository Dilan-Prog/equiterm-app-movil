import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme, type ThemeColors } from '../../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/** Tono del chip: fondo tenue + texto oscurecido (AA). */
export type ChipTone = 'neutral' | 'info' | 'warn' | 'ok' | 'err' | 'brand';

export function toneColors(tone: ChipTone, c: ThemeColors): { bg: string; fg: string } {
  switch (tone) {
    case 'info':
      return { bg: c.infoBg, fg: c.info };
    case 'warn':
      return { bg: c.warnBg, fg: c.warn };
    case 'ok':
      return { bg: c.okBg, fg: c.ok };
    case 'err':
      return { bg: c.errBg, fg: c.err };
    case 'brand':
      return { bg: c.brandSoft, fg: c.brandInk };
    default:
      return { bg: c.neuBg, fg: c.neu };
  }
}

/** Estados conocidos del diseño → [etiqueta, tono]. */
const KNOWN: Record<string, [string, ChipTone]> = {
  borrador: ['Borrador', 'neutral'],
  draft: ['Borrador', 'neutral'],
  en_proceso: ['En proceso', 'info'],
  in_progress: ['En proceso', 'info'],
  completado: ['Completado', 'warn'],
  completed: ['Completado', 'warn'],
  firmado: ['Firmado', 'ok'],
  signed: ['Firmado', 'ok'],
  pendiente: ['Pendiente', 'neutral'],
  pending: ['Pendiente', 'neutral'],
  enviando: ['Enviando', 'info'],
  sending: ['Enviando', 'info'],
  enviado: ['Enviado', 'ok'],
  sent: ['Enviado', 'ok'],
  error: ['Error', 'err'],
  failed: ['Error', 'err'],
  programado: ['Programado', 'neutral'],
  scheduled: ['Programado', 'neutral'],
  en_curso: ['En curso', 'warn'],
  terminado: ['Terminado', 'ok'],
  finished: ['Terminado', 'ok'],
  done: ['Terminado', 'ok'],
  cancelado: ['Cancelado', 'err'],
  cancelled: ['Cancelado', 'err'],
};

/** Deduce tono (y etiqueta por defecto) a partir del status del API. */
export function statusTone(status?: string | null): { tone: ChipTone; label?: string } {
  const key = (status ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (KNOWN[key]) return { tone: KNOWN[key][1], label: KNOWN[key][0] };
  const s = key;
  if (/(firmad|signed)/.test(s)) return { tone: 'ok' };
  if (/(cancel|rechaz|error|fail)/.test(s)) return { tone: 'err' };
  if (/(complet|finaliz|cerrad|terminad)/.test(s)) return { tone: s.includes('complet') ? 'warn' : 'ok' };
  if (/(curso|ruta|iniciad)/.test(s)) return { tone: 'warn' };
  if (/(progres|proceso|envian)/.test(s)) return { tone: 'info' };
  return { tone: 'neutral' };
}

/** Tono del chip de rol: Administrador → brand, Supervisor → info, resto neutro. */
export function roleTone(role?: string | null, isAdmin?: boolean): ChipTone {
  const r = (role ?? '').toLowerCase();
  if (isAdmin || r.includes('admin')) return 'brand';
  if (r.includes('super')) return 'info';
  return 'neutral';
}

export interface StatusChipProps {
  /** Status crudo del API (p. ej. "en_proceso", "signed"); define tono y etiqueta por defecto. */
  status?: string | null;
  /** Texto visible (gana sobre la etiqueta deducida). */
  label?: string | null;
  /** Fuerza el tono. */
  tone?: ChipTone;
  /** Punto de 6 dp antes del texto (default true; los chips de rol van sin punto). */
  dot?: boolean;
  /** Ícono opcional (p. ej. `shield_person` en rol administrador). */
  icon?: IconName;
  /** `sm` alto 26 / texto 12 (default) · `md` alto 28 / texto 13 (rol en Inicio/Perfil). */
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

/** Chip de estado (A·04). Sólo lectura; el color nunca va solo, siempre con texto. */
export function StatusChip({ status, label, tone, dot = true, icon, size = 'sm', style }: StatusChipProps) {
  const { colors } = useTheme();
  const guess = statusTone(status ?? label);
  const text = label || guess.label || status;
  if (!text) return null;
  const c = toneColors(tone ?? guess.tone, colors);
  const md = size === 'md';
  return (
    <View
      accessibilityRole="text"
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: md ? 5 : 6,
          height: md ? 28 : 26,
          paddingHorizontal: md ? 11 : 10,
          borderRadius: 999,
          backgroundColor: c.bg,
        },
        style,
      ]}
    >
      {icon ? (
        <Icon name={icon} size={16} color={c.fg} />
      ) : dot ? (
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.fg }} />
      ) : null}
      <Text variant="legend" size={md ? 13 : 12} color={c.fg} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}
