import mongoose from 'mongoose';
import { getEnv } from './env';
import { logger } from './logger';

let isConnected = false;
let devMongoServer: any = null;

export async function connectDB(): Promise<typeof mongoose> {
  const env = getEnv();

  if (!env.MONGODB_URI || env.MONGODB_URI.trim().length === 0) {
    const errorMsg = '[DB_ERROR] MONGODB_URI is required to connect to MongoDB';
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

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

  try {
    logger.info(`Conectando a MongoDB en ${env.MONGODB_URI.split('@').pop() /* oculta credenciales */}`);
    const timeout = process.env.DB_TIMEOUT_MS
      ? Number(process.env.DB_TIMEOUT_MS)
      : env.NODE_ENV === 'development'
        ? 2500
        : 5000;
    const conn = await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: timeout });
    isConnected = true;
    return conn;
  } catch (err: any) {
    if (env.NODE_ENV === 'development') {
      logger.warn(`No se pudo conectar al MongoDB en ${env.MONGODB_URI}. Iniciando instancia local embebida...`);
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const fs = await import('fs');
        const path = await import('path');
        const dbPath = path.resolve(process.cwd(), '.mongo-dev-data');
        if (!fs.existsSync(dbPath)) {
          fs.mkdirSync(dbPath, { recursive: true });
        }
        try {
          devMongoServer = await MongoMemoryServer.create({
            instance: { port: 27017, dbPath, launchTimeout: 30000 }
          });
        } catch {
          devMongoServer = await MongoMemoryServer.create({
            instance: { dbPath, launchTimeout: 30000 }
          });
        }
        const uri = devMongoServer.getUri();
        const conn = await mongoose.connect(uri);
        isConnected = true;
        logger.info(`MongoDB embebido iniciado y conectado en ${uri}`);

        // Si la base de datos está vacía, sembrar automáticamente
        const { User } = await import('../models/user.model');
        const userCount = await User.countDocuments();
        if (userCount === 0) {
          logger.info('Base de datos vacía. Ejecutando seed automático de demostración...');
          const { seedData } = await import('../seed/data');
          await seedData();
          logger.info('Seed automático completado.');
        }

        return conn;
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
