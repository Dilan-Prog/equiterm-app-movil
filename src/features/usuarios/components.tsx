import React, { useEffect, useMemo, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { Permissions } from '../../api/types';
import { useResponsive } from '../../hooks/useResponsive';
import { formatDateTime, parseDate } from '../../lib/format';
import { fontFamily, useTheme } from '../../theme';
import { Avatar, Button, DataRow, Icon, ListRow, StatusChip, Switch, Text, roleTone, type IconName } from '../../ui';
import { isUserActive, roleName, type ManagedRole, type ManagedUser } from './api';
import { ACTIONS, buildMatrix, matrixToPermissions, type Matrix, type PermAction } from './permissions';

/** Tarjeta contenedora de listas (card + borde, radio 12). */
export function ListCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 12, overflow: 'hidden' }, style]}>
      {children}
    </View>
  );
}

export function roleIcon(name?: string | null, isAdmin?: boolean): IconName {
  const n = (name ?? '').toLowerCase();
  if (isAdmin || n.includes('admin')) return 'admin_panel_settings';
  if (n.includes('super')) return 'supervisor_account';
  if (n.includes('técn') || n.includes('tecn')) return 'engineering';
  return 'badge';
}

/* ------------------------------------------------------------------ */
/* Filas                                                               */
/* ------------------------------------------------------------------ */

export function UserRow({ user, selected, onPress, divider }: { user: ManagedUser; selected?: boolean; onPress?: () => void; divider?: boolean }) {
  const active = isUserActive(user);
  const role = roleName(user.role, user.is_admin);
  return (
    <ListRow
      title={user.name}
      subtitle={active ? 'Activo' : 'Inactivo'}
      subtitleDot={active ? 'ok' : 'muted'}
      avatarName={user.name}
      trailing={<StatusChip label={role} tone={roleTone(role, user.is_admin)} dot={false} />}
      selected={selected}
      onPress={onPress}
      divider={divider}
    />
  );
}

