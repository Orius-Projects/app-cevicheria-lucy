export const ROOM_ROLE_MOZO = 'role:MOZO';
export const ROOM_ROLE_COCINERO = 'role:COCINERO';
export const ROOM_ROLE_ENCARGADO = 'role:ENCARGADO';

export const ALL_ROLES_ROOMS = [
  ROOM_ROLE_MOZO,
  ROOM_ROLE_COCINERO,
  ROOM_ROLE_ENCARGADO
];

export function getRoleRoom(role: string): string {
  return `role:${role}`;
}

export function getUserRoom(userId: string): string {
  return `user:${userId}`;
}
