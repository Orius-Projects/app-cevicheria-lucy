import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup';
import { seedData, getTodayLimaDate } from '../src/seed/data';
import { MenuDay } from '../src/models/menu-day.model';
import { MenuItem } from '../src/models/menu-item.model';
import { Table } from '../src/models/table.model';

describe('E2E Spec 002: Ciclo de Integración Menú, Raciones y Agotados', () => {
  let encargadoToken: string;
  let mozoToken: string;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedData();

    // Login encargado
    const loginEncargado = await request(app)
      .post('/api/auth/login')
      .send({ username: 'encargado1', password: 'encargado123' });
    expect(loginEncargado.status).toBe(200);
    encargadoToken = loginEncargado.body.token;

    // Login mozo
    const loginMozo = await request(app)
      .post('/api/auth/login')
      .send({ username: 'mozo1', password: 'mozo123' });
    expect(loginMozo.status).toBe(200);
    mozoToken = loginMozo.body.token;

    // Limpiar menú del día previo para asegurar un ciclo E2E limpio desde la creación
    await MenuDay.deleteMany({});
    await MenuItem.deleteMany({});
  });

  it('flujo principal: encargado crea plato y menú, publica, GET /api/menu/today lo muestra, se marca sold-out y un pedido devuelve DISH_UNAVAILABLE; luego reactivar y verificar que vuelve a estar disponible', async () => {
    const today = getTodayLimaDate();

    // 1. Obtener secciones para asociar el nuevo plato maestro
    const sectionsRes = await request(app)
      .get('/api/menu-sections')
      .set('Authorization', `Bearer ${encargadoToken}`);
    expect(sectionsRes.status).toBe(200);
    const marinoSection = sectionsRes.body.find((s: any) => s.key === 'MARINO') || sectionsRes.body[0];
    expect(marinoSection).toBeDefined();

    // 2. Encargado crea un plato maestro nuevo con descripción y variaciones sin costo
    const dishRes = await request(app)
      .post('/api/dishes')
      .set('Authorization', `Bearer ${encargadoToken}`)
      .send({
        sectionId: marinoSection.id,
        name: 'Parihuela Especial de la Casa',
        description: 'Sopa marina tradicional con frutos del mar, cangrejo y chicha de jora',
        priceCents: 4200,
        course: 'FONDO',
        isFixed: true,
        variations: [
          { id: 'v_picante', name: 'Picante moderado' },
          { id: 'v_sin_rocoto', name: 'Sin rocoto' }
        ]
      });
    expect(dishRes.status).toBe(201);
    expect(dishRes.body.name).toBe('Parihuela Especial de la Casa');
    const createdDishId = dishRes.body.id;

    // 3. Encargado crea el menú del día para la fecha actual (queda en BORRADOR)
    const createMenuRes = await request(app)
      .post('/api/menu/days')
      .set('Authorization', `Bearer ${encargadoToken}`)
      .send({
        date: today,
        notes: 'Menú especial preparado para la jornada de hoy'
      });
    expect(createMenuRes.status).toBe(201);
    expect(createMenuRes.body.status).toBe('BORRADOR');
    const menuDayId = createMenuRes.body.id;

    // 4. Encargado configura el plato dentro del menú del día con límite de raciones
    const updateMenuRes = await request(app)
      .put(`/api/menu/days/${menuDayId}`)
      .set('Authorization', `Bearer ${encargadoToken}`)
      .send({
        notes: 'Menú con parihuela especial activa',
        items: [
          {
            dishId: createdDishId,
            active: true,
            hasRationsLimit: true,
            totalRations: 20,
            remainingRations: 20,
            priceCents: 4200
          }
        ]
      });
    expect(updateMenuRes.status).toBe(200);

    // 5. Encargado publica el menú
    const publishRes = await request(app)
      .post(`/api/menu/days/${menuDayId}/publish`)
      .set('Authorization', `Bearer ${encargadoToken}`);
    expect(publishRes.status).toBe(200);
    expect(publishRes.body.status).toBe('PUBLICADO');

    // 6. Mozo consulta GET /api/menu/today y lo visualiza con campos planos (F1), estado y raciones
    const todayRes = await request(app)
      .get('/api/menu/today')
      .set('Authorization', `Bearer ${mozoToken}`);
    expect(todayRes.status).toBe(200);
    expect(todayRes.body.status).toBe('PUBLICADO');

    let menuItem: any = null;
    for (const sec of todayRes.body.sections) {
      const found = sec.items.find((i: any) => i.dishId === createdDishId);
      if (found) {
        menuItem = found;
        break;
      }
    }
    expect(menuItem).toBeDefined();
    expect(menuItem.dishName).toBe('Parihuela Especial de la Casa');
    expect(menuItem.description).toBe('Sopa marina tradicional con frutos del mar, cangrejo y chicha de jora');
    expect(menuItem.priceCents).toBe(4200);
    expect(menuItem.status).toBe('DISPONIBLE');
    expect(menuItem.state).toBe('DISPONIBLE');
    expect(menuItem.manuallySoldOut).toBe(false);
    expect(menuItem.remainingRations).toBe(20);
    expect(menuItem.variations.length).toBe(2);
    const menuItemId = menuItem.id;

    // 7. Mozo realiza un pedido con éxito mientras el plato está disponible
    const table = await Table.findOne({ code: 'M01' });
    expect(table).toBeDefined();
    const tableId = table!._id.toString();

    const orderOkRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozoToken}`)
      .send({
        tableId,
        items: [
          {
            dishId: createdDishId,
            quantity: 2,
            variationIds: ['v_picante']
          }
        ],
        notes: 'Mesa 1 pedido regular'
      });
    expect(orderOkRes.status).toBe(201);
    expect(orderOkRes.body.status).toBe('ENVIADO');

    // Las raciones disponibles deben haber bajado a 18
    const checkStockRes = await request(app)
      .get('/api/menu/today')
      .set('Authorization', `Bearer ${mozoToken}`);
    const itemStock = checkStockRes.body.sections
      .flatMap((s: any) => s.items)
      .find((i: any) => i.dishId === createdDishId);
    expect(itemStock.remainingRations).toBe(18);
    expect(itemStock.status).toBe('DISPONIBLE');

    // 8. Encargado marca el ítem como agotado por falta de insumo (sold-out)
    const soldOutRes = await request(app)
      .post(`/api/menu-items/${menuItemId}/sold-out`)
      .set('Authorization', `Bearer ${encargadoToken}`)
      .send({ reason: 'Agotado cangrejo fresco para la parihuela' });
    expect(soldOutRes.status).toBe(200);
    expect(soldOutRes.body.manuallySoldOut).toBe(true);
    expect(soldOutRes.body.status).toBe('AGOTADO');

    // 9. GET /api/menu/today ahora reporta estado AGOTADO y manuallySoldOut: true
    const todaySoldOutRes = await request(app)
      .get('/api/menu/today')
      .set('Authorization', `Bearer ${mozoToken}`);
    const itemSoldOut = todaySoldOutRes.body.sections
      .flatMap((s: any) => s.items)
      .find((i: any) => i.dishId === createdDishId);
    expect(itemSoldOut.manuallySoldOut).toBe(true);
    expect(itemSoldOut.status).toBe('AGOTADO');

    // 10. Mozo intenta pedir el plato agotado y el API devuelve 409 con código DISH_UNAVAILABLE
    const failedOrderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozoToken}`)
      .send({
        tableId,
        items: [
          {
            dishId: createdDishId,
            quantity: 1
          }
        ]
      });
    expect(failedOrderRes.status).toBe(409);
    expect(failedOrderRes.body.error.code).toBe('DISH_UNAVAILABLE');

    // 11. Encargado reactiva el plato tras recibir nuevo insumo
    const reactivateRes = await request(app)
      .post(`/api/menu-items/${menuItemId}/reactivate`)
      .set('Authorization', `Bearer ${encargadoToken}`);
    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.manuallySoldOut).toBe(false);

    // 12. GET /api/menu/today muestra nuevamente el plato como DISPONIBLE
    const todayReactivatedRes = await request(app)
      .get('/api/menu/today')
      .set('Authorization', `Bearer ${mozoToken}`);
    const itemReactivated = todayReactivatedRes.body.sections
      .flatMap((s: any) => s.items)
      .find((i: any) => i.dishId === createdDishId);
    expect(itemReactivated.manuallySoldOut).toBe(false);
    expect(itemReactivated.status).toBe('DISPONIBLE');
    expect(itemReactivated.remainingRations).toBe(18);

    // 13. Mozo puede realizar un pedido nuevamente tras la reactivación
    const secondOrderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozoToken}`)
      .send({
        tableId,
        items: [
          {
            dishId: createdDishId,
            quantity: 1
          }
        ]
      });
    expect(secondOrderRes.status).toBe(201);
    expect(secondOrderRes.body.status).toBe('ENVIADO');

    // Raciones restantes ahora son 17
    const finalMenuRes = await request(app)
      .get('/api/menu/today')
      .set('Authorization', `Bearer ${mozoToken}`);
    const finalItem = finalMenuRes.body.sections
      .flatMap((s: any) => s.items)
      .find((i: any) => i.dishId === createdDishId);
    expect(finalItem.remainingRations).toBe(17);
  });

  it('control de acceso y validaciones: mozo no puede marcar sold-out ni reactivar', async () => {
    const today = getTodayLimaDate();

    // Crear plato y menú con encargado
    const sectionsRes = await request(app)
      .get('/api/menu-sections')
      .set('Authorization', `Bearer ${encargadoToken}`);
    const sectionId = sectionsRes.body[0].id;

    const dishRes = await request(app)
      .post('/api/dishes')
      .set('Authorization', `Bearer ${encargadoToken}`)
      .send({
        sectionId,
        name: 'Plato Control Acceso',
        priceCents: 2500,
        course: 'FONDO'
      });
    const dishId = dishRes.body.id;

    const menuRes = await request(app)
      .post('/api/menu/days')
      .set('Authorization', `Bearer ${encargadoToken}`)
      .send({ date: today });
    const menuId = menuRes.body.id;

    await request(app)
      .put(`/api/menu/days/${menuId}`)
      .set('Authorization', `Bearer ${encargadoToken}`)
      .send({
        items: [{ dishId, active: true, priceCents: 2500 }]
      });

    await request(app)
      .post(`/api/menu/days/${menuId}/publish`)
      .set('Authorization', `Bearer ${encargadoToken}`);

    const todayRes = await request(app)
      .get('/api/menu/today')
      .set('Authorization', `Bearer ${mozoToken}`);
    const menuItemId = todayRes.body.sections[0].items[0].id;

    // Mozo intenta marcar sold-out -> 403 Forbidden
    const mozoSoldOut = await request(app)
      .post(`/api/menu-items/${menuItemId}/sold-out`)
      .set('Authorization', `Bearer ${mozoToken}`)
      .send({ reason: 'Intento no autorizado' });
    expect(mozoSoldOut.status).toBe(403);

    // Mozo intenta reactivar -> 403 Forbidden
    const mozoReactivate = await request(app)
      .post(`/api/menu-items/${menuItemId}/reactivate`)
      .set('Authorization', `Bearer ${mozoToken}`);
    expect(mozoReactivate.status).toBe(403);
  });
});
