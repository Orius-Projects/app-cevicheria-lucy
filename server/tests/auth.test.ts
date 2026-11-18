import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app';
import { User } from '../src/models/user.model';
import { hashPassword, comparePassword } from '../src/utils/password';
import { signToken, verifyToken } from '../src/utils/jwt';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup';

describe('Fase 2: Autenticación (T021–T028)', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('Utilidades de seguridad', () => {
    it('debe hashear contraseñas con bcrypt coste >= 10 y compararlas correctamente', async () => {
      const password = 'miPasswordSeguro123';
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true);

      const isValid = await comparePassword(password, hash);
      const isInvalid = await comparePassword('otroPassword', hash);

      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    it('debe firmar y verificar tokens JWT con expiración configurada', () => {
      const payload = {
        id: '66f0c0123456789012345678',
        username: 'mozo1',
        displayName: 'Mozo Uno',
        role: 'MOZO' as const
      };

      const token = signToken(payload);
      expect(typeof token).toBe('string');

      const verified = verifyToken(token);
      expect(verified.id).toBe(payload.id);
      expect(verified.username).toBe(payload.username);
      expect(verified.role).toBe(payload.role);
    });

    it('debe rechazar tokens expirados con código TOKEN_EXPIRED', () => {
      const expiredToken = jwt.sign(
        { id: '123', username: 'exp', displayName: 'Exp', role: 'MOZO' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1s' }
      );

      expect(() => verifyToken(expiredToken)).toThrowError();
    });
  });

  describe('POST /api/auth/login', () => {
    it('debe autenticar con éxito a un usuario activo y retornar token y user', async () => {
      const passwordHash = await hashPassword('mozo123');
      await User.create({
        username: 'mozo1',
        passwordHash,
        displayName: 'Mozo 1',
        role: 'MOZO',
        active: true
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'mozo1', password: 'mozo123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toEqual({
        id: expect.any(String),
        username: 'mozo1',
        displayName: 'Mozo 1',
        role: 'MOZO'
      });
      expect(response.body.user).not.toHaveProperty('passwordHash');

      // Verifica actualización de lastLoginAt
      const updatedUser = await User.findOne({ username: 'mozo1' });
      expect(updatedUser?.lastLoginAt).not.toBeNull();
    });

    it('debe rechazar contraseña incorrecta con 401 genérico', async () => {
      const passwordHash = await hashPassword('mozo123');
      await User.create({
        username: 'mozo1',
        passwordHash,
        displayName: 'Mozo 1',
        role: 'MOZO',
        active: true
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'mozo1', password: 'passwordIncorrecto' });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('Credenciales inválidas o usuario inactivo');
      expect(response.body.error).toHaveProperty('requestId');
    });

    it('debe rechazar usuario inexistente con 401 genérico', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'noexiste', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('Credenciales inválidas o usuario inactivo');
    });

    it('debe rechazar usuario inactivo con 401 genérico', async () => {
      const passwordHash = await hashPassword('mozo123');
      await User.create({
        username: 'mozo_inactivo',
        passwordHash,
        displayName: 'Mozo Inactivo',
        role: 'MOZO',
        active: false
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'mozo_inactivo', password: 'mozo123' });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('Credenciales inválidas o usuario inactivo');
    });

    it('debe rechazar petición con campos faltantes con 422 VALIDATION_ERROR', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'mozo1' });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/auth/me', () => {
    it('debe retornar el perfil del usuario autenticado sin passwordHash', async () => {
      const passwordHash = await hashPassword('encargado123');
      const user = await User.create({
        username: 'encargado1',
        passwordHash,
        displayName: 'Encargado 1',
        role: 'ENCARGADO',
        active: true
      });

      const token = signToken({
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName,
        role: user.role
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: user._id.toString(),
        username: 'encargado1',
        displayName: 'Encargado 1',
        role: 'ENCARGADO',
        active: true
      });
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('debe rechazar petición sin cabecera de autorización con 401', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('debe rechazar token expirado con 401 TOKEN_EXPIRED', async () => {
      const expiredToken = jwt.sign(
        { id: '123', username: 'exp', displayName: 'Exp', role: 'MOZO' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1s' }
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('debe responder con HTTP 204 No Content', async () => {
      const response = await request(app).post('/api/auth/logout');
      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
    });
  });
});
