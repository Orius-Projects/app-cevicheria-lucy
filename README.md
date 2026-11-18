# Cevichería Lucy — Sistema de Pedidos y Cocina

Sistema web responsive de pedidos y cocina en tiempo real para la Cevichería Lucy.

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

# 3. Compilar los paquetes
npm run build
```

## 4. Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo del cliente.
- `npm run dev:server`: Inicia el backend en modo watch (`tsx`).
- `npm run dev:client`: Inicia el frontend con Vite.
- `npm run build`: Compila `shared`, `server` y `client`.
- `npm run typecheck`: Ejecuta la verificación estricta de tipos de TypeScript en todos los workspaces.
- `npm run lint`: Ejecuta ESLint en todo el proyecto.
- `npm run format`: Formatea el código con Prettier.
- `npm run seed`: Siembra datos de demostración en la base de datos (Fase 2+).

Para más detalles, consulta [quickstart.md](./quickstart.md).
