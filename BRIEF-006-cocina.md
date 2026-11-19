# Brief 006 — Cocina / KDS (spec `004-cocina-pendientes`)

> Agente: `agy-fe-004`. Spec: `D:\Cevicheria\specs-cevicheria-lucy\specs\004-cocina-pendientes\`
> Código: `D:\Cevicheria\app-cevicheria-lucy`. El orquestador verifica y commitea.

## Reglas

- Solo `client/**` y tipos nuevos en `shared/types/index.ts`. **No** tocar `server/**` ni specs.
- No `git commit`, no `npm run build` (lo hace el orquestador).
- Sin tiempos/cronómetros, sin stock/mermas, sin “En preparación”, sin pagos/IGV.
- Un solo botón de cocina: **“Marcar listo”**. Nada de prioridad manual ni drag & drop.
- Objetivos táctiles ≥ 44 px, alto contraste (fondo oscuro legible a distancia).
- Dinero en centavos; este tablero no muestra totales de pago.

## Contrato API (ya existe)

| Uso | Endpoint | Respuesta |
|---|---|---|
| Tablero | `GET /api/kitchen/board` | `{ pending: OrderDTO[], ready: OrderDTO[], serverTime }` |
| Marcar listo | `PATCH /api/orders/:id/ready` body `{ version }` | `OrderDTO`; `409 VERSION_CONFLICT` o `INVALID_TRANSITION` |
| Rol | `COCINERO` (y `ENCARGADO` lectura) | `MOZO` recibe `403` en `/ready` |

`pending` ya viene ordenado por `enviadoEn` ascendente (FIFO) y solo `ENVIADO`.
`ready` viene ordenado por `listoEn` y solo `LISTO`.
Los `OrderDTO.items` traen `dishName`, `quantity`, `variations`, `notes`, `sectionName`, `lineTotalCents`.

## Entregables (tasks.md)

### Fase 0

- T001: mantén la ruta `/cocina` (ya existe en `AppRoutes`) con guard `COCINERO`/`ENCARGADO`.
- T002: `client/src/api/kitchen.api.ts` (`getBoard`, `markReady`) con errores normalizados
  (`error.response.data.error.code`).
- T003: `client/src/stores/kitchenStore.ts`: `pending`, `ready`, `loading`, `error`, `connection`,
  `loadBoard`, `markReady`, `applyEvent` (para 005), dedupe por `id`+`version`.
- T004: tipos en `shared/types/index.ts`: `KitchenBoard`, `KitchenConnectionState`.
- T005: `client/src/hooks/useKitchenEvents.ts`: por ahora **polling cada 10 s** + resync al
  enfocar/volver online. No implementes Socket.IO; la spec 005 lo reemplazará.

### Fase 1

- T006–T012: `client/src/pages/cocina/KitchenPage.tsx` + `client/src/components/cocina/`:
  `KitchenHeader` (contadores pendientes/listos + conexión), `KitchenEmptyState`,
  `KitchenConnectionBanner`, `KitchenOrderCard` (mesa, `#orderNumber`, ítems, variaciones
  resaltadas, notas completas), `KitchenItems` (scroll), `PendingColumn`, `ReadyColumn`.
  Conserva el estilo oscuro actual. La tarjeta debe expandirse si hay muchos ítems.

### Fases 2–7

- Pendientes: FIFO por `enviadoEn` ascendente; excluir `LISTO`/`ENTREGADO`/`CANCELADO`.
  Scroll para 30 pedidos.
- Detalle: variaciones resaltadas y notas sin truncar; sin tiempos.
- “Marcar listo”: solo en `ENVIADO`; deshabilitar mientras procesa (anti doble tap); mover de
  pendientes a listos sin recargar; `409` → aviso + resync.
- Listos: columna informativa “Listo para recoger”, sin botón de cocina; retirar al recibir
  `order:delivered`/`order:cancelled` vía `applyEvent` (cuando 005 emita) y en el polling.
- Recarga/reconexión: resync completo; banner visible al perder conexión.
- Accesibilidad: `aria-live` para nuevos pedidos/errores; contraste AA básico.

### Pruebas

- FIFO con 10 pedidos conocidos (unitario del store/utilidad).
- Detalle con variaciones + notas.
- “Marcar listo” y doble tap = una sola transición.
- Columnas: mover/retirar; 403/409 manejados.
- Archivos: `client/src/stores/__tests__/kitchenStore.test.ts`,
  `client/src/test/kitchenFlow.test.tsx` (o similar). Mockea `kitchen.api`.

## Verificación

```
npm run typecheck:client
npx eslint client/src
npm run test -w client
```

Reporta archivos, salidas reales y cualquier bloqueo. No edites pruebas de otros agentes.
