# Equiterm — App móvil (fase 1, prueba)

App de **Equiterm Industries** hecha con React Native + Expo (SDK 58) y Expo Router.
Consume el API móvil de Laravel en `/api/mobile/v1`.

Funciones de esta versión:

- Inicio de sesión con correo y contraseña (token guardado de forma segura en el dispositivo).
- Inicio automático si ya había sesión; si el servidor responde 401 se regresa al login.
- Menú según permisos del rol: **Reportes de servicio** y **Agenda de servicios**.
- Reportes: búsqueda, deslizar para actualizar, scroll infinito, estatus, firmado, detalle con fotos y botón **Ver PDF**.
- Agenda: servicios de los próximos 14 días agrupados por día.
- Sin conexión: muestra los últimos datos guardados con el aviso *"Sin conexión — mostrando datos guardados"*.
- Tablet: en Reportes se ve la lista a la izquierda y el detalle a la derecha. Funciona vertical y horizontal.

---

## Requisitos

- **Node.js LTS** (20 o 22) en la PC — <https://nodejs.org>. Verifica con `node -v`.
- **Expo Go** en los teléfonos/tablets:
  - iPhone/iPad: App Store → "Expo Go".
  - Android: Play Store → "Expo Go".
  - Debe ser la versión actual de Expo Go (compatible con Expo SDK 58).
- La PC y los teléfonos conectados a la **misma red Wi‑Fi**.
- El proyecto Laravel funcionando en Laragon, con el API móvil (`/api/mobile/v1`).

---

## Pasos en Windows (Laragon)

### 1. Instalar dependencias

Abre la terminal de Laragon (o PowerShell) en la carpeta del proyecto Laravel:

```bash
cd app-movil
npm install
```

### 2. Configurar la IP del servidor

1. Averigua la IP de tu PC en la red Wi‑Fi:
   ```bash
   ipconfig
   ```
   Busca el adaptador **Wi‑Fi** (o Ethernet si la PC está por cable) → **Dirección IPv4**, por ejemplo `192.168.1.50`.
2. Copia el archivo de ejemplo:
   ```bash
   copy .env.example .env
   ```
3. Edita `app-movil/.env` y pon tu IP:
   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.50:8000
   ```
   (sin `/` al final y sin `/api/...`; la app agrega `/api/mobile/v1` sola).

> Si cambias el `.env`, detén Expo y vuelve a correr `npx expo start` para que tome el nuevo valor.

### 3. Levantar el API de Laravel

En **otra** terminal, desde la carpeta raíz del proyecto Laravel (no dentro de `app-movil`):

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

- `--host=0.0.0.0` es indispensable: sin eso Laravel sólo acepta conexiones de la propia PC.
- La primera vez Windows mostrará el aviso del **Firewall** para PHP: marca **Redes privadas** y da **Permitir acceso**.
- Prueba desde el navegador del teléfono: `http://192.168.1.50:8000` debe abrir el sitio.

### 4. Arrancar la app

En la terminal de `app-movil`:

```bash
npx expo start
```

Aparecerá un código QR:

- **iPhone/iPad:** abre la app **Cámara**, apunta al QR y toca el aviso "Abrir en Expo Go".
- **Android:** abre **Expo Go** → "Scan QR code" y escanea el QR.

La primera carga tarda un poco (se construye el paquete JavaScript). Los cambios en el código se recargan solos.

---

## Cambiar el servidor desde la app

Si la IP de la PC cambia no hace falta editar el `.env`:

- En la pantalla de login toca **"Configurar servidor"** (abajo), o toca **5 veces el logo**.
- Escribe la nueva dirección (`http://IP:8000`), toca **Probar conexión** y luego **Guardar**.
- **"Usar valor del .env"** borra la dirección personalizada.

La pantalla de login muestra siempre el servidor que se está usando. Al cambiar de servidor estando
dentro de la app se cierra la sesión.

---

## Solución de problemas

