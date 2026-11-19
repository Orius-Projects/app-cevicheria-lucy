# Encargo — 001 Fases 5–8 (menú/raciones, pedidos, seed y pulido)

> Orquestador: OpenCode. Desarrollador: agy.
> Base: commits `a2ee939` (Fases 0–1) y `b629949` (Fases 2–4), ambos verificados.

## 1. Lee antes de escribir código

1. `D:\Cevicheria\specs-cevicheria-lucy\specs\001-plataforma-base\data-model.md` §5, §6, §7, §8, §9
2. `D:\Cevicheria\specs-cevicheria-lucy\specs\001-plataforma-base\contracts\rest-api.md` §8–§14
3. `D:\Cevicheria\specs-cevicheria-lucy\specs\001-plataforma-base\tasks.md` Fases 5–8
4. `D:\Cevicheria\app-cevicheria-lucy\BRIEF.md` y `ROADMAP.md`

## 2. Alcance: T042–T080, en este orden

### Bloque A — Fase 5: menú y raciones (T042–T052)

- `GET /api/menu/today`: menú `PUBLICADO` de la fecha con secciones, platos y estado derivado.
- `POST /api/menu/days` y `PUT /api/menu/days/:id`: borrador editable (solo `ENCARGADO`).
- `POST /api/menu/days/:id/publish`: exige al menos un ítem activo; `422` si vacío.
- `GET /api/menu-sections` y `GET /api/dishes`.
- CRUD de platos: `POST/PATCH/DELETE /api/dishes`; baja lógica; variaciones sin costo.
- Derivación de estado: `INACTIVO`, `DISPONIBLE`, `ULTIMAS_RACIONES`, `AGOTADO`
  con la función compartida `deriveDishStatus` (no dupliques la regla en el servidor).
- `POST /api/menu-items/:id/rations/replenish`: `MOZO`/`ENCARGADO`, motivo obligatorio,
  incrementa `remainingRations` y audita.
- `POST /api/menu-items/:id/rations/adjust`: solo `ENCARGADO`, fija el conteo, motivo obligatorio.
- `POST /api/menu-items/:id/sold-out` y `/reactivate`: solo `ENCARGADO`.
  `manuallySoldOut` no se limpia con una reposición.
- Todo ajuste va a `rationAdjustments` con actor, rol, motivo, antes/después.
- Pruebas: estados, límites, 0 sobreventa, auditoría 100%.

### Bloque B — Fase 6: pedidos (T053–T065)

- `POST /api/orders`: pipeline exacto de `data-model.md` §6:
  1. turno `ABIERTO` o `409 SHIFT_NOT_OPEN`;
  2. mesa activa y sesión abierta (o crearla);
  3. menú `PUBLICADO` para la fecha o `409 MENU_NOT_PUBLISHED`;
  4. validar ítems, cantidades, variaciones permitidas, notas y disponibilidad;
  5. descontar raciones secuencialmente con `findOneAndUpdate` + `$gte` y compensación;
  6. `orderNumber` atómico con `Counter`;
  7. crear el pedido `ENVIADO` con snapshots, `statusHistory`, `version: 0`;
  8. si falla la creación, reponer raciones;
  9. responder `201` (los eventos Socket.IO son de `005`: deja el hook, no los implementes).
- `totalCents = Σ lineTotalCents`; sin IGV ni impuestos.
- Cancelación:
  - `ENVIADO → CANCELADO`: repone raciones y registra `CANCELLATION_REVERSAL`;
  - `LISTO → CANCELADO`: **no** repone; motivo obligatorio;
  - `BORRADOR` no existe en el servidor.
- `PATCH /api/orders/:id/ready`: solo `COCINERO`, `ENVIADO → LISTO`, `readyBy`.
- `PATCH /api/orders/:id/deliver`: cualquier `MOZO`, `LISTO → ENTREGADO`, `deliveredBy`.
- `ENVIADO → ENTREGADO` por mozo/cocinero: `409 INVALID_TRANSITION`.
- `GET /api/kitchen/board`: pendientes FIFO por `enviadoEn` ascendente + listos.
  Sin tiempos, sin cronómetros, sin “En preparación”.
- `GET /api/orders` y `GET /api/orders/:id`: todos los mozos ven todos; filtros por estado/mesa/turno.
- Cierre manual P2: solo `ENCARGADO`, con motivo, `manualClose = true`.
- Actualizaciones de estado atómicas con `version` (filtro por estado + versión, `$inc`).
- Pruebas: transiciones válidas e inválidas, snapshots, cancelación, doble envío,
  y **200 envíos concurrentes sobre la última ración → 0 sobreventa**.

### Bloque C — Fase 7: seed, salud y documentación (T066–T070)

- `server/src/seed/data.ts` idempotente con `upsert` por clave natural:
  - usuarios `encargado1/encargado123`, `mozo1/mozo123`, `mozo2/mozo223`, `cocinero1/cocina123`;
  - mesas `M01`–`M08`, zonas Salón/Terraza;
  - secciones Criollo, Marino, A la carta, Bebidas;
  - al menos 10 platos con precios y variaciones;
  - menú del día publicado, un plato limitado a 30 raciones y uno agotado por insumo;
  - turno `Almuerzo` abierto;
  - settings `Cevichería Lucy`, `PEN`, umbral 5.
- `GET /api/health`: servicio + estado de MongoDB + uptime + timestamp.
- Documentar credenciales demo en `quickstart.md`.
- Prueba de seed doble: mismos conteos.

### Bloque D — Fase 8: seguridad y pulido (T071–T080)

- `statusHistory` completo (actor, rol, motivo) y `takenBy`/`readyBy`/`deliveredBy`/`cancelledBy`.
- `helmet`, CORS por allowlist y rate limit en login.
- Actualizar `quickstart.md` y el README con endpoints reales.
- Verificaciones automáticas o checklist:
  - sin campos de pago/IGV/facturación;
  - sin tiempos de cocina en API/UI;
  - 200 envíos concurrentes sin sobreventa;
  - E2E básico login → pedido (puede ser de API con Supertest si Playwright no está listo;
    si usas Playwright, documéntalo).
- Análisis de consistencia final contra `data-model.md`.

## 3. Reglas duras

- No toques el repo de specs.
- No implementes Socket.IO ni UI de cocina/mozo completas (eso es `003`–`006`).
- No añadas pagos, IGV, SUNAT, facturación, delivery, inventario ni APK.
- No cambies los índices ya verificados sin justificarlo.
- No hagas `git commit`.
- TypeScript estricto. Errores con `{ error: { code, message, details?, requestId } }`.
- Español en mensajes de negocio.
- El servidor es la única autoridad de estado y raciones.

## 4. Criterios de aceptación (con salida real)

1. `npm run typecheck`, `npm run lint`, `npm run build` sin errores.
2. `npm test` con pruebas reales que cubran: auth, mesas, turnos, menú, raciones,
   pedidos, cancelación, concurrencia de última ración y seed doble.
3. Prueba de concurrencia: 200 intentos sobre 1 ración → exactamente 1 éxito, 0 sobreventa.
4. `npm run seed` dos veces seguidas → mismos conteos (idempotente).
5. `GET /api/health` responde `200` con `db: connected` en entorno de prueba.
6. Búsqueda de términos prohibidos (`paymentStatus`, `igv`, `taxCents`, `facturación`,
   `EN_PREPARACION`, `waiterId`) sin resultados en `server/src` y `shared`.
7. Reporte final con archivos, salidas y desviaciones.
