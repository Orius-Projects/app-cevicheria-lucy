# Brief 010 — Tiempo real, CLIENTE (spec `005-avisos-tiempo-real`)

> Agente: `agy-fe-005`. Spec: `D:\Cevicheria\specs-cevicheria-lucy\specs\005-avisos-tiempo-real\`
> (`contracts/events.md` es la fuente canónica). Código: `D:\Cevicheria\app-cevicheria-lucy`.
> El backend de eventos **ya está implementado y commiteado** (`server/src/realtime/**`,
> emisiones en `order.service.ts` y `menu.service.ts`).

## Reglas

- Solo `client/**` (y tipos nuevos en `shared/types/index.ts` si hace falta).
  **No** tocar `server/**` ni specs.
- No `git commit`, no `npm run build` (lo hace el orquestador).
- Sin tiempos/cronómetros/alertas de demora, sin pagos/IGV/facturación, sin push del SO.
- El polling actual debe **mantenerse como fallback** (NFR-010): si el socket no conecta,
  todo sigue funcionando por REST.
- Un solo socket por pestaña. Sin listeners duplicados (NFR-008).

## Contexto del servidor (ya existente)

- Handshake: `io(url, { auth: { token } })`; rechaza sin token `UNAUTHORIZED`,
  token vencido `TOKEN_EXPIRED`, usuario inactivo `FORBIDDEN` (llega en `connect_error.message`).
- Envelope: `{ eventId, type, occurredAt, version, schemaVersion: 2, orderId?, payload }`.
- Tipos: `order:created`, `order:ready`, `order:delivered`, `order:cancelled`,
  `order:manual-closed`, `menu:availability-changed`, `shift:closed`.
- `payload` de pedidos: `{ order, previousStatus, changedBy }`; el `order` ya viene sin
  `passwordHash`, `clientRequestId` ni `statusHistory`.
- `menu:availability-changed`: `{ menuDayId, menuItemId, dishId, dishName, state,
  remainingRations, manuallySoldOut, changeType, changedBy }`.
- URL: `import.meta.env.VITE_SOCKET_URL` o `window.location.origin`; misma instancia/puerto.
  El proxy de Vite ya reenvía `/socket.io` en dev (verifícalo; si falta, no toques
  `vite.config.ts` — repórtalo porque lo hace el agente de despliegue).

## Entregables

### 1. Cliente socket (`client/src/api/socket.ts`)

- Singleton `getSocket()` / `connectSocket()` / `disconnectSocket()`.
- Token desde `localStorage.getItem('auth_token')` (igual que `apiClient`).
- `autoConnect: false`, `transports: ['websocket', 'polling']`, reconexión con backoff.
- `socket.io-client` ya debe estar en `client/package.json`; si no, instálalo
  (`npm install socket.io-client -w client`).

### 2. Estado de conexión (`client/src/stores/realtimeStore.ts`)

- `status: 'connected' | 'connecting' | 'disconnected' | 'error'`, `lastEventAt`,
  `lastError`, y acciones `setStatus`.
- `useRealtimeConnection()` en `client/src/hooks/useRealtimeConnection.ts`:
  conecta al montar (si hay token), desconecta al desmontar/logout, expone el estado.
  En `UNAUTHORIZED`/`TOKEN_EXPIRED` → `logout()` del `authStore` (redirige a login).
- `useRealtimeEvents(handlers)` interno con dedupe por `eventId` (`Set` acotado, máx. 500)
  y descarte si `version <=` la última conocida por `orderId`.

### 3. Refactor de los hooks existentes

- `client/src/hooks/useOrderEvents.ts`: suscribe a los 7 eventos; en `order:created|ready|
  delivered|cancelled|manual-closed` aplica al `ordersStore` (usa `upsertOrder`/`removeOrder`
  ya existentes o añade acciones equivalentes) y en `menu:availability-changed` refresca el
  menú del día / aplica el cambio al `menuStore`. Resync REST en `connect` (reconexión) y al
  volver del background. Polling baja a 60 s cuando el socket está conectado y vuelve a 15 s
  si se cae.
- `client/src/hooks/useKitchenEvents.ts`: igual para cocina con `order:created|ready|
  delivered|cancelled|manual-closed`; resync del board al reconectar; polling 60 s conectado /
  10 s desconectado.

### 4. Notificaciones (`client/src/stores/notificationsStore.ts`)

- Cola de toasts con `eventId` como clave (dedupe), `type`, `message`, `orderId`, `createdAt`,
  `read`; acciones `push`, `dismiss`, `markAllRead`; límite 20.
- `NotificationCenter` (campana con badge de no leídos) montado en el layout del mozo
  (`/mozo`) y en `KitchenHeader` (sin sonido en cocina).
- Toast visible en cualquier pantalla del mozo al recibir `order:ready` con el número de
  pedido y mesa. `aria-live="polite"` para el contenedor de toasts.
- Sonido en `client/src/utils/notificationSound.ts`: WebAudio con oscilador (sin assets),
  `playReadySound()`; si `AudioContext` está bloqueado o falla, solo log debug y el aviso
  visual permanece. Añade un toggle “Sonido” persistido en `localStorage` (por defecto ON).
- **Todos** los mozos reciben el aviso (no filtres por dueño del pedido).

### 5. Banner de conexión

- Reutiliza/crea `ConnectionBanner` visible en `/mozo` y `/cocina` cuando el estado no es
  `connected` (“Reconectando…” / “Sin conexión: los datos se actualizan por REST”).

### 6. `shift:closed`

- Al recibirlo: marcar el turno como cerrado en el store correspondiente y, en el mozo,
  bloquear el botón de enviar pedido (mismo guard FR-008 de la spec 003). No navegues a otra
  ruta automáticamente; muestra un aviso.

## Pruebas (nuevas, mockeando `socket.io-client`)

- `client/src/test/realtimeDedupe.test.ts`: mismo `eventId` dos veces → un toast/una mutación;
  `version` menor → ignorado; 1 000 eventos sin duplicados.
- `client/src/test/realtimeNotifications.test.tsx`: `order:ready` muestra toast + badge;
  audio bloqueado no rompe; dos eventos distintos → dos toasts.
- `client/src/test/realtimeResync.test.tsx`: al reconectar llama a `refreshAll`/`getBoard`.
- No modifiques pruebas existentes salvo que un cambio de API interno lo exija; si lo haces,
  reporta exactamente qué y por qué.

## Verificación

```
npm run typecheck:client
npx eslint client/src
npm run test -w client
```

No corras la suite de servidor ni `npm run build`. Reporta archivos, salidas reales y bloqueos.
