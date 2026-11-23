import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError } from '../../../src/api/client';
import type { Permissions } from '../../../src/api/types';
import { CachedNotice } from '../../../src/components/CachedNotice';
import { useAuth } from '../../../src/context/AuthContext';
import { usuariosApi, usuariosCacheKeys, roleName, type Availability, type ManagedRole, type ManagedUser } from '../../../src/features/usuarios/api';
import { ListCard, RoleDetail, RoleRow, UserDetail, UserRow } from '../../../src/features/usuarios/components';
import { useCachedFetch } from '../../../src/hooks/useCachedFetch';
import { useResponsive } from '../../../src/hooks/useResponsive';
import { useTheme } from '../../../src/theme';
import { EmptyState, Header, SegmentedControl, Skeleton, Text, useToast } from '../../../src/ui';

type Tab = 'users' | 'roles';
type Selection = { kind: 'user'; id: ManagedUser['id'] } | { kind: 'role'; id: ManagedRole['id'] } | null;

const UNAVAILABLE_USERS = 'La gestión de usuarios estará disponible cuando el servidor la habilite.';
const UNAVAILABLE_ROLES = 'La gestión de roles estará disponible cuando el servidor la habilite. Mientras tanto puedes consultar los permisos de tu rol.';
const NOT_YET = 'Disponible cuando el servidor lo habilite';
const MY_ROLE_ID = '__mine__';

const goBack = () => (router.canGoBack() ? router.back() : router.navigate('/'));

