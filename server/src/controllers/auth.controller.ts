import { Request, Response, NextFunction } from 'express';
import { User } from '../models/user.model';
import { comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { UnauthorizedError } from '../middlewares/error';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, password } = req.body;

    const normalizedUsername = (username || '').toLowerCase().trim();

    // Busca usuario incluyendo el passwordHash
    const user = await User.findOne({ username: normalizedUsername }).select('+passwordHash');

    // T022: Si no existe, está inactivo o la contraseña no coincide -> 401 genérico
    if (!user || !user.active) {
      throw new UnauthorizedError('Credenciales inválidas o usuario inactivo', 'UNAUTHORIZED');
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Credenciales inválidas o usuario inactivo', 'UNAUTHORIZED');
    }

    // Actualiza lastLoginAt
    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken({
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName,
      role: user.role
    });

    res.status(200).json({
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Usuario no autenticado');
    }

    const user = await User.findById(req.user.id);
    if (!user || !user.active) {
      throw new UnauthorizedError('Usuario no encontrado o inactivo', 'UNAUTHORIZED');
    }

    res.status(200).json({
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      active: user.active
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  // En arquitectura JWT stateless, el cliente descarta el token
  res.status(204).send();
}