export function RoleRow({ role, selected, onPress, divider, subtitle }: { role: ManagedRole; selected?: boolean; onPress?: () => void; divider?: boolean; subtitle?: string }) {
  const n = role.users_count;
  return (
    <ListRow
      title={role.name}
      subtitle={subtitle ?? (typeof n === 'number' ? `${n} ${n === 1 ? 'usuario' : 'usuarios'}` : undefined)}
      icon={roleIcon(role.name, role.is_admin)}
      chevron
      selected={selected}
      onPress={onPress}
      divider={divider}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Detalle de usuario                                                  */
/* ------------------------------------------------------------------ */

function lastAccess(v?: string | null): string {
  const d = parseDate(v);
  if (!d) return '—';
  const today = new Date();
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (d.toDateString() === today.toDateString()) return `Hoy, ${hm}`;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `Ayer, ${hm}`;
  return formatDateTime(v);
}

export function UserDetail({
  user,
  onRolePress,
  onToggleActive,
  onResetPassword,
  editable,
}: {
  user: ManagedUser;
  onRolePress?: () => void;
  onToggleActive?: (v: boolean) => void;
  onResetPassword?: () => void;
  /** Si es false, el interruptor se muestra sin poder cambiarse. */
  editable?: boolean;
}) {
  const role = roleName(user.role, user.is_admin);
  return (
    <View style={{ gap: 16 }}>
      <View style={{ alignItems: 'center', gap: 6, paddingTop: 8 }}>
        <Avatar name={user.name} size={80} />
        <Text variant="title1" align="center" style={{ marginTop: 6 }}>
          {user.name}
        </Text>
        {user.email ? (
          <Text variant="small" color="muted" align="center">
            {user.email}
          </Text>
        ) : null}
      </View>
      <ListCard>
        <DataRow
          icon="badge"
          label="Rol"
          value={<StatusChip label={role} tone={roleTone(role, user.is_admin)} dot={false} />}
          chevron={!!onRolePress}
          onPress={onRolePress}
        />
        <DataRow icon="call" label="Teléfono" value={user.phone || '—'} />
        <DataRow icon="schedule" label="Último acceso" value={lastAccess(user.last_login_at ?? user.last_seen_at)} />
        <DataRow
          icon="how_to_reg"
          label="Usuario activo"
          divider={false}
          value={
            <View pointerEvents={editable ? 'auto' : 'none'}>
              <Switch value={isUserActive(user)} onValueChange={onToggleActive} accessibilityLabel="Usuario activo" />
            </View>
          }
        />
      </ListCard>
      {onResetPassword ? <Button title="Restablecer contraseña" icon="lock_reset" variant="secondary" onPress={onResetPassword} /> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Detalle de rol + matriz de permisos                                 */
/* ------------------------------------------------------------------ */

export function PermissionMatrix({
  permissions,
  isAdmin,
  editable,
  onChange,
  compact,
}: {
  permissions: Permissions | null | undefined;
  isAdmin?: boolean;
  editable?: boolean;
  onChange?: (p: Permissions) => void;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const initial = useMemo(() => buildMatrix(permissions, isAdmin), [permissions, isAdmin]);
  const [matrix, setMatrix] = useState<Matrix>(initial.matrix);
  useEffect(() => setMatrix(initial.matrix), [initial]);
  const colW = compact ? 52 : 56;

  const toggle = (key: string, a: PermAction, v: boolean) => {
    const next: Matrix = { ...matrix, [key]: new Set(matrix[key]) };
    if (v) next[key].add(a);
    else next[key].delete(a);
    // Sin "Ver" no tiene sentido el resto; con cualquier otra se activa "Ver".
    if (a === 'view' && !v) next[key].clear();
    if (a !== 'view' && v) next[key].add('view');
    setMatrix(next);
    onChange?.(matrixToPermissions(next));
  };

  return (
    <ListCard>
      <View
        accessibilityRole="header"
        style={{ flexDirection: 'row', alignItems: 'center', height: 36, paddingHorizontal: 12, backgroundColor: colors.soft, borderBottomWidth: 1, borderBottomColor: colors.line }}
      >
        <Text size={12} color="muted" style={{ flex: 1, fontFamily: fontFamily.semibold }}>
          Módulo
        </Text>
        {ACTIONS.map((a) => (
          <Text key={a.key} size={12} color="muted" align="center" style={{ width: colW, fontFamily: fontFamily.semibold }}>
            {a.label}
          </Text>
        ))}
      </View>
      {initial.rows.map((row, i) => (
        <View
          key={row.key}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 60,
            paddingLeft: 12,
            borderBottomWidth: i === initial.rows.length - 1 ? 0 : 1,
            borderBottomColor: colors.line,
          }}
        >
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, minWidth: 0 }}>
            <Icon name={row.icon} size={18} color="muted" />
            <Text size={14} style={{ flex: 1, fontFamily: fontFamily.semibold }} numberOfLines={2}>
              {row.label}
            </Text>
          </View>
          {ACTIONS.map((a) => {
            const on = matrix[row.key]?.has(a.key) ?? false;
            return (
              <View key={a.key} style={{ width: colW, alignItems: 'center' }} pointerEvents={editable ? 'auto' : 'none'}>
                <Switch
                  value={on}
                  onValueChange={(v) => toggle(row.key, a.key, v)}
                  accessibilityLabel={`${row.label}: ${a.label}${editable ? '' : ' (sólo lectura)'}`}
                />
              </View>
            );
          })}
        </View>
      ))}
    </ListCard>
  );
}

export function RoleDetail({
  role,
  editable,
  saving,
  onSave,
  note,
}: {
  role: ManagedRole;
  editable?: boolean;
  saving?: boolean;
  onSave?: (p: Permissions) => void;
  /** Aviso bajo la matriz (p. ej. permisos de sólo lectura). */
  note?: string;
}) {
  const { colors } = useTheme();
  const { isTablet } = useResponsive();
  const [draft, setDraft] = useState<Permissions | null>(null);
  useEffect(() => setDraft(null), [role]);
  const n = role.users_count;
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
        <View style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={roleIcon(role.name, role.is_admin)} size={28} color="brandInk" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="title1">{role.name}</Text>
          {role.description ? (
            <Text variant="bodySm" color="ink2">
              {role.description}
            </Text>
          ) : null}
          {typeof n === 'number' ? (
            <Text variant="caption" color="muted">
              {n} {n === 1 ? 'usuario con este rol' : 'usuarios con este rol'}
            </Text>
          ) : null}
        </View>
      </View>
      <PermissionMatrix permissions={role.permissions} isAdmin={role.is_admin} editable={editable} onChange={setDraft} compact={!isTablet} />
      {note ? (
        <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 10, backgroundColor: colors.infoBg }}>
          <Icon name="info" size={20} color="info" />
          <Text size={13} color="info" style={{ flex: 1, lineHeight: 18 }}>
            {note}
          </Text>
        </View>
      ) : null}
      {editable ? (
        <Button title="Guardar cambios" disabled={!draft} loading={saving} loadingTitle="Guardando…" onPress={() => draft && onSave?.(draft)} />
      ) : null}
    </View>
  );
}
