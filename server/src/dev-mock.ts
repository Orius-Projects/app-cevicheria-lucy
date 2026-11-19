/**
 * Arranque de demostración sin MongoDB instalado.
 *
 * Inicia el servidor con una instancia embebida de MongoDB (mongodb-memory-server),
 * siembra los datos de demo si la base está vacía y deja la API en PORT.
 *
 * Uso:
 *   npm run dev:mock        (desde la raíz, levanta API + cliente)
 *   npm run dev:mock -w server
 *
 * No usar en producción: mongodb-memory-server es solo para demo/pruebas.
 */

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.PORT = process.env.PORT || '3000';
// Valor de relleno: db.ts detecta USE_EMBEDDED_MONGO y no intenta conectarse aquí.
process.env.MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cevicheria_lucy_dev';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'dev-mock-secret-cevicheria-lucy-no-usar-en-produccion';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
process.env.USE_EMBEDDED_MONGO = 'true';

async function main(): Promise<void> {
  // Import dinámico: el entorno debe quedar fijado antes de cargar app/env/db.
  await import('./server');
}

main().catch((error: any) => {
  console.error('[DEV_MOCK_ERROR]', error?.message || error);
  process.exit(1);
});
