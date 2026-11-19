# Cevichería Lucy — Sistema de Pedidos y Cocina

Sistema web responsive de pedidos y cocina en tiempo real para la Cevichería Lucy. Plataforma base completa (Fases 0 a 8).

## 1. Arquitectura del Monorepo

Este repositorio está estructurado como un monorepo con `npm workspaces`:

- `client/`: Aplicación frontend SPA desarrollada con React 18, Vite 5, Tailwind CSS 3 y Zustand.
- `server/`: API backend REST y servidor WebSocket desarrollado con Node.js, Express 4, Mongoose 8 y Socket.IO 4.
- `shared/`: Tipos TypeScript y constantes de dominio compartidos entre frontend y backend (roles, estados de pedido y plato, transiciones).

## 2. Requisitos Previos

- **Node.js**: `v20.x` LTS o superior (recomendado `v24.x`).
- **npm**: `v10.x` o superior.
- **MongoDB**: `v6.0` o superior (local o MongoDB Atlas).

## 3. Instalación Rápida

```bash
# 1. Instalar todas las dependencias del monorepo
npm install

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Sembrar datos de demostración
npm run seed

# 4. Compilar los paquetes
npm run build

# 5. Iniciar en modo servicio único (producción)
NODE_ENV=production npm run start -w server
```

El sistema estará listo en `http://localhost:3000` sirviendo la SPA, la API REST en `/api` y Socket.IO en `/socket.io`.

## 3.1 Demo sin MongoDB instalado (recomendado para probar)

Si no tienes MongoDB local, un solo comando levanta la API con una instancia
embebida en memoria, siembra los datos de demostración y arranca el cliente:

```bash
npm install
npm run dev:mock
```

- Cliente: `http://localhost:5173`
- API: `http://localhost:3000`
- Datos: se guardan en `server/.mongo-dev-data` y se siembran solos si están vacíos.

Usuarios: `encargado1/encargado123`, `mozo1/mozo123`, `mozo2/mozo223`,
`cocinero1/cocina123`. Al detener el proceso se conservan los datos locales;
si quieres empezar de cero, borra `server/.mongo-dev-data`.

## 4. Scripts Disponibles

- `npm run dev:mock`: API con MongoDB embebido + seed + cliente Vite (sin instalar Mongo).
- `npm run dev`: Inicia el servidor de desarrollo del cliente con Vite.
- `npm run dev:server`: Inicia el backend en modo watch (`tsx`).
- `npm run dev:client`: Inicia el frontend con Vite.
- `npm run build`: Compila `shared`, `server` y `client` (incluye PWA y service worker).
- `npm run start -w server`: Inicia el servidor compilado de producción en Node.js.
- `npm run preview -w client`: Previsualiza el build de Vite localmente.
- `npm run typecheck`: Ejecuta la verificación estricta de tipos de TypeScript en todos los workspaces.
- `npm run lint`: Ejecuta ESLint en todo el proyecto.
- `npm run format`: Formatea el código con Prettier.
- `npm test`: Ejecuta la suite de pruebas automatizadas.
- `npm run seed`: Siembra datos iniciales de demostración de manera idempotente.

## 5. Modos de Ejecución y Despliegue

- **Modo Servicio Único (Producción / Local / LAN)**:
  Un solo proceso Express sirve el frontend compilado (`client/dist`), la API (`/api`) y los WebSockets (`/socket.io`).
- **Modo Desarrollo**:
  Ejecutar `npm run dev:server` (puerto 3000) y `npm run dev:client` (puerto 5173 con proxy inverso).

Para instrucciones detalladas sobre despliegue en red local (LAN) para tablets/móviles, MongoDB Atlas, PWA, copias de seguridad (`mongodump`/`mongorestore`) y troubleshooting, consulta **[DEPLOY.md](./DEPLOY.md)**.

## 5. Credenciales Demo

| Rol | Usuario | Contraseña |
|---|---|---|
| `ENCARGADO` | `encargado1` | `encargado123` |
| `MOZO` | `mozo1` | `mozo123` |
| `MOZO` | `mozo2` | `mozo223` |
| `COCINERO` | `cocinero1` | `cocina123` |

Para más detalles, ejemplos cURL y arquitectura de datos, consulta [quickstart.md](./quickstart.md).
