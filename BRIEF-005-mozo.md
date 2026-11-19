# Brief 005 — Toma de pedidos (spec `003-toma-pedidos-mozo`)

> Reparto de trabajo entre 3 agentes `agy`. El orquestador verifica y commitea.
> Specs: `D:\Cevicheria\specs-cevicheria-lucy\specs\003-toma-pedidos-mozo\`
> Código: `D:\Cevicheria\app-cevicheria-lucy`

## Reglas duras (aplican a todos)

- No `git commit`, no `git push`, no tocar el repo de specs.
- No pagos, IGV, propinas, facturación, delivery, APK, tiempos de cocina ni cronómetros.
  No existe `EN_PREPARACION`; los estados son `ENVIADO`, `LISTO`, `ENTREGADO`, `CANCELADO`
  (+ `BORRADOR` solo en UI).
- Dinero en **centavos enteros**; mostrar con `S/ 00.00`. Fechas ISO 8601 UTC; mostrar en
  `America/Lima`.
- El servidor manda: no recalcular totales ni raciones en cliente como fuente de verdad.
- No editar archivos fuera de tu propiedad. No `npm run build` (lo hace el orquestador).
- Reporta archivos tocados y salidas reales de comandos. Si un comando falla, pega el error.

## Propiedad de archivos

| Agente | Puede tocar | No puede tocar |
|---|---|---|
| `agy-fe` | `client/**`, `shared/types/index.ts` (solo tipos nuevos) | `server/**`, specs |
| `agy-be` | `server/**` | `client/**`, `shared/**`, specs |
| `agy-qa` | solo archivos nuevos de prueba: `server/tests/e2e-orders-003.test.ts` | todo `src/**`, tests existentes, specs |

## Contrato API ya implementado (verificado por el orquestador)

Errores: `{ error: { code, message, details? } }`.

| Uso | Endpoint | Cuerpo / query | Respuesta |
|---|---|---|---|
| Crear | `POST /api/orders` | `{ tableId, items:[{dishId, quantity, variationIds?, notes?}], notes?, clientRequestId? }` | `201` OrderDTO; `200` si `clientRequestId` repetido |
| Activos | `GET /api/orders?scope=active` | — | `{ data: OrderDTO[], meta }` |
| Listos | `GET /api/orders?scope=ready` | — | igual |
| Detalle | `GET /api/orders/:id` | — | OrderDTO |
| Entregar | `PATCH /api/orders/:id/deliver` | `{ version }` | OrderDTO; `409 VERSION_CONFLICT` |
| Cancelar | `PATCH /api/orders/:id/cancel` | `{ reason, version }` | OrderDTO |
| Cocina listo | `PATCH /api/orders/:id/ready` | `{ version }` | solo `COCINERO` |
| Mesas | `GET /api/tables` | — | `{ data: [{ id, code, zone, seats, state, openSessionId }] }` |
| Cerrar mesa | `POST /api/table-sessions/:id/close` | `{ notes? }` | sesión; `409` si hay pedidos activos |
| Menú hoy | `GET /api/menu/today` | — | `{ menuDayId, date, status, sections:[{ name, key, items }] }` |
| Turno | `GET /api/shifts/current` | — | turno actual (`status: ABIERTO`) |

Códigos de error relevantes: `DISH_UNAVAILABLE`, `RATION_UNAVAILABLE`, `VERSION_CONFLICT`,
`TABLE_INACTIVE`, `MENU_NOT_PUBLISHED`, `VALIDATION_ERROR`.

Los `items` del menú de hoy vienen **planos** (`description`, `variations`, `status`,
`remainingRations`), no anidados en `dish`.

## `agy-fe` — Frontend (Fases 0–2 y 4–8 de `tasks.md`)

Implementa el flujo completo del mozo en `client/src` reutilizando lo de `002`.

### Rutas (T001)

- `/mozo` → `WaiterDashboardPage` (mesas + pedidos activos/listos).
- `/mozo/pedido/nuevo` → `NewOrderPage`.
- `/mozo/pedidos` → `ActiveOrdersPage`.
- `/mozo/pedidos/:id` → `OrderDetailPage`.
- Mantén `/mozo/menu` y el resto de rutas existentes. Guard `MOZO`/`ENCARGADO`.

### API y tipos (T002–T005)

- `client/src/api/orders.api.ts`: `create`, `listActive`, `listReady`, `getById`, `deliver`,
  `cancel`. Tipados; extrae `error.response.data.error.code`.
- `client/src/api/tables.api.ts`: `list`, `closeSession` (o envuelve lo actual).
- Tipos en `shared/types/index.ts`: `OrderDraft`, `OrderDraftItem`, `CreateOrderInput`,
  `OrderListResponse`, `TableWithSession`. Reexporta si hace falta.
- `client/src/utils/money.ts` (`formatSoles(cents)`), `client/src/utils/datetime.ts`
  (`formatLima(iso)`, sin “hace X minutos”). Pruebas unitarias.

### Stores (T006–T008, T048–T049)

- `orderDraftStore`: mesa, ítems (`dishId`, nombre, precio, cantidad, `variationIds`,
  `variations`, `notes`, `remainingRations`), nota general, `clientRequestId` **estable**
  (no regenerar en cada intento). Persistencia `zustand/persist`; limpiar al enviar/descartar.
- `ordersStore`: `active`, `ready`, `detail`, `loading`, `error`, `refreshAll`, dedupe por `id`,
  actualización tras entregar/cancelar y resync al reconectar.
- `tablesStore`: extender el existente sin romper `WaiterPage`; `state`, `openSessionId`.

### Componentes (T010–T014)

`client/src/components/mozo/`: `TableSelector` (puedes reutilizar el de `components/waiter`),
`QuantityStepper`, `OrderCart`, `VariationSheet`, `ItemNotesModal` (140 ítem / 280 general),
`OrderSummary` (total exacto en centavos), `OrderStatusBadge`, `ReadyOrderCard`,
`CancelOrderModal` (motivo obligatorio; aviso extra si `LISTO`: “Coordina con cocina”).

Sin tiempos, sin pagos, sin IGV. Objetivos táctiles ≥ 44 px, `aria-live` para errores.

### Páginas y flujo

- `NewOrderPage` (T015–T020): validar turno abierto, menú publicado, mesa e ítems; mostrar
  disponibilidad/raciones; deshabilitar `AGOTADO`/`INACTIVO`; limitar cantidad a
  `remainingRations`; variaciones solo del plato; resumen con mesa/ítems/variaciones/notas/total.
- Envío (T022–T028): bloquear doble tap, `clientRequestId`, aceptar `200/201`, confirmación con
  `orderNumber`, limpiar borrador, impedir edición posterior. Ante `DISH_UNAVAILABLE` /
  `RATION_UNAVAILABLE`: recargar menú y refrescar carrito con mensaje claro.
- Dashboard y activos (T029–T034): todos los pedidos `ENVIADO`/`LISTO` de todos los mozos, con
  mesa, ítems y quién tomó; panel “Listo para recoger”; ningún terminal en activos.
- Entregar (T035–T038): botón solo en `LISTO`; `PATCH deliver` con `version`; si `409`,
  refrescar sin dejar estado inconsistente.
- Cancelar (T039–T043): modal con motivo; `LISTO` advierte; `PATCH cancel` con `version`;
  cancelados visibles en historial con motivo; terminal no cancelable.
- Cerrar mesa (T044–T047): solo si no hay pedidos activos; `POST close`; refrescar a `LIBRE`;
  al volver a pedir se abre sesión nueva.
- `useOrderEvents` (T009/T032/T033): hook contra el contrato de
  `specs\005-avisos-tiempo-real\contracts\events.md` (`order:created|ready|delivered|cancelled`).
  El servidor aún no emite Socket.IO: si no hay `VITE_SOCKET_URL` o falla la conexión, usa
  polling cada 15 s y resync al reconectar. No debe romper en tests/jsdom.
- Responsive 360/768/1024 y accesibilidad básica (T051–T052). Extiende
  `client/src/test/constitutionCheck.test.ts` con términos prohibidos (`tiempo`, `demora`,
  `igv`, `propina`, `pago`, `EN_PREPARACION`).

### Pruebas del frontend

Archivos nuevos en `client/src/**/__tests__` y `client/src/test/` (no uses
`server/tests/e2e-orders-003.test.ts`, es de QA). Cubre: armado (agotado/raciones/variaciones),
envío e idempotencia, dos mozos viendo lo mismo, entrega solo `LISTO`, cancelación, cierre y
persistencia del borrador. Mockea `orders.api`/`tables.api`; no dependas de Mongo.

### Verificación obligatoria

```
npm run typecheck:client
npm run lint
npm run test -w client
```

## `agy-be` — Backend (auditoría + huecos de spec 003)

El backend de pedidos existe desde `001`. **No reescribas**; audita contra la spec y corrige
solo huecos reales. Revisa y deja evidencia de:

1. `GET /api/orders?scope=active` devuelve solo `ENVIADO`/`LISTO`; `scope=ready` solo `LISTO`.
2. `POST /api/orders` idempotente por `clientRequestId` (mismo pedido, `200`, sin descontar
   raciones dos veces).
3. `deliver` solo desde `LISTO`, con `version`; `409 VERSION_CONFLICT`; registra `deliveredBy`.
4. `cancel`: motivo obligatorio; `ENVIADO` repone raciones; `LISTO` no repone; terminal `409`.
5. `close` de mesa: `409` con pedidos activos; registra `closedBy`; mesa queda `LIBRE`.
6. Mesa `LIBRE` + nuevo pedido abre sesión nueva.
7. `variationIds` ajenos al plato → `422`; plato agotado → `DISH_UNAVAILABLE`; sin raciones →
   `RATION_UNAVAILABLE`.
8. Que `GET /api/orders` no exponga `passwordHash` ni datos internos.

Añade `server/tests/orders-003.test.ts` (nuevo) con los casos que falten. No modifiques
`server/tests/e2e-orders-003.test.ts` (QA). Si corriges `server/src`, explica el porqué y el
archivo:línea.

### Verificación obligatoria

```
npm run typecheck:server
npm run test -w server
```

## `agy-qa` — Pruebas independientes

Único archivo: `server/tests/e2e-orders-003.test.ts` (nuevo). Usa el harness existente
(`mongodb-memory-server`, Supertest, seed/login reales). Cubre el flujo completo:

1. Login `mozo1`, `mozo2`, `cocinero1`, `encargado1`.
2. Encargado publica menú del día (o usa el seed) y abre turno si hace falta.
3. `mozo1` crea pedido con 2 ítems, variación y notas → `201`, `ENVIADO`, total exacto.
4. `mozo2` ve el pedido en `scope=active` y en el detalle (mismo registro).
5. `cocinero1` marca `ready` con `version` → `LISTO`; ambos mozos lo ven en `scope=ready`.
6. `mozo2` entrega con `version` → `ENTREGADO`, `deliveredBy` = mozo2; sale de activos.
7. Mesa con pedido activo no se puede cerrar (`409`); tras entregar, se cierra y queda `LIBRE`.
8. Nuevo pedido en mesa libre abre sesión nueva.
9. Cancelar `ENVIADO` repone raciones; cancelar `LISTO` no repone; cancelar terminal `409`.
10. Doble `POST` con el mismo `clientRequestId` → un solo pedido.
11. Escaneo estático en `client/src` y `server/src` de términos prohibidos (pagos, IGV,
    propinas, facturación, tiempos/cronómetros, `EN_PREPARACION`, `preparationTime`).

No edites `src/**` ni tests existentes. No commitees. Reporta salidas reales y cualquier
hallazgo con archivo:línea. La suite completa la correrás cuando el orquestador te avise.

### Verificación obligatoria

```
npx vitest run server/tests/e2e-orders-003.test.ts
```

## Criterios de aceptación (Definition of Done)

- Pedido creado una sola vez, con número, `ENVIADO` y raciones descontadas exactas.
- Todos los mozos ven activos y listos; cualquiera entrega un `LISTO`.
- Cancelación aplica la regla de raciones y exige motivo.
- Cierre de mesa solo sin pedidos activos y reapertura en el siguiente pedido.
- Sin tiempos, pagos, IGV ni propinas.
- `typecheck`, `lint`, `build` y toda la suite en verde.