/** Usuarios y roles (1m–1p / 3j–3k). Sólo administradores. */
export default function UsuariosScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { isTablet } = useResponsive();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const isAdmin = !!user?.is_admin;

  const [tab, setTab] = useState<Tab>('users');
  const [selection, setSelection] = useState<Selection>(null);
  const [savingRole, setSavingRole] = useState(false);

  const usersFetcher = useCallback(() => usuariosApi.users(), []);
  const rolesFetcher = useCallback(() => usuariosApi.roles(), []);
  const users = useCachedFetch<Availability<ManagedUser[]>>(isAdmin ? usuariosCacheKeys.users : null, usersFetcher);
  const roles = useCachedFetch<Availability<ManagedRole[]>>(isAdmin ? usuariosCacheKeys.roles : null, rolesFetcher);

  /** Usuario actual como fila (datos reales de la sesión). */
  const me: ManagedUser | null = useMemo(
    () => (user ? { id: user.id, name: user.name, email: user.email, role: user.role, is_admin: user.is_admin, is_active: true } : null),
    [user],
  );
  const myRole: ManagedRole | null = useMemo(
    () =>
      user
        ? {
            id: MY_ROLE_ID,
            name: roleName(user.role, user.is_admin),
            description: 'Tu rol actual. Estos son los permisos con los que trabajas en la app.',
            permissions: user.permissions,
            is_admin: user.is_admin,
          }
        : null,
    [user],
  );

  const usersAvailable = users.data?.available === true;
  const rolesAvailable = roles.data?.available === true;
  const userList: ManagedUser[] = users.data?.available ? users.data.data : me ? [me] : [];
  const roleList: ManagedRole[] = roles.data?.available ? roles.data.data : myRole ? [myRole] : [];

  // Tablet: seleccionar el primero de la pestaña activa.
  useEffect(() => {
    if (!isTablet) return;
    if (tab === 'users' && selection?.kind !== 'user' && userList[0]) setSelection({ kind: 'user', id: userList[0].id });
    if (tab === 'roles' && selection?.kind !== 'role' && roleList[0]) setSelection({ kind: 'role', id: roleList[0].id });
  }, [isTablet, tab, userList, roleList, selection?.kind]);

  // Teléfono: el botón atrás de Android cierra el detalle.
  useEffect(() => {
    if (isTablet || !selection) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelection(null);
      return true;
    });
    return () => sub.remove();
  }, [isTablet, selection]);

  if (!isAdmin) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {!isTablet ? <Header variant="compact" title="Usuarios y roles" subtitle="Solo administradores" onBack={goBack} /> : null}
        <EmptyState
          icon="lock"
          title="Sólo para administradores"
          text="Tu rol no tiene acceso a la gestión de usuarios y roles. Pide al administrador que te lo asigne."
          action={{ label: 'Volver al inicio', icon: 'home', onPress: () => router.navigate('/') }}
        />
      </View>
    );
  }

  const selectedUser = selection?.kind === 'user' ? userList.find((u) => u.id === selection.id) : undefined;
  const selectedRole = selection?.kind === 'role' ? roleList.find((r) => r.id === selection.id) : undefined;

  const openRoleOf = (u: ManagedUser) => {
    setTab('roles');
    const match = roles.data?.available ? roleList.find((r) => (u.role?.id != null && r.id === u.role.id) || r.name === u.role?.name) : u.id === me?.id ? myRole : null;
    if (match) setSelection({ kind: 'role', id: match.id });
    else {
      setSelection(null);
      toast.show({ kind: 'info', title: 'Rol no disponible', message: UNAVAILABLE_ROLES });
    }
  };

  const saveRole = async (role: ManagedRole, permissions: Permissions) => {
    setSavingRole(true);
    try {
      await usuariosApi.saveRole(role.id, permissions);
      toast.show({ kind: 'success', title: 'Permisos guardados', message: `Rol ${role.name}` });
      roles.refresh();
    } catch (e) {
      const notReady = e instanceof ApiError && (e.status === 404 || e.status === 405 || e.status === 501);
      toast.show({ kind: notReady ? 'info' : 'error', title: notReady ? NOT_YET : 'No se pudieron guardar los permisos', message: notReady ? undefined : (e as Error)?.message });
    } finally {
      setSavingRole(false);
    }
  };

  /* -------------------------------- Lista -------------------------------- */
  const active = tab === 'users' ? users : roles;
  const loadingList = !active.data && active.loading;
  const loadError = !active.data && !active.loading ? active.error : null;
  const refreshing = users.refreshing || roles.refreshing;
  const onRefresh = () => {
    users.refresh();
    roles.refresh();
  };

  const listContent = loadingList ? (
    <ListCard>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: colors.line }}>
          <Skeleton w={44} h={44} r={22} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton w="60%" h={14} tone="line" />
            <Skeleton w="30%" h={10} />
          </View>
          <Skeleton w={84} h={24} r={12} />
        </View>
      ))}
    </ListCard>
  ) : loadError ? (
    <EmptyState
      fill={false}
      icon="cloud_off"
      title="No se pudo cargar"
      text={loadError.message}
      action={{ label: 'Reintentar', icon: 'refresh', onPress: active.reload }}
    />
  ) : tab === 'users' ? (
    <View style={{ gap: 16 }}>
      {userList.length ? (
        <ListCard>
          {userList.map((u, i) => (
            <UserRow
              key={u.id}
              user={u}
              selected={isTablet && selectedUser?.id === u.id}
              divider={i < userList.length - 1}
              onPress={() => setSelection({ kind: 'user', id: u.id })}
            />
          ))}
        </ListCard>
      ) : (
        <EmptyState fill={false} icon="group" title="Sin usuarios" text="No hay usuarios registrados." />
      )}
      {!usersAvailable ? (
        <EmptyState
          fill={false}
          icon={users.data?.available === false && users.data.reason === 'forbidden' ? 'lock' : 'manage_accounts'}
          title="Gestión de usuarios"
          text={users.data?.available === false && users.data.reason === 'forbidden' ? 'Tu rol no tiene permiso para administrar usuarios.' : UNAVAILABLE_USERS}
        />
      ) : null}
    </View>
  ) : (
    <View style={{ gap: 16 }}>
      <ListCard>
        {roleList.map((r, i) => (
          <RoleRow
            key={String(r.id)}
            role={r}
            subtitle={r.id === MY_ROLE_ID ? 'Tu rol · sólo lectura' : undefined}
            selected={isTablet && selectedRole?.id === r.id}
            divider={i < roleList.length - 1}
            onPress={() => setSelection({ kind: 'role', id: r.id })}
          />
        ))}
      </ListCard>
      {!rolesAvailable ? <EmptyState fill={false} icon="admin_panel_settings" title="Gestión de roles" text={UNAVAILABLE_ROLES} /> : null}
    </View>
  );

  const cachedNotice = active.fromCache ? <CachedNotice savedAt={active.savedAt} message={active.error?.message} /> : null;
  const segmented = (
    <SegmentedControl<Tab>
      value={tab}
      onChange={(t) => {
        setTab(t);
        if (!isTablet) setSelection(null);
      }}
      options={[
        { value: 'users', label: 'Usuarios' },
        { value: 'roles', label: 'Roles' },
      ]}
    />
  );

  /* ------------------------------- Detalle ------------------------------- */
  const detail = selectedUser ? (
    <UserDetail
      user={selectedUser}
      editable={usersAvailable}
      onRolePress={() => openRoleOf(selectedUser)}
      onToggleActive={() => toast.show({ kind: 'info', title: NOT_YET, message: 'El servidor aún no permite activar o desactivar usuarios desde la app.' })}
      onResetPassword={usersAvailable ? () => toast.show({ kind: 'info', title: NOT_YET, message: 'El servidor aún no permite restablecer contraseñas desde la app.' }) : undefined}
    />
  ) : selectedRole ? (
    <RoleDetail
      role={selectedRole}
      editable={rolesAvailable && selectedRole.id !== MY_ROLE_ID}
      saving={savingRole}
      onSave={(p) => saveRole(selectedRole, p)}
      note={selectedRole.id === MY_ROLE_ID ? 'Permisos de tu rol, sólo lectura. Para cambiarlos se necesita la gestión de roles en el servidor.' : undefined}
    />
  ) : null;

  /* -------------------------------- Tablet -------------------------------- */
  if (isTablet) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
        <View style={{ width: '40%', minWidth: 340, maxWidth: 440, borderRightWidth: 1, borderRightColor: colors.line }}>
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, gap: 16 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />}
          >
            <View>
              <Text variant="title1" accessibilityRole="header">
                Usuarios y roles
              </Text>
              <Text variant="caption" color="muted">
                Solo administradores
              </Text>
            </View>
            {segmented}
            {cachedNotice}
            {listContent}
          </ScrollView>
        </View>
        <ScrollView style={{ flex: 1, backgroundColor: colors.card }} contentContainerStyle={{ padding: 24, paddingTop: insets.top + 24, flexGrow: 1 }}>
          <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center', flexGrow: 1 }}>
            {detail ?? <EmptyState icon={tab === 'users' ? 'person' : 'badge'} title={tab === 'users' ? 'Selecciona un usuario' : 'Selecciona un rol'} />}
          </View>
        </ScrollView>
      </View>
    );
  }

  /* ------------------------------- Teléfono ------------------------------- */
  if (detail && selection) {
    const title = selectedUser ? selectedUser.name : selectedRole?.name ?? '';
    const subtitle = selectedUser ? roleName(selectedUser.role, selectedUser.is_admin) : 'Permisos por módulo';
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header variant="compact" title={title} subtitle={subtitle} onBack={() => setSelection(null)} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>{detail}</ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header variant="compact" title="Usuarios y roles" subtitle="Solo administradores" onBack={goBack} />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />}
      >
        {segmented}
        {cachedNotice}
        {listContent}
      </ScrollView>
    </View>
  );
}
