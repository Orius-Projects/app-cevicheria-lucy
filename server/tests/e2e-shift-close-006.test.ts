import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup';
import { seedData } from '../src/seed/data';
import { Order } from '../src/models/order.model';
import { TableSession } from '../src/models/table-session.model';
import { ManualRecord } from '../src/models/manual-record.model';
import { ShiftSummary } from '../src/models/shift-summary.model';

describe('Spec 006 E2E — Cierre de Turno y Resumen Inmutable', () => {
  let encargadoToken: string;
  let mozoToken: string;
  let cocineroToken: string;

  beforeAll(async () => {
    await setupTestDB();
  }, 30000);

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedData();

    // Limpieza de pedidos y sesiones previas para aislamiento del turno
    await Order.deleteMany({});
    await TableSession.deleteMany({});
    await ManualRecord.deleteMany({});
    await ShiftSummary.deleteMany({});

    // Login multirrol con credenciales canónicas del seed
    const loginEncargado = await request(app)
      .post('/api/auth/login')
      .send({ username: 'encargado1', password: 'encargado123' });
    expect(loginEncargado.status).toBe(200);
    encargadoToken = loginEncargado.body.token;

    const loginMozo = await request(app)
      .post('/api/auth/login')
      .send({ username: 'mozo1', password: 'mozo123' });
    expect(loginMozo.status).toBe(200);
    mozoToken = loginMozo.body.token;

    const loginCocinero = await request(app)
      .post('/api/auth/login')
      .send({ username: 'cocinero1', password: 'cocina123' });
    expect(loginCocinero.status).toBe(200);
    cocineroToken = loginCocinero.body.token;
  }, 30000);

  it('flujo integral de turno: pedidos entregados, cancelado, agotado con motivo, registros PAPER, validación de mesas abiertas, cierre con snapshot inmutable y rechazo de nuevos pedidos', async () => {
    // 1. Obtener turno abierto actual
    const currentShiftRes = await request(app)
      .get('/api/shifts/current')
      .set('Authorization', `Bearer ${encargadoToken}`);
    expect(currentShiftRes.status).toBe(200);
    expect(currentShiftRes.body.status).toBe('ABIERTO');
    const shiftId = currentShiftRes.body.id;

    // 2. Obtener mesas del restaurante
    const tablesRes = await request(app)
      .get('/api/tables')
      .set('Authorization', `Bearer ${mozoToken}`);
    expect(tablesRes.status).toBe(200);
    const tableM01 = tablesRes.body.data.find((t: any) => t.code === 'M01');
    const tableM02 = tablesRes.body.data.find((t: any) => t.code === 'M02');
    expect(tableM01).toBeDefined();
    expect(tableM02).toBeDefined();

    // 3. Obtener menú publicado del día
    const menuRes = await request(app)
      .get('/api/menu/today')
      .set('Authorization', `Bearer ${mozoToken}`);
    expect(menuRes.status).toBe(200);

    let cevicheClasicoDishId = '';
    let cevicheMixtoDishId = '';
    let jaleaMenuItemId = '';

    for (const sec of menuRes.body.sections) {
      for (const item of sec.items) {
        if (item.dishName === 'Ceviche clásico') {
          cevicheClasicoDishId = item.dishId;
        }
        if (item.dishName === 'Ceviche mixto') {
          cevicheMixtoDishId = item.dishId;
        }
        if (item.dishName === 'Jalea mixta') {
          jaleaMenuItemId = item.id;
        }
      }
    }
    expect(cevicheClasicoDishId).toBeTruthy();
    expect(cevicheMixtoDishId).toBeTruthy();
    expect(jaleaMenuItemId).toBeTruthy();

    // 4. Crear pedido 1 en Mesa M01 y completar ciclo hasta ENTREGADO
    // 2 Ceviche clásico (2 * 2800 = 5600) + 1 Ceviche mixto (1 * 3200 = 3200) -> Total = 8800 centavos
    const order1Res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozoToken}`)
      .send({
        tableId: tableM01.id,
        items: [
          { dishId: cevicheClasicoDishId, quantity: 2 },
          { dishId: cevicheMixtoDishId, quantity: 1 }
        ]
      });
    expect(order1Res.status).toBe(201);
    const order1Id = order1Res.body.id;
    expect(order1Res.body.totalCents).toBe(8800);

    // Cocinero despacha a LISTO
    const ready1Res = await request(app)
      .patch(`/api/orders/${order1Id}/ready`)
      .set('Authorization', `Bearer ${cocineroToken}`)
      .send({ version: 0 });
    expect(ready1Res.status).toBe(200);
    expect(ready1Res.body.status).toBe('LISTO');

    // Mozo entrega pedido
    const deliver1Res = await request(app)
      .patch(`/api/orders/${order1Id}/deliver`)
      .set('Authorization', `Bearer ${mozoToken}`)
      .send({ version: 1 });
    expect(deliver1Res.status).toBe(200);
    expect(deliver1Res.body.status).toBe('ENTREGADO');

    // 5. Crear pedido 2 en Mesa M02 y cancelarlo
    const order2Res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozoToken}`)
      .send({
        tableId: tableM02.id,
        items: [{ dishId: cevicheMixtoDishId, quantity: 1 }]
      });
    expect(order2Res.status).toBe(201);
    const order2Id = order2Res.body.id;

    // Mozo cancela pedido 2 con motivo
    const cancel2Res = await request(app)
      .patch(`/api/orders/${order2Id}/cancel`)
      .set('Authorization', `Bearer ${mozoToken}`)
      .send({
        version: 0,
        reason: 'Comensal tuvo una urgencia imprevista'
      });
    expect(cancel2Res.status).toBe(200);
    expect(cancel2Res.body.status).toBe('CANCELADO');

    // 6. Encargado marca plato agotado con motivo
    const soldOutRes = await request(app)
      .post(`/api/menu-items/${jaleaMenuItemId}/sold-out`)
      .set('Authorization', `Bearer ${encargadoToken}`)
      .send({ reason: 'Falta de mariscos frescos del día' });
    expect(soldOutRes.status).toBe(200);
    expect(soldOutRes.body.manuallySoldOut).toBe(true);

    // 7. Registros manuales PAPER: validación de error 422 y registro exitoso
    // 7a. Registro inválido: sin items -> 422
    const invalidManual1 = await request(app)
      .post(`/api/shifts/${shiftId}/manual-records`)
      .set('Authorization', `Bearer ${encargadoToken}`)
      .send({ tableCode: 'M05', items: [] });
    expect(invalidManual1.status).toBe(422);

    // 7b. Registro inválido: monto negativo -> 422
    const invalidManual2 = await request(app)
      .post(`/api/shifts/${shiftId}/manual-records`)
      .set('Authorization', `Bearer ${encargadoToken}`)
      .send({
        tableCode: 'M05',
        items: [{ name: 'Chicharrón de calamar', quantity: 1, amountCents: -500 }]
      });
    expect(invalidManual2.status).toBe(422);

    // 7c. Registro manual PAPER válido -> 201
    const validManualRes = await request(app)
      .post(`/api/shifts/${shiftId}/manual-records`)
      .set('Authorization', `Bearer ${encargadoToken}`)
      .send({
        tableCode: 'M05',
        items: [{ name: 'Chicharrón de calamar', quantity: 2, amountCents: 5200 }],
        notes: 'Comanda manual en papel por contingencia de red'
      });
    expect(validManualRes.status).toBe(201);
    expect(validManualRes.body.source).toBe('PAPER');
    expect(validManualRes.body.totalCents).toBe(5200);

    // 8. Consulta de resumen en vivo (GET /api/shifts/:id/summary)
    const liveSummaryRes = await request(app)
      .get(`/api/shifts/${shiftId}/summary`)
      .set('Authorization', `Bearer ${encargadoToken}`);
    expect(liveSummaryRes.status).toBe(200);
    const liveSummary = liveSummaryRes.body;

    // Resumen en vivo no tiene fecha de cierre definitiva
    expect(liveSummary.closedAt).toBeNull();

    // Verificación exacta de montos en centavos
    expect(liveSummary.totalAmountCents).toBe(8800);
    expect(liveSummary.manualTotalCents).toBe(5200);

    // Platos vendidos (solo pedidos entregados, separados de manualRecords)
    expect(liveSummary.soldDishes).toHaveLength(2);
    const soldClasico = liveSummary.soldDishes.find((d: any) => d.dishName === 'Ceviche clásico');
    expect(soldClasico).toBeDefined();
    expect(soldClasico.quantity).toBe(2);
    expect(soldClasico.amountCents).toBe(5600);

    const soldMixto = liveSummary.soldDishes.find((d: any) => d.dishName === 'Ceviche mixto');
    expect(soldMixto).toBeDefined();
    expect(soldMixto.quantity).toBe(1);
    expect(soldMixto.amountCents).toBe(3200);

    // El ítem manual NO se mezcla en soldDishes
    const manualInSold = liveSummary.soldDishes.find((d: any) => d.dishName === 'Chicharrón de calamar');
    expect(manualInSold).toBeUndefined();

    // Registros manuales PAPER separados
    expect(liveSummary.manualRecords).toHaveLength(1);
    expect(liveSummary.manualRecords[0].tableCode).toBe('M05');
    expect(liveSummary.manualRecords[0].totalCents).toBe(5200);
    expect(liveSummary.manualRecords[0].source).toBe('PAPER');

    // Cancelaciones registradas
    expect(liveSummary.cancellations).toHaveLength(1);
    expect(liveSummary.cancellations[0].reason).toBe('Comensal tuvo una urgencia imprevista');

    // Platos agotados con su motivo correspondiente
    const soldOutJalea = liveSummary.soldOutDishes.find((d: any) => d.dishName === 'Jalea mixta');
    expect(soldOutJalea).toBeDefined();
    expect(soldOutJalea.reason).toBe('Falta de mariscos frescos del día');

    // Raciones restantes (Ceviche mixto: 30 inicial - 1 consumido = 29)
    const rationsMixto = liveSummary.remainingRations.find((d: any) => d.dishName === 'Ceviche mixto');
    expect(rationsMixto).toBeDefined();
    expect(rationsMixto.remainingRations).toBe(29);

    // 9. Intento de cierre de turno con mesas abiertas => 409 OPEN_TABLES_REMAIN
    const closeBlockedRes = await request(app)
      .post(`/api/shifts/${shiftId}/close`)
      .set('Authorization', `Bearer ${encargadoToken}`)
      .send({ observations: 'Intento de cierre con mesas sin desocupar' });
    expect(closeBlockedRes.status).toBe(409);
    expect(closeBlockedRes.body.error.code).toBe('OPEN_TABLES_REMAIN');

    // 10. Cerrar sesiones de mesa abiertas
    const openTablesRes = await request(app)
      .get('/api/tables')
      .set('Authorization', `Bearer ${mozoToken}`);
    expect(openTablesRes.status).toBe(200);

    for (const t of openTablesRes.body.data) {
      if (t.openSessionId) {
        const closeSessionRes = await request(app)
          .post(`/api/table-sessions/${t.openSessionId}/close`)
          .set('Authorization', `Bearer ${mozoToken}`)
          .send({ notes: 'Mesa desocupada y cuenta saldada' });
        expect(closeSessionRes.status).toBe(200);
      }
    }

    // 11. Ejecutar cierre de turno con observaciones => snapshot CERRADO
    const closeSuccessRes = await request(app)
      .post(`/api/shifts/${shiftId}/close`)
      .set('Authorization', `Bearer ${encargadoToken}`)
      .send({ observations: 'Turno almuerzo cerrado con arqueo conforme' });
    expect(closeSuccessRes.status).toBe(200);
    const closedSnapshot = closeSuccessRes.body;
    expect(closedSnapshot.closedAt).toBeDefined();
    expect(closedSnapshot.closedAt).not.toBeNull();
    expect(closedSnapshot.observations).toBe('Turno almuerzo cerrado con arqueo conforme');
    expect(closedSnapshot.totalAmountCents).toBe(8800);
    expect(closedSnapshot.manualTotalCents).toBe(5200);

    // 12. GET summary devuelve el snapshot inmutable idéntico
    const finalSummaryRes = await request(app)
      .get(`/api/shifts/${shiftId}/summary`)
      .set('Authorization', `Bearer ${encargadoToken}`);
    expect(finalSummaryRes.status).toBe(200);
    expect(finalSummaryRes.body.closedAt).toBe(closedSnapshot.closedAt);
    expect(finalSummaryRes.body.observations).toBe('Turno almuerzo cerrado con arqueo conforme');
    expect(finalSummaryRes.body.totalAmountCents).toBe(8800);
    expect(finalSummaryRes.body.manualTotalCents).toBe(5200);
    expect(finalSummaryRes.body.soldDishes).toEqual(closedSnapshot.soldDishes);
    expect(finalSummaryRes.body.manualRecords).toEqual(closedSnapshot.manualRecords);

    // 13. Intento de doble cierre devuelve 409 CONFLICT
    const doubleCloseRes = await request(app)
      .post(`/api/shifts/${shiftId}/close`)
      .set('Authorization', `Bearer ${encargadoToken}`)
      .send({ observations: 'Segundo intento' });
    expect(doubleCloseRes.status).toBe(409);

    // 14. Intento de crear pedido en turno cerrado devuelve 409 SHIFT_NOT_OPEN
    const orderOnClosedRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozoToken}`)
      .send({
        tableId: tableM01.id,
        items: [{ dishId: cevicheClasicoDishId, quantity: 1 }]
      });
    expect(orderOnClosedRes.status).toBe(409);
    expect(orderOnClosedRes.body.error.code).toBe('SHIFT_NOT_OPEN');
  });

  it('restricciones de rol y turno cerrado para registros manuales y resumen', async () => {
    const currentShiftRes = await request(app)
      .get('/api/shifts/current')
      .set('Authorization', `Bearer ${encargadoToken}`);
    const shiftId = currentShiftRes.body.id;

    // Mozo y Cocinero no tienen acceso al resumen de turno -> 403 Forbidden
    const mozoSummary = await request(app)
      .get(`/api/shifts/${shiftId}/summary`)
      .set('Authorization', `Bearer ${mozoToken}`);
    expect(mozoSummary.status).toBe(403);

    const cocineroSummary = await request(app)
      .get(`/api/shifts/${shiftId}/summary`)
      .set('Authorization', `Bearer ${cocineroToken}`);
    expect(cocineroSummary.status).toBe(403);

    // Mozo no puede cerrar turno -> 403 Forbidden
    const mozoClose = await request(app)
      .post(`/api/shifts/${shiftId}/close`)
      .set('Authorization', `Bearer ${mozoToken}`)
      .send({ observations: 'Cierre no autorizado' });
    expect(mozoClose.status).toBe(403);

    // Mozo no puede agregar registros manuales PAPER -> 403 Forbidden
    const mozoManual = await request(app)
      .post(`/api/shifts/${shiftId}/manual-records`)
      .set('Authorization', `Bearer ${mozoToken}`)
      .send({
        tableCode: 'M01',
        items: [{ name: 'Ceviche clásico', quantity: 1, amountCents: 2800 }]
      });
    expect(mozoManual.status).toBe(403);

    // Cerrar turno formalmente
    await request(app)
      .post(`/api/shifts/${shiftId}/close`)
      .set('Authorization', `Bearer ${encargadoToken}`)
      .send({ observations: 'Cierre de verificación' });

    // No se permite agregar registros manuales a un turno cerrado -> 409 Conflict
    const manualOnClosed = await request(app)
      .post(`/api/shifts/${shiftId}/manual-records`)
      .set('Authorization', `Bearer ${encargadoToken}`)
      .send({
        tableCode: 'M01',
        items: [{ name: 'Ceviche clásico', quantity: 1, amountCents: 2800 }]
      });
    expect(manualOnClosed.status).toBe(409);
  });
});
