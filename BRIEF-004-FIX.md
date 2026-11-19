# Encargo de corrección — 002 Menú (UI)

> Orquestador: OpenCode. Desarrollador: agy.
> Estado: la implementación de `BRIEF-004-menu-ui.md` compila, pasa lint/build y 89 pruebas.
> La revisión independiente encontró 6 defectos. Corrígelos sin ampliar el alcance.

## Hallazgos

### F1 — El menú publicado no muestra descripción ni variaciones (crítico)

`GET /api/menu/today` devuelve cada ítem con los campos **planos**
`description`, `variations`, `course`, `isFixed`, `isRotating` y `state`
(ver `server/src/services/menu.service.ts`, `getTodayMenu`), **no** un objeto `dish`.
`DishCard` y `MenuView` leen `item.dish.description` / `item.dish.variations`,
así que en producción no se ve nada de eso. El mock de `menuIntegration.test.tsx`
incluye un `dish` anidado y oculta el error.

Corrige:

- Tipa en `client/src/api/menu.api.ts` el ítem del menú de hoy con los campos
  planos reales (`TodayMenuItem`), manteniendo `dish?` solo como compatibilidad.
- En `DishCard` y `MenuView`, usa el campo plano con fallback al anidado:
  descripción = `item.description ?? item.dish?.description`;
  variaciones = `item.variations ?? item.dish?.variations`.
  No muestres variaciones inactivas (`active === false`).
- Cambia el mock de `menuIntegration.test.tsx` a la forma **plana** real y añade
  aserciones de que se ven la descripción y una variación.

### F2 — Raciones restantes pueden superar el total

`RationInput` permite escribir `remainingRations > totalRations`; el `<input max>`
no se aplica porque no hay `<form>`. La spec exige entero ≥ 0 y ≤ totalRations.

Corrige: al cambiar `totalRations`, recorta `remainingRations`; al escribir
`remainingRations`, limita a `totalRations` y muestra un mensaje inline claro
(ej. “Las raciones disponibles no pueden superar el total”). Mantén enteros ≥ 0.

### F3 — Publicar continúa aunque falle el guardado

`MenuDayPage.handleSaveDraft` captura el error y no lo propaga; `handlePublish`
sigue y publica datos viejos.

Corrige: `handleSaveDraft` devuelve `boolean` (o lanza) y `handlePublish` aborta
si el guardado falló, mostrando un mensaje de error.

### F4 — Etiqueta prohibida “Tiempo de servicio”

En `DishesPage` el label dice “Tiempo de servicio / Tipo”. No se permiten tiempos.

Corrige: cámbialo a “Tipo de plato”. Revisa que no quede otra mención de tiempo.

### F5 — “Quitar” un plato del borrador no persiste

El backend (`updateMenuDay`) solo hace upsert de los `items` enviados: nunca
elimina los que ya no vienen. Si el encargado quita un plato y guarda, reaparece.

Corrige en `server/src/services/menu.service.ts`: cuando la petición incluye
`items`, elimina los `MenuItem` de ese `menuDayId` cuyo `dishId` no esté en la
lista entrante; si la lista viene vacía, elimina todos. Mantén el comportamiento
actual cuando `items` es `undefined`.

Justificación: el PUT del contrato representa el conjunto de ítems del menú y la
UI ofrece “Quitar”; sin esto la acción es mentira. Añade pruebas en
`server/tests/menu.test.ts`: quitar un ítem y guardar; quitar todos y comprobar
que publicar responde `422`.

### F6 — Historial sin nombre del actor

`getRationAdjustments` hace `populate('actorId', 'username displayName role')`,
pero `AdjustmentHistory` solo muestra `actorRole`. Muestra el nombre
(`actorId.displayName` o `username`) cuando venga poblado, con fallback a
`actorRole`. Ajusta el tipo del DTO para aceptar `string | { ... }`.

## Reglas

- No toques nada fuera de estos puntos. No hagas `git commit`.
- No modifiques `D:\Cevicheria\specs-cevicheria-lucy`.
- Español en la UI, Tailwind, TypeScript estricto, sin `any` nuevos.
- Tras corregir, ejecuta en `D:\Cevicheria\app-cevicheria-lucy`:
  `npm run typecheck`, `npm run lint`, `npm run build` y `npm test`.
- Reporta archivos tocados, salidas reales y cualquier desviación.
