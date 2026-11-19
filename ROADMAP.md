# Roadmap de implementación — Cevichería Lucy

> Mantenido por el orquestador (OpenCode). `agy` implementa; el orquestador verifica y commitea.

## Estado

| # | Spec | Alcance | Estado |
|---|---|---|---|
| 001 | Plataforma base | Fases 0–1 (setup, modelos, middlewares) | ✅ verificado y commiteado (`a2ee939`) |
| 001 | Plataforma base | Fases 2–4 (auth, mesas, turnos) | ✅ verificado (30 pruebas) |
| 001 | Plataforma base | Fases 5–8 (menú/raciones, pedidos, seed, pulido) | ✅ verificado (60 pruebas + 4 bugs corregidos) |
| 002 | Menú y raciones | UI encargado + mozo | ✅ verificado (98 pruebas + F1–F6 corregidos) |
| 003 | Toma de pedidos | UI mozo + flujo de pedido | ✅ verificado (135 pruebas + variaciones 422) |
| 004 | Cocina | Tablero FIFO y “Marcar listo” | 🔄 siguiente |
| 005 | Avisos tiempo real | Socket.IO + sonido/visual | ⏳ pendiente |
| 006 | Cierre de turno | Resumen y cierre | ⏳ pendiente |
| 007 | Despliegue | Build, servicio único, responsive, PWA | 🔄 implementado (verificado build/types/lint/humo; pendiente validación manual) |

> Nota: `useOrderEvents` ya sincroniza por polling cada 15 s y al reconectar.
> El transporte Socket.IO se conectará cuando se implemente la spec `005`.

## Protocolo por milestone

1. El orquestador escribe `BRIEF-<n>.md` con alcance, contratos y criterios.
2. Reparte por `hc`: `agy-fe` (cliente), `agy-be` (servidor) y `agy-qa`
   (pruebas independientes). Cada uno tiene archivos asignados; nadie commitea.
3. El orquestador **verifica de forma independiente**:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
   - `npm test`
   - revisión de diff y de reglas de la constitución
4. Si falla: devuelve hallazgos concretos a `agy`.
5. Si pasa: commit `feat(00X): ...` y actualiza esta tabla.

## Reglas fijas

- Sin pagos, IGV, SUNAT, facturación, delivery, APK ni tiempos de cocina.
- Dinero en céntimos enteros. Fechas ISO 8601 UTC.
- El servidor es la autoridad del estado y de las raciones.
- `passwordHash` nunca se serializa.
- Un solo turno abierto; una sola sesión abierta por mesa.
- `ENVIADO → ENTREGADO` prohibido en el flujo normal.
- Sin `EN_PREPARACION`, sin `waiterId` en mesas.

## Terminales de trabajo

- `t1d`: OpenCode (orquestador; único que hace commits).
- `t1h` (`agy-fe`): frontend en `client/**`.
- `t1p` (`agy-be`): backend en `server/**`.
- `t1n` (`agy-qa`): pruebas independientes y verificación final.
