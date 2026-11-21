import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup';
import { seedData } from '../src/seed/data';
import { Table } from '../src/models/table.model';
import { Dish } from '../src/models/dish.model';
import { Order } from '../src/models/order.model';

describe('E2E Spec 004: Cocina / Tablero KDS (Pendientes y Listos)', () => {
  let cocineroToken: string;
  let mozoToken: string;
  let encargadoToken: string;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedData();

    // 1. Login multirrol con credenciales canónicas del seed
    const loginCocinero = await request(app)
      .post('/api/auth/login')
      .send({ username: 'cocinero1', password: 'cocina123' });
    expect(loginCocinero.status).toBe(200);
    cocineroToken = loginCocinero.body.token;

    const loginMozo = await request(app)
      .post('/api/auth/login')
      .send({ username: 'mozo1', password: 'mozo123' });
    expect(loginMozo.status).toBe(200);
    mozoToken = loginMozo.body.token;

    const loginEncargado = await request(app)
      .post('/api/auth/login')
      .send({ username: 'encargado1', password: 'encargado123' });
    expect(loginEncargado.status).toBe(200);
    encargadoToken = loginEncargado.body.token;

    // Limpiar pedidos preexistentes del seed para aislamiento riguroso del tablero
    await Order.deleteMany({});
  });

  it('cola FIFO de pedidos pendientes, detalle con variaciones y transición de ENVIADO a LISTO y entrega', async () => {
    // Tablero inicialmente vacío
    const initialBoardRes = await request(app)
      .get('/api/kitchen/board')
      .set('Authorization', `Bearer ${cocineroToken}`);
    expect(initialBoardRes.status).toBe(200);
    expect(initialBoardRes.body.pending).toEqual([]);
    expect(initialBoardRes.body.ready).toEqual([]);
    expect(initialBoardRes.body.serverTime).toBeDefined();

    // Obtener mesas y platos
    const tableM01 = await Table.findOne({ code: 'M01' });
    const tableM02 = await Table.findOne({ code: 'M02' });
    const tableM03 = await Table.findOne({ code: 'M03' });

    const dishClasico = await Dish.findOne({ name: 'Ceviche' });
    const dishMixto = await Dish.findOne({ name: 'Chaufa de marisco' });
    const dishChicha = await Dish.findOne({ name: 'Chicha morada 1L' });

    // 2. Crear 3 pedidos distanciados cronológicamente
    const order1Res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozoToken}`)
      .send({
        tableId: tableM01!._id.toString(),
        items: [{ dishId: dishClasico!._id.toString(), quantity: 1, notes: 'Sin cebolla' }],
        notes: 'Pedido 1 para mesa M01'
      });
    expect(order1Res.status).toBe(201);
    const order1Id = order1Res.body.id;

    // Pequeño intervalo para garantizar marcas de tiempo estrictamente ascendentes
    await new Promise((r) => setTimeout(r, 60));

    const order2Res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozoToken}`)
      .send({
        tableId: tableM02!._id.toString(),
        items: [
          {
            dishId: dishMixto!._id.toString(),
            quantity: 2,
            variationIds: ['v_con_aji'],
            notes: 'Bien picante'
          }
        ],
        notes: 'Pedido 2 para mesa M02'
      });
    expect(order2Res.status).toBe(201);
    const order2Id = order2Res.body.id;

    await new Promise((r) => setTimeout(r, 60));

    const order3Res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozoToken}`)
      .send({
        tableId: tableM03!._id.toString(),
        items: [{ dishId: dishChicha!._id.toString(), quantity: 1, notes: 'Con hielo' }],
        notes: 'Pedido 3 para mesa M03'
      });
    expect(order3Res.status).toBe(201);
    const order3Id = order3Res.body.id;

    // 3. Verificar GET /api/kitchen/board con pending en orden FIFO por enviadoEn
    const boardRes = await request(app)
      .get('/api/kitchen/board')
      .set('Authorization', `Bearer ${cocineroToken}`);
    expect(boardRes.status).toBe(200);
    expect(boardRes.body.pending.length).toBe(3);
    expect(boardRes.body.ready.length).toBe(0);

    // Verificación de orden FIFO exacto
    expect(boardRes.body.pending[0].id).toBe(order1Id);
    expect(boardRes.body.pending[1].id).toBe(order2Id);
    expect(boardRes.body.pending[2].id).toBe(order3Id);

    const time1 = new Date(boardRes.body.pending[0].enviadoEn).getTime();
    const time2 = new Date(boardRes.body.pending[1].enviadoEn).getTime();
    const time3 = new Date(boardRes.body.pending[2].enviadoEn).getTime();
    expect(time1).toBeLessThanOrEqual(time2);
    expect(time2).toBeLessThanOrEqual(time3);

    // Verificar detalle completo: mesa, platos, cantidades, variaciones y notas
    const pendingItem2 = boardRes.body.pending[1];
    expect(pendingItem2.tableCode).toBe('M02');
    expect(pendingItem2.notes).toBe('Pedido 2 para mesa M02');
    expect(pendingItem2.items[0].dishName).toBe('Chaufa de marisco');
    expect(pendingItem2.items[0].quantity).toBe(2);
    expect(pendingItem2.items[0].notes).toBe('Bien picante');
    expect(pendingItem2.items[0].variations[0].name).toBe('Con ají');

    // Verificar que el ENCARGADO también puede supervisar el tablero
    const encargadoBoardRes = await request(app)
      .get('/api/kitchen/board')
      .set('Authorization', `Bearer ${encargadoToken}`);
    expect(encargadoBoardRes.status).toBe(200);
    expect(encargadoBoardRes.body.pending.length).toBe(3);

    // 4. Cocinero marca ready con version 0 -> LISTO y se mueve a la columna ready
    const readyRes = await request(app)
      .patch(`/api/orders/${order1Id}/ready`)
      .set('Authorization', `Bearer ${cocineroToken}`)
      .send({ version: 0 });
    expect(readyRes.status).toBe(200);
    expect(readyRes.body.status).toBe('LISTO');
    expect(readyRes.body.version).toBe(1);
    expect(readyRes.body.readyBy.name).toBe('Cocinero 1');

    // Tablero refleja pedido 1 en ready y solo 2 y 3 en pending
    const boardAfterReadyRes = await request(app)
      .get('/api/kitchen/board')
      .set('Authorization', `Bearer ${cocineroToken}`);
    expect(boardAfterReadyRes.body.pending.length).toBe(2);
    expect(boardAfterReadyRes.body.pending.map((p: any) => p.id)).toEqual([order2Id, order3Id]);
    expect(boardAfterReadyRes.body.ready.length).toBe(1);
    expect(boardAfterReadyRes.body.ready[0].id).toBe(order1Id);
    expect(boardAfterReadyRes.body.ready[0].status).toBe('LISTO');

    // 5. Mozo entrega el pedido listo -> sale de ready
    const deliverRes = await request(app)
      .patch(`/api/orders/${order1Id}/deliver`)
      .set('Authorization', `Bearer ${mozoToken}`)
      .send({ version: 1 });
    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.status).toBe('ENTREGADO');

    const boardAfterDeliverRes = await request(app)
      .get('/api/kitchen/board')
      .set('Authorization', `Bearer ${cocineroToken}`);
    expect(boardAfterDeliverRes.body.ready.length).toBe(0);
    expect(boardAfterDeliverRes.body.pending.length).toBe(2);
  });

  it('casos borde y reglas de negocio: doble ready da 409, ready de cancelado da 409, cancelado no aparece en KDS y mozo recibe 403', async () => {
    const tableM01 = await Table.findOne({ code: 'M01' });
    const dishClasico = await Dish.findOne({ name: 'Ceviche' });

    // Crear pedido A
    const orderARes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozoToken}`)
      .send({
        tableId: tableM01!._id.toString(),
        items: [{ dishId: dishClasico!._id.toString(), quantity: 1 }]
      });
    const orderAId = orderARes.body.id;

    // Cocinero pasa Pedido A a LISTO
    const firstReady = await request(app)
      .patch(`/api/orders/${orderAId}/ready`)
      .set('Authorization', `Bearer ${cocineroToken}`)
      .send({ version: 0 });
    expect(firstReady.status).toBe(200);

    // Doble ready sobre pedido ya en LISTO -> 409 Conflict
    const doubleReadySameVersion = await request(app)
      .patch(`/api/orders/${orderAId}/ready`)
      .set('Authorization', `Bearer ${cocineroToken}`)
      .send({ version: 0 });
    expect(doubleReadySameVersion.status).toBe(409);

    const doubleReadyNextVersion = await request(app)
      .patch(`/api/orders/${orderAId}/ready`)
      .set('Authorization', `Bearer ${cocineroToken}`)
      .send({ version: 1 });
    expect(doubleReadyNextVersion.status).toBe(409);

    // Crear Pedido B y cancelarlo desde el mozo
    const orderBRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozoToken}`)
      .send({
        tableId: tableM01!._id.toString(),
        items: [{ dishId: dishClasico!._id.toString(), quantity: 1 }]
      });
    const orderBId = orderBRes.body.id;

    const cancelRes = await request(app)
      .patch(`/api/orders/${orderBId}/cancel`)
      .set('Authorization', `Bearer ${mozoToken}`)
      .send({ version: 0, reason: 'Cliente se marchó' });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.status).toBe('CANCELADO');

    // Intentar marcar LISTO sobre pedido cancelado -> 409 Conflict
    const readyCancelled = await request(app)
      .patch(`/api/orders/${orderBId}/ready`)
      .set('Authorization', `Bearer ${cocineroToken}`)
      .send({ version: 1 });
    expect(readyCancelled.status).toBe(409);

    // El pedido cancelado no debe aparecer en pendientes ni en listos
    const boardRes = await request(app)
      .get('/api/kitchen/board')
      .set('Authorization', `Bearer ${cocineroToken}`);
    const inPending = boardRes.body.pending.some((o: any) => o.id === orderBId);
    const inReady = boardRes.body.ready.some((o: any) => o.id === orderBId);
    expect(inPending).toBe(false);
    expect(inReady).toBe(false);

    // Control de acceso: Mozo no puede marcar ready (403 Forbidden)
    const orderCRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozoToken}`)
      .send({
        tableId: tableM01!._id.toString(),
        items: [{ dishId: dishClasico!._id.toString(), quantity: 1 }]
      });
    const orderCId = orderCRes.body.id;

    const mozoReadyAttempt = await request(app)
      .patch(`/api/orders/${orderCId}/ready`)
      .set('Authorization', `Bearer ${mozoToken}`)
      .send({ version: 0 });
    expect(mozoReadyAttempt.status).toBe(403);

    // Mozo tampoco puede consultar el tablero de cocina KDS (403 Forbidden)
    const mozoBoardAttempt = await request(app)
      .get('/api/kitchen/board')
      .set('Authorization', `Bearer ${mozoToken}`);
    expect(mozoBoardAttempt.status).toBe(403);
  });
});
