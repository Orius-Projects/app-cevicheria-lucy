# Hallazgos de revisión — Milestone 3 (001 Fases 5–8)

> Revisión del orquestador sobre `server/src/services/order.service.ts` y `menu.service.ts`.
> Las 56 pruebas pasan, pero estos casos no están cubiertos. Corregir + agregar pruebas de regresión.

## H1 — CRÍTICO: doble compensación de raciones en `createOrder`

**Ubicación:** `server/src/services/order.service.ts`, descuento secuencial (líneas ~177–265).

**Qué pasa:** cuando falla el descuento de un ítem, el bloque interno compensa los descuentos
previos y lanza `RATION_UNAVAILABLE`. El `catch` externo vuelve a compensar
`successfullyDiscounted`, que todavía contiene esos ítems. Resultado: un pedido con 2 ítems
donde el segundo no tiene stock **devuelve 2 raciones al primer plato en vez de 1**.
Con la última ración eso reabre la sobreventa.

**Fix esperado:** una sola ruta de compensación. Opciones:
- limpiar `successfullyDiscounted` después de compensar en el bloque interno, o
- eliminar la compensación interna y dejar que el `catch` externo haga todo.

**Prueba de regresión obligatoria:** pedido con 2 platos con límite, el segundo con 0 raciones.
Assert: `remainingRations` del primer plato queda **igual** al valor inicial (no +1 de más).

## H2 — ALTO: `cancelOrder` repone raciones antes de confirmar la transición

**Ubicación:** `order.service.ts`, `cancelOrder` (líneas ~379–473).

**Qué pasa:** primero repone raciones y crea `CANCELLATION_REVERSAL`, y recién después hace
`findOneAndUpdate` con `{ version }`. Si hay `VERSION_CONFLICT`, la cancelación **no ocurre**
pero las raciones ya se repusieron. Dos cancelaciones simultáneas reponen dos veces.

**Fix esperado:**
1. Hacer primero la transición atómica con filtro
   `{ _id, status: previousStatus, version }` y `$set/$inc/$push`.
2. Solo si devolvió el documento, reponer raciones y auditar.
3. Si la reposición falla después, registrar el incidente y no dejar el pedido a medias
   (documentar la limitación de no tener transacciones multi-documento).

**Prueba de regresión obligatoria:** dos cancelaciones concurrentes del mismo pedido `ENVIADO`
→ una responde 200 y la otra 409; `remainingRations` se incrementa **una sola vez**.

## H3 — MEDIO: reposición a un `menuItem` ambiguo

**Ubicación:** `cancelOrder`, búsqueda `MenuItem.findOne({ dishId: item.dishId, active: true })`.

**Qué pasa:** el mismo plato puede existir en varios `menuDays`. `findOne` devuelve uno
arbitrario y repone raciones al día equivocado.

**Fix esperado:** resolver el `menuDay` del turno del pedido (fecha del `shift`) y buscar
`{ menuDayId, dishId }`. Alternativa recomendada: guardar `menuItemId` y `menuDayId` como
snapshot en `orders.items[]` al crear el pedido (cambio de modelo justificado; actualizar
`data-model.md` no, ese repo no se toca: solo el esquema y el snapshot).

**Prueba de regresión obligatoria:** mismo plato en dos `menuDays`, cancelar un pedido del día A
y verificar que solo cambia el ítem del día A.

## H4 — MEDIO: reposición y ajuste con read-modify-write

**Ubicación:** `menu.service.ts`, `replenishRations` y `adjustRations`.

**Qué pasa:** `findById` + mutar + `save()` pierde actualizaciones concurrentes. Dos mozos
reponiendo a la vez pueden dejar el conteo mal, y eso rompe el invariante de 0 sobreventa.

**Fix esperado:**
- `replenish`: `findOneAndUpdate({ _id }, { $inc: { remainingRations: qty }, $inc: { version: 1 } }, { new: true })`
  y derivar `previousRemaining = newRemaining - qty` para la auditoría.
- `adjust`: `findOneAndUpdate` con `$set` y leer el valor anterior antes con `returnDocument: 'before'`
  o un `findOneAndUpdate` con agregación; lo importante es que el `save()` desaparezca.
- Auditar con los valores reales aplicados.

**Prueba de regresión obligatoria:** 10 reposiciones concurrentes de +1 sobre el mismo ítem
→ `remainingRations` aumenta exactamente 10 y hay 10 `REPLENISH` auditados
(verifica también que no se pierda ninguno).

## Instrucciones

- Corrige los 4 hallazgos.
- Agrega las 4 pruebas de regresión descritas.
- No toques el repositorio de specs. No hagas `git commit`.
- Al terminar reporta: archivos cambiados, salida de `npm run typecheck`, `npm run lint`,
  `npm test` (con el conteo final) y cómo quedó cada hallazgo.
