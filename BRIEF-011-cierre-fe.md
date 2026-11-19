# Brief 011 — Cierre de turno, CLIENTE (spec `006-cierre-turno`)

> Agente: `agy-fe-006`. Spec: `D:\Cevicheria\specs-cevicheria-lucy\specs\006-cierre-turno\`.
> Código: `D:\Cevicheria\app-cevicheria-lucy`. Ejecutar **después** del brief 010
> (socket) y del brief 008 (backend de cierre), que ya estarán commiteados.

## Reglas

- Solo `client/**` y `shared/types/shift.ts` (nuevo) o `shared/types/index.ts`.
  **No** tocar `server/**` ni specs.
- No `git commit`, no `npm run build`.
- **Sin pagos, IGV, SUNAT, facturación, propinas, cierre de caja, exportación ni tiempos.**
- El total en soles es **informativo** (`S/ 00.00`, centavos enteros). Etiquétalo así.
- Objetivos táctiles ≥ 44 px; tablas con scroll horizontal en móvil; sin cortes a 360 px.

## Contrato API (lo crea el brief 008; si un campo no coincide, adáptate al servidor real)

| Uso | Endpoint |
|---|---|
| Turno actual | `GET /api/shifts/current` → `ShiftDTO \| null` |
| Pendientes | `GET /api/orders?scope=active` (ENVIADO/LISTO), `GET /api/tables` (sesiones abiertas) |
| Resumen | `GET /api/shifts/:id/summary` → snapshot si `CERRADO`, cálculo en vivo si `ABIERTO` |
| Cierre | `POST /api/shifts/:id/close` body `{ observations? }` → `409 OPEN_ORDERS_REMAIN` / `OPEN_TABLES_REMAIN` / doble cierre |
| Cierre de mesa | `POST /api/table-sessions/:id/close` → `409 TABLE_HAS_ACTIVE_ORDERS` |
| Cierre manual de pedido | `POST /api/orders/:id/manual-close` body `{ reason }` |
| Registros PAPER | `GET/POST /api/shifts/:id/manual-records` |
| Ajuste de raciones | `POST /api/menu-items/:id/rations/adjust` body `{ remainingRations, reason }` |
| Historial de ajustes | `GET /api/menu-items/:id/rations/adjustments` |

Resumen esperado: `soldDishes[]`, `remainingRations[]`, `soldOutDishes[]`,
`cancellations[]`, `manualRecords[]`, `manualTotalCents`, `totalAmountCents`,
`observations`, `closedAt`. Usa `amountCents`/`totalAmountCents` (nunca floats).

## Entregables

### Fase 0

- T001: ruta `/encargado/cierre` con guard `ENCARGADO` en `AppRoutes`.
- T002: `client/src/api/shiftClose.api.ts` con errores normalizados
  (`error.response.data.error.code`).
- T003: `client/src/stores/shiftCloseStore.ts`: `shift`, `openOrders`, `openTables`,
  `summary`, `manualRecords`, `loading`, `error`, `loadAll`, `closeTable`, `closeShift`,
  `manualCloseOrder`, `addManualRecord`, `adjustRations`, `refreshSummary`.
- T004: `shared/types/shift.ts` (`ShiftSummary`, `SoldDishRow`, `RemainingRationRow`,
  `SoldOutRow`, `CancellationRow`, `ManualRecord`, `CreateManualRecordInput`).
- T005: `client/src/pages/encargado/ShiftClosePage.tsx` con secciones y navegación por anclas.

### Fase 1 — Pendientes (US-001)

- Pedidos `ENVIADO`/`LISTO` (mesa, `#orderNumber`, estado, ítems resumidos) y mesas con
  sesión abierta (código, apertura en `America/Lima`).
- Estado vacío “Todo cerrado”.
- Acciones por pedido: “Cerrar manualmente” (solo si el pedido está entregado sin marcar;
  ver US-005) y por mesa: “Cerrar mesa”.

### Fase 2 — Resumen (US-002)

- `SummaryCards`: total informativo, pedidos vendidos, raciones restantes, agotados,
  cancelaciones, registros manuales. Sin IGV ni “subtotal/impuesto”.
- `SoldDishesTable` agrupada por plato (cantidad, monto `S/ 00.00`).
- `RemainingRationsTable`, `SoldOutList` (con motivo), `CancellationsTable` (motivo + actor).
- Si el turno está `CERRADO`, muestra el snapshot y oculta acciones de escritura.

### Fase 3 — Cerrar mesas (US-003)

- Botón por mesa; si `TABLE_HAS_ACTIVE_ORDERS` → aviso y resalta esos pedidos.
- Tras cerrar: mesa desaparece de la lista y el resumen se refresca.

### Fase 4 — Cerrar turno (US-004)

- `ObservationForm` (opcional, máx. 500).
- `CloseShiftButton` deshabilitado si hay pendientes; si el servidor responde `409`,
  muestra el motivo y refresca listas.
- Confirmación explícita (“¿Cerrar el turno? No se podrán crear pedidos nuevos.”).
- Tras cerrar: muestra snapshot, badge `CERRADO`, y el botón de enviar pedido del mozo ya
  queda bloqueado por `SHIFT_NOT_OPEN` (no hay que tocar la spec 003).

### Fase 5 — Cierre manual (US-005)

- `ManualCloseModal` con motivo obligatorio (mín. 3 caracteres), solo `ENVIADO`/`LISTO`.
- Éxito → el pedido sale de pendientes y aparece en cancelaciones/cierre manual del resumen.

### Fase 6 — Registro por falla (US-006)

- `ManualRecordForm`: mesa (texto obligatorio), ≥ 1 ítem (`name`, `quantity` entero ≥ 1,
  `amountCents` entero ≥ 0), nota opcional. Se muestra aparte de `soldDishes`.
- Errores de validación locales antes de enviar.

### Fase 7 — Ajuste de raciones (US-007)

- `AdjustRationsModal`: `remainingRations` entero ≥ 0 + motivo obligatorio, para platos con
  límite de raciones del menú de hoy.
- Reutiliza el patrón visual de `client/src/components/menu/` (spec 002).

### Fase 8 — Pulido

- Enlace “Cierre de turno” en el dashboard del encargado (`/encargado`).
- `aria-live` para errores/éxitos; estados de carga; responsive 360/768/1024.
- Escaneo propio: 0 ocurrencias de pago/IGV/SUNAT/factura/tiempo/cronómetro.

## Pruebas (mockeando `shiftClose.api`)

- `client/src/stores/__tests__/shiftCloseStore.test.ts`: carga, 409 de cierre, cierre de mesa.
- `client/src/test/shiftCloseFlow.test.tsx`: pendientes visibles; resumen con montos exactos
  (`S/ 123.50`); cierre bloqueado con pendientes; cierre exitoso muestra snapshot; registro
  manual válido/ inválido; modal de cierre manual exige motivo.

## Verificación

```
npm run typecheck:client
npx eslint client/src
npm run test -w client
```

Reporta archivos, salidas reales y cualquier desajuste con el contrato del servidor.
