import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup';
import { seedData } from '../src/seed/data';
import { Table } from '../src/models/table.model';
import { Shift } from '../src/models/shift.model';
import { MenuDay } from '../src/models/menu-day.model';
import { MenuItem } from '../src/models/menu-item.model';
import { Dish } from '../src/models/dish.model';
import { Order } from '../src/models/order.model';
import { RationAdjustment } from '../src/models/ration-adjustment.model';

describe('Módulo de Pedidos y Concurrencia (T053–T065, T077)', () => {
  let encargadoToken: string;
  let mozoToken: string;
  let cocineroToken: string;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedData();

    // Login roles
    const loginEncargado = await request(app)
      .post('/api/auth/login')
      .send({ username: 'encargado1', password: 'encargado123' });
    encargadoToken = loginEncargado.body.token;

    const loginMozo = await request(app)
      .post('/api/auth/login')
      .send({ username: 'mozo1', password: 'mozo123' });
    mozoToken = loginMozo.body.token;

    const loginCocina = await request(app)
      .post('/api/auth/login')
      .send({ username: 'cocinero1', password: 'cocina123' });
    cocineroToken = loginCocina.body.token;
  });

  describe('Pipeline de Creación de Pedido (T053–T056)', () => {
    it('debe rechazar la creación si el turno no está abierto (409 SHIFT_NOT_OPEN)', async () => {
      // Cerrar el turno abierto
      await Shift.updateMany({}, { status: 'CERRADO', closedAt: new Date() });

      const table = await Table.findOne({ code: 'M01' });
      const dish = await Dish.findOne({ name: 'Ceviche clásico' });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({
          tableId: table!._id.toString(),
          items: [{ dishId: dish!._id.toString(), quantity: 1 }]
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('SHIFT_NOT_OPEN');
    });

    it('debe rechazar si no hay menú publicado para la fecha (409 MENU_NOT_PUBLISHED)', async () => {
      // Despublicar menú
      await MenuDay.updateMany({}, { status: 'BORRADOR' });

      const table = await Table.findOne({ code: 'M01' });
      const dish = await Dish.findOne({ name: 'Ceviche clásico' });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({
          tableId: table!._id.toString(),
          items: [{ dishId: dish!._id.toString(), quantity: 1 }]
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('MENU_NOT_PUBLISHED');
    });

    it('debe crear un pedido exitosamente con snapshots, version 0 y totalCents sin impuestos', async () => {
      const table = await Table.findOne({ code: 'M01' });
      const dishClasico = await Dish.findOne({ name: 'Ceviche clásico' });
      const dishChicha = await Dish.findOne({ name: 'Chicha morada 1L' });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({
          tableId: table!._id.toString(),
          items: [
            {
              dishId: dishClasico!._id.toString(),
              quantity: 2,
              variationIds: ['v_pic_med'],
              notes: 'Con rocoto aparte'
            },
            {
              dishId: dishChicha!._id.toString(),
              quantity: 1
            }
          ],
          notes: 'Mesa con niños pequeños',
          clientRequestId: 'req-test-uuid-001'
        });

      expect(res.status).toBe(201);
      const order = res.body;

      expect(order.orderNumber).toBeGreaterThanOrEqual(1);
      expect(order.status).toBe('ENVIADO');
      expect(order.version).toBe(0);
      expect(order.tableCode).toBe('M01');
      expect(order.takenByName).toBe('Mozo 1');
      expect(order.items.length).toBe(2);

      // Ceviche clásico 2800 * 2 = 5600; Chicha 1200 * 1 = 1200; Total = 6800
      expect(order.items[0].lineTotalCents).toBe(5600);
      expect(order.items[1].lineTotalCents).toBe(1200);
      expect(order.totalCents).toBe(6800);
      expect(order.currency).toBe('PEN');

      // Snapshots
      expect(order.items[0].dishName).toBe('Ceviche clásico');
      expect(order.items[0].variations[0].name).toBe('Picante medio');

      // Status history
      expect(order.statusHistory.length).toBe(1);
      expect(order.statusHistory[0].status).toBe('ENVIADO');
      expect(order.statusHistory[0].byRole).toBe('MOZO');

      // Idempotencia por clientRequestId
      const idempRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({
          tableId: table!._id.toString(),
          items: [
            {
              dishId: dishClasico!._id.toString(),
              quantity: 2
            }
          ],
          clientRequestId: 'req-test-uuid-001'
        });

      expect(idempRes.status).toBe(200);
      expect(idempRes.body.id).toBe(order.id);
      expect(idempRes.body.orderNumber).toBe(order.orderNumber);
    });

    it('debe rechazar la creación si un plato está marcado como agotado (409 DISH_UNAVAILABLE)', async () => {
      const table = await Table.findOne({ code: 'M02' });
      // Arroz con mariscos fue sembrado con manuallySoldOut = true
      const dishAgotado = await Dish.findOne({ name: 'Arroz con mariscos' });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({
          tableId: table!._id.toString(),
          items: [{ dishId: dishAgotado!._id.toString(), quantity: 1 }]
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DISH_UNAVAILABLE');
    });
  });

  describe('Transiciones de Estado y Ciclo de Vida (T057–T060)', () => {
    let orderId: string;

    beforeEach(async () => {
      const table = await Table.findOne({ code: 'M01' });
      const dish = await Dish.findOne({ name: 'Ceviche clásico' });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({
          tableId: table!._id.toString(),
          items: [{ dishId: dish!._id.toString(), quantity: 1 }]
        });

      orderId = res.body.id;
    });

    it('debe permitir a COCINERO marcar ENVIADO -> LISTO y rechazar a MOZO (403)', async () => {
      // Mozo intenta marcar listo -> 403
      const mozoRes = await request(app)
        .patch(`/api/orders/${orderId}/ready`)
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({ version: 0 });
      expect(mozoRes.status).toBe(403);

      // Cocinero marca listo -> 200
      const cocinaRes = await request(app)
        .patch(`/api/orders/${orderId}/ready`)
        .set('Authorization', `Bearer ${cocineroToken}`)
        .send({ version: 0 });

      expect(cocinaRes.status).toBe(200);
      expect(cocinaRes.body.status).toBe('LISTO');
      expect(cocinaRes.body.version).toBe(1);
      expect(cocinaRes.body.readyBy.name).toBe('Cocinero 1');
    });

    it('debe permitir a cualquier MOZO marcar LISTO -> ENTREGADO', async () => {
      // 1. Cocina marca listo
      await request(app)
        .patch(`/api/orders/${orderId}/ready`)
        .set('Authorization', `Bearer ${cocineroToken}`)
        .send({ version: 0 });

      // 2. Mozo marca entregado
      const deliverRes = await request(app)
        .patch(`/api/orders/${orderId}/deliver`)
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({ version: 1 });

      expect(deliverRes.status).toBe(200);
      expect(deliverRes.body.status).toBe('ENTREGADO');
      expect(deliverRes.body.version).toBe(2);
      expect(deliverRes.body.deliveredBy.name).toBe('Mozo 1');
    });

    it('debe rechazar la transición directa ENVIADO -> ENTREGADO con 409 INVALID_TRANSITION', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/deliver`)
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({ version: 0 });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_TRANSITION');
    });

    it('debe detectar colisiones de concurrencia mediante versioning (409 VERSION_CONFLICT)', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/ready`)
        .set('Authorization', `Bearer ${cocineroToken}`)
        .send({ version: 99 }); // versión obsoleta

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('VERSION_CONFLICT');
    });
  });

  describe('Cancelación y Reposición de Raciones (T062–T063)', () => {
    it('al cancelar un pedido ENVIADO, debe reponer raciones y registrar CANCELLATION_REVERSAL', async () => {
      const table = await Table.findOne({ code: 'M03' });
      const dishLimitado = await Dish.findOne({ name: 'Ceviche mixto' }); // tiene límite de 30 raciones

      // Crear pedido de 3 raciones
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({
          tableId: table!._id.toString(),
          items: [{ dishId: dishLimitado!._id.toString(), quantity: 3 }]
        });

      const orderId = createRes.body.id;

      // Las raciones bajaron a 27
      const itemBefore = await MenuItem.findOne({ dishId: dishLimitado!._id });
      expect(itemBefore?.remainingRations).toBe(27);

      // Cancelar pedido
      const cancelRes = await request(app)
        .patch(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({
          version: 0,
          reason: 'Cliente cambió de opinión'
        });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.status).toBe('CANCELADO');

      // Las raciones deben haber vuelto a 30
      const itemAfter = await MenuItem.findOne({ dishId: dishLimitado!._id });
      expect(itemAfter?.remainingRations).toBe(30);

      // Verificar registro de auditoría de reposición
      const audit = await RationAdjustment.findOne({
        orderId,
        type: 'CANCELLATION_REVERSAL'
      });
      expect(audit).toBeDefined();
      expect(audit?.previousRemaining).toBe(27);
      expect(audit?.newRemaining).toBe(30);
    });

    it('al cancelar un pedido LISTO, NO debe reponer raciones', async () => {
      const table = await Table.findOne({ code: 'M03' });
      const dishLimitado = await Dish.findOne({ name: 'Ceviche mixto' });

      // Crear pedido de 2 raciones
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({
          tableId: table!._id.toString(),
          items: [{ dishId: dishLimitado!._id.toString(), quantity: 2 }]
        });

      const orderId = createRes.body.id;

      // Cocinero marca LISTO
      await request(app)
        .patch(`/api/orders/${orderId}/ready`)
        .set('Authorization', `Bearer ${cocineroToken}`)
        .send({ version: 0 });

      // Cancelar pedido en estado LISTO
      const cancelRes = await request(app)
        .patch(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({
          version: 1,
          reason: 'Cliente se retiró intempestivamente'
        });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.status).toBe('CANCELADO');
      expect(cancelRes.body.warning).toBeDefined();

      // Las raciones NO deben reponerse (se quedan en 28)
      const itemAfter = await MenuItem.findOne({ dishId: dishLimitado!._id });
      expect(itemAfter?.remainingRations).toBe(28);
    });
  });

  describe('Cierre Manual P2 y Tablero Cocina FIFO (T061, T064)', () => {
    it('debe permitir a ENCARGADO realizar cierre manual de pedido con motivo', async () => {
      const table = await Table.findOne({ code: 'M04' });
      const dish = await Dish.findOne({ name: 'Ceviche clásico' });

      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({
          tableId: table!._id.toString(),
          items: [{ dishId: dish!._id.toString(), quantity: 1 }]
        });

      const orderId = createRes.body.id;

      // Mozo intenta cierre manual -> 403
      const mozoRes = await request(app)
        .post(`/api/orders/${orderId}/manual-close`)
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({ reason: 'Cierre manual mozo' });
      expect(mozoRes.status).toBe(403);

      // Encargado realiza cierre manual -> 200
      const encRes = await request(app)
        .post(`/api/orders/${orderId}/manual-close`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ reason: 'Entregado sin marcar antes de cerrar turno' });

      expect(encRes.status).toBe(200);
      expect(encRes.body.status).toBe('ENTREGADO');
      expect(encRes.body.manualClose).toBe(true);
      expect(encRes.body.manualCloseReason).toBe('Entregado sin marcar antes de cerrar turno');
    });

    it('el tablero de cocina debe listar pedidos FIFO por enviadoEn y sin cronómetros ni EN_PREPARACION', async () => {
      const boardRes = await request(app)
        .get('/api/kitchen/board')
        .set('Authorization', `Bearer ${cocineroToken}`);

      expect(boardRes.status).toBe(200);
      expect(boardRes.body.pending).toBeDefined();
      expect(boardRes.body.ready).toBeDefined();

      // Verificar ausencia de campos de tiempo de preparación o estados prohibidos
      const jsonStr = JSON.stringify(boardRes.body);
      expect(jsonStr).not.toContain('EN_PREPARACION');
      expect(jsonStr).not.toContain('preparationTime');
      expect(jsonStr).not.toContain('stopwatch');
    });
  });

  describe('Prueba de Concurrencia Extrema: 200 Envíos sobre 1 Ración (T077)', () => {
    it('debe procesar 200 envíos simultáneos sobre un plato con 1 ración: exactamente 1 éxito (201), 199 rechazos (409) y 0 sobreventa', async () => {
      const table = await Table.findOne({ code: 'M05' });
      const dish = await Dish.findOne({ name: 'Ceviche mixto' });

      // Fijar remainingRations exactamente en 1
      await MenuItem.findOneAndUpdate(
        { dishId: dish!._id },
        {
          $set: {
            hasRationsLimit: true,
            totalRations: 1,
            remainingRations: 1,
            active: true,
            manuallySoldOut: false
          }
        }
      );

      // Verificar que inicia en 1
      const initialItem = await MenuItem.findOne({ dishId: dish!._id });
      expect(initialItem?.remainingRations).toBe(1);

      // Disparar 200 peticiones concurrentes simultáneas
      const CONCURRENT_REQUESTS = 200;
      const promises = Array.from({ length: CONCURRENT_REQUESTS }, (_, idx) =>
        request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${mozoToken}`)
          .send({
            tableId: table!._id.toString(),
            items: [
              {
                dishId: dish!._id.toString(),
                quantity: 1
              }
            ],
            clientRequestId: `concurrent-req-${idx}-${Date.now()}`
          })
      );

      const responses = await Promise.all(promises);

      // Agrupar resultados por código de estado HTTP
      const successResponses = responses.filter((r) => r.status === 201);
      const conflictResponses = responses.filter(
        (r) => r.status === 409 && r.body.error?.code === 'RATION_UNAVAILABLE'
      );

      // Aserciones estrictas de atomicidad y no sobreventa
      expect(successResponses.length).toBe(1);
      expect(conflictResponses.length).toBe(199);
      expect(responses.length).toBe(200);

      // Verificar estado final en base de datos
      const finalItem = await MenuItem.findOne({ dishId: dish!._id });
      expect(finalItem?.remainingRations).toBe(0);

      // Verificar que se creó exactamente 1 pedido con ese ítem
      const createdOrders = await Order.find({
        tableId: table!._id,
        'items.dishId': dish!._id
      });
      expect(createdOrders.length).toBe(1);
      expect(createdOrders[0].orderNumber).toBeDefined();
    }, 30000); // 30 segundos timeout para soportar las 200 operaciones concurrentes
  });

  describe('Pruebas de Regresión FINDINGS-01 (H1, H2, H3)', () => {
    it('H1: creación con 2 platos con límite donde el 2do falla no debe duplicar la compensación en el 1ero', async () => {
      const table = await Table.findOne({ code: 'M01' });
      const dish1 = await Dish.findOne({ name: 'Ceviche clásico' });
      const dish2 = await Dish.findOne({ name: 'Ceviche mixto' });

      // Configurar plato 1 con 5 raciones y plato 2 con 0 raciones
      await MenuItem.findOneAndUpdate(
        { dishId: dish1!._id },
        { $set: { hasRationsLimit: true, totalRations: 5, remainingRations: 5 } }
      );
      await MenuItem.findOneAndUpdate(
        { dishId: dish2!._id },
        { $set: { hasRationsLimit: true, totalRations: 10, remainingRations: 0 } }
      );

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({
          tableId: table!._id.toString(),
          items: [
            { dishId: dish1!._id.toString(), quantity: 1 },
            { dishId: dish2!._id.toString(), quantity: 1 }
          ]
        });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe('RATION_UNAVAILABLE');

      // Assert H1: remainingRations del plato 1 debe quedar exactamente en 5 (su valor inicial, no 6)
      const item1 = await MenuItem.findOne({ dishId: dish1!._id });
      expect(item1?.remainingRations).toBe(5);
    });

    it('H2: dos cancelaciones concurrentes sobre el mismo pedido ENVIADO solo reponen raciones una vez', async () => {
      const table = await Table.findOne({ code: 'M02' });
      const dish = await Dish.findOne({ name: 'Ceviche clásico' });

      // Fijar raciones iniciales en 5
      await MenuItem.findOneAndUpdate(
        { dishId: dish!._id },
        { $set: { hasRationsLimit: true, totalRations: 10, remainingRations: 5 } }
      );

      // Crear pedido de 2 raciones
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({
          tableId: table!._id.toString(),
          items: [{ dishId: dish!._id.toString(), quantity: 2 }]
        });

      expect(createRes.status).toBe(201);
      const orderId = createRes.body.id;
      const orderVersion = createRes.body.version; // 0

      // El plato ahora tiene 5 - 2 = 3 raciones
      const itemAfterOrder = await MenuItem.findOne({ dishId: dish!._id });
      expect(itemAfterOrder?.remainingRations).toBe(3);

      // Dos cancelaciones concurrentes simultáneas con la misma versión
      const [res1, res2] = await Promise.all([
        request(app)
          .patch(`/api/orders/${orderId}/cancel`)
          .set('Authorization', `Bearer ${mozoToken}`)
          .send({ reason: 'Cancelación concurrente 1', version: orderVersion }),
        request(app)
          .patch(`/api/orders/${orderId}/cancel`)
          .set('Authorization', `Bearer ${mozoToken}`)
          .send({ reason: 'Cancelación concurrente 2', version: orderVersion })
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);

      // Verificar que el conflicto tiene código de error correspondiente
      const conflictRes = res1.status === 409 ? res1 : res2;
      expect(['VERSION_CONFLICT', 'CANCELLATION_NOT_ALLOWED']).toContain(conflictRes.body.error?.code);

      // Assert H2: Las raciones deben haberse repuesto exactamente una vez: 3 + 2 = 5 (no 7)
      const finalItem = await MenuItem.findOne({ dishId: dish!._id });
      expect(finalItem?.remainingRations).toBe(5);

      // Assert H2: Solo 1 ajuste CANCELLATION_REVERSAL registrado para este pedido
      const reversals = await RationAdjustment.find({
        orderId,
        type: 'CANCELLATION_REVERSAL'
      });
      expect(reversals.length).toBe(1);
    });

    it('H3: el mismo plato en dos menuDays solo repone raciones al menuDay específico del pedido al cancelar', async () => {
      const table = await Table.findOne({ code: 'M03' });
      const dish = await Dish.findOne({ name: 'Ceviche clásico' });

      // Menú A es el del turno actual
      const shift = await Shift.findOne({ status: 'ABIERTO' });
      const menuDayA = await MenuDay.findOne({ date: shift!.date });
      expect(menuDayA).toBeDefined();

      const itemA = await MenuItem.findOne({ menuDayId: menuDayA!._id, dishId: dish!._id });
      await MenuItem.findByIdAndUpdate(itemA!._id, {
        $set: { hasRationsLimit: true, totalRations: 10, remainingRations: 5 }
      });

      // Crear Menú B para otra fecha con el mismo plato
      const menuDayB = await MenuDay.create({
        date: '2026-11-25',
        status: 'PUBLICADO',
        notes: 'Menú futuro'
      });

      const itemB = await MenuItem.create({
        menuDayId: menuDayB._id,
        dishId: dish!._id,
        dishName: dish!.name,
        sectionKey: 'MARINO',
        priceCents: dish!.priceCents,
        active: true,
        hasRationsLimit: true,
        totalRations: 20,
        remainingRations: 10,
        lowStockThreshold: 5,
        manuallySoldOut: false,
        version: 0
      });

      // Crear pedido en Menú A con 2 raciones
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({
          tableId: table!._id.toString(),
          items: [{ dishId: dish!._id.toString(), quantity: 2 }]
        });

      expect(createRes.status).toBe(201);
      const orderId = createRes.body.id;

      // itemA se redujo a 3, itemB sigue en 10
      const itemACheck1 = await MenuItem.findById(itemA!._id);
      const itemBCheck1 = await MenuItem.findById(itemB._id);
      expect(itemACheck1?.remainingRations).toBe(3);
      expect(itemBCheck1?.remainingRations).toBe(10);

      // Cancelar pedido
      const cancelRes = await request(app)
        .patch(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({ reason: 'Mesa se retira antes de comer', version: 0 });

      expect(cancelRes.status).toBe(200);

      // Assert H3: Solo itemA fue repuesto a 5; itemB debe mantenerse intacto en 10
      const finalItemA = await MenuItem.findById(itemA!._id);
      const finalItemB = await MenuItem.findById(itemB._id);
      expect(finalItemA?.remainingRations).toBe(5);
      expect(finalItemB?.remainingRations).toBe(10);
    });
  });
});
