# Encargo — 001 Fases 2, 3 y 4 (auth, mesas, turnos)

> Orquestador: OpenCode. Desarrollador: agy.
> Continúa sobre el milestone 1 ya verificado y commiteado (`a2ee939`).

## 1. Lee antes de escribir código

1. `D:\Cevicheria\specs-cevicheria-lucy\specs\001-plataforma-base\contracts\rest-api.md` §2, §3, §5, §6, §7
2. `D:\Cevicheria\specs-cevicheria-lucy\specs\001-plataforma-base\data-model.md` §3.1–3.4, §7
3. `D:\Cevicheria\specs-cevicheria-lucy\specs\001-plataforma-base\tasks.md` Fases 2–4
4. `D:\Cevicheria\app-cevicheria-lucy\BRIEF.md` (restricciones globales del proyecto)

## 2. Alcance: T021–T041

### Fase 2 — Autenticación (T021–T028)

- `POST /api/auth/login`: valida credenciales, devuelve `{ token, user }` con el shape exacto del contrato.
- `POST /api/auth/logout`: `204`.
- `GET /api/auth/me`: perfil sin `passwordHash`.
- Errores: credenciales inválidas o usuario inactivo → `401` genérico (no filtrar cuál falló).
- `server/src/utils/jwt.ts`: firmar/verificar, expiración `JWT_EXPIRES_IN` (8h).
- `server/src/utils/password.ts`: bcryptjs, coste ≥ 10.
- `server/tests/auth.test.ts`: válido, inválido, inactivo, token expirado.
- Cliente: `LoginPage.tsx`, rutas protegidas y guards por rol; cada rol aterriza en su vista base.

### Fase 3 — Mesas y sesiones (T029–T035)

- `GET /api/tables`: estado derivado `LIBRE` / `OCUPADA` / `POR_CERRAR`, con `openSessionId`.
  - `OCUPADA`: sesión abierta con pedidos activos.
  - `POR_CERRAR`: sesión abierta sin pedidos activos.
- Servicio `ensureOpenTableSession(tableId, shiftId, user)`: abre sesión al primer pedido.
  - Índice parcial único: una sola sesión `ABIERTA` por mesa.
- `POST /api/table-sessions/:id/close`: roles `MOZO`/`ENCARGADO`; `409 TABLE_HAS_ACTIVE_ORDERS` si hay pedidos `ENVIADO`/`LISTO`.
- `GET /api/tables/:id`: mesa con pedidos activos y rondas.
- `server/tests/tables.test.ts`: estados, apertura única y cierre.
- Cliente: `tablesStore.ts` y `TableSelector.tsx` (libres/ocupadas, táctil ≥ 44 px).

### Fase 4 — Turnos (T036–T041)

- `POST /api/shifts` (solo `ENCARGADO`): abre turno; `409 SHIFT_ALREADY_OPEN` si ya hay uno abierto.
- `GET /api/shifts/current`: turno abierto o `404`.
- Bloqueo de pedidos sin turno: helper que lanza `409 SHIFT_NOT_OPEN` (se usará en Fase 6).
- `POST /api/shifts/:id/close`: `409 OPEN_ORDERS_REMAIN` / `OPEN_TABLES_REMAIN`; genera snapshot en `shiftSummaries`.
- `GET /api/shifts/:id/summary`: shape del contrato.
- `server/tests/shifts.test.ts`: apertura única, bloqueo y cierre.
- Cliente: `shiftStore.ts`.

## 3. Infraestructura de pruebas (nueva, obligatoria)

- Añadir `vitest`, `supertest`, `@types/supertest` y `mongodb-memory-server` a `server`.
- Script `test` real en `server/package.json` y en la raíz.
- Usar `mongodb-memory-server` para integración. Si la descarga del binario falla por red,
  documenta el fallo y deja pruebas unitarias reales (no placeholders) para JWT, password,
  derivación de estado de mesa y reglas de turno.
- Prohibido dejar `server/tests/index.test.ts` como placeholder.

## 4. Contratos y errores

- Formato de error uniforme: `{ error: { code, message, details?, requestId } }`.
- `401` auth, `403` rol, `404` recurso, `409` conflicto de estado, `422` validación Zod.
- `requestId` en todas las respuestas de error.
- No devolver `passwordHash`, tokens en logs ni campos de pago/IGV.

## 5. Reglas de implementación

- No implementes endpoints de menú, pedidos ni cocina: son Fase 5–6.
- No cambies los modelos ni los índices ya verificados sin justificarlo.
- No toques el repositorio de specs.
- No hagas `git commit`; el orquestador revisa y commitea.
- Mantén TypeScript estricto, sin `any` nuevos injustificados.
- Español en mensajes de negocio; nombres de código en inglés.

## 6. Criterios de aceptación (con salida real)

1. `npm run typecheck` sin errores.
2. `npm run lint` sin errores.
3. `npm run build` sin errores.
4. `npm test` ejecuta pruebas reales y pasa (o documenta el fallo de red de mongodb-memory-server
   y pasa las unitarias).
5. `POST /api/auth/login` y `GET /api/auth/me` funcionan contra una BD en memoria.
6. Una mesa no puede tener dos sesiones `ABIERTA`.
7. Un segundo `POST /api/shifts` devuelve `409 SHIFT_ALREADY_OPEN`.
8. El reporte final incluye archivos, salidas y desviaciones.
