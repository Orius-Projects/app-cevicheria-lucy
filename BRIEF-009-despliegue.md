# Brief 009 — Despliegue web responsive (spec `007-despliegue-web-responsive`)

> Agente: `agy-deploy`. Spec: `D:\Cevicheria\specs-cevicheria-lucy\specs\007-despliegue-web-responsive\`.
> Código: `D:\Cevicheria\app-cevicheria-lucy`. Ejecutar después de los briefs 007–008.

## Reglas

- Puedes tocar `server/src/app.ts`, `server/src/server.ts`, `server/src/config/**`,
  `client/vite.config.ts`, `client/public/**`, `.env.example`, `DEPLOY.md`, `README.md`
  y `ROADMAP.md` (solo la sección de despliegue).
- **No** tocar `client/src/**` (lo usan otros agentes), ni specs, ni `package-lock.json` sin
  necesidad. No `git commit`.
- Sin APK, sin pagos/IGV/facturación, sin topología de hosting concreta.
- No romper `NODE_ENV=test` ni el arranque en desarrollo.

## Entregables

### Fase 0–1 — Build y servicio único

- Verifica scripts `build`, `start`, `preview`; corrige si falta.
- `.env.example` completo: `NODE_ENV`, `PORT`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`,
  `CORS_ORIGIN`, `VITE_API_URL`, `VITE_SOCKET_URL`. Sin secretos reales.
- `app.ts`: en producción (o `SERVE_STATIC=true`), servir `client/dist` con
  `express.static`; fallback SPA a `index.html` **excluyendo** `/api` y `/socket.io`.
  Si `client/dist` no existe, no fallar: seguir en modo API y avisar por log.
- CORS REST y Socket.IO con `CORS_ORIGIN`; `helmet` ya está.
- Documenta que `VITE_*` exige rebuild.

### Fase 2–3 — Datos, salud y PWA

- `/api/health` ya existe: verifica servicio + Mongo.
- Seed idempotente ya existe: documenta `npm run seed` y el reset seguro.
- PWA: manifest + iconos en `client/public` (SVG/PNG 192 y 512 si es posible) y service
  worker ya configurado con `vite-plugin-pwa`; ajusta `manifest` si falta nombre/colores.
  Documenta que instalar requiere HTTPS o localhost (no verificable en este entorno).

### Fase 4 — Responsive

- No cambies `client/src`; documenta el checklist 360 / 768 / 1024×768 / 1280 y objetivos
  ≥ 44 px. Si detectas un corte evidente, repórtalo (no lo arregles aquí).

### Fase 5–6 — Documentación y humo

- `DEPLOY.md`: build, variables, ejecución local/LAN, MongoDB local/Atlas, seed/reset,
  backup/restore (`mongodump`/`mongorestore`), troubleshooting, PWA y límites (sin APK).
- Actualiza `README.md`/`quickstart` si existe con el modo servicio único.
- Humo verificable aquí: `npm run build`, arranque del server sin Mongo debe fallar con
  `[ENV_ERROR]` claro; con Mongo no disponible debe reportar el error de conexión.
  Marca como **pendiente manual**: Chrome Android, instalación PWA, backup/restore real.

## Verificación

```
npm run build
npm run typecheck
npx eslint server/src
```

No corras la suite completa. Reporta archivos, comandos y qué quedó pendiente de validación manual.
