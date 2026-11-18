import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { Table, TableSession, Shift, Order, User } from '../src/models';
import { signToken } from '../src/utils/jwt';
import { ensureOpenTableSession } from '../src/services/table.service';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup';

describe('Fase 3: Mesas y Sesiones (T029–T035)', () => {
  let mozoToken: string;
  let encargadoToken: string;
  let cocineroToken: string;
  let mozoUser: any;
  let openShift: any;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    // Crea usuarios para los roles
    mozoUser = await User.create({
      username: 'mozo1',
      passwordHash: 'hash',
      displayName: 'Mozo 1',
      role: 'MOZO',
      active: true
    });
    const encargadoUser = await User.create({
      username: 'encargado1',
      passwordHash: 'hash',
      displayName: 'Encargado 1',
      role: 'ENCARGADO',
      active: true
    });
    const cocineroUser = await User.create({
      username: 'cocinero1',
      passwordHash: 'hash',
      displayName: 'Cocinero 1',
      role: 'COCINERO',
      active: true
    });

    mozoToken = signToken({
      id: mozoUser._id.toString(),
      username: mozoUser.username,
      displayName: mozoUser.displayName,
      role: mozoUser.role
    });
    encargadoToken = signToken({
      id: encargadoUser._id.toString(),
      username: encargadoUser.username,
      displayName: encargadoUser.displayName,
      role: encargadoUser.role
    });
    cocineroToken = signToken({
      id: cocineroUser._id.toString(),
      username: cocineroUser.username,
      displayName: cocineroUser.displayName,
      role: cocineroUser.role
    });

    // Crea turno abierto
    openShift = await Shift.create({
      date: '2026-11-18',
      label: 'Almuerzo',
      status: 'ABIERTO',
      openedBy: encargadoUser._id,
      openedAt: new Date()
    });
  });

  describe('GET /api/tables (Estado derivado)', () => {
    it('debe listar mesas con estados derivados LIBRE, OCUPADA y POR_CERRAR', async () => {
      // 1. Mesa Libre
      await Table.create({ code: 'M01', zone: 'Salón', seats: 4, active: true });

      // 2. Mesa Ocupada (sesión abierta + pedido ENVIADO)
      const table2 = await Table.create({ code: 'M02', zone: 'Salón', seats: 4, active: true });
      const session2 = await TableSession.create({
        tableId: table2._id,
        tableCode: table2.code,
        shiftId: openShift._id,
        status: 'ABIERTA',
        openedBy: mozoUser._id,
        openedAt: new Date()
      });
      await Order.create({
        orderNumber: 1,
        shiftId: openShift._id,
        tableId: table2._id,
        tableCode: table2.code,
        tableSessionId: session2._id,
        takenByUserId: mozoUser._id,
        takenByName: mozoUser.displayName,
        status: 'ENVIADO',
        items: [
          {
            dishId: new mongoose.Types.ObjectId(),
            dishName: 'Ceviche Clásico',
            sectionName: 'Marino',
            unitPriceCents: 3500,
            quantity: 1,
            lineTotalCents: 3500
          }
        ],
        totalCents: 3500,
        currency: 'PEN',
        statusHistory: [{ status: 'ENVIADO', at: new Date(), byUserId: mozoUser._id, byName: 'Mozo 1', byRole: 'MOZO', version: 0 }],
        enviadoEn: new Date(),
        version: 0
      });

      // 3. Mesa Por Cerrar (sesión abierta sin pedidos activos, e.g. entregado)
      const table3 = await Table.create({ code: 'M03', zone: 'Terraza', seats: 2, active: true });
      const session3 = await TableSession.create({
        tableId: table3._id,
        tableCode: table3.code,
        shiftId: openShift._id,
        status: 'ABIERTA',
        openedBy: mozoUser._id,
        openedAt: new Date()
      });
      await Order.create({
        orderNumber: 2,
        shiftId: openShift._id,
        tableId: table3._id,
        tableCode: table3.code,
        tableSessionId: session3._id,
        takenByUserId: mozoUser._id,
        takenByName: mozoUser.displayName,
        status: 'ENTREGADO',
        items: [
          {
            dishId: new mongoose.Types.ObjectId(),
            dishName: 'Chicharrón de Calamar',
            sectionName: 'Marino',
            unitPriceCents: 3000,
            quantity: 1,
            lineTotalCents: 3000
          }
        ],
        totalCents: 3000,
        currency: 'PEN',
        statusHistory: [{ status: 'ENTREGADO', at: new Date(), byUserId: mozoUser._id, byName: 'Mozo 1', byRole: 'MOZO', version: 1 }],
        enviadoEn: new Date(),
        entregadoEn: new Date(),
        version: 1
      });

      const response = await request(app)
        .get('/api/tables')
        .set('Authorization', `Bearer ${mozoToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.length).toBe(3);

      const m1 = response.body.data.find((t: any) => t.code === 'M01');
      const m2 = response.body.data.find((t: any) => t.code === 'M02');
      const m3 = response.body.data.find((t: any) => t.code === 'M03');

      expect(m1.state).toBe('LIBRE');
      expect(m1.openSessionId).toBeNull();

      expect(m2.state).toBe('OCUPADA');
      expect(m2.openSessionId).toBe(session2._id.toString());

      expect(m3.state).toBe('POR_CERRAR');
      expect(m3.openSessionId).toBe(session3._id.toString());
    });
  });

  describe('Apertura y regla de sesión única (T030)', () => {
    it('ensureOpenTableSession debe crear una sesión si no existe o retornar la abierta', async () => {
      const table = await Table.create({ code: 'M05', zone: 'Salón', seats: 4, active: true });

      const session1 = await ensureOpenTableSession(table._id, openShift._id, {
        id: mozoUser._id.toString(),
        username: mozoUser.username,
        displayName: mozoUser.displayName,
        role: mozoUser.role
      });

      expect(session1.status).toBe('ABIERTA');
      expect(session1.tableCode).toBe('M05');

      // Segunda llamada debe retornar la misma sesión sin duplicar
      const session2 = await ensureOpenTableSession(table._id, openShift._id, {
        id: mozoUser._id.toString(),
        username: mozoUser.username,
        displayName: mozoUser.displayName,
        role: mozoUser.role
      });

      expect(session2._id.toString()).toBe(session1._id.toString());
    });

    it('el índice parcial único debe impedir dos sesiones ABIERTA en la misma mesa', async () => {
      const table = await Table.create({ code: 'M06', zone: 'Salón', seats: 4, active: true });

      // Crea primera sesión abierta
      await TableSession.create({
        tableId: table._id,
        tableCode: table.code,
        shiftId: openShift._id,
        status: 'ABIERTA',
        openedBy: mozoUser._id,
        openedAt: new Date()
      });

      // Intentar crear directamente otra sesión abierta para la misma mesa debe violar la unicidad
      await expect(
        TableSession.create({
          tableId: table._id,
          tableCode: table.code,
          shiftId: openShift._id,
          status: 'ABIERTA',
          openedBy: mozoUser._id,
          openedAt: new Date()
        })
      ).rejects.toThrow();
    });
  });

  describe('POST /api/table-sessions/:id/close (T031)', () => {
    it('debe rechazar el cierre de mesa con 409 TABLE_HAS_ACTIVE_ORDERS si hay pedidos ENVIADO o LISTO', async () => {
      const table = await Table.create({ code: 'M07', zone: 'Salón', seats: 4, active: true });
      const session = await TableSession.create({
        tableId: table._id,
        tableCode: table.code,
        shiftId: openShift._id,
        status: 'ABIERTA',
        openedBy: mozoUser._id,
        openedAt: new Date()
      });

      await Order.create({
        orderNumber: 10,
        shiftId: openShift._id,
        tableId: table._id,
        tableCode: table.code,
        tableSessionId: session._id,
        takenByUserId: mozoUser._id,
        takenByName: mozoUser.displayName,
        status: 'LISTO',
        items: [{ dishId: new mongoose.Types.ObjectId(), dishName: 'Tiradito', sectionName: 'Marino', unitPriceCents: 3200, quantity: 1, lineTotalCents: 3200 }],
        totalCents: 3200,
        currency: 'PEN',
        statusHistory: [{ status: 'LISTO', at: new Date(), byUserId: mozoUser._id, byName: 'Mozo', byRole: 'MOZO', version: 1 }],
        enviadoEn: new Date(),
        listoEn: new Date(),
        version: 1
      });

      const response = await request(app)
        .post(`/api/table-sessions/${session._id}/close`)
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({ notes: 'Intentando cerrar con pedido listo' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('TABLE_HAS_ACTIVE_ORDERS');
    });

    it('debe permitir cerrar la mesa si no hay pedidos activos y marcar CERRADA', async () => {
      const table = await Table.create({ code: 'M08', zone: 'Salón', seats: 4, active: true });
      const session = await TableSession.create({
        tableId: table._id,
        tableCode: table.code,
        shiftId: openShift._id,
        status: 'ABIERTA',
        openedBy: mozoUser._id,
        openedAt: new Date()
      });

      const response = await request(app)
        .post(`/api/table-sessions/${session._id}/close`)
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({ notes: 'Mesa atendida correctamente' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('CERRADA');

      const updatedSession = await TableSession.findById(session._id);
      expect(updatedSession?.status).toBe('CERRADA');
      expect(updatedSession?.notes).toBe('Mesa atendida correctamente');
    });

    it('debe permitir a un ENCARGADO cerrar una sesión de mesa sin pedidos activos', async () => {
      const table = await Table.create({ code: 'M08B', zone: 'Salón', seats: 4, active: true });
      const session = await TableSession.create({
        tableId: table._id,
        tableCode: table.code,
        shiftId: openShift._id,
        status: 'ABIERTA',
        openedBy: mozoUser._id,
        openedAt: new Date()
      });

      const response = await request(app)
        .post(`/api/table-sessions/${session._id}/close`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ notes: 'Cierre por encargado' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('CERRADA');
    });

    it('debe rechazar el cierre con 403 si el rol es COCINERO', async () => {
      const table = await Table.create({ code: 'M09', zone: 'Salón', seats: 4, active: true });
      const session = await TableSession.create({
        tableId: table._id,
        tableCode: table.code,
        shiftId: openShift._id,
        status: 'ABIERTA',
        openedBy: mozoUser._id,
        openedAt: new Date()
      });

      const response = await request(app)
        .post(`/api/table-sessions/${session._id}/close`)
        .set('Authorization', `Bearer ${cocineroToken}`)
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/tables/:id (T032)', () => {
    it('debe retornar detalle de la mesa con sus rondas y pedidos asociados', async () => {
      const table = await Table.create({ code: 'M10', zone: 'Salón', seats: 4, active: true });
      const session = await TableSession.create({
        tableId: table._id,
        tableCode: table.code,
        shiftId: openShift._id,
        status: 'ABIERTA',
        openedBy: mozoUser._id,
        openedAt: new Date()
      });

      const response = await request(app)
        .get(`/api/tables/${table._id}`)
        .set('Authorization', `Bearer ${mozoToken}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe('M10');
      expect(response.body.state).toBe('POR_CERRAR');
      expect(response.body.openSession.id).toBe(session._id.toString());
    });
  });
});
