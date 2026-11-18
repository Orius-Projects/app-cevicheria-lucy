import mongoose from 'mongoose';
import { getEnv } from './env';
import { logger } from './logger';

let isConnected = false;

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
    const conn = await mongoose.connect(env.MONGODB_URI);
    isConnected = true;
    return conn;
  } catch (err: any) {
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
}

export function isDBConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}
