# Brief 008 — Cierre de turno (spec `006-cierre-turno`, backend)

> Agente: `agy-be-006`. Spec: `D:\Cevicheria\specs-cevicheria-lucy\specs\006-cierre-turno\`.
> Código: `D:\Cevicheria\app-cevicheria-lucy`. Ejecutar **después** del brief 007 (realtime).

## Reglas

- Solo `server/**`. No tocar `client/**`, `shared/**`, specs ni los archivos de `realtime/`
  (los crea el brief 007; solo consume `emitShiftClosed`).
- No `git commit`, no `npm run build`. Sin pagos/IGV/facturación/tiempos.
- El resumen al cerrar es un **snapshot inmutable**; no se recalcula después.

## Estado actual

- `shift.service.ts` ya tiene `closeShift` (valida pedidos activos y mesas abiertas, crea
  `ShiftSummary`) y `getShiftSummary` (solo lee snapshot existente).
- `shift.routes.ts`: `GET /current`, `POST /`, `POST /:id/close`, `GET /:id/summary`.
- No existe endpoint de registros manuales (`PAPER`).
- `order.service.ts` ya tiene `manualCloseOrder` y la ruta `POST /api/orders/:id/manual-close`.

## Entregables

1. **Preview del resumen** (`GET /api/shifts/:id/summary`):
   - Si el turno está `CERRADO` y hay `ShiftSummary`, devolver el snapshot.
   - Si está `ABIERTO`, calcular en vivo con la misma estructura del snapshot:
     `soldDishes` (plato, cantidades, `amountCents`), `remainingRations`,
     `soldOutDishes` (con motivo), `cancellations` (pedido, motivo, actor),
     `manualRecords`, `totalAmountCents` (informativo, sin IGV), `observations`, `closedAt`.
   - `404` si el turno no existe. Solo `ENCARGADO`.
2. **Registros manuales PAPER**:
   - Modelo `ManualRecord` (`shiftId`, `tableCode`, `items[{name, quantity, amountCents}]`,
     `notes?`, `source: 'PAPER'`, `createdBy`, timestamps).
   - `POST /api/shifts/:id/manual-records` (solo `ENCARGADO`): valida mesa e ítems no vacíos,
     cantidades enteras ≥ 1, montos enteros ≥ 0. Rechaza turno cerrado.
   - `GET /api/shifts/:id/manual-records` (solo `ENCARGADO`) o incluir en el resumen.
   - El resumen incluye `manualRecords` y `manualTotalCents`; **no** los mezcles con `soldDishes`.
3. **Cierre**:
   - Mantén `409 OPEN_ORDERS_REMAIN` / `OPEN_TABLES_REMAIN`.
   - Guarda observaciones en el snapshot.
   - Doble cierre → `409`.
   - Tras cerrar, `POST /api/orders` debe fallar con `SHIFT_NOT_OPEN` (ya existe; verifica).
   - Emite `shift:closed` con `{ shiftId, date, label, closedBy }` usando `emitShiftClosed`
     (`server/src/realtime`). No-op seguro en tests.
4. **Cierre manual de pedido**: verifica reglas (solo `ENVIADO`/`LISTO`, motivo obligatorio,
   `manualClose=true`, auditoría). Corrige solo si falta.

## Pruebas

`server/tests/shift-close-006.test.ts` (nuevo):

- Resumen en vivo con pedidos entregados, agotados y cancelaciones.
- Cierre con pendientes → `409`; cierre válido guarda snapshot y observaciones.
- Doble cierre → `409`; nuevo pedido tras cierre → `SHIFT_NOT_OPEN`.
- Registro manual válido aparece en el resumen; inválido → `422`.
- Cierre manual: `LISTO` → `ENTREGADO` con `manualClose`; sin motivo → `422`; terminal → `409`.

## Verificación

```
npm run typecheck:server
npx vitest run server/tests/shift-close-006.test.ts
```

No corras la suite completa (otros agentes escriben tests). Reporta archivos, endpoints y salidas.
