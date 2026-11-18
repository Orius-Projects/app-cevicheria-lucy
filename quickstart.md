# Guía de Inicio Rápido — Cevichería Lucy

Esta guía describe los pasos necesarios para configurar, ejecutar y verificar la plataforma base de Cevichería Lucy.

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

## 3. Verificación de Integridad

Ejecuta los siguientes comandos para asegurar que el código cumple con los estándares:

```bash
# Verificación de tipos TypeScript estricto
npm run typecheck

# Análisis estático con ESLint
npm run lint

# Compilación de shared, server y client
npm run build
```

## 4. Ejecución en Desarrollo

### Backend (Servidor Express + Socket.IO)
```bash
npm run dev:server
```
El servidor validará las variables de entorno y se conectará a MongoDB. Si falta `MONGODB_URI`, se detendrá con un mensaje de error explícito y legible.

Endpoint de salud:
```bash
curl http://localhost:3000/api/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "db": "connected",
  "uptimeSeconds": 12,
  "timestamp": "2026-11-18T18:00:00.000Z"
}
```

### Frontend (Cliente React + Vite + Tailwind)
```bash
npm run dev:client
```
Abre tu navegador en `http://localhost:5173`.

## 5. Modelos de Datos Implementados

Los 12 modelos canónicos de Mongoose se encuentran en `server/src/models/`:
1. `User` (`user.model.ts`): Autenticación y roles (`ENCARGADO`, `MOZO`, `COCINERO`). `passwordHash` protegido y excluido en serialización.
2. `Table` (`table.model.ts`): Mesas del restaurante. Sin mozo asignado.
3. `TableSession` (`table-session.model.ts`): Sesiones de mesa por turno con índice parcial único.
4. `Shift` (`shift.model.ts`): Turnos (`ABIERTO`, `CERRADO`).
5. `MenuSection` (`menu-section.model.ts`): Secciones (`CRIOLLO`, `MARINO`, `A_LA_CARTA`, `BEBIDAS`).
6. `Dish` (`dish.model.ts`): Catálogo maestro de platos y variaciones sin costo.
7. `MenuDay` (`menu-day.model.ts`): Menú publicado del día.
8. `MenuItem` (`menu-item.model.ts`): Disponibilidad diaria y raciones con cálculo de estado derivado.
9. `RationAdjustment` (`ration-adjustment.model.ts`): Auditoría de reposiciones y ajustes de raciones.
10. `Order` (`order.model.ts`): Pedidos, transiciones de estado e historial inmutable. Sin datos de pagos ni IGV.
11. `Counter` (`counter.model.ts`): Generador atómico de números secuenciales de pedido.
12. `Settings` (`settings.model.ts`): Configuración general del restaurante.
