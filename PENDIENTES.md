# Backlog — pendientes y features futuros

> Registrado por el orquestador al cierre de las specs `001`–`007`.
> Nada de esta lista bloquea la demo. No implementar sin pedido explícito.

## 1. Validación manual pendiente (spec 007)

- [ ] Probar la UI en **Chrome Android real** a 360 px y en tablet a 768 px.
- [ ] Probar en **Safari iOS** (al menos login, pedido y cocina).
- [ ] Verificar **instalación PWA** (“Agregar a pantalla de inicio”). Requiere HTTPS o
      `localhost`; en LAN por HTTP plano no es instalable.
- [ ] Ejecutar `mongodump`/`mongorestore` reales sobre una base del restaurante.
- [ ] Prueba de humo en red LAN con los dispositivos definitivos.

## 2. Infraestructura y datos

- [ ] **MongoDB real o Docker** para desarrollo y producción. Hoy `npm run dev:mock`
      usa `mongodb-memory-server` y pierde/duplica estado si se borra `.mongo-dev-data`.
- [ ] Verificar `npm run seed` contra una instancia real de MongoDB.
- [ ] Definir topología de hosting definitiva (local, LAN o nube) y CI/CD.
- [ ] Backups automáticos y política de retención.
- [ ] Redis adapter para Socket.IO con múltiples instancias (Q-005-02).
- [ ] Replay histórico de eventos (Q-005-03). Hoy la recuperación es por REST.
- [ ] Definir retención de logs de eventos (Q-005-04).

## 3. Producto (fuera del alcance actual)

- [ ] Push del sistema operativo para avisos (Q-005-01). Fuera del MVP.
- [ ] Sonido distinto por tipo de aviso (Q-005-05).
- [ ] Exportación del resumen de turno a Excel/PDF (solo si se solicita).
- [ ] App nativa/APK (explícitamente fuera del alcance).
- [ ] Pagos, IGV, SUNAT, facturación, propinas o cierre de caja:
      **prohibido por la constitución del proyecto**.

## 4. Calidad y deuda técnica

- [ ] Pruebas E2E de UI en navegador real (Playwright). Hoy Vitest + jsdom.
- [ ] Automatizar la prueba de carga: 20 clientes y 1 000 eventos (SC-006).
- [ ] Observabilidad: métricas, alertas y correlación por `requestId`/`eventId`.
- [ ] Endpoint de readiness separado de `/api/health` para orquestadores.

## Cómo retomar la demo

```bash
npm install
npm run dev:mock
# http://localhost:5173
```
