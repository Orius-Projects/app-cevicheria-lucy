# Guía de Inicio Rápido — Cevichería Lucy

Esta guía describe los pasos necesarios para configurar, sembrar datos, ejecutar y verificar la plataforma base de Cevichería Lucy (Fases 0 a 8).

## 1. Requisitos

- Node.js `v20.0.0` o superior (verificado con `v24.19.0`).
- npm `v10.0.0` o superior (verificado con `v11.17.0`).
- Instancia de MongoDB accesible (local o Atlas).

## 2. Configuración Inicial

1. Clonar o acceder a la carpeta del proyecto:
   ```bash
   cd D:\Cevicheria\app-cevicheria-lucy
   ```

2. Instalar dependencias en la raíz:
   ```bash
   npm install
   ```

3. Configurar variables de entorno:
   Copiar `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```

   Variables clave en `.env`:
   - `PORT`: Puerto HTTP del servidor (por defecto `3000`).
   - `MONGODB_URI`: Cadena de conexión de MongoDB (ej. `mongodb://127.0.0.1:27017/cevicheria_lucy`).
   - `JWT_SECRET`: Clave secreta para firmar tokens de autenticación JWT.
   - `CORS_ORIGIN`: Origen permitido para CORS (por defecto `http://localhost:5173`).

## 3. Credenciales de Demostración Sembradas

El comando `npm run seed` siembra usuarios, mesas, catálogo de platos, menú del día, turno y configuración con clave natural idempotente:

| Usuario | Contraseña | Rol | Descripción |
|---|---|---|---|
| `encargado1` | `encargado123` | `ENCARGADO` | Encargado Demo (administra menú, raciones, turnos, configuración y pedidos) |
| `mozo1` | `mozo123` | `MOZO` | Mozo 1 (envía pedidos, repone raciones, entrega pedidos) |
| `mozo2` | `mozo223` | `MOZO` | Mozo 2 (colabora en sala con cualquier mesa) |
| `cocinero1` | `cocina123` | `COCINERO` | Cocinero 1 (atiende cola FIFO KDS y marca pedidos listos) |

## 4. Sembrado de Datos Idempotente

```bash
# Ejecutar seed (puede correrse múltiples veces sin duplicar datos ni alterar conteos)
npm run seed
```

Conteos sembrados garantizados:
- 4 usuarios (`encargado1`, `mozo1`, `mozo2`, `cocinero1`).
- 8 mesas (`M01`–`M05` Salón, `M06`–`M08` Terraza).
- 4 secciones (`Criollo`, `Marino`, `A la carta`, `Bebidas`).
- 12 platos maestros con precios enteros y variaciones sin costo.
- 1 menú del día `PUBLICADO` para la fecha actual (Ceviche mixto con límite de 30 raciones, Arroz con mariscos agotado por insumo).
- 1 turno `Almuerzo` abierto.
- Configuración global (`Cevichería Lucy`, `PEN`, umbral de alerta 5 raciones).

## 5. Verificación y Pruebas Automatizadas

```bash
# Verificación estricta de tipos TypeScript en shared, server y client
npm run typecheck

# Análisis estático de código con ESLint
npm run lint

# Compilación completa de artefactos de producción
npm run build

# Ejecución de la suite completa de 56 pruebas con Vitest
npm test
```

La suite de pruebas valida:
- Autenticación JWT stateless y rate limit en login.
- Estados derivados de mesas (`LIBRE`, `OCUPADA`, `POR_CERRAR`) y regla de sesión única.
- Ciclo de vida de turnos (`ABIERTO` -> `CERRADO`) y generación de resumen snapshot.
- Publicación de menú, derivación de disponibilidad (`DISPONIBLE`, `ULTIMAS_RACIONES`, `AGOTADO`) y auditoría 100% de raciones (`RationAdjustment`).
- Pipeline de pedidos: creación atómica con `Counter`, descuentos secuenciales, idempotencia por `clientRequestId`.
- Transiciones de estado con versionado concurrente (`ENVIADO` -> `LISTO` -> `ENTREGADO`).
- Cancelación con reposición para `ENVIADO` y sin reposición para `LISTO`.
- Cierre manual P2 y Tablero KDS FIFO sin tiempos transcurridos ni `EN_PREPARACION`.
- **Prueba de concurrencia extrema**: 200 envíos simultáneos sobre 1 ración restante -> 1 éxito (201), 199 rechazos (409 `RATION_UNAVAILABLE`), 0 sobreventa.
- **Prueba de seed doble**: ejecuciones consecutivas mantienen conteos idénticos.
- Salud del sistema: `GET /api/health` retorna `200 OK` con `db: connected`.

## 6. Endpoints REST Canónicos (Ejemplos cURL)

### Salud
```bash
curl -s http://localhost:3000/api/health
```

### Autenticación
```bash
# Iniciar sesión como mozo
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"mozo1","password":"mozo123"}'
```

### Menú del Día y Raciones
```bash
# Ver menú de hoy
curl -s http://localhost:3000/api/menu/today \
  -H "Authorization: Bearer $TOKEN"

# Reponer raciones (MOZO o ENCARGADO)
curl -s -X POST http://localhost:3000/api/menu-items/ITEM_ID/rations/replenish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"quantity": 10, "reason": "Llegaron porciones preparadas de cocina"}'
```

### Pedidos
```bash
# Enviar nuevo pedido a cocina
curl -s -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "tableId": "TABLE_ID",
    "items": [
      { "dishId": "DISH_ID", "quantity": 2, "variationIds": ["v_pic_med"], "notes": "Sin ají" }
    ],
    "clientRequestId": "uuid-v4-generado-por-cliente"
  }'
```

### Cocina KDS
```bash
# Ver cola de cocina FIFO
curl -s http://localhost:3000/api/kitchen/board \
  -H "Authorization: Bearer $TOKEN_COCINA"

# Marcar pedido listo (solo COCINERO)
curl -s -X PATCH http://localhost:3000/api/orders/ORDER_ID/ready \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_COCINA" \
  -d '{"version": 0}'
```

### Entrega y Cancelación
```bash
# Marcar pedido entregado (cualquier MOZO)
curl -s -X PATCH http://localhost:3000/api/orders/ORDER_ID/deliver \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"version": 1}'

# Cancelar pedido con motivo
curl -s -X PATCH http://localhost:3000/api/orders/ORDER_ID/cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"version": 0, "reason": "Cliente solicitó cancelar"}'
```

### Configuración
```bash
# Consultar configuración
curl -s http://localhost:3000/api/settings \
  -H "Authorization: Bearer $TOKEN"

# Actualizar umbral de raciones (solo ENCARGADO)
curl -s -X PATCH http://localhost:3000/api/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ENCARGADO" \
  -d '{"lowStockThreshold": 5}'
```
