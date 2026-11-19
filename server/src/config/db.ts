import mongoose from 'mongoose';
import { getEnv } from './env';
import { logger } from './logger';

let isConnected = false;
let devMongoServer: any = null;

function registerConnectionListeners(): void {
  mongoose.connection.on('connected', () => {
    isConnected = true;
    logger.info('MongoDB conectado exitosamente');
  });

  mongoose.connection.on('error', (err) => {
    isConnected = false;
    logger.error(`Error en conexión MongoDB: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB desconectado');
  });
}

/**
 * Inicia una instancia embebida de MongoDB (mongodb-memory-server) y siembra
 * los datos de demostración si la base está vacía.
 *
 * Solo para desarrollo/demo: no se usa en producción.
 */
async function startEmbeddedMongo(): Promise<typeof mongoose> {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const fs = await import('fs');
  const path = await import('path');

  const dbPath = path.resolve(process.cwd(), '.mongo-dev-data');
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }

  // Intenta reutilizar el puerto/datos locales; si el directorio quedó
  // bloqueado por un cierre abrupto, reintenta sin persistencia.
  const attempts: Array<() => Promise<any>> = [
    () =>
      MongoMemoryServer.create({
        instance: { port: 27017, dbPath, launchTimeout: 30000 }
      }),
    () => MongoMemoryServer.create({ instance: { dbPath, launchTimeout: 30000 } }),
    () => MongoMemoryServer.create({ instance: { launchTimeout: 30000 } })
  ];

  let lastError: any = null;

  for (const create of attempts) {
    try {
      devMongoServer = await create();
      const uri = devMongoServer.getUri();
      const conn = await mongoose.connect(uri);
      isConnected = true;
      logger.info(`MongoDB embebido iniciado y conectado en ${uri}`);

      // En modo demo (`dev:mock`) se siembra siempre: el seed es idempotente y
      // garantiza menú publicado y turno abierto para la fecha actual.
      const { User } = await import('../models/user.model');
      const shouldSeed =
        process.env.USE_EMBEDDED_MONGO === 'true' || (await User.countDocuments()) === 0;
      if (shouldSeed) {
        logger.info('Sembrando datos de demostración (seed idempotente)...');
        const { seedData } = await import('../seed/data');
        await seedData();
        logger.info('Seed de demostración completado.');
      }

      return conn;
    } catch (error: any) {
      lastError = error;
      if (devMongoServer) {
        try {
          await devMongoServer.stop();
        } catch {
          /* ignora el error al detener la instancia fallida */
        }
        devMongoServer = null;
      }
      if (mongoose.connection.readyState !== 0) {
        try {
          await mongoose.disconnect();
        } catch {
          /* ignora */
        }
      }
      logger.warn(`MongoDB embebido falló, reintentando: ${error.message}`);
    }
  }

  throw lastError ?? new Error('No se pudo iniciar MongoDB embebido');
}

export async function connectDB(): Promise<typeof mongoose> {
  const env = getEnv();

  if (!env.MONGODB_URI || env.MONGODB_URI.trim().length === 0) {
    const errorMsg = '[DB_ERROR] MONGODB_URI is required to connect to MongoDB';
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  registerConnectionListeners();

  // Arranque explícito de demo sin MongoDB instalado (`npm run dev:mock`).
  if (process.env.USE_EMBEDDED_MONGO === 'true' && env.NODE_ENV !== 'production') {
    return startEmbeddedMongo();
  }

  try {
    logger.info(
      `Conectando a MongoDB en ${env.MONGODB_URI.split('@').pop() /* oculta credenciales */}`
    );
    const timeout = process.env.DB_TIMEOUT_MS
      ? Number(process.env.DB_TIMEOUT_MS)
      : env.NODE_ENV === 'development'
        ? 2500
        : 5000;
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: timeout
    });
    isConnected = true;
    return conn;
  } catch (err: any) {
    if (env.NODE_ENV === 'development') {
      logger.warn(
        `No se pudo conectar al MongoDB en ${env.MONGODB_URI}. Iniciando instancia local embebida...`
      );
      try {
        return await startEmbeddedMongo();
      } catch (embErr: any) {
        logger.error(`Error al iniciar MongoDB embebido: ${embErr.message}`);
      }
    }

    isConnected = false;
    logger.error(`Fallo crítico al conectar con MongoDB: ${err.message}`);
    throw err;
  }
}

export async function disconnectDB(): Promise<void> {
  if (isConnected || mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('Conexión con MongoDB cerrada');
  }
  if (devMongoServer) {
    await devMongoServer.stop();
    devMongoServer = null;
  }
}

export function isDBConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
