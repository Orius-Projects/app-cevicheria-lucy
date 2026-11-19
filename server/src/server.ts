import http from 'http';
import { app } from './app';
import { validateEnv } from './config/env';
import { connectDB, disconnectDB } from './config/db';
import { logger } from './config/logger';
import { initRealtime, closeRealtime } from './realtime';

let server: http.Server | null = null;

export async function startServer(): Promise<http.Server> {
  try {
    const env = validateEnv();
    await connectDB();

    server = http.createServer(app);
    initRealtime(server);

    server.listen(env.PORT, () => {
      logger.info(
        `Servidor de Cevichería Lucy iniciado en http://localhost:${env.PORT} [entorno: ${env.NODE_ENV}]`
      );
    });

    const shutdown = async (signal: string) => {
      logger.info(`Señal ${signal} recibida. Cerrando servidor elegantemente...`);
      await closeRealtime();
      if (server) {
        server.close(async () => {
          logger.info('Servidor HTTP cerrado');
          await disconnectDB();
          process.exit(0);
        });
      } else {
        await disconnectDB();
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    return server;
  } catch (error: any) {
    logger.error(`Error fatal al iniciar el servidor: ${error.message}`);
    process.exit(1);
  }
}

// Ejecución directa si se invoca como script principal
if (require.main === module || process.env.NODE_ENV !== 'test') {
  startServer();
}

export { server };
