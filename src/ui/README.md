# src/ui — Librería de componentes Equiterm

Implementación en React Native del diseño "Equiterm · App de campo" (Sistema de diseño +
Inventario de componentes). Importa todo desde `src/ui`:

```tsx
import { Button, Header, Screen, StatusChip, useToast } from '../src/ui';
import { useTheme, space, radius, fontFamily } from '../src/theme';
```

## Reglas

- **Colores siempre del tema**: `const { colors } = useTheme()` (claro/oscuro). Nunca hex sueltos,
  salvo los fijos del diseño (menú lateral `sideNav`, tarjeta "Nuevo reporte" `colors.inverse`).
- **Textos con `<Text>`** de `src/ui` (Inter). No uses `fontWeight` con Inter: usa `weight="semibold"`
  o `fontFamily.semibold`. En `TextInput` aplica `fontFamily.regular`.
- **Insets**: usa `useSafeAreaInsets()` / `<Screen>` / `<Header>` — **no** `SafeAreaView`. El banner de
  conexión global consume el inset superior cuando está visible.
- **No pongas `ConnectionBanner` en pantallas**: ya está en `app/_layout.tsx`.
- **Íconos**: `<Icon name="calendar_month" />` acepta nombres Material Symbols (snake_case) o
  MaterialIcons (kebab). Alias: `mode_heat`→flama, `shield_person`→admin, `signature`→draw,
  `ink_eraser`, `calendar_add_on`, `progress_activity`. MaterialIcons es relleno; `filled={false}` usa la
  variante outline cuando existe.
- Área táctil mínima 48. Un solo botón `primary` por pantalla.
- Toda la UI en español (es-MX).

## Tema (`src/theme`)

| Export | Qué es |
| --- | --- |
| `light`, `dark`, `space`, `radius`, `size`, `font`, `shadow` | Tokens **verbatim** del diseño. |
| `palettes.light/dark` → `ThemeColors` | Tokens + extensiones: `neu/neuBg` (chip neutro), `field`, `fieldDisabled`, `textDisabled`, `overlay`, `inverse`, `onInverse(Muted)`, `onBrand`, `brandPressed`, `brandLoading`, `brandSoftPressed`, `danger(Pressed)`, `linePressed`, `infoSolid/okSolid/warnSolid`. |
| `typography` | `display` 28/700 · `title1` 22/700 · `title2` 19/700 · `title3` 17/600 · `body` 16 · `bodyStrong` · `bodySm` 15 · `small` 14 · `label` 14/600 · `caption` 13 · `legend` 12/600 · `tiny` 11. |
| `fontFamily` | `regular/medium/semibold/bold/extrabold` (Inter 400–800). |
| `boxShadow` | Sombras CSS: `sm`, `lg`, `dialog`, `fab`, `segment`, `knob`, `smDark`. `focusRing(color)` = anillo 3 dp. |
| `sideNav`, `SIDE_NAV_WIDTH` (248), `TABLET_BREAKPOINT` (768), `avatarColors` | Constantes. |
| `ThemeProvider`, `useTheme()` | `{ colors, scheme, isDark, mode, setMode, cardShadow }`; `mode`: `'system' \| 'light' \| 'dark'` guardado en AsyncStorage (`equiterm.themeMode`). |
| `makeStyles((colors, theme) => ({...}))` | Hook de estilos memorizado por esquema. |

`useResponsive()` (src/hooks) → `{ isTablet, width, height, isLandscape, pad, … }`.

## Átomos

