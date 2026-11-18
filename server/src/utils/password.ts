import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hashea una contraseña usando bcrypt con coste >= 10.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
}

/**
 * Compara una contraseña en texto plano contra un hash bcrypt.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
