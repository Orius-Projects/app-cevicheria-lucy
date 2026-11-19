import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { getEnv } from '../config/env';
import { logger } from '../config/logger';
import { verifyToken } from '../utils/jwt';
import { User } from '../models/user.model';
import { getRoleRoom, getUserRoom } from './rooms';

let io: SocketIOServer | null = null;

export function getIO(): SocketIOServer | null {
  return io;
}

export function initRealtime(httpServer: http.Server): SocketIOServer {
  const env = getEnv();

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.NODE_ENV === 'test' ? '*' : env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization?.startsWith('Bearer ')
          ? socket.handshake.headers.authorization.slice(7)
          : null);

      if (!token) {
        const error: any = new Error('UNAUTHORIZED');
        error.data = { code: 'UNAUTHORIZED', message: 'Token no proporcionado' };
        return next(error);
      }

      let payload;
      try {
        payload = verifyToken(token);
      } catch (jwtErr: any) {
        if (jwtErr.code === 'TOKEN_EXPIRED') {
          const error: any = new Error('TOKEN_EXPIRED');
          error.data = { code: 'TOKEN_EXPIRED', message: 'Token expirado' };
          return next(error);
        }
        const error: any = new Error('UNAUTHORIZED');
        error.data = { code: 'UNAUTHORIZED', message: 'Token inválido' };
        return next(error);
      }

      const user = await User.findById(payload.id);
      if (!user || !user.active) {
        const error: any = new Error('FORBIDDEN');
        error.data = { code: 'FORBIDDEN', message: 'Usuario inactivo o no encontrado' };
        return next(error);
      }

      (socket as any).user = {
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName,
        role: user.role
      };

      next();
    } catch (err: any) {
      logger.error(`Error en autenticación Socket.IO: ${err.message}`);
      const error: any = new Error('UNAUTHORIZED');
      error.data = { code: 'UNAUTHORIZED', message: err.message };
      next(error);
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user;
    if (user) {
      socket.join(getRoleRoom(user.role));
      socket.join(getUserRoom(user.id));
      logger.debug(`Socket conectado: ${socket.id} (Usuario: ${user.username}, Rol: ${user.role})`);
    }

    socket.on('disconnect', (reason) => {
      logger.debug(`Socket desconectado: ${socket.id} (Razón: ${reason})`);
    });
  });

  return io;
}

export async function closeRealtime(): Promise<void> {
  if (io) {
    await new Promise<void>((resolve) => {
      io!.close(() => {
        io = null;
        resolve();
      });
    });
  }
}
