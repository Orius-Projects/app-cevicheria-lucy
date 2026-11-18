# Encargo — 001 Plataforma base, Fase 0 + Fase 1

> Orquestador: OpenCode. Desarrollador: agy (Antigravity CLI).
> Este archivo es el contrato del milestone. No lo edites sin avisar al orquestador.

## 1. Contexto

Sistema web responsive de pedidos y cocina para la Cevichería Lucy.
Las especificaciones viven en `D:\Cevicheria\specs-cevicheria-lucy`.
El código de implementación vive aquí: `D:\Cevicheria\app-cevicheria-lucy`.

Lee primero, en este orden, y trata esos documentos como fuente de verdad:

1. `D:\Cevicheria\specs-cevicheria-lucy\.specify\memory\constitution.md`
2. `D:\Cevicheria\specs-cevicheria-lucy\specs\001-plataforma-base\plan.md`
3. `D:\Cevicheria\specs-cevicheria-lucy\specs\001-plataforma-base\data-model.md`
4. `D:\Cevicheria\specs-cevicheria-lucy\specs\001-plataforma-base\tasks.md` (solo T001–T020)

## 2. Alcance de este milestone

Implementar **Fase 0 (T001–T010) y Fase 1 (T011–T020)** de `tasks.md`. Nada más.
No implementes endpoints de auth, mesas, turnos, menú ni pedidos: eso es Fase 2+.

### Fase 0 — Setup

- **T001** Monorepo con npm workspaces: `client/`, `server/`, `shared/`.
- **T002** TypeScript (strict), ESLint y Prettier en la raíz.
- **T003** `.env.example` + validación Zod de variables de entorno.
- **T004** Dependencias backend en `server/package.json`.
- **T005** Dependencias frontend en `client/package.json`.
- **T006** Tipos y constantes compartidas en `shared/types/` y `shared/constants/`:
  roles, estados de pedido, estados de plato, transiciones.
- **T007** Vite + Tailwind + PWA opcional configurados; `npm run dev -w client` levanta.
- **T008** Scripts raíz: `dev`, `build`, `test`, `lint`, `typecheck`, `seed`.
- **T009** Estructura de carpetas según `plan.md` §4.
- **T010** `README.md` + `quickstart.md` locales con el setup.

### Fase 1 — Base compartida

- **T011** `server/src/config/db.ts`: conexión Mongoose con log y cierre; error claro.
- **T012** `server/src/config/logger.ts` + `requestId` por request.
- **T013** `server/src/middlewares/error.ts`: formato uniforme de error.
- **T014** `server/src/middlewares/validate.ts`: validación Zod, `400/422` con detalle.
- **T015** `server/src/middlewares/auth.ts`: JWT adjunta usuario; inválido `401`.
- **T016** `server/src/middlewares/roles.ts`: `ENCARGADO`, `MOZO`, `COCINERO`; sin permiso `403`.
- **T017** `server/src/models/user.model.ts`: `passwordHash` nunca se serializa.
- **T018** Modelos `Table`, `TableSession`, `Shift`.
- **T019** Modelos `MenuSection`, `Dish`, `MenuDay`, `MenuItem`, `RationAdjustment`.
- **T020** Modelos `Order`, `Counter`, `Settings`.

## 3. Restricciones no negociables

- TypeScript en cliente y servidor. Nada de JavaScript suelto en `src/`.
- Stack exacto: Node 20+ / Express 4 / Mongoose 8 / Socket.IO 4 / React 18+ / Vite 5+ /
  Tailwind 3+ / React Router 6+ / Zustand 4+ / Axios / Zod / JWT / bcryptjs.
- Dinero en céntimos enteros (`priceCents`, `totalCents`). Moneda `PEN`.
- Prohibido: pagos, IGV, SUNAT, facturación, delivery, inventario de almacén,
  app nativa/APK, tiempos de cocina, estado `EN_PREPARACION`, `waiterId` en mesas.
- Los modelos deben coincidir con `data-model.md` §3 (campos, enums, defaults, índices).
- `passwordHash`: `select: false` y excluido en `toJSON`.
- Fechas ISO 8601 UTC. Zona de visualización `America/Lima`.
- `tables` NO tiene mozo asignado.
- `orders` NO tiene campos de pago ni IGV.

## 4. Entorno real (importante)

- Node `v24.19.0`, npm `11.17.0` disponibles.
- **No hay MongoDB instalado ni Docker.** No intentes levantar la base ni correr
  pruebas de integración. Basta con que `db.ts` compile y falle con mensaje claro
  si falta `MONGODB_URI`.
- No ejecutes `git init` ni `git commit`. El orquestador maneja Git.

## 5. Criterios de aceptación (debes demostrarlos con salida real)

1. `npm install` en la raíz termina sin errores.
2. `npm run typecheck` termina sin errores.
3. `npm run lint` termina sin errores.
4. `npm run build` compila cliente y servidor (o al menos `typecheck` + build del server).
5. Arrancar el server sin `MONGODB_URI` produce un error explícito y comprensible.
6. Existen los 12 modelos de T017–T020 con los índices de `data-model.md`.
7. `shared/` expone roles, estados y transiciones reutilizables por cliente y servidor.

## 6. Cómo reportar al terminar

Responde en la terminal con:

1. Lista de archivos creados/ modificados (agrupada por carpeta).
2. Salida (resumida) de `npm install`, `npm run typecheck`, `npm run lint`, `npm run build`.
3. Cualquier criterio que no pudiste cumplir y por qué.
4. No escribas "listo" sin la evidencia de los comandos.

El orquestador revisará el diff y volverá con hallazgos concretos si algo falla.
