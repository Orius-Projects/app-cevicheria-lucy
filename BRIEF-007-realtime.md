# Brief 007 — Tiempo real (spec `005-avisos-tiempo-real`, backend)

> Agente: `agy-be-005`. Spec y contrato:
> `D:\Cevicheria\specs-cevicheria-lucy\specs\005-avisos-tiempo-real\`
> (`contracts/events.md` es la fuente canónica). Código: `D:\Cevicheria\app-cevicheria-lucy`.

## Reglas

- Solo `server/**`. **No** tocar `client/**`, `shared/**` ni specs.
- No `git commit`, no `npm run build`. `socket.io` ya está en `server/package.json`.
- No eventos de tiempo, demora, pago, IGV ni facturación.
- Emitir **después** de persistir. Si la emisión falla: log `EMIT_FAILED`, nunca revertir ni
  romper la request.
- El servidor de tests (`supertest(app)`) **no** inicializa Socket.IO: todos los emisores deben
  ser no-op seguros cuando no hay IO inicializado.

## Entregables

### Infraestructura (`server/src/realtime/`)

- `envelope.ts`: `buildEnvelope({ type, version, orderId, payload })` con
  `{ eventId: uuid, type, occurredAt: ISO, version, schemaVersion: 2, orderId, payload }`.
- `rooms.ts`: `role:MOZO`, `role:COCINERO`, `role:ENCARGADO`, `user:<id>`.
- `socket.ts`: `initRealtime(httpServer)`, `getIO()`, `closeRealtime()`. Handshake con
  `handshake.auth.token`; verifica JWT (`JWT_SECRET`), carga `User` y exige `active`.
  Errores: sin token `UNAUTHORIZED`, token vencido `TOKEN_EXPIRED`, usuario inactivo `FORBIDDEN`.
  Al conectar: une a `role:<rol>` y `user:<id>`. CORS con `env.CORS_ORIGIN`.
- `emitters.ts`: `emitOrderCreated/Ready/Delivered/Cancelled/ManualClosed`,
  `emitMenuAvailabilityChanged`, `emitShiftClosed`. Todos no-op si `!getIO()`.
- `index.ts`: barrel.
- `server/src/server.ts`: `initRealtime(server)` al escuchar; `closeRealtime()` en shutdown.

### Integración (después del commit de cada transición)

- `order.service.ts`: `create` (`order:created`), `markOrderReady` (`order:ready`),
  `deliverOrder` (`order:delivered`), `cancelOrder` (`order:cancelled`),
  `manualCloseOrder` (`order:manual-closed`). Incluye `payload.order` con el DTO formateado,
  `previousStatus` y `changedBy {id,name,role}`. `version` = nueva versión del pedido.
- `menu.service.ts`: `menu:availability-changed` en descuento de raciones al crear pedido,
  reposición por cancelación, `replenishRations`, `adjustRations`, `markSoldOut`, `reactivate`.
  Payload: `menuDayId`, `menuItemId`, `dishId`, `dishName`, `state`, `remainingRations`,
  `manuallySoldOut`, `changeType` (`RATION_DECREMENT`, `REPLENISH`, `ADJUSTMENT`, `SOLD_OUT`,
  `REACTIVATE`, `CANCELLATION_REVERSAL`) y `changedBy`.
- `order:ready` va a **todos** los mozos (sala `role:MOZO`), no solo al que tomó el pedido.
- `shift:closed` queda listo para que la spec 006 lo invoque (no lo dispares aún si no existe el
  cierre en esa ruta; el emisor sí debe existir).

## Pruebas

`server/tests/realtime-005.test.ts` (nuevo):

1. Handshake sin token → `connect_error` `UNAUTHORIZED`; token válido conecta.
2. Usuario inactivo → `FORBIDDEN`.
3. Salas: un `MOZO` recibe `order:ready`; un cliente sin rol no lo recibe; `COCINERO` recibe
   `order:created`.
4. Envelope: `eventId`, `schemaVersion: 2`, `type`, `version`, `orderId`, `payload.changedBy`.
5. Un evento de pedido real (crear + ready) llega a las salas correctas.
6. `payload.order` no contiene `passwordHash` ni `clientRequestId`/`statusHistory`.
7. Con IO no inicializado, las funciones de emisión no lanzan.

Usa `http.createServer(app)` + `socket.io-client`. Añade `socket.io-client` a
`devDependencies` de `server/package.json` si hace falta.

## Verificación

```
npm run typecheck:server
npx vitest run server/tests/realtime-005.test.ts
```

No corras la suite completa (otros agentes escriben tests en paralelo); el orquestador la corre
al final. Reporta archivos, eventos implementados y salidas reales.
