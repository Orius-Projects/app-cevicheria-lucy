# Encargo — 002 Menú, raciones y agotados (UI)

> Orquestador: OpenCode. Desarrollador: agy.
> Base verificada: `001` completo (commits `a2ee939`, `b629949`, `ccd9493`), 60 pruebas backend.

## 1. Lee antes de escribir código

1. `D:\Cevicheria\specs-cevicheria-lucy\specs\002-menu-raciones\spec.md`
2. `D:\Cevicheria\specs-cevicheria-lucy\specs\002-menu-raciones\plan.md` (§3–§10)
3. `D:\Cevicheria\specs-cevicheria-lucy\specs\002-menu-raciones\tasks.md` (T001–T050)
4. `D:\Cevicheria\specs-cevicheria-lucy\specs\001-plataforma-base\contracts\rest-api.md` §8–§11
5. `D:\Cevicheria\app-cevicheria-lucy\ROADMAP.md`

## 2. Alcance

Implementa la UI del feature `002`. El backend de menú y raciones ya existe y está probado
(no lo reescribas; solo consume la API).

### Fase 0 — Setup cliente (T001–T005)

- `client/src/api/menu.api.ts` tipado: secciones, platos, menú del día, publicación,
  raciones, agotado/reactivación e historial. Usa `apiClient` (JWT ya configurado).
- `menuAdminStore.ts` y `menuPublicStore.ts` con las acciones del `plan.md` §7.
- `client/src/utils/dishState.ts`: **re-exporta `deriveDishStatus` de `@cevicheria/shared`**.
  No dupliques la regla.
- Tipos de menú en `shared/types/` si falta alguno (`Dish`, `MenuDay`, `MenuItem`, `DishState`).

### Fase 1 — Maestro de platos (T006–T011)

- `DishesPage` en `client/src/pages/encargado/DishesPage.tsx`: lista, filtro por sección,
  alta/edición, baja lógica, `VariationEditor` sin costo.
- Validaciones: `priceCents` entero ≥ 0, nombres no vacíos, variaciones sin duplicados.

### Fase 2 — Menú del día (T012–T018)

- `MenuDayPage`: selector de fecha, estado `BORRADOR`/`PUBLICADO`.
- `MenuSectionTabs` + `DishPicker` para agregar platos por sección.
- Activar/desactivar platos del día, configurar precios del día.
- `PublishMenuButton`: bloquea si no hay ítems activos (`422` → mensaje claro).
- Tras publicar, el menú del mozo se refresca (sin Socket.IO todavía).

### Fase 3 — Raciones (T019–T023)

- `RationInput` + `RationBadge`: `hasRationsLimit`, `totalRations`, `remainingRations`,
  `lowStockThreshold` (default 5).
- Validar `remainingRations` entero ≥ 0 y ≤ `totalRations` en la configuración inicial.
- Variaciones: solo las permitidas del plato; **sin costo** y sin alterar el total.

### Fase 4 — Menú publicado (T024–T029)

- `MenuView` reutilizable en `client/src/pages/shared/MenuView.tsx`: tabs por sección,
  `DishCard`, `AvailabilityBadge` (`DISPONIBLE`, `ULTIMAS_RACIONES`, `AGOTADO`).
- Mostrar “Quedan N” cuando hay límite.
- “Agregar” deshabilitado para `AGOTADO`/`INACTIVO`.
- Toast cuando un plato pasa a agotado (“Ofrece una alternativa”).
- Integrar `MenuView` en la vista del mozo (`/mozo/menu`), sin carrito (eso es `003`).

### Fase 5 — Descuento y disponibilidad (T030–T034)

- T030/T031: el backend ya descuenta al enviar. En el cliente, refresca el menú tras enviar
  un pedido: deja `refreshAfterOrder()` en `menuPublicStore` listo para `003`.
- T032: implementa `applyAvailabilityEvent(payload)` en `menuPublicStore`.
  **No** conectes Socket.IO: el cableado es de `005`.
- T033/T034: ya cubiertos por `server/tests/orders.test.ts` (concurrencia y cancelación).
  No dupliques; enlázalos en el reporte.

### Fase 6 — Reposición (T035–T039)

- `ReplenishRationsModal`: motivo obligatorio, integra
  `POST /api/menu-items/:id/rations/replenish`, recalcula badge.
- Si `manuallySoldOut` sigue activo, el plato sigue `AGOTADO`.

### Fase 7 — Agotado y ajustes (T040–T044)

- `SoldOutModal` (motivo obligatorio), `AdjustRationsModal` (conteo ≥ 0 + motivo),
  `AdjustmentHistory` con actor, motivo, antes/después y fecha.
- Integrar `POST /sold-out` y `/reactivate`.

### Fase 8 — Pruebas y pulido (T045–T050)

- Añadir infraestructura de pruebas de cliente: `vitest`, `jsdom`,
  `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`;
  script `test` real en `client` y en la raíz.
- Pruebas mínimas: `dishState`, `AvailabilityBadge`, `RationBadge`, validación de
  `PublishMenuButton` y `ReplenishRationsModal`.
- Responsive 360/768/1024 px, objetivos táctiles ≥ 44 px.
- Verificar ausencia de campos de costo, IGV o pago.
- E2E: si Playwright no está disponible, deja un test de integración API
  “publicar → menú del mozo → agotar → bloqueo” y documenta la decisión.

## 3. Integración con lo existente

- Mantén el layout y el header actuales; añade navegación del encargado:
  `/encargado` (turnos), `/encargado/menu`, `/encargado/platos`, `/encargado/raciones`.
- No rompas `LoginPage`, guards por rol, `TableSelector` ni `AdminPage`.
- No toques el backend salvo que falte un dato imprescindible; si lo haces, justifícalo y
  añade pruebas.
- No implementes carrito, pedidos ni cocina.

## 4. Reglas duras

- Español en la UI. Tailwind, sin librerías de UI nuevas.
- Sin `EN_PREPARACION`, sin tiempos de cocina, sin pagos/IGV/SUNAT.
- Sin `any` nuevos injustificados. TypeScript estricto.
- No toques el repositorio de specs. No hagas `git commit`.
- No inventes endpoints: usa el contrato.

## 5. Criterios de aceptación (con salida real)

1. `npm run typecheck`, `npm run lint`, `npm run build` sin errores.
2. `npm test` pasa: backend (60) + cliente (nuevas).
3. La UI del encargado permite crear plato, armar menú del día y publicarlo.
4. El menú publicado muestra badges y bloquea agotados.
5. Reponer y ajustar exigen motivo y refrescan el estado.
6. Responsive verificado a 360 px.
7. Reporte final con archivos, salidas y desviaciones.