| Componente | Props principales |
| --- | --- |
| `Text` | `variant` (typography), `weight`, `color` (token o literal, default `ink`), `size`, `align`, `tabular` + props de RN Text. |
| `Icon` | `name: IconName`, `size` (17 meta · 20 listas · 22 campos · 24 nav), `color`, `filled`. |
| `Button` | `title`, `onPress`, `variant`: `primary \| dark \| secondary \| tonal \| danger \| dangerSoft \| ghost \| ghostMuted`, `size`: `lg` 56 · `md` 52 · `sm` 44, `icon`, `iconRight`, `loading`, `loadingTitle`, `disabled`, `block` (default true), `style`. |
| `IconButton` | `icon`, `accessibilityLabel` (obligatorio), `onPress`, `variant`: `ghost \| soft \| outline \| fab`, `iconSize`, `color`, `disabled`. |
| `StatusChip` | `status` (crudo del API: deduce etiqueta/tono), `label`, `tone`: `neutral \| info \| warn \| ok \| err \| brand`, `dot` (default true), `icon`, `size`: `sm` 26 · `md` 28. Helpers: `statusTone(status)`, `roleTone(roleName, isAdmin)`, `toneColors(tone, colors)`. |
| `Avatar` | `name`, `size` (32/44/48/80), `color`, `onPress`. Helpers `initials()`, `avatarColor()`. |
| `Badge` | `count` (oculta en 0, «99+»), `size`: `sm` (sobre ícono, con borde) · `md` 22 · `lg` 26, `bordered`, `borderColor`. |
| `Switch` | `value`, `onValueChange`, `disabled`, `accessibilityLabel`. |
| `Radio`, `Checkbox` | `selected`, `onPress`, `label`, `description`, `disabled` (con label toda la fila es tocable). |
| `Spinner` | `size`: `lg` 44 · `sm` 20 · número, `color`, `trackColor`, `thickness`. |
| `ProgressBar` | `value` 0–100, `tone`: `info \| warn \| brand \| ok`, `showLabel`, `trackColor`. |
| `TextField` | Props de TextInput + `invalid`, `disabled`, `leftIcon`, `rightIcon` + `onRightIconPress`, `unit`, `password` (ojo mostrar/ocultar), `size`: `md` 52 · `sm` 48, `multiline` (mín. 96), `style` (contenedor), `inputStyle`. `ref` → TextInput. |
| `Skeleton` | `w`, `h`, `r`, `tone`: `soft \| line`. `ReportCardSkeleton` listo para listas. |
| `Logo` | `size`: `lg` · `md` · `sm`, `onDark`. |

## Moléculas

| Componente | Props principales |
| --- | --- |
| `LabeledField` | Todo `TextField` + `label`, `hint`, `error` (mensaje + borde), `containerStyle`, `children` (reemplaza el campo por otro control). `ref` → TextInput. |
| `SearchBar` | `value`, `onChangeText`, `placeholder`, `onClear`, `loading` + props de TextInput. |
| `FilterChip` | `label`, `count`, `selected`, `onPress` (píldora 40, seleccionado = ink). |
| `OptionChip` | `label`, `selected`, `onPress`, `icon`, `disabled` (48, radio 10, seleccionado brandSoft + borde brand). |
| `SegmentedControl<T>` | `options: {value,label,icon?}[]`, `value`, `onChange`. |
| `ListRow` | `title`, `subtitle`, `subtitleDot` (token, p. ej. `'ok'`), `avatarName` \| `icon` \| `leading`, `trailing`, `chevron`, `onPress`, `selected`, `divider`. Alto mín. 68. |
| `DataRow` | `label`, `value` (texto o nodo), `icon`, `onPress`, `chevron`, `divider`. Alto mín. 60. |
| `DataGrid` | `items: {label, value}[]`, `columns` (default 2). |
| `StepIndicator` | `steps: string[]`, `current` (0-based). |
| `AccessCard` | `icon`, `title`, `subtitle`, `loading`, `badge`, `locked`, `onPress`. |
| `Toast` | Presentacional: `kind`: `success \| error \| info \| warning`, `title`, `message`, `onClose`, `action` (`ToastAction`: `{ label, onPress }`, botón de texto brandInk). |
| `ToastProvider` / `useToast()` | `toast.show({ kind, title, message, duration = 3400, action })` (con `action` dura 6000 ms; al tocarla se cierra el aviso), `toast.hide()`. Ya montado en el layout raíz. |
| `ConnectionBanner` | `state`: `offline \| reconnected`, `pendingCount`, `message`. `useConnectionBanner(online, { reconnectedMs, onReconnect })`. Ya montado globalmente. |
| `CollapsibleHeader` | `title`, `summary`, `icon`, `expanded` / `defaultExpanded`, `onToggle`, `children`, `divider`. |

## Organismos

