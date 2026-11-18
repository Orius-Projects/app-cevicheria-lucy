import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { Shift, User, Order, Table, TableSession } from '../src/models';
import { signToken } from '../src/utils/jwt';
import { assertOpenShift } from '../src/services/shift.service';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup';

describe('Fase 4: Turnos (T036–T041)', () => {
  let encargadoToken: string;
  let mozoToken: string;
  let encargadoUser: any;
  let mozoUser: any;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    encargadoUser = await User.create({
      username: 'encargado1',
      passwordHash: 'hash',
      displayName: 'Encargado 1',
      role: 'ENCARGADO',
      active: true
    });
    mozoUser = await User.create({
      username: 'mozo1',
      passwordHash: 'hash',
      displayName: 'Mozo 1',
      role: 'MOZO',
      active: true
    });

    encargadoToken = signToken({
      id: encargadoUser._id.toString(),
      username: encargadoUser.username,
      displayName: encargadoUser.displayName,
      role: encargadoUser.role
    });
    mozoToken = signToken({
      id: mozoUser._id.toString(),
      username: mozoUser.username,
      displayName: mozoUser.displayName,
      role: mozoUser.role
    });
  });

  describe('POST /api/shifts (Apertura de turno - T036)', () => {
    it('debe permitir a un ENCARGADO abrir un turno nuevo', async () => {
      const response = await request(app)
        .post('/api/shifts')
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ date: '2026-11-18', label: 'Almuerzo' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.status).toBe('ABIERTO');
      expect(response.body.label).toBe('Almuerzo');
      expect(response.body.date).toBe('2026-11-18');
    });

    it('debe rechazar un segundo turno con 409 SHIFT_ALREADY_OPEN si ya hay uno abierto', async () => {
      // Abre primer turno
      await request(app)
        .post('/api/shifts')
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ date: '2026-11-18', label: 'Almuerzo' });

      // Intenta abrir un segundo turno
      const response = await request(app)
        .post('/api/shifts')
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ date: '2026-11-18', label: 'Cena' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('SHIFT_ALREADY_OPEN');
    });

    it('debe rechazar la apertura de turno con 403 si el rol no es ENCARGADO', async () => {
      const response = await request(app)
        .post('/api/shifts')
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({ date: '2026-11-18', label: 'Almuerzo' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/shifts/current (T037)', () => {
    it('debe retornar 404 si no hay turno abierto', async () => {
      const response = await request(app)
        .get('/api/shifts/current')
        .set('Authorization', `Bearer ${encargadoToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('debe retornar el turno abierto si existe', async () => {
      await Shift.create({
        date: '2026-11-18',
        label: 'Almuerzo',
        status: 'ABIERTO',
        openedBy: encargadoUser._id,
        openedAt: new Date()
      });

      const response = await request(app)
        .get('/api/shifts/current')
        .set('Authorization', `Bearer ${mozoToken}`);

      expect(response.status).toBe(200);
      expect(response.body.label).toBe('Almuerzo');
      expect(response.body.status).toBe('ABIERTO');
      expect(response.body).toHaveProperty('openedAt');
    });

    it('assertOpenShift helper debe lanzar 409 SHIFT_NOT_OPEN si no hay turno abierto', async () => {
      await expect(assertOpenShift()).rejects.toMatchObject({
        statusCode: 409,
        code: 'SHIFT_NOT_OPEN'
      });
    });
  });

  describe('POST /api/shifts/:id/close (Cierre de turno - T038, T039)', () => {
    it('debe rechazar el cierre con 409 OPEN_ORDERS_REMAIN si existen pedidos en ENVIADO o LISTO', async () => {
      const shift = await Shift.create({
        date: '2026-11-18',
        label: 'Almuerzo',
        status: 'ABIERTO',
        openedBy: encargadoUser._id,
        openedAt: new Date()
      });

      const table = await Table.create({ code: 'M01', zone: 'Salón', seats: 4, active: true });
      const session = await TableSession.create({
        tableId: table._id,
        tableCode: table.code,
        shiftId: shift._id,
        status: 'ABIERTA',
        openedBy: mozoUser._id,
        openedAt: new Date()
      });

      await Order.create({
        orderNumber: 101,
        shiftId: shift._id,
        tableId: table._id,
        tableCode: table.code,
        tableSessionId: session._id,
        takenByUserId: mozoUser._id,
        takenByName: mozoUser.displayName,
        status: 'ENVIADO',
        items: [{ dishId: new mongoose.Types.ObjectId(), dishName: 'Ceviche', sectionName: 'Marino', unitPriceCents: 3500, quantity: 1, lineTotalCents: 3500 }],
        totalCents: 3500,
        currency: 'PEN',
        statusHistory: [{ status: 'ENVIADO', at: new Date(), byUserId: mozoUser._id, byName: 'Mozo', byRole: 'MOZO', version: 0 }],
        enviadoEn: new Date(),
        version: 0
      });

      const response = await request(app)
        .post(`/api/shifts/${shift._id}/close`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ observations: 'Cierre con pedido activo' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('OPEN_ORDERS_REMAIN');
    });

    it('debe rechazar el cierre con 409 OPEN_TABLES_REMAIN si existen mesas con sesión ABIERTA', async () => {
      const shift = await Shift.create({
        date: '2026-11-18',
        label: 'Almuerzo',
        status: 'ABIERTO',
        openedBy: encargadoUser._id,
        openedAt: new Date()
      });

      const table = await Table.create({ code: 'M02', zone: 'Salón', seats: 4, active: true });
      await TableSession.create({
        tableId: table._id,
        tableCode: table.code,
        shiftId: shift._id,
        status: 'ABIERTA',
        openedBy: mozoUser._id,
        openedAt: new Date()
      });

      const response = await request(app)
        .post(`/api/shifts/${shift._id}/close`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({});

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('OPEN_TABLES_REMAIN');
    });

    it('debe cerrar el turno exitosamente y generar snapshot en shiftSummaries', async () => {
      const shift = await Shift.create({
        date: '2026-11-18',
        label: 'Almuerzo',
        status: 'ABIERTO',
        openedBy: encargadoUser._id,
        openedAt: new Date()
      });

      // Mesa y sesión ya cerradas
      const table = await Table.create({ code: 'M03', zone: 'Salón', seats: 4, active: true });
      const session = await TableSession.create({
        tableId: table._id,
        tableCode: table.code,
        shiftId: shift._id,
        status: 'CERRADA',
        openedBy: mozoUser._id,
        openedAt: new Date(),
        closedBy: mozoUser._id,
        closedAt: new Date()
      });

      const dishId = new mongoose.Types.ObjectId();
      // Pedido entregado
      await Order.create({
        orderNumber: 102,
        shiftId: shift._id,
        tableId: table._id,
        tableCode: table.code,
        tableSessionId: session._id,
        takenByUserId: mozoUser._id,
        takenByName: mozoUser.displayName,
        status: 'ENTREGADO',
        items: [{ dishId, dishName: 'Arroz con Mariscos', sectionName: 'Marino', unitPriceCents: 3800, quantity: 2, lineTotalCents: 7600 }],
        totalCents: 7600,
        currency: 'PEN',
        statusHistory: [{ status: 'ENTREGADO', at: new Date(), byUserId: mozoUser._id, byName: 'Mozo', byRole: 'MOZO', version: 1 }],
        enviadoEn: new Date(),
        entregadoEn: new Date(),
        version: 1
      });

      const response = await request(app)
        .post(`/api/shifts/${shift._id}/close`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ observations: 'Turno sin incidentes' });

      expect(response.status).toBe(200);
      expect(response.body.shiftId).toBe(shift._id.toString());
      expect(response.body.totalAmountCents).toBe(7600);
      expect(response.body.soldDishes.length).toBe(1);
      expect(response.body.soldDishes[0].dishName).toBe('Arroz con Mariscos');
      expect(response.body.soldDishes[0].quantity).toBe(2);

      // Verifica que el turno en BD esté CERRADO
      const updatedShift = await Shift.findById(shift._id);
      expect(updatedShift?.status).toBe('CERRADO');
    });
  });

  describe('GET /api/shifts/:id/summary (T039)', () => {
    it('debe retornar el resumen generado de un turno cerrado', async () => {
      const shift = await Shift.create({
        date: '2026-11-18',
        label: 'Almuerzo',
        status: 'ABIERTO',
        openedBy: encargadoUser._id,
        openedAt: new Date()
      });

      // Cierra turno para generar resumen
      await request(app)
        .post(`/api/shifts/${shift._id}/close`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ observations: 'Observación de prueba' });

      const response = await request(app)
        .get(`/api/shifts/${shift._id}/summary`)
        .set('Authorization', `Bearer ${encargadoToken}`);

      expect(response.status).toBe(200);
      expect(response.body.shiftId).toBe(shift._id.toString());
      expect(response.body.observations).toBe('Observación de prueba');
      expect(response.body).toHaveProperty('soldDishes');
      expect(response.body).toHaveProperty('cancellations');
    });
  });
});
