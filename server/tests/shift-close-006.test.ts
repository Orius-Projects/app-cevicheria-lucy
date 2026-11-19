import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/app';
import {
  Shift,
  ShiftSummary,
  User,
  Order,
  Table,
  TableSession,
  Dish,
  MenuDay,
  MenuItem,
  ManualRecord
} from '../src/models';
import { signToken } from '../src/utils/jwt';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup';

describe('Spec 006 — Cierre de Turno (Brief 008)', () => {
  let encargadoToken: string;
  let mozoToken: string;
  let encargadoUser: any;
  let mozoUser: any;

  beforeAll(async () => {
    await setupTestDB();
  }, 30000);

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
  }, 30000);

  describe('1. Preview del resumen (GET /api/shifts/:id/summary en turno ABIERTO)', () => {
    it('debe calcular el resumen en vivo con platos vendidos, agotados, raciones restantes, cancelaciones y registros manuales', async () => {
      const shiftDate = '2026-11-18';
      const shift = await Shift.create({
        date: shiftDate,
        label: 'Almuerzo',
        status: 'ABIERTO',
        openedBy: encargadoUser._id,
        openedAt: new Date()
      });

      const dish1 = await Dish.create({
        name: 'Ceviche Clásico',
        priceCents: 3500,
        course: 'FONDO',
        active: true,
        sectionId: new mongoose.Types.ObjectId()
      });

      const dish2 = await Dish.create({
        name: 'Arroz con Mariscos',
        priceCents: 4000,
        course: 'FONDO',
        active: true,
        sectionId: new mongoose.Types.ObjectId()
      });

      const dish3 = await Dish.create({
        name: 'Tiradito de Pescado',
        priceCents: 3800,
        course: 'ENTRADA',
        active: true,
        sectionId: new mongoose.Types.ObjectId()
      });

      const menuDay = await MenuDay.create({
        date: shiftDate,
        status: 'PUBLICADO',
        publishedBy: encargadoUser._id,
        publishedAt: new Date()
      });

      // MenuItem 1: con límite de raciones (8 restantes)
      await MenuItem.create({
        menuDayId: menuDay._id,
        dishId: dish1._id,
        dishName: dish1.name,
        sectionKey: 'MARINOS',
        priceCents: dish1.priceCents,
        hasRationsLimit: true,
        initialRations: 20,
        remainingRations: 8,
        active: true
      });

      // MenuItem 2: plato agotado manualmente
      await MenuItem.create({
        menuDayId: menuDay._id,
        dishId: dish2._id,
        dishName: dish2.name,
        sectionKey: 'MARINOS',
        priceCents: dish2.priceCents,
        hasRationsLimit: false,
        manuallySoldOut: true,
        soldOutReason: 'Agotado mariscos del día',
        active: true
      });

      // MenuItem 3: plato agotado por raciones en 0
      await MenuItem.create({
        menuDayId: menuDay._id,
        dishId: dish3._id,
        dishName: dish3.name,
        sectionKey: 'MARINOS',
        priceCents: dish3.priceCents,
        hasRationsLimit: true,
        initialRations: 10,
        remainingRations: 0,
        active: true
      });

      const table = await Table.create({
        code: 'M01',
        label: 'Mesa 1',
        capacity: 4,
        zone: 'SALON',
        active: true
      });

      const session = await TableSession.create({
        tableId: table._id,
        tableCode: table.code,
        shiftId: shift._id,
        status: 'ABIERTA',
        openedBy: mozoUser._id,
        openedAt: new Date()
      });

      // Pedido entregado (ENTREGADO)
      await Order.create({
        orderNumber: 101,
        tableId: table._id,
        tableSessionId: session._id,
        tableCode: table.code,
        shiftId: shift._id,
        status: 'ENTREGADO',
        takenByUserId: mozoUser._id,
        takenByName: mozoUser.displayName,
        items: [
          {
            dishId: dish1._id,
            dishName: dish1.name,
            sectionName: 'Marinos',
            quantity: 2,
            unitPriceCents: 3500,
            lineTotalCents: 7000
          }
        ],
        totalCents: 7000,
        version: 2,
        orderedByUserId: mozoUser._id,
        orderedByName: mozoUser.displayName,
        orderedByRole: mozoUser.role,
        enviadoEn: new Date(),
        entregadoEn: new Date(),
        deliveredByUserId: mozoUser._id,
        deliveredByName: mozoUser.displayName
      });

      // Pedido cancelado (CANCELADO)
      await Order.create({
        orderNumber: 102,
        tableId: table._id,
        tableSessionId: session._id,
        tableCode: table.code,
        shiftId: shift._id,
        status: 'CANCELADO',
        takenByUserId: mozoUser._id,
        takenByName: mozoUser.displayName,
        items: [
          {
            dishId: dish1._id,
            dishName: dish1.name,
            sectionName: 'Marinos',
            quantity: 1,
            unitPriceCents: 3500,
            lineTotalCents: 3500
          }
        ],
        totalCents: 3500,
        version: 1,
        cancelReason: 'Cliente cambió de opinión',
        cancelledByUserId: mozoUser._id,
        cancelledByName: mozoUser.displayName,
        cancelledByRole: mozoUser.role,
        orderedByUserId: mozoUser._id,
        orderedByName: mozoUser.displayName,
        orderedByRole: mozoUser.role,
        enviadoEn: new Date(),
        canceladoEn: new Date()
      });

      // Registro manual PAPER
      await ManualRecord.create({
        shiftId: shift._id,
        tableCode: 'M05',
        items: [
          { name: 'Ceviche Mixto', quantity: 1, amountCents: 4500 }
        ],
        totalCents: 4500,
        notes: 'Atendido en libreta por corte de luz',
        source: 'PAPER',
        createdBy: encargadoUser._id
      });

      // Consulta del resumen de turno abierto
      const response = await request(app)
        .get(`/api/shifts/${shift._id}/summary`)
        .set('Authorization', `Bearer ${encargadoToken}`);

      expect(response.status).toBe(200);
      expect(response.body.shiftId).toBe(shift._id.toString());
      expect(response.body.date).toBe(shiftDate);
      expect(response.body.label).toBe('Almuerzo');
      expect(response.body.closedAt).toBeNull();

      // Platos vendidos de pedidos entregados
      expect(response.body.soldDishes).toHaveLength(1);
      expect(response.body.soldDishes[0].dishName).toBe('Ceviche Clásico');
      expect(response.body.soldDishes[0].quantity).toBe(2);
      expect(response.body.soldDishes[0].amountCents).toBe(7000);
      expect(response.body.totalAmountCents).toBe(7000);

      // Raciones restantes
      expect(response.body.remainingRations).toContainEqual(
        expect.objectContaining({
          dishName: 'Ceviche Clásico',
          remainingRations: 8
        })
      );

      // Platos agotados
      expect(response.body.soldOutDishes).toContainEqual(
        expect.objectContaining({
          dishName: 'Arroz con Mariscos',
          reason: 'Agotado mariscos del día'
        })
      );
      expect(response.body.soldOutDishes).toContainEqual(
        expect.objectContaining({
          dishName: 'Tiradito de Pescado',
          reason: 'Raciones agotadas'
        })
      );

      // Cancelaciones
      expect(response.body.cancellations).toContainEqual({
        orderNumber: 102,
        reason: 'Cliente cambió de opinión',
        cancelledBy: 'Mozo 1'
      });

      // Registros manuales PAPER separados de soldDishes
      expect(response.body.manualRecords).toHaveLength(1);
      expect(response.body.manualRecords[0].tableCode).toBe('M05');
      expect(response.body.manualRecords[0].totalCents).toBe(4500);
      expect(response.body.manualTotalCents).toBe(4500);
    });

    it('debe rechazar con 403 si un Mozo intenta consultar el resumen', async () => {
      const shift = await Shift.create({
        date: '2026-11-18',
        label: 'Almuerzo',
        status: 'ABIERTO',
        openedBy: encargadoUser._id,
        openedAt: new Date()
      });

      const response = await request(app)
        .get(`/api/shifts/${shift._id}/summary`)
        .set('Authorization', `Bearer ${mozoToken}`);

      expect(response.status).toBe(403);
    });

    it('debe retornar 404 si el turno no existe', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/shifts/${nonExistentId}/summary`)
        .set('Authorization', `Bearer ${encargadoToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('2. Cierre con pendientes y cierre válido', () => {
    it('debe impedir cerrar con 409 OPEN_ORDERS_REMAIN si hay pedidos ENVIADO o LISTO', async () => {
      const shift = await Shift.create({
        date: '2026-11-18',
        label: 'Almuerzo',
        status: 'ABIERTO',
        openedBy: encargadoUser._id,
        openedAt: new Date()
      });

      const table = await Table.create({
        code: 'M02',
        label: 'Mesa 2',
        capacity: 4,
        zone: 'SALON',
        active: true
      });

      const session = await TableSession.create({
        tableId: table._id,
        tableCode: table.code,
        shiftId: shift._id,
        status: 'ABIERTA',
        openedBy: mozoUser._id,
        openedAt: new Date()
      });

      await Order.create({
        orderNumber: 201,
        tableId: table._id,
        tableSessionId: session._id,
        tableCode: table.code,
        shiftId: shift._id,
        takenByUserId: mozoUser._id,
        takenByName: mozoUser.displayName,
        status: 'LISTO',
        items: [
          {
            dishId: new mongoose.Types.ObjectId(),
            dishName: 'Ceviche',
            sectionName: 'Marinos',
            quantity: 1,
            unitPriceCents: 3000,
            lineTotalCents: 3000
          }
        ],
        totalCents: 3000,
        version: 1,
        orderedByUserId: mozoUser._id,
        orderedByName: mozoUser.displayName,
        orderedByRole: mozoUser.role,
        enviadoEn: new Date()
      });

      const response = await request(app)
        .post(`/api/shifts/${shift._id}/close`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ observations: 'Intento de cierre con pedidos pendientes' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('OPEN_ORDERS_REMAIN');
    });

    it('debe impedir cerrar con 409 OPEN_TABLES_REMAIN si no hay pedidos pero hay mesas ABIERTA', async () => {
      const shift = await Shift.create({
        date: '2026-11-18',
        label: 'Almuerzo',
        status: 'ABIERTO',
        openedBy: encargadoUser._id,
        openedAt: new Date()
      });

      const table = await Table.create({
        code: 'M03',
        label: 'Mesa 3',
        capacity: 4,
        zone: 'SALON',
        active: true
      });

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
        .send({ observations: 'Intento de cierre con mesa abierta' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('OPEN_TABLES_REMAIN');
    });

    it('debe cerrar el turno exitosamente, guardar observaciones y generar snapshot inmutable', async () => {
      const shift = await Shift.create({
        date: '2026-11-18',
        label: 'Almuerzo',
        status: 'ABIERTO',
        openedBy: encargadoUser._id,
        openedAt: new Date()
      });

      const table = await Table.create({
        code: 'M04',
        label: 'Mesa 4',
        capacity: 4,
        zone: 'TERRAZA',
        active: true
      });

      // Mesa cerrada previamente
      await TableSession.create({
        tableId: table._id,
        tableCode: table.code,
        shiftId: shift._id,
        status: 'CERRADA',
        openedBy: mozoUser._id,
        openedAt: new Date(),
        closedBy: encargadoUser._id,
        closedAt: new Date()
      });

      const response = await request(app)
        .post(`/api/shifts/${shift._id}/close`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ observations: 'Cierre regular sin incidentes ni faltantes' });

      expect(response.status).toBe(200);
      expect(response.body.shiftId).toBe(shift._id.toString());
      expect(response.body.observations).toBe('Cierre regular sin incidentes ni faltantes');
      expect(response.body.closedAt).toBeDefined();
      expect(response.body.closedAt).not.toBeNull();

      // Verificación en base de datos del turno
      const updatedShift = await Shift.findById(shift._id);
      expect(updatedShift?.status).toBe('CERRADO');
      expect(updatedShift?.closedBy?.toString()).toBe(encargadoUser._id.toString());
      expect(updatedShift?.closedAt).toBeDefined();
      expect(updatedShift?.notes).toBe('Cierre regular sin incidentes ni faltantes');

      // Verificación del snapshot en ShiftSummary
      const savedSummary = await ShiftSummary.findOne({ shiftId: shift._id });
      expect(savedSummary).toBeDefined();
      expect(savedSummary?.observations).toBe('Cierre regular sin incidentes ni faltantes');
      expect(savedSummary?.closedAt).toBeDefined();
    });
  });

  describe('3. Doble cierre y nuevo pedido tras cierre', () => {
    it('debe responder 409 si se intenta cerrar un turno ya cerrado (doble cierre)', async () => {
      const shift = await Shift.create({
        date: '2026-11-18',
        label: 'Almuerzo',
        status: 'ABIERTO',
        openedBy: encargadoUser._id,
        openedAt: new Date()
      });

      // Primer cierre válido
      const firstClose = await request(app)
        .post(`/api/shifts/${shift._id}/close`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ observations: 'Primer cierre' });
      expect(firstClose.status).toBe(200);

      // Segundo cierre debe fallar con 409
      const secondClose = await request(app)
        .post(`/api/shifts/${shift._id}/close`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ observations: 'Segundo intento' });

      expect(secondClose.status).toBe(409);
      expect(secondClose.body.error.message).toContain('cerrado');
    });

    it('debe responder 409 SHIFT_NOT_OPEN al intentar crear un pedido cuando no hay turno abierto', async () => {
      // Turno cerrado previamente
      await Shift.create({
        date: '2026-11-18',
        label: 'Almuerzo',
        status: 'CERRADO',
        openedBy: encargadoUser._id,
        openedAt: new Date(),
        closedBy: encargadoUser._id,
        closedAt: new Date()
      });

      const table = await Table.create({
        code: 'M05',
        label: 'Mesa 5',
        capacity: 4,
        zone: 'SALON',
        active: true
      });

      const dish = await Dish.create({
        name: 'Chicharrón de Calamar',
        priceCents: 3200,
        course: 'FONDO',
        active: true,
        sectionId: new mongoose.Types.ObjectId()
      });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({
          tableId: table._id.toString(),
          items: [{ dishId: dish._id.toString(), quantity: 1 }]
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('SHIFT_NOT_OPEN');
    });

    it('debe devolver el snapshot guardado inmutable al consultar GET /api/shifts/:id/summary de un turno cerrado', async () => {
      const shift = await Shift.create({
        date: '2026-11-18',
        label: 'Almuerzo',
        status: 'ABIERTO',
        openedBy: encargadoUser._id,
        openedAt: new Date()
      });

      await request(app)
        .post(`/api/shifts/${shift._id}/close`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ observations: 'Snapshot inmutable' });

      const res = await request(app)
        .get(`/api/shifts/${shift._id}/summary`)
        .set('Authorization', `Bearer ${encargadoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.shiftId).toBe(shift._id.toString());
      expect(res.body.observations).toBe('Snapshot inmutable');
      expect(res.body.closedAt).toBeDefined();
      expect(res.body.closedAt).not.toBeNull();
    });
  });

  describe('4. Registros manuales PAPER (POST y GET /api/shifts/:id/manual-records)', () => {
    it('debe crear un registro manual válido en un turno ABIERTO y listarlo', async () => {
      const shift = await Shift.create({
        date: '2026-11-18',
        label: 'Almuerzo',
        status: 'ABIERTO',
        openedBy: encargadoUser._id,
        openedAt: new Date()
      });

      const payload = {
        tableCode: 'M06',
        items: [
          { name: 'Ceviche Mixto', quantity: 2, amountCents: 7000 },
          { name: 'Chicha Morada Jarra', quantity: 1, amountCents: 1500 }
        ],
        totalCents: 8500,
        notes: 'Atendido con libreta física por caída de red'
      };

      const postRes = await request(app)
        .post(`/api/shifts/${shift._id}/manual-records`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send(payload);

      expect(postRes.status).toBe(201);
      expect(postRes.body.shiftId).toBe(shift._id.toString());
      expect(postRes.body.tableCode).toBe('M06');
      expect(postRes.body.items).toHaveLength(2);
      expect(postRes.body.totalCents).toBe(8500);
      expect(postRes.body.source).toBe('PAPER');
      expect(postRes.body.createdBy).toBe(encargadoUser._id.toString());

      // Consulta de registros manuales
      const getRes = await request(app)
        .get(`/api/shifts/${shift._id}/manual-records`)
        .set('Authorization', `Bearer ${encargadoToken}`);

      expect(getRes.status).toBe(200);
      expect(Array.isArray(getRes.body)).toBe(true);
      expect(getRes.body).toHaveLength(1);
      expect(getRes.body[0].tableCode).toBe('M06');

      // Aparece en el resumen de turno
      const summaryRes = await request(app)
        .get(`/api/shifts/${shift._id}/summary`)
        .set('Authorization', `Bearer ${encargadoToken}`);

      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.manualRecords).toHaveLength(1);
      expect(summaryRes.body.manualTotalCents).toBe(8500);
    });

    it('debe rechazar con 403 si un Mozo intenta registrar o consultar pedidos manuales', async () => {
      const shift = await Shift.create({
        date: '2026-11-18',
        label: 'Almuerzo',
        status: 'ABIERTO',
        openedBy: encargadoUser._id,
        openedAt: new Date()
      });

      const postRes = await request(app)
        .post(`/api/shifts/${shift._id}/manual-records`)
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({
          tableCode: 'M07',
          items: [{ name: 'Ceviche', quantity: 1, amountCents: 3500 }]
        });
      expect(postRes.status).toBe(403);

      const getRes = await request(app)
        .get(`/api/shifts/${shift._id}/manual-records`)
        .set('Authorization', `Bearer ${mozoToken}`);
      expect(getRes.status).toBe(403);
    });

    it('debe rechazar con 409 si se intenta agregar un registro manual a un turno CERRADO', async () => {
      const shift = await Shift.create({
        date: '2026-11-18',
        label: 'Almuerzo',
        status: 'CERRADO',
        openedBy: encargadoUser._id,
        openedAt: new Date(),
        closedBy: encargadoUser._id,
        closedAt: new Date()
      });

      const res = await request(app)
        .post(`/api/shifts/${shift._id}/manual-records`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({
          tableCode: 'M08',
          items: [{ name: 'Ceviche', quantity: 1, amountCents: 3500 }]
        });

      expect(res.status).toBe(409);
    });

    it('debe rechazar con 422 si los datos del registro manual son inválidos', async () => {
      const shift = await Shift.create({
        date: '2026-11-18',
        label: 'Almuerzo',
        status: 'ABIERTO',
        openedBy: encargadoUser._id,
        openedAt: new Date()
      });

      // 1. Sin mesa
      const res1 = await request(app)
        .post(`/api/shifts/${shift._id}/manual-records`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({
          tableCode: '',
          items: [{ name: 'Ceviche', quantity: 1, amountCents: 3500 }]
        });
      expect(res1.status).toBe(422);

      // 2. Lista de items vacía
      const res2 = await request(app)
        .post(`/api/shifts/${shift._id}/manual-records`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({
          tableCode: 'M01',
          items: []
        });
      expect(res2.status).toBe(422);

      // 3. Cantidad menor a 1 o negativa
      const res3 = await request(app)
        .post(`/api/shifts/${shift._id}/manual-records`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({
          tableCode: 'M01',
          items: [{ name: 'Ceviche', quantity: 0, amountCents: 3500 }]
        });
      expect(res3.status).toBe(422);

      // 4. Monto negativo
      const res4 = await request(app)
        .post(`/api/shifts/${shift._id}/manual-records`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({
          tableCode: 'M01',
          items: [{ name: 'Ceviche', quantity: 1, amountCents: -500 }]
        });
      expect(res4.status).toBe(422);

      // 5. Nombre de plato vacío
      const res5 = await request(app)
        .post(`/api/shifts/${shift._id}/manual-records`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({
          tableCode: 'M01',
          items: [{ name: '', quantity: 1, amountCents: 3500 }]
        });
      expect(res5.status).toBe(422);
    });
  });

  describe('5. Cierre manual de pedido (POST /api/orders/:id/manual-close)', () => {
    it('debe permitir a un ENCARGADO cerrar manualmente un pedido en estado LISTO con motivo', async () => {
      const shift = await Shift.create({
        date: '2026-11-18',
        label: 'Almuerzo',
        status: 'ABIERTO',
        openedBy: encargadoUser._id,
        openedAt: new Date()
      });

      const table = await Table.create({
        code: 'M10',
        label: 'Mesa 10',
        capacity: 4,
        zone: 'SALON',
        active: true
      });

      const session = await TableSession.create({
        tableId: table._id,
        tableCode: table.code,
        shiftId: shift._id,
        status: 'ABIERTA',
        openedBy: mozoUser._id,
        openedAt: new Date()
      });

      const order = await Order.create({
        orderNumber: 501,
        tableId: table._id,
        tableSessionId: session._id,
        tableCode: table.code,
        shiftId: shift._id,
        takenByUserId: mozoUser._id,
        takenByName: mozoUser.displayName,
        status: 'LISTO',
        items: [
          {
            dishId: new mongoose.Types.ObjectId(),
            dishName: 'Chicharrón de Pescado',
            sectionName: 'Marinos',
            quantity: 1,
            unitPriceCents: 3600,
            lineTotalCents: 3600
          }
        ],
        totalCents: 3600,
        version: 1,
        orderedByUserId: mozoUser._id,
        orderedByName: mozoUser.displayName,
        orderedByRole: mozoUser.role,
        enviadoEn: new Date(),
        listoEn: new Date()
      });

      const res = await request(app)
        .post(`/api/orders/${order._id}/manual-close`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ reason: 'Mozo no marcó la entrega pero plato fue consumido' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ENTREGADO');
      expect(res.body.manualClose).toBe(true);
      expect(res.body.manualCloseReason).toBe('Mozo no marcó la entrega pero plato fue consumido');

      // Auditoría en base de datos
      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder?.status).toBe('ENTREGADO');
      expect(updatedOrder?.manualClose).toBe(true);
      expect(updatedOrder?.manualCloseReason).toBe('Mozo no marcó la entrega pero plato fue consumido');
      expect(updatedOrder?.deliveredByUserId?.toString()).toBe(encargadoUser._id.toString());
      expect(updatedOrder?.deliveredByName).toBe(encargadoUser.displayName);
      expect(updatedOrder?.entregadoEn).toBeDefined();

      const lastHistory = updatedOrder?.statusHistory[updatedOrder.statusHistory.length - 1];
      expect(lastHistory?.status).toBe('ENTREGADO');
      expect(lastHistory?.previousStatus).toBe('LISTO');
      expect(lastHistory?.byRole).toBe('ENCARGADO');
      expect(lastHistory?.reason).toContain('Mozo no marcó la entrega');
    });

    it('debe rechazar con 422 si el cierre manual no incluye motivo obligatorio', async () => {
      const shift = await Shift.create({
        date: '2026-11-18',
        label: 'Almuerzo',
        status: 'ABIERTO',
        openedBy: encargadoUser._id,
        openedAt: new Date()
      });

      const table = await Table.create({
        code: 'M11',
        label: 'Mesa 11',
        capacity: 4,
        zone: 'SALON',
        active: true
      });

      const session = await TableSession.create({
        tableId: table._id,
        tableCode: table.code,
        shiftId: shift._id,
        status: 'ABIERTA',
        openedBy: mozoUser._id,
        openedAt: new Date()
      });

      const order = await Order.create({
        orderNumber: 502,
        tableId: table._id,
        tableSessionId: session._id,
        tableCode: table.code,
        shiftId: shift._id,
        takenByUserId: mozoUser._id,
        takenByName: mozoUser.displayName,
        status: 'ENVIADO',
        items: [
          {
            dishId: new mongoose.Types.ObjectId(),
            dishName: 'Ceviche',
            sectionName: 'Marinos',
            quantity: 1,
            unitPriceCents: 3000,
            lineTotalCents: 3000
          }
        ],
        totalCents: 3000,
        version: 0,
        orderedByUserId: mozoUser._id,
        orderedByName: mozoUser.displayName,
        orderedByRole: mozoUser.role,
        enviadoEn: new Date()
      });

      // Motivo vacío
      const resEmpty = await request(app)
        .post(`/api/orders/${order._id}/manual-close`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ reason: '' });

      expect(resEmpty.status).toBe(422);

      // Sin campo reason
      const resMissing = await request(app)
        .post(`/api/orders/${order._id}/manual-close`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({});

      expect(resMissing.status).toBe(422);
    });

    it('debe rechazar con 409 si el pedido ya está en estado terminal (ENTREGADO o CANCELADO)', async () => {
      const shift = await Shift.create({
        date: '2026-11-18',
        label: 'Almuerzo',
        status: 'ABIERTO',
        openedBy: encargadoUser._id,
        openedAt: new Date()
      });

      const table = await Table.create({
        code: 'M12',
        label: 'Mesa 12',
        capacity: 4,
        zone: 'SALON',
        active: true
      });

      const session = await TableSession.create({
        tableId: table._id,
        tableCode: table.code,
        shiftId: shift._id,
        status: 'ABIERTA',
        openedBy: mozoUser._id,
        openedAt: new Date()
      });

      // 1. Pedido ya ENTREGADO
      const deliveredOrder = await Order.create({
        orderNumber: 503,
        tableId: table._id,
        tableSessionId: session._id,
        tableCode: table.code,
        shiftId: shift._id,
        takenByUserId: mozoUser._id,
        takenByName: mozoUser.displayName,
        status: 'ENTREGADO',
        items: [
          {
            dishId: new mongoose.Types.ObjectId(),
            dishName: 'Ceviche',
            sectionName: 'Marinos',
            quantity: 1,
            unitPriceCents: 3000,
            lineTotalCents: 3000
          }
        ],
        totalCents: 3000,
        version: 2,
        orderedByUserId: mozoUser._id,
        orderedByName: mozoUser.displayName,
        orderedByRole: mozoUser.role,
        enviadoEn: new Date(),
        entregadoEn: new Date()
      });

      const resDelivered = await request(app)
        .post(`/api/orders/${deliveredOrder._id}/manual-close`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ reason: 'Reintento de cierre' });

      expect(resDelivered.status).toBe(409);

      // 2. Pedido ya CANCELADO
      const cancelledOrder = await Order.create({
        orderNumber: 504,
        tableId: table._id,
        tableSessionId: session._id,
        tableCode: table.code,
        shiftId: shift._id,
        takenByUserId: mozoUser._id,
        takenByName: mozoUser.displayName,
        status: 'CANCELADO',
        items: [
          {
            dishId: new mongoose.Types.ObjectId(),
            dishName: 'Ceviche',
            sectionName: 'Marinos',
            quantity: 1,
            unitPriceCents: 3000,
            lineTotalCents: 3000
          }
        ],
        totalCents: 3000,
        version: 1,
        cancelReason: 'Cliente desistió',
        orderedByUserId: mozoUser._id,
        orderedByName: mozoUser.displayName,
        orderedByRole: mozoUser.role,
        enviadoEn: new Date(),
        canceladoEn: new Date()
      });

      const resCancelled = await request(app)
        .post(`/api/orders/${cancelledOrder._id}/manual-close`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ reason: 'Intento de cerrar cancelado' });

      expect(resCancelled.status).toBe(409);
    });

    it('debe rechazar con 403 si un Mozo intenta realizar un cierre manual', async () => {
      const shift = await Shift.create({
        date: '2026-11-18',
        label: 'Almuerzo',
        status: 'ABIERTO',
        openedBy: encargadoUser._id,
        openedAt: new Date()
      });

      const table = await Table.create({
        code: 'M13',
        label: 'Mesa 13',
        capacity: 4,
        zone: 'SALON',
        active: true
      });

      const session = await TableSession.create({
        tableId: table._id,
        tableCode: table.code,
        shiftId: shift._id,
        status: 'ABIERTA',
        openedBy: mozoUser._id,
        openedAt: new Date()
      });

      const order = await Order.create({
        orderNumber: 505,
        tableId: table._id,
        tableSessionId: session._id,
        tableCode: table.code,
        shiftId: shift._id,
        takenByUserId: mozoUser._id,
        takenByName: mozoUser.displayName,
        status: 'LISTO',
        items: [
          {
            dishId: new mongoose.Types.ObjectId(),
            dishName: 'Ceviche',
            sectionName: 'Marinos',
            quantity: 1,
            unitPriceCents: 3000,
            lineTotalCents: 3000
          }
        ],
        totalCents: 3000,
        version: 1,
        orderedByUserId: mozoUser._id,
        orderedByName: mozoUser.displayName,
        orderedByRole: mozoUser.role,
        enviadoEn: new Date()
      });

      const res = await request(app)
        .post(`/api/orders/${order._id}/manual-close`)
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({ reason: 'Mozo intentando cierre manual' });

      expect(res.status).toBe(403);
    });
  });
});