| Componente | Props principales |
| --- | --- |
| `TabBar` | `items: {key,label,icon,badge?}[]` (4), `activeKey`, `onSelect`, `onFabPress`, `fabLabel`. Usado por `app/(app)/(tabs)/_layout.tsx`. |
| `Header` | `variant`: `large` (título 28 + `action` tonal `{label, icon, onPress}`) · `compact` (60 alto, `onBack`, `backIcon`: `arrow_back \| close`, `subtitle`, `right`, `alignLeft`), `safeTop` (default true), `children` (buscador/filtros/pasos bajo el título). |
| `SideMenu` | `items: {key,label,icon,badge?,locked?}[]`, `activeKey`, `onSelect`, `user {name, role}`, `onUserPress`, `userActive`, `connection {online, server}`. Montado en `app/(app)/_layout.tsx` (tablet). |
| `ReportCard` | `report: ReportSummary`, `onPress(report)`, `selected`. |
| `ServiceCard` | `service: ServiceItem`, `duration`, `description`, `onPress`, `onDirections`, `onCreateReport` (botones ocultos si no se pasan). |
| `OutboxItem` | `title`, `subtitle`, `status`: `pending \| sending \| sent \| failed`, `progress`, `errorMessage`, `icon`, `onRetry`, `onPress`, `action` (`OutboxItemAction`: `{ label, icon?, onPress, loading?, loadingLabel?, disabled?, accessibilityLabel? }` → botón secundario chico bajo la fila, oculto mientras `sending`; la bandeja lo usa para «Ver PDF» en reportes sin enviar). |
| `ConfirmDialog` | `visible`, `title`, `message`, `icon`, `danger` (default true), `tone`, `confirmLabel`, `cancelLabel`, `confirmVariant`, `loading`, `onConfirm`, `onCancel`, `children`. `DialogFrame` = marco base para diálogos propios. |
| `InactivityDialog` | `visible`, `seconds` (60), `onStay`, `onLogout`, `onTimeout`, `message`. Lleva su propia cuenta regresiva. |
| `SignaturePad` | `onAccept({ path, width, height })` (path SVG `d`), `onClear`, `accepted`, `onDrawingChange(bool)` (desactiva el scroll del padre), `height` (220 / 300 tablet), `strokeWidth` (2.6), `placeholder`. |
| `EmptyState` | `icon`, `title`, `text`, `action {label, onPress, icon?, variant?}`, `fill`. |
| `SectionLoader` | `text` ("Cargando…"), `height`. |

## Plantillas

| Componente | Props principales |
| --- | --- |
| `Screen` | `header`, `footer`, `scroll` (true), `padding` (16 / 32 tablet), `maxWidth`, `background` (token, `bg`), `safeTop`, `safeBottom`, `refreshControl`, `keyboard`, `contentStyle`, `scrollProps`. |
| `ScreenFooter` | Pie fijo (asistente/formularios) con fila de botones, máx. 760. |

Ejemplo — pantalla de lista:

```tsx
<Screen header={<Header title="Agenda" action={{ label: 'Programar', icon: 'calendar_add_on', onPress }} />}>
  <ServiceCard service={s} onDirections={…} onCreateReport={…} />
</Screen>
```

Ejemplo — asistente:

```tsx
<Screen
  header={<Header variant="compact" title="Nuevo reporte" subtitle="Paso 2 de 5 · Equipo" backIcon="close" onBack={…}>
    <StepIndicator steps={STEPS} current={1} style={{ paddingHorizontal: 16, paddingBottom: 12 }} />
  </Header>}
  footer={<ScreenFooter><Button title="Anterior" variant="secondary" icon="arrow_back" style={{ flex: 1 }} /><Button title="Siguiente" iconRight="arrow_forward" style={{ flex: 1 }} /></ScreenFooter>}
  maxWidth={760}
>…</Screen>
```

## Navegación (para saber dónde va cada pantalla)

```
app/_layout.tsx                 Fuentes, ThemeProvider, Auth, Outbox, Toast, banner de conexión, Stack protegido
app/login.tsx, app/servidor.tsx Fuera del grupo autenticado
app/(app)/_layout.tsx           Stack autenticado; en tablet envuelve todo con SideMenu
app/(app)/(tabs)/_layout.tsx    Tabs con TabBar propio (teléfono); "+" → /reporte-nuevo
  index (Inicio) · reportes · agenda · bandeja · perfil (oculta) · usuarios (oculta)
app/(app)/reportes/[id].tsx     Detalle (teléfono)
app/(app)/reporte-nuevo.tsx     Asistente (sin barra de pestañas)
app/(app)/servicio-nuevo.tsx    Programar servicio
```

`src/navigation/destinations.ts` define `DEST` (href, etiqueta, ícono) y `destinationFromPath()`.
`src/context/OutboxContext.tsx` → `useOutbox()` `{ items, pendingCount, failedCount, refresh, flush }`
(insignias de Bandeja). Llama `refresh()` después de encolar algo.
