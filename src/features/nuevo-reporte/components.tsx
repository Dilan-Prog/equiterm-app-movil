import React, { useState } from 'react';
import { Image, Pressable, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { fontFamily, useTheme } from '../../theme';
import { Button, Icon, LabeledField, Text, type IconName } from '../../ui';
import type { ClientOption, DraftMaterial, DraftPhoto } from './types';

/** Aviso informativo azul (infoBg) con ícono: "Se guardará en el teléfono…". */
export function InfoBanner({ text, icon = 'save', tone = 'info', style }: { text: string; icon?: IconName; tone?: 'info' | 'warn'; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const fg = tone === 'warn' ? colors.warn : colors.info;
  const bg = tone === 'warn' ? colors.warnBg : colors.infoBg;
  return (
    <View
      accessibilityRole="text"
      style={[{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: bg, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 }, style]}
    >
      <Icon name={icon} size={18} color={fg} style={{ marginTop: 1 }} />
      <Text size={14} style={{ flex: 1, color: fg, lineHeight: 19 }}>
        {text}
      </Text>
    </View>
  );
}

/** Título de sección del paso (22/700). */
export function StepTitle({ children }: { children: string }) {
  return (
    <Text variant="title1" accessibilityRole="header">
      {children}
    </Text>
  );
}

/** Mensaje de error de grupo (chips, lista) con ícono. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }} accessibilityRole="alert">
      <Icon name="error" filled={false} size={16} color="err" />
      <Text variant="caption" color="err" style={{ flex: 1 }}>
        {message}
      </Text>
    </View>
  );
}

/** Fila de cliente con radio (paso 1). */
export function ClientRow({ client, selected, onPress }: { client: ClientOption; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const meta = [client.contacto, client.ubicacion].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${client.nombre}${meta ? `, ${meta}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 64,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? colors.brand : colors.line,
        backgroundColor: selected ? colors.brandSoft : pressed ? colors.soft : colors.card,
      })}
    >
      <Icon name={selected ? 'radio_button_checked' : 'radio_button_unchecked'} size={24} color={selected ? colors.brand : colors.muted} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size={16} style={{ fontFamily: fontFamily.semibold }} numberOfLines={2}>
          {client.nombre}
        </Text>
        {meta ? (
          <Text size={13} color="muted" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Lista de materiales (tarjeta con filas "descripción · cantidad · ✕"). */
export function MaterialList({ items, onRemove }: { items: DraftMaterial[]; onRemove: (id: string) => void }) {
  const { colors } = useTheme();
  if (!items.length) return null;
  return (
    <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.card, overflow: 'hidden' }}>
      {items.map((m, i) => (
        <View
          key={m.id}
          style={{
            minHeight: 52,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingLeft: 14,
            paddingRight: 4,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: colors.line,
          }}
        >
          <Text size={15} style={{ flex: 1 }} numberOfLines={2}>
            {m.descripcion}
          </Text>
          <Text size={15} style={{ fontFamily: fontFamily.semibold }} tabular>
            {[m.cantidad || '1', m.unidad].filter(Boolean).join(' ')}
          </Text>
          <Pressable
            onPress={() => onRemove(m.id)}
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${m.descripcion}`}
            style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.soft : 'transparent' })}
          >
            <Icon name="close" size={20} color="muted" />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

/** Formulario en línea para agregar un material. */
export function MaterialForm({ onAdd, onCancel }: { onAdd: (m: Omit<DraftMaterial, 'id'>) => void; onCancel: () => void }) {
  const { colors } = useTheme();
  const [descripcion, setDescripcion] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [unidad, setUnidad] = useState('pza');
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    if (!descripcion.trim()) {
      setError('Escribe el material.');
      return;
    }
    onAdd({ descripcion: descripcion.trim(), cantidad: cantidad.trim() || '1', unidad: unidad.trim() });
  };
  return (
    <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.card, padding: 14, gap: 12 }}>
      <LabeledField
        label="Material"
        placeholder="Ej. Empaque de registro de mano 3×4 in"
        value={descripcion}
        onChangeText={(t) => {
          setDescripcion(t);
          if (error) setError(null);
        }}
        error={error}
        autoFocus
        returnKeyType="next"
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <LabeledField label="Cantidad" value={cantidad} onChangeText={setCantidad} keyboardType="decimal-pad" containerStyle={{ flex: 1 }} />
        <LabeledField label="Unidad" value={unidad} onChangeText={setUnidad} placeholder="pza" containerStyle={{ flex: 1 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Cancelar" variant="secondary" size="sm" onPress={onCancel} style={{ flex: 1 }} />
        <Button title="Agregar" icon="check" variant="dark" size="sm" onPress={submit} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

/** Botón grande de acción de foto ("Tomar foto" naranja / "Elegir de la galería" con borde). */
export function PhotoActionButton({
  icon,
  label,
  primary,
  disabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 96,
        borderRadius: 12,
        borderWidth: primary ? 0 : 1,
        borderColor: colors.line,
        backgroundColor: primary ? (pressed ? colors.brandPressed : colors.brand) : pressed ? colors.soft : colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 10,
        opacity: disabled ? 0.45 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <Icon name={icon} size={28} color={primary ? colors.onBrand : colors.brand} />
      <Text size={16} align="center" style={{ fontFamily: fontFamily.semibold, color: primary ? colors.onBrand : colors.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Miniatura de foto con botón ✕ y campo de descripción. */
export function PhotoTile({
  photo,
  size,
  onRemove,
  onCaption,
}: {
  photo: DraftPhoto;
  size: number;
  onRemove: () => void;
  onCaption: (t: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ width: size, gap: 6 }}>
      <View style={{ width: size, height: size, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.line }}>
        <Image source={{ uri: photo.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={photo.caption || 'Foto del servicio'} />
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel="Quitar foto"
          hitSlop={6}
          style={({ pressed }) => ({
            position: 'absolute',
            top: 6,
            right: 6,
            width: 30,
            height: 30,
            borderRadius: 15,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? 'rgba(0,0,0,0.8)' : 'rgba(20,21,22,0.65)',
          })}
        >
          <Icon name="close" size={18} color="#ffffff" />
        </Pressable>
      </View>
      <TextInput
        value={photo.caption}
        onChangeText={onCaption}
        placeholder="Descripción"
        placeholderTextColor={colors.muted}
        selectionColor={colors.brand}
        accessibilityLabel="Descripción de la foto"
        multiline
        maxLength={120}
        style={{
          minHeight: 40,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.field,
          paddingHorizontal: 8,
          paddingVertical: 6,
          fontFamily: fontFamily.regular,
          fontSize: 13,
          color: colors.ink,
          textAlignVertical: 'top',
        }}
      />
    </View>
  );
}

/** Fila de resumen (paso Firma): etiqueta muted + valor. */
export function SummaryRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 6 }}>
      <Text size={14} color="muted" style={{ width: 110 }}>
        {label}
      </Text>
      <Text size={14} style={{ flex: 1, fontFamily: fontFamily.medium }}>
        {value}
      </Text>
    </View>
  );
}