| Problema | Qué revisar |
| --- | --- |
| El teléfono no abre la app / se queda cargando con el QR | Que ambos estén en la misma Wi‑Fi (no la de invitados). Si no funciona, usa **`npx expo start --tunnel`** (la primera vez pedirá instalar `@expo/ngrok`; acepta). |
| "No se pudo conectar con el servidor" al iniciar sesión | ¿Está corriendo `php artisan serve --host=0.0.0.0 --port=8000`? ¿La IP del `.env`/servidor es correcta? ¿Abre `http://IP:8000` en el navegador del teléfono? |
| Funciona en la PC pero no en el teléfono | **Firewall de Windows**: permite "PHP" y "Node.js" en redes privadas (Panel de control → Firewall → Permitir una aplicación). Verifica que la red Wi‑Fi esté marcada como **Privada** en Windows. |
| Cambió la IP de la PC (router reiniciado, otra red) | Corre `ipconfig` de nuevo y actualiza el `.env` (y reinicia `npx expo start`) o usa **Configurar servidor** en el login. |
| "El servidor respondió, pero no encontró el API móvil (404)" | El proyecto Laravel no tiene las rutas `/api/mobile/v1` (haz `git pull` y `php artisan route:clear`). |
| Con `--tunnel` la app abre pero no conecta al API | El túnel sólo sirve para Expo; el API sigue necesitando la IP local (misma Wi‑Fi) o una URL pública. |
| Pantalla roja de error | Detén Expo y corre `npx expo start -c` (limpia la caché de Metro). |
| "Sin conexión — mostrando datos guardados" | La app no pudo contactar el servidor; muestra lo último que se descargó. Desliza hacia abajo para reintentar. |

---

## Comandos útiles

```bash
npx expo start          # servidor de desarrollo (QR)
npx expo start -c       # igual, limpiando caché
npx expo start --tunnel # si la red local no funciona
npx tsc --noEmit        # revisar tipos TypeScript
npx expo-doctor         # diagnosticar dependencias
npx expo install <paq>  # instalar paquetes compatibles con el SDK (no usar npm install <paq>)
```

---

## Estructura

```
app-movil/
├── app/                      # Rutas (Expo Router, un archivo = una pantalla)
│   ├── _layout.tsx           # Proveedores, Stack y protección de rutas por sesión
│   ├── login.tsx             # Inicio de sesión
│   ├── servidor.tsx          # Configurar servidor (URL en tiempo de ejecución)
│   ├── index.tsx             # Inicio (menú por permisos)
│   ├── agenda.tsx            # Agenda de servicios (14 días)
│   └── reportes/
│       ├── index.tsx         # Lista (y maestro-detalle en tablet)
│       └── [id].tsx          # Detalle (teléfono)
├── src/
│   ├── api/client.ts         # fetch con URL base, token, errores y endpoints
│   ├── api/types.ts          # Tipos del API
│   ├── context/AuthContext.tsx
│   ├── components/           # Botones, campos, tarjetas, detalle, galería, banners
│   ├── hooks/                # useResponsive, useOnline, useCachedFetch
│   ├── lib/cache.ts          # Caché sin conexión (AsyncStorage)
│   ├── lib/config.ts         # URL del servidor (.env + override)
│   ├── lib/format.ts         # Fechas y etiquetas
│   ├── lib/outbox.ts         # (Fase 3) cola de envíos sin conexión — sólo diseño
│   └── theme.ts              # Colores de marca y escalas teléfono/tablet
├── app.json
└── .env.example
```

---

## Antes de producción

- **Quitar el tráfico HTTP sin cifrar** de `app.json`, y usar `https://` en el servidor:
  - `ios.infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads` → eliminar.
  - Plugin `expo-build-properties` → `android.usesCleartextTraffic: true` → eliminar.
  - (En Expo Go estas opciones no aplican; sólo afectan a builds propios con EAS.)
- Generar builds firmados con EAS (`npx eas-cli@latest build`) en lugar de usar Expo Go.
- Definir íconos y splash definitivos de Equiterm en `assets/`.
