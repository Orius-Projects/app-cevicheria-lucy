import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

function getSocketUrl(): string {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

/**
 * Obtiene la instancia singleton del socket de comunicación en directo.
 */
export function getSocket(): Socket {
  if (!socketInstance) {
    const url = getSocketUrl();
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    socketInstance = io(url, {
      auth: { token },
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000
    });
  }
  return socketInstance;
}

/**
 * Conecta el socket asegurando el token de autenticación actualizado.
 */
export function connectSocket(): Socket {
  const socket = getSocket();
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  if (socket.auth && typeof socket.auth === 'object') {
    (socket.auth as Record<string, any>).token = token;
  } else {
    socket.auth = { token };
  }

  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

/**
 * Desconecta la instancia singleton del socket.
 */
export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
  }
}

/**
 * Resetea la instancia del socket (útil para pruebas unitarias).
 */
export function resetSocketInstance(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
