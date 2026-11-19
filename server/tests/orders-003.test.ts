import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup';
import { seedData } from '../src/seed/data';
import { Table, MenuItem, Dish } from '../src/models';

describe('Auditoría Spec 003 — Toma de Pedidos Mozo (Brief 005 - agy-be)', () => {
  let mozo1Token: string;
  let mozo2Token: string;
  let cocineroToken: string;
  let mozo2User: any;

  beforeAll(async () => {
    await setupTestDB();
  }, 30000);

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedData();

    // Iniciar sesión con los usuarios del seed
    const loginMozo1 = await request(app)
      .post('/api/auth/login')
      .send({ username: 'mozo1', password: 'mozo123' });
    mozo1Token = loginMozo1.body.token;

    const loginMozo2 = await request(app)
      .post('/api/auth/login')
      .send({ username: 'mozo2', password: 'mozo223' });
    mozo2Token = loginMozo2.body.token;
    mozo2User = loginMozo2.body.user;

    const loginCocina = await request(app)
      .post('/api/auth/login')
      .send({ username: 'cocinero1', password: 'cocina123' });
    cocineroToken = loginCocina.body.token;
  }, 30000);

  describe('1. Filtros de scope en pedidos (scope=active y scope=ready)', () => {
    it('scope=active debe retornar solo ENVIADO y LISTO; scope=ready solo LISTO; excluye terminales', async () => {
      const dishes = await Dish.find({ active: true });
      const table1 = await Table.findOne({ code: 'M01' });
      const table2 = await Table.findOne({ code: 'M02' });
      const table3 = await Table.findOne({ code: 'M03' });
      const table4 = await Table.findOne({ code: 'M04' });

      // 1. Pedido 1 -> queda ENVIADO
      const res1 = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozo1Token}`)
        .send({
          tableId: table1!._id.toString(),
          items: [{ dishId: dishes[0]._id.toString(), quantity: 1 }]
        });
      expect(res1.status).toBe(201);
      const order1Id = res1.body.id;

      // 2. Pedido 2 -> ENVIADO -> LISTO
      const res2 = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozo1Token}`)
        .send({
          tableId: table2!._id.toString(),
          items: [{ dishId: dishes[0]._id.toString(), quantity: 1 }]
        });
      expect(res2.status).toBe(201);
      const order2Id = res2.body.id;
      await request(app)
        .patch(`/api/orders/${order2Id}/ready`)
        .set('Authorization', `Bearer ${cocineroToken}`)
        .send({ version: 0 });

      // 3. Pedido 3 -> ENVIADO -> LISTO -> ENTREGADO
      const res3 = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozo2Token}`)
        .send({
          tableId: table3!._id.toString(),
          items: [{ dishId: dishes[0]._id.toString(), quantity: 1 }]
        });
      expect(res3.status).toBe(201);
      const order3Id = res3.body.id;
      await request(app)
        .patch(`/api/orders/${order3Id}/ready`)
        .set('Authorization', `Bearer ${cocineroToken}`)
        .send({ version: 0 });
      await request(app)
        .patch(`/api/orders/${order3Id}/deliver`)
        .set('Authorization', `Bearer ${mozo1Token}`)
        .send({ version: 1 });

      // 4. Pedido 4 -> ENVIADO -> CANCELADO
      const res4 = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozo2Token}`)
        .send({
          tableId: table4!._id.toString(),
          items: [{ dishId: dishes[0]._id.toString(), quantity: 1 }]
        });
      expect(res4.status).toBe(201);
      const order4Id = res4.body.id;
      await request(app)
        .patch(`/api/orders/${order4Id}/cancel`)
        .set('Authorization', `Bearer ${mozo2Token}`)
        .send({ reason: 'Cliente se retira', version: 0 });

      // Verificar scope=active: solo debe contener Pedido 1 (ENVIADO) y Pedido 2 (LISTO)
      const activeRes = await request(app)
        .get('/api/orders?scope=active')
        .set('Authorization', `Bearer ${mozo2Token}`);
      expect(activeRes.status).toBe(200);
      expect(Array.isArray(activeRes.body.data)).toBe(true);

      const activeIds = activeRes.body.data.map((o: any) => o.id);
      expect(activeIds).toContain(order1Id);
      expect(activeIds).toContain(order2Id);
      expect(activeIds).not.toContain(order3Id);
      expect(activeIds).not.toContain(order4Id);

      for (const order of activeRes.body.data) {
        expect(['ENVIADO', 'LISTO']).toContain(order.status);
      }

      // Verificar scope=ready: solo debe contener Pedido 2 (LISTO)
      const readyRes = await request(app)
        .get('/api/orders?scope=ready')
        .set('Authorization', `Bearer ${mozo1Token}`);
      expect(readyRes.status).toBe(200);
      expect(Array.isArray(readyRes.body.data)).toBe(true);

      const readyIds = readyRes.body.data.map((o: any) => o.id);
      expect(readyIds).toContain(order2Id);
      expect(readyIds).not.toContain(order1Id);
      expect(readyIds).not.toContain(order3Id);
      expect(readyIds).not.toContain(order4Id);

      for (const order of readyRes.body.data) {
        expect(order.status).toBe('LISTO');
      }
    });
  });

  describe('2. Idempotencia estricta por clientRequestId', () => {
    it('mismo clientRequestId debe retornar 200 con el pedido original y NO descontar raciones dos veces', async () => {
      const table = await Table.findOne({ code: 'M01' });
      const dish = await Dish.findOne({ name: 'Ceviche mixto' }); // Plato con límite de raciones

      const menuItemBefore = await MenuItem.findOne({ dishId: dish!._id });
      const initialRations = menuItemBefore!.remainingRations!;

      const clientRequestId = 'test-client-request-uuid-003-idem';

      // 1er intento -> 201 Created
      const res1 = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozo1Token}`)
        .send({
          tableId: table!._id.toString(),
          items: [{ dishId: dish!._id.toString(), quantity: 2 }],
          clientRequestId
        });
      expect(res1.status).toBe(201);
      const createdOrder = res1.body;

      const menuItemAfterFirst = await MenuItem.findOne({ dishId: dish!._id });
      expect(menuItemAfterFirst!.remainingRations).toBe(initialRations - 2);

      // 2do intento con mismo clientRequestId -> 200 OK idempotente
      const res2 = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozo1Token}`)
        .send({
          tableId: table!._id.toString(),
          items: [{ dishId: dish!._id.toString(), quantity: 2 }],
          clientRequestId
        });
      expect(res2.status).toBe(200);
      expect(res2.body.id).toBe(createdOrder.id);
      expect(res2.body.orderNumber).toBe(createdOrder.orderNumber);

      // Las raciones deben mantenerse en initialRations - 2, NO descontar otra vez
      const menuItemAfterSecond = await MenuItem.findOne({ dishId: dish!._id });
      expect(menuItemAfterSecond!.remainingRations).toBe(initialRations - 2);
    });
  });

  describe('3. Transición deliver (solo LISTO, concurrencia y deliveredBy)', () => {
    it('deliver debe fallar desde ENVIADO (409), fallar con versión desactualizada (409), y registrar deliveredBy', async () => {
      const table = await Table.findOne({ code: 'M02' });
      const dish = await Dish.findOne({ name: 'Ceviche clásico' });

      // Mozo 1 crea el pedido
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozo1Token}`)
        .send({
          tableId: table!._id.toString(),
          items: [{ dishId: dish!._id.toString(), quantity: 1 }]
        });
      expect(createRes.status).toBe(201);
      const orderId = createRes.body.id;

      // Intentar entregar directamente en estado ENVIADO -> 409 INVALID_TRANSITION
      const prematureDeliver = await request(app)
        .patch(`/api/orders/${orderId}/deliver`)
        .set('Authorization', `Bearer ${mozo1Token}`)
        .send({ version: 0 });
      expect(prematureDeliver.status).toBe(409);
      expect(prematureDeliver.body.error.code).toBe('INVALID_TRANSITION');

      // Cocinero marca LISTO
      const readyRes = await request(app)
        .patch(`/api/orders/${orderId}/ready`)
        .set('Authorization', `Bearer ${cocineroToken}`)
        .send({ version: 0 });
      expect(readyRes.status).toBe(200);
      expect(readyRes.body.version).toBe(1);

      // Intento de entrega con versión incorrecta -> 409 VERSION_CONFLICT
      const conflictDeliver = await request(app)
        .patch(`/api/orders/${orderId}/deliver`)
        .set('Authorization', `Bearer ${mozo2Token}`)
        .send({ version: 99 });
      expect(conflictDeliver.status).toBe(409);
      expect(conflictDeliver.body.error.code).toBe('VERSION_CONFLICT');

      // Mozo 2 (otro mozo) entrega el pedido exitosamente
      const validDeliver = await request(app)
        .patch(`/api/orders/${orderId}/deliver`)
        .set('Authorization', `Bearer ${mozo2Token}`)
        .send({ version: 1 });
      expect(validDeliver.status).toBe(200);
      expect(validDeliver.body.status).toBe('ENTREGADO');
      expect(validDeliver.body.version).toBe(2);
      expect(validDeliver.body.deliveredBy).toBeDefined();
      expect(validDeliver.body.deliveredBy.name).toBe(mozo2User.displayName);
      expect(validDeliver.body.deliveredBy.id).toBe(mozo2User.id);

      // Intentar entregar nuevamente un pedido ya entregado -> 409 INVALID_TRANSITION
      const alreadyDelivered = await request(app)
        .patch(`/api/orders/${orderId}/deliver`)
        .set('Authorization', `Bearer ${mozo1Token}`)
        .send({ version: 2 });
      expect(alreadyDelivered.status).toBe(409);
      expect(alreadyDelivered.body.error.code).toBe('INVALID_TRANSITION');
    });
  });

  describe('4. Cancelación con motivo obligatorio y reglas de reposición', () => {
    it('cancelar sin motivo debe responder 422; cancelar pedido terminal debe responder 409', async () => {
      const table = await Table.findOne({ code: 'M03' });
      const dish = await Dish.findOne({ name: 'Ceviche clásico' });

      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozo1Token}`)
        .send({
          tableId: table!._id.toString(),
          items: [{ dishId: dish!._id.toString(), quantity: 1 }]
        });
      const orderId = createRes.body.id;

      // 1. Cancelar sin motivo (vacío o ausente) -> 422 VALIDATION_ERROR
      const noReasonRes = await request(app)
        .patch(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${mozo1Token}`)
        .send({ reason: '', version: 0 });
      expect(noReasonRes.status).toBe(422);

      // 2. Cancelar pedido ENVIADO exitosamente
      const cancelRes = await request(app)
        .patch(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${mozo1Token}`)
        .send({ reason: 'Mesa canceló el pedido', version: 0 });
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.status).toBe('CANCELADO');

      // 3. Intentar cancelar pedido ya CANCELADO -> 409 CANCELLATION_NOT_ALLOWED
      const repeatCancel = await request(app)
        .patch(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${mozo1Token}`)
        .send({ reason: 'Reintento de cancelación', version: 1 });
      expect(repeatCancel.status).toBe(409);
      expect(repeatCancel.body.error.code).toBe('CANCELLATION_NOT_ALLOWED');
    });
  });

  describe('5. Cierre de mesa y sesiones (bloqueo con pedidos activos, LIBRE y reapertura)', () => {
    it('cerrar mesa con pedidos activos responde 409; al cerrar queda LIBRE y el nuevo pedido abre sesión nueva', async () => {
      const table = await Table.findOne({ code: 'M05' });
      const dish = await Dish.findOne({ name: 'Ceviche clásico' });

      // 1. Crear pedido en M05
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozo1Token}`)
        .send({
          tableId: table!._id.toString(),
          items: [{ dishId: dish!._id.toString(), quantity: 1 }]
        });
      expect(createRes.status).toBe(201);
      const orderId = createRes.body.id;
      const firstSessionId = createRes.body.tableSessionId;
      expect(firstSessionId).toBeDefined();

      // Verificar que en GET /api/tables la mesa está OCUPADA
      const tablesRes1 = await request(app)
        .get('/api/tables')
        .set('Authorization', `Bearer ${mozo1Token}`);
      const m05Before = tablesRes1.body.data.find((t: any) => t.code === 'M05');
      expect(m05Before.state).toBe('OCUPADA');
      expect(m05Before.openSessionId).toBe(firstSessionId);

      // 2. Intentar cerrar sesión mientras el pedido está activo (ENVIADO) -> 409 TABLE_HAS_ACTIVE_ORDERS
      const closeActiveRes = await request(app)
        .post(`/api/table-sessions/${firstSessionId}/close`)
        .set('Authorization', `Bearer ${mozo1Token}`)
        .send({ notes: 'Intento de cierre prematuro' });
      expect(closeActiveRes.status).toBe(409);
      expect(closeActiveRes.body.error.code).toBe('TABLE_HAS_ACTIVE_ORDERS');

      // 3. Cocinero marca LISTO e intentar cerrar de nuevo -> sigue 409 TABLE_HAS_ACTIVE_ORDERS
      await request(app)
        .patch(`/api/orders/${orderId}/ready`)
        .set('Authorization', `Bearer ${cocineroToken}`)
        .send({ version: 0 });

      const closeReadyRes = await request(app)
        .post(`/api/table-sessions/${firstSessionId}/close`)
        .set('Authorization', `Bearer ${mozo1Token}`)
        .send();
      expect(closeReadyRes.status).toBe(409);
      expect(closeReadyRes.body.error.code).toBe('TABLE_HAS_ACTIVE_ORDERS');

      // 4. Entregar el pedido -> pedido queda ENTREGADO
      await request(app)
        .patch(`/api/orders/${orderId}/deliver`)
        .set('Authorization', `Bearer ${mozo1Token}`)
        .send({ version: 1 });

      // Ahora la mesa pasa a POR_CERRAR
      const tablesRes2 = await request(app)
        .get('/api/tables')
        .set('Authorization', `Bearer ${mozo1Token}`);
      const m05PorCerrar = tablesRes2.body.data.find((t: any) => t.code === 'M05');
      expect(m05PorCerrar.state).toBe('POR_CERRAR');

      // 5. Cerrar la sesión de mesa exitosamente
      const closeSuccessRes = await request(app)
        .post(`/api/table-sessions/${firstSessionId}/close`)
        .set('Authorization', `Bearer ${mozo2Token}`)
        .send({ notes: 'Atención completada con éxito' });
      expect(closeSuccessRes.status).toBe(200);
      expect(closeSuccessRes.body.status).toBe('CERRADA');
      expect(closeSuccessRes.body.closedBy).toBe(mozo2User.id);

      // Verificar que la mesa quedó en estado LIBRE y sin sesión abierta
      const tablesRes3 = await request(app)
        .get('/api/tables')
        .set('Authorization', `Bearer ${mozo1Token}`);
      const m05Libre = tablesRes3.body.data.find((t: any) => t.code === 'M05');
      expect(m05Libre.state).toBe('LIBRE');
      expect(m05Libre.openSessionId).toBeNull();

      // 6. Nuevo pedido en mesa LIBRE abre automáticamente una sesión nueva
      const newOrderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozo1Token}`)
        .send({
          tableId: table!._id.toString(),
          items: [{ dishId: dish!._id.toString(), quantity: 1 }]
        });
      expect(newOrderRes.status).toBe(201);
      const secondSessionId = newOrderRes.body.tableSessionId;
      expect(secondSessionId).toBeDefined();
      expect(secondSessionId).not.toBe(firstSessionId);

      // La mesa vuelve a estar OCUPADA con la nueva sesión
      const tablesRes4 = await request(app)
        .get('/api/tables')
        .set('Authorization', `Bearer ${mozo1Token}`);
      const m05NuevaRonda = tablesRes4.body.data.find((t: any) => t.code === 'M05');
      expect(m05NuevaRonda.state).toBe('OCUPADA');
      expect(m05NuevaRonda.openSessionId).toBe(secondSessionId);
    });
  });

  describe('6. Validaciones de variaciones ajenas, platos agotados y sin raciones', () => {
    it('variationIds ajenos al plato debe responder 422 VALIDATION_ERROR', async () => {
      const table = await Table.findOne({ code: 'M01' });
      const dish = await Dish.findOne({ name: 'Ceviche clásico' });

      // Enviar variación inexistente
      const resInvalid = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozo1Token}`)
        .send({
          tableId: table!._id.toString(),
          items: [
            {
              dishId: dish!._id.toString(),
              quantity: 1,
              variationIds: ['variacion_inexistente_123']
            }
          ]
        });

      expect(resInvalid.status).toBe(422);
      expect(resInvalid.body.error.code).toBe('VALIDATION_ERROR');

      // Enviar variación que pertenece a OTRO plato
      const dishOtro = await Dish.findOne({ name: 'Ceviche mixto' });
      const variationOtro = dishOtro!.variations[0].id;

      const resOtro = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozo1Token}`)
        .send({
          tableId: table!._id.toString(),
          items: [
            {
              dishId: dish!._id.toString(),
              quantity: 1,
              variationIds: [variationOtro]
            }
          ]
        });

      expect(resOtro.status).toBe(422);
      expect(resOtro.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('plato agotado responde 409 DISH_UNAVAILABLE y sin raciones responde 409 RATION_UNAVAILABLE', async () => {
      const table = await Table.findOne({ code: 'M01' });
      const dishAgotado = await Dish.findOne({ name: 'Arroz con mariscos' }); // manuallySoldOut = true en seed

      // 1. Plato agotado por insumos
      const resAgotado = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozo1Token}`)
        .send({
          tableId: table!._id.toString(),
          items: [{ dishId: dishAgotado!._id.toString(), quantity: 1 }]
        });
      expect(resAgotado.status).toBe(409);
      expect(resAgotado.body.error.code).toBe('DISH_UNAVAILABLE');

      // 2. Plato con raciones insuficientes
      const dishLimitado = await Dish.findOne({ name: 'Ceviche mixto' });
      await MenuItem.findOneAndUpdate(
        { dishId: dishLimitado!._id },
        { $set: { hasRationsLimit: true, totalRations: 10, remainingRations: 2 } }
      );

      const resSinRaciones = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozo1Token}`)
        .send({
          tableId: table!._id.toString(),
          items: [{ dishId: dishLimitado!._id.toString(), quantity: 5 }] // pide 5, solo quedan 2
        });
      expect(resSinRaciones.status).toBe(409);
      expect(resSinRaciones.body.error.code).toBe('RATION_UNAVAILABLE');
    });
  });

  describe('7. Seguridad y no exposición de passwordHash ni datos internos', () => {
    it('GET /api/orders y GET /api/orders/:id no deben exponer passwordHash, password ni __v', async () => {
      const table = await Table.findOne({ code: 'M01' });
      const dish = await Dish.findOne({ name: 'Ceviche clásico' });

      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozo1Token}`)
        .send({
          tableId: table!._id.toString(),
          items: [{ dishId: dish!._id.toString(), quantity: 1 }]
        });
      const orderId = createRes.body.id;

      // 1. Listado de pedidos
      const listRes = await request(app)
        .get('/api/orders?scope=all')
        .set('Authorization', `Bearer ${mozo1Token}`);
      expect(listRes.status).toBe(200);

      const listJson = JSON.stringify(listRes.body);
      expect(listJson).not.toContain('passwordHash');
      expect(listJson).not.toContain('password');
      expect(listJson).not.toContain('"__v"');

      // 2. Detalle de pedido
      const detailRes = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${mozo2Token}`);
      expect(detailRes.status).toBe(200);

      const detailJson = JSON.stringify(detailRes.body);
      expect(detailJson).not.toContain('passwordHash');
      expect(detailJson).not.toContain('password');
      expect(detailJson).not.toContain('"__v"');
    });
  });
});
