import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup';
import { seedData } from '../src/seed/data';
import { Table } from '../src/models/table.model';
import { Dish } from '../src/models/dish.model';
import { MenuItem } from '../src/models/menu-item.model';
import { RationAdjustment } from '../src/models/ration-adjustment.model';

describe('E2E Spec 003: Toma de Pedidos — Ciclo Completo Mozo / Cocina / Encargado', () => {
  let mozo1Token: string;
  let mozo2Token: string;
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

    // 1. Login multirrol con credenciales del seed
    const loginEncargado = await request(app)
      .post('/api/auth/login')
      .send({ username: 'encargado1', password: 'encargado123' });
    expect(loginEncargado.status).toBe(200);

    const loginMozo1 = await request(app)
      .post('/api/auth/login')
      .send({ username: 'mozo1', password: 'mozo123' });
    expect(loginMozo1.status).toBe(200);
    mozo1Token = loginMozo1.body.token;

    const loginMozo2 = await request(app)
      .post('/api/auth/login')
      .send({ username: 'mozo2', password: 'mozo223' });
    expect(loginMozo2.status).toBe(200);
    mozo2Token = loginMozo2.body.token;

    const loginCocinero = await request(app)
      .post('/api/auth/login')
      .send({ username: 'cocinero1', password: 'cocina123' });
    expect(loginCocinero.status).toBe(200);
    cocineroToken = loginCocinero.body.token;
  });

  it('flujo principal colaborativo: mozo1 crea pedido (2 ítems, variación, notas), mozo2 lo ve en activos y detalle, cocinero1 marca LISTO, mozo2 entrega y sale de activos', async () => {
    // 2. Verificar que el turno está abierto y menú del día publicado
    const shiftRes = await request(app)
      .get('/api/shifts/current')
      .set('Authorization', `Bearer ${mozo1Token}`);
    expect(shiftRes.status).toBe(200);
    expect(shiftRes.body.status).toBe('ABIERTO');

    const menuTodayRes = await request(app)
      .get('/api/menu/today')
      .set('Authorization', `Bearer ${mozo1Token}`);
    expect(menuTodayRes.status).toBe(200);
    expect(menuTodayRes.body.status).toBe('PUBLICADO');

    // Obtener mesa M01 y platos maestros
    const tableM01 = await Table.findOne({ code: 'M01' });
    expect(tableM01).toBeDefined();

    const dishMixto = await Dish.findOne({ name: 'Ceviche mixto' });
    expect(dishMixto).toBeDefined();
    expect(dishMixto?.priceCents).toBe(3200);

    const dishChicha = await Dish.findOne({ name: 'Chicha morada 1L' });
    expect(dishChicha).toBeDefined();
    expect(dishChicha?.priceCents).toBe(1200);

    const menuItemMixtoBefore = await MenuItem.findOne({ dishId: dishMixto!._id });
    const initialRations = menuItemMixtoBefore?.remainingRations ?? 30;

    // 3. mozo1 crea pedido con 2 ítems, variación y notas
    const createOrderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozo1Token}`)
      .send({
        tableId: tableM01!._id.toString(),
        items: [
          {
            dishId: dishMixto!._id.toString(),
            quantity: 2,
            variationIds: ['v_con_aji'],
            notes: 'Picante moderado por favor'
          },
          {
            dishId: dishChicha!._id.toString(),
            quantity: 1,
            notes: 'Jarra fría'
          }
        ],
        notes: 'Mesa con niños pequeños',
        clientRequestId: 'req-mozo1-flujo-001'
      });

    expect(createOrderRes.status).toBe(201);
    const order = createOrderRes.body;
    expect(order.orderNumber).toBeGreaterThanOrEqual(1);
    expect(order.status).toBe('ENVIADO');
    expect(order.tableCode).toBe('M01');
    expect(order.takenByName).toBe('Mozo 1');
    expect(order.version).toBe(0);
    // Total: (3200 * 2) + (1200 * 1) = 7600 centavos exactos (sin IGV)
    expect(order.totalCents).toBe(7600);
    expect(order.items.length).toBe(2);

    // Raciones de Ceviche mixto descontadas exactamente en 2 unidades
    const menuItemMixtoAfter = await MenuItem.findOne({ dishId: dishMixto!._id });
    expect(menuItemMixtoAfter?.remainingRations).toBe(initialRations - 2);

    const orderId = order.id;

    // 4. mozo2 ve el pedido en scope=active y en el detalle (mismo registro compartido)
    const activeOrdersRes = await request(app)
      .get('/api/orders?scope=active')
      .set('Authorization', `Bearer ${mozo2Token}`);
    expect(activeOrdersRes.status).toBe(200);
    const foundInActive = activeOrdersRes.body.data.find((o: any) => o.id === orderId);
    expect(foundInActive).toBeDefined();
    expect(foundInActive.status).toBe('ENVIADO');
    expect(foundInActive.takenByName).toBe('Mozo 1');

    const detailRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${mozo2Token}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.id).toBe(orderId);
    expect(detailRes.body.totalCents).toBe(7600);
    expect(detailRes.body.notes).toBe('Mesa con niños pequeños');
    expect(detailRes.body.items[0].variations[0].name).toBe('Con ají');

    // 5. cocinero1 marca ready con version 0 -> LISTO
    const readyRes = await request(app)
      .patch(`/api/orders/${orderId}/ready`)
      .set('Authorization', `Bearer ${cocineroToken}`)
      .send({ version: 0 });
    expect(readyRes.status).toBe(200);
    expect(readyRes.body.status).toBe('LISTO');
    expect(readyRes.body.version).toBe(1);
    expect(readyRes.body.readyBy.name).toBe('Cocinero 1');

    // Ambos mozos lo ven en scope=ready
    const readyMozo1Res = await request(app)
      .get('/api/orders?scope=ready')
      .set('Authorization', `Bearer ${mozo1Token}`);
    expect(readyMozo1Res.body.data.some((o: any) => o.id === orderId)).toBe(true);

    const readyMozo2Res = await request(app)
      .get('/api/orders?scope=ready')
      .set('Authorization', `Bearer ${mozo2Token}`);
    expect(readyMozo2Res.body.data.some((o: any) => o.id === orderId)).toBe(true);

    // 6. mozo2 entrega con version 1 -> ENTREGADO, deliveredBy = mozo2, sale de activos
    const deliverRes = await request(app)
      .patch(`/api/orders/${orderId}/deliver`)
      .set('Authorization', `Bearer ${mozo2Token}`)
      .send({ version: 1 });
    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.status).toBe('ENTREGADO');
    expect(deliverRes.body.version).toBe(2);
    expect(deliverRes.body.deliveredBy.name).toBe('Mozo 2');

    // Ya no debe aparecer en scope=active ni en scope=ready
    const finalActiveRes = await request(app)
      .get('/api/orders?scope=active')
      .set('Authorization', `Bearer ${mozo1Token}`);
    expect(finalActiveRes.body.data.some((o: any) => o.id === orderId)).toBe(false);

    const finalReadyRes = await request(app)
      .get('/api/orders?scope=ready')
      .set('Authorization', `Bearer ${mozo2Token}`);
    expect(finalReadyRes.body.data.some((o: any) => o.id === orderId)).toBe(false);
  });

  it('ciclo de vida de mesa: mesa con pedido activo rechaza cierre (409), tras entregar se cierra y queda LIBRE, y nuevo pedido abre sesión nueva', async () => {
    const tableM02 = await Table.findOne({ code: 'M02' });
    const dishClasico = await Dish.findOne({ name: 'Ceviche clásico' });

    // 7a. Crear pedido en mesa M02
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozo1Token}`)
      .send({
        tableId: tableM02!._id.toString(),
        items: [{ dishId: dishClasico!._id.toString(), quantity: 1 }]
      });
    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.id;
    const firstSessionId = orderRes.body.tableSessionId;
    expect(firstSessionId).toBeDefined();

    // La mesa se encuentra en estado OCUPADA
    const tablesList1 = await request(app)
      .get('/api/tables')
      .set('Authorization', `Bearer ${mozo1Token}`);
    expect(tablesList1.status).toBe(200);
    const tableState1 = tablesList1.body.data.find((t: any) => t.id === tableM02!._id.toString());
    expect(tableState1).toBeDefined();
    expect(tableState1.state).toBe('OCUPADA');
    expect(tableState1.openSessionId).toBe(firstSessionId);

    // Intentar cerrar la sesión de mesa con pedido en ENVIADO -> 409 TABLE_HAS_ACTIVE_ORDERS
    const closeFailEnviado = await request(app)
      .post(`/api/table-sessions/${firstSessionId}/close`)
      .set('Authorization', `Bearer ${mozo1Token}`)
      .send({ notes: 'Intento de cierre con pedido enviado' });
    expect(closeFailEnviado.status).toBe(409);
    expect(closeFailEnviado.body.error.code).toBe('TABLE_HAS_ACTIVE_ORDERS');

    // Cocinero pasa pedido a LISTO
    await request(app)
      .patch(`/api/orders/${orderId}/ready`)
      .set('Authorization', `Bearer ${cocineroToken}`)
      .send({ version: 0 });

    // Intentar cerrar la mesa con pedido en LISTO -> 409 TABLE_HAS_ACTIVE_ORDERS
    const closeFailListo = await request(app)
      .post(`/api/table-sessions/${firstSessionId}/close`)
      .set('Authorization', `Bearer ${mozo2Token}`)
      .send({ notes: 'Intento de cierre con pedido listo' });
    expect(closeFailListo.status).toBe(409);
    expect(closeFailListo.body.error.code).toBe('TABLE_HAS_ACTIVE_ORDERS');

    // 7b. Mozo entrega el pedido -> ya no quedan pedidos activos en la sesión
    await request(app)
      .patch(`/api/orders/${orderId}/deliver`)
      .set('Authorization', `Bearer ${mozo2Token}`)
      .send({ version: 1 });

    // La mesa pasa a POR_CERRAR
    const tablesList2 = await request(app)
      .get('/api/tables')
      .set('Authorization', `Bearer ${mozo1Token}`);
    const tableState2 = tablesList2.body.data.find((t: any) => t.id === tableM02!._id.toString());
    expect(tableState2.state).toBe('POR_CERRAR');

    // Mozo cierra la sesión de mesa exitosamente
    const closeOkRes = await request(app)
      .post(`/api/table-sessions/${firstSessionId}/close`)
      .set('Authorization', `Bearer ${mozo1Token}`)
      .send({ notes: 'Comensales se retiraron conformes' });
    expect(closeOkRes.status).toBe(200);
    expect(closeOkRes.body.status).toBe('CERRADA');

    // La mesa queda en estado LIBRE y sin sesión abierta
    const tablesList3 = await request(app)
      .get('/api/tables')
      .set('Authorization', `Bearer ${mozo1Token}`);
    const tableState3 = tablesList3.body.data.find((t: any) => t.id === tableM02!._id.toString());
    expect(tableState3.state).toBe('LIBRE');
    expect(tableState3.openSessionId).toBeNull();

    // 8. Nuevo pedido en la mesa libre abre automáticamente una nueva sesión
    const newOrderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozo2Token}`)
      .send({
        tableId: tableM02!._id.toString(),
        items: [{ dishId: dishClasico!._id.toString(), quantity: 1 }],
        notes: 'Nueva ocupación de la mesa M02'
      });
    expect(newOrderRes.status).toBe(201);
    const secondSessionId = newOrderRes.body.tableSessionId;
    expect(secondSessionId).toBeDefined();
    expect(secondSessionId).not.toBe(firstSessionId);

    const tablesList4 = await request(app)
      .get('/api/tables')
      .set('Authorization', `Bearer ${mozo2Token}`);
    const tableState4 = tablesList4.body.data.find((t: any) => t.id === tableM02!._id.toString());
    expect(tableState4.state).toBe('OCUPADA');
    expect(tableState4.openSessionId).toBe(secondSessionId);
  });

  it('reglas de cancelación: ENVIADO repone raciones, LISTO no repone raciones, y terminal falla con 409', async () => {
    const tableM03 = await Table.findOne({ code: 'M03' });
    const dishMixto = await Dish.findOne({ name: 'Ceviche mixto' });

    // --- Caso 9a: Cancelar ENVIADO repone raciones y audita CANCELLATION_REVERSAL ---
    const initialItem = await MenuItem.findOne({ dishId: dishMixto!._id });
    const initialStock = initialItem?.remainingRations ?? 30;

    const createEnviadoRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozo1Token}`)
      .send({
        tableId: tableM03!._id.toString(),
        items: [{ dishId: dishMixto!._id.toString(), quantity: 3 }]
      });
    expect(createEnviadoRes.status).toBe(201);
    const orderEnviadoId = createEnviadoRes.body.id;

    // Stock temporalmente descontado en 3
    const stockAfterCreate = await MenuItem.findOne({ dishId: dishMixto!._id });
    expect(stockAfterCreate?.remainingRations).toBe(initialStock - 3);

    // Cancelar pedido en estado ENVIADO
    const cancelEnviadoRes = await request(app)
      .patch(`/api/orders/${orderEnviadoId}/cancel`)
      .set('Authorization', `Bearer ${mozo2Token}`)
      .send({
        version: 0,
        reason: 'Cliente cambió de opinión antes de preparación'
      });
    expect(cancelEnviadoRes.status).toBe(200);
    expect(cancelEnviadoRes.body.status).toBe('CANCELADO');

    // Raciones vuelven íntegras
    const stockAfterCancelEnviado = await MenuItem.findOne({ dishId: dishMixto!._id });
    expect(stockAfterCancelEnviado?.remainingRations).toBe(initialStock);

    // Auditoría registrada
    const reversalAudit = await RationAdjustment.findOne({
      orderId: orderEnviadoId,
      type: 'CANCELLATION_REVERSAL'
    });
    expect(reversalAudit).toBeDefined();
    expect(reversalAudit?.previousRemaining).toBe(initialStock - 3);
    expect(reversalAudit?.newRemaining).toBe(initialStock);

    // --- Caso 9b: Cancelar LISTO NO repone raciones y advierte ---
    const createListoRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozo1Token}`)
      .send({
        tableId: tableM03!._id.toString(),
        items: [{ dishId: dishMixto!._id.toString(), quantity: 2 }]
      });
    expect(createListoRes.status).toBe(201);
    const orderListoId = createListoRes.body.id;

    // Cocinero pasa a LISTO
    await request(app)
      .patch(`/api/orders/${orderListoId}/ready`)
      .set('Authorization', `Bearer ${cocineroToken}`)
      .send({ version: 0 });

    // Cancelar en estado LISTO
    const cancelListoRes = await request(app)
      .patch(`/api/orders/${orderListoId}/cancel`)
      .set('Authorization', `Bearer ${mozo1Token}`)
      .send({
        version: 1,
        reason: 'Comensal tuvo una urgencia y se retiró'
      });
    expect(cancelListoRes.status).toBe(200);
    expect(cancelListoRes.body.status).toBe('CANCELADO');
    expect(cancelListoRes.body.warning).toBeDefined();

    // Las raciones NO deben volver (permanecen descontadas en 2)
    const stockAfterCancelListo = await MenuItem.findOne({ dishId: dishMixto!._id });
    expect(stockAfterCancelListo?.remainingRations).toBe(initialStock - 2);

    // --- Caso 9c: Cancelar pedidos terminales falla con 409 CANCELLATION_NOT_ALLOWED ---
    // Intentar cancelar el pedido ya cancelado
    const cancelAgainRes = await request(app)
      .patch(`/api/orders/${orderListoId}/cancel`)
      .set('Authorization', `Bearer ${mozo1Token}`)
      .send({
        version: 2,
        reason: 'Intento de recancelar'
      });
    expect(cancelAgainRes.status).toBe(409);
    expect(cancelAgainRes.body.error.code).toBe('CANCELLATION_NOT_ALLOWED');

    // Crear y entregar un pedido para probar cancelación sobre ENTREGADO
    const createToDeliverRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozo1Token}`)
      .send({
        tableId: tableM03!._id.toString(),
        items: [{ dishId: dishMixto!._id.toString(), quantity: 1 }]
      });
    const orderDeliveredId = createToDeliverRes.body.id;

    await request(app)
      .patch(`/api/orders/${orderDeliveredId}/ready`)
      .set('Authorization', `Bearer ${cocineroToken}`)
      .send({ version: 0 });

    await request(app)
      .patch(`/api/orders/${orderDeliveredId}/deliver`)
      .set('Authorization', `Bearer ${mozo2Token}`)
      .send({ version: 1 });

    const cancelDeliveredRes = await request(app)
      .patch(`/api/orders/${orderDeliveredId}/cancel`)
      .set('Authorization', `Bearer ${mozo1Token}`)
      .send({
        version: 2,
        reason: 'No se puede cancelar tras entregar'
      });
    expect(cancelDeliveredRes.status).toBe(409);
    expect(cancelDeliveredRes.body.error.code).toBe('CANCELLATION_NOT_ALLOWED');
  });

  it('idempotencia por clientRequestId: doble POST crea un solo pedido (201 luego 200) y descuenta raciones una sola vez', async () => {
    const tableM04 = await Table.findOne({ code: 'M04' });
    const dishMixto = await Dish.findOne({ name: 'Ceviche mixto' });

    const initialStockItem = await MenuItem.findOne({ dishId: dishMixto!._id });
    const initialRations = initialStockItem?.remainingRations ?? 30;

    const clientRequestId = 'req-unique-idempotent-order-uuid-999';

    // Primer POST -> 201 Created
    const firstPostRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozo1Token}`)
      .send({
        tableId: tableM04!._id.toString(),
        items: [{ dishId: dishMixto!._id.toString(), quantity: 2 }],
        notes: 'Pedido con clientRequestId',
        clientRequestId
      });
    expect(firstPostRes.status).toBe(201);
    const firstOrderId = firstPostRes.body.id;
    const firstOrderNumber = firstPostRes.body.orderNumber;

    // Stock bajó en exactamente 2 unidades
    const stockAfterFirst = await MenuItem.findOne({ dishId: dishMixto!._id });
    expect(stockAfterFirst?.remainingRations).toBe(initialRations - 2);

    // Segundo POST idéntico (simula doble tap o reintento de red con mismo clientRequestId) -> 200 OK
    const secondPostRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozo1Token}`)
      .send({
        tableId: tableM04!._id.toString(),
        items: [{ dishId: dishMixto!._id.toString(), quantity: 2 }],
        notes: 'Pedido con clientRequestId',
        clientRequestId
      });
    expect(secondPostRes.status).toBe(200);
    expect(secondPostRes.body.id).toBe(firstOrderId);
    expect(secondPostRes.body.orderNumber).toBe(firstOrderNumber);

    // Stock permanece en exactamente initialRations - 2 (NO se descuenta por duplicado)
    const stockAfterSecond = await MenuItem.findOne({ dishId: dishMixto!._id });
    expect(stockAfterSecond?.remainingRations).toBe(initialRations - 2);
  });
});
