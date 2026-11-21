import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup';
import { seedData } from '../src/seed/data';
import { MenuItem } from '../src/models/menu-item.model';
import { RationAdjustment } from '../src/models/ration-adjustment.model';

describe('Módulo de Menú y Raciones (T042–T052)', () => {
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

    // Iniciar sesión como encargado
    const loginEncargado = await request(app)
      .post('/api/auth/login')
      .send({ username: 'encargado1', password: 'encargado123' });
    encargadoToken = loginEncargado.body.token;

    // Iniciar sesión como mozo
    const loginMozo = await request(app)
      .post('/api/auth/login')
      .send({ username: 'mozo1', password: 'mozo123' });
    mozoToken = loginMozo.body.token;
  });

  describe('CRUD de Platos Maestros', () => {
    it('debe listar las secciones del menú', async () => {
      const res = await request(app)
        .get('/api/menu-sections')
        .set('Authorization', `Bearer ${mozoToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(4);
    });

    it('debe permitir a un ENCARGADO crear un plato nuevo con variaciones sin costo', async () => {
      const sectionsRes = await request(app)
        .get('/api/menu-sections')
        .set('Authorization', `Bearer ${encargadoToken}`);
      const sectionId = sectionsRes.body[0].id;

      const res = await request(app)
        .post('/api/dishes')
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({
          sectionId,
          name: 'Tiradito al ají amarillo',
          description: 'Láminas finas de pescado en crema de ají',
          priceCents: 3400,
          course: 'FONDO',
          isFixed: true,
          variations: [
            { id: 'sin_picante', name: 'Sin picante' },
            { id: 'picante', name: 'Picante' }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Tiradito al ají amarillo');
      expect(res.body.priceCents).toBe(3400);
      expect(res.body.variations.length).toBe(2);
    });

    it('debe rechazar la creación de platos por parte de un MOZO con 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/api/dishes')
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({
          sectionId: '66f0c0000000000000000001',
          name: 'Plato Mozo',
          priceCents: 2000,
          course: 'FONDO'
        });

      expect(res.status).toBe(403);
    });

    it('debe permitir actualizar un plato existente y realizar baja lógica (soft delete)', async () => {
      const listRes = await request(app)
        .get('/api/dishes')
        .set('Authorization', `Bearer ${encargadoToken}`);
      const dish = listRes.body[0];

      // Actualizar
      const patchRes = await request(app)
        .patch(`/api/dishes/${dish.id}`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ priceCents: 2950 });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.priceCents).toBe(2950);

      // Baja lógica
      const deleteRes = await request(app)
        .delete(`/api/dishes/${dish.id}`)
        .set('Authorization', `Bearer ${encargadoToken}`);

      expect(deleteRes.status).toBe(204);

      // Verificar que el plato quedó desactivado
      const verifyRes = await request(app)
        .get('/api/dishes')
        .set('Authorization', `Bearer ${encargadoToken}`);
      const deactivatedDish = verifyRes.body.find((d: any) => d.id === dish.id);
      expect(deactivatedDish.active).toBe(false);
    });
  });

  describe('Menú del Día y Derivación de Estado', () => {
    it('debe retornar el menú de hoy publicado con secciones y platos derivados', async () => {
      const res = await request(app)
        .get('/api/menu/today')
        .set('Authorization', `Bearer ${mozoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PUBLICADO');
      expect(Array.isArray(res.body.sections)).toBe(true);

      // Buscar ítem limitado (Chaufa de marisco)
      let cevicheMixto: any = null;
      for (const section of res.body.sections) {
        const found = section.items.find((i: any) => i.dishName === 'Chaufa de marisco');
        if (found) cevicheMixto = found;
      }
      expect(cevicheMixto).toBeDefined();
      expect(cevicheMixto.remainingRations).toBe(30);
      expect(cevicheMixto.status).toBe('DISPONIBLE');
      // El menú del mozo necesita sectionKey para filtrar por categoría y
      // mostrar el badge de sección en la tarjeta.
      expect(cevicheMixto.sectionKey).toBe('MARINO');

      // Buscar ítem agotado por insumo (Arroz con mariscos)
      let arrozMariscos: any = null;
      for (const section of res.body.sections) {
        const found = section.items.find((i: any) => i.dishName === 'Arroz con mariscos');
        if (found) arrozMariscos = found;
      }
      expect(arrozMariscos).toBeDefined();
      expect(arrozMariscos.manuallySoldOut).toBe(true);
      expect(arrozMariscos.status).toBe('AGOTADO');
      expect(arrozMariscos.sectionKey).toBe('MARINO');
    });

    it('debe rechazar la publicación de un menú sin ítems activos con 422', async () => {
      // Crear un menú en borrador para fecha futura
      const createRes = await request(app)
        .post('/api/menu/days')
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ date: '2026-12-31', notes: 'Menú fin de año' });

      expect(createRes.status).toBe(201);
      const menuId = createRes.body.id;

      // Intentar publicar sin items
      const pubRes = await request(app)
        .post(`/api/menu/days/${menuId}/publish`)
        .set('Authorization', `Bearer ${encargadoToken}`);

      expect(pubRes.status).toBe(422);
      expect(pubRes.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('debe permitir quitar un ítem de un borrador de menú y persistir la eliminación al guardar (F5)', async () => {
      const dishesRes = await request(app)
        .get('/api/dishes')
        .set('Authorization', `Bearer ${encargadoToken}`);
      const dish1 = dishesRes.body[0];
      const dish2 = dishesRes.body[1];

      // 1. Crear menú en borrador
      const createRes = await request(app)
        .post('/api/menu/days')
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ date: '2026-12-20', notes: 'Menú de prueba para quitar ítem' });
      expect(createRes.status).toBe(201);
      const menuId = createRes.body.id;

      // 2. Guardar con 2 ítems
      const saveRes1 = await request(app)
        .put(`/api/menu/days/${menuId}`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({
          items: [
            { dishId: dish1.id, active: true, priceCents: dish1.priceCents },
            { dishId: dish2.id, active: true, priceCents: dish2.priceCents }
          ]
        });
      expect(saveRes1.status).toBe(200);
      expect(saveRes1.body.items.length).toBe(2);

      const itemsInDbBefore = await MenuItem.find({ menuDayId: menuId });
      expect(itemsInDbBefore.length).toBe(2);

      // 3. Quitar el segundo ítem (enviar solo dish1) y guardar
      const saveRes2 = await request(app)
        .put(`/api/menu/days/${menuId}`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({
          items: [
            { dishId: dish1.id, active: true, priceCents: dish1.priceCents }
          ]
        });
      expect(saveRes2.status).toBe(200);
      expect(saveRes2.body.items.length).toBe(1);
      expect(saveRes2.body.items[0].dishId.toString()).toBe(dish1.id);

      // Verificar en BD que se eliminó el ítem excluido
      const itemsInDbAfter = await MenuItem.find({ menuDayId: menuId });
      expect(itemsInDbAfter.length).toBe(1);
      expect(itemsInDbAfter[0].dishId.toString()).toBe(dish1.id);

      // 4. Si items es undefined, no se altera la lista de platos
      const saveRes3 = await request(app)
        .put(`/api/menu/days/${menuId}`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ notes: 'Notas actualizadas sin tocar items' });
      expect(saveRes3.status).toBe(200);
      expect(saveRes3.body.items.length).toBe(1);
      expect(saveRes3.body.notes).toBe('Notas actualizadas sin tocar items');
    });

    it('debe permitir quitar todos los ítems de un borrador y que la publicación devuelva 422 (F5)', async () => {
      const dishesRes = await request(app)
        .get('/api/dishes')
        .set('Authorization', `Bearer ${encargadoToken}`);
      const dish = dishesRes.body[0];

      // 1. Crear menú en borrador
      const createRes = await request(app)
        .post('/api/menu/days')
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ date: '2026-12-21', notes: 'Menú borrador que quedará vacío' });
      expect(createRes.status).toBe(201);
      const menuId = createRes.body.id;

      // 2. Guardar con 1 ítem
      const saveRes1 = await request(app)
        .put(`/api/menu/days/${menuId}`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({
          items: [
            { dishId: dish.id, active: true, priceCents: dish.priceCents }
          ]
        });
      expect(saveRes1.status).toBe(200);
      expect(saveRes1.body.items.length).toBe(1);

      // 3. Quitar todos los ítems enviando items: []
      const saveRes2 = await request(app)
        .put(`/api/menu/days/${menuId}`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ items: [] });
      expect(saveRes2.status).toBe(200);
      expect(saveRes2.body.items.length).toBe(0);

      // Verificar en BD que no quedan ítems
      const itemsInDb = await MenuItem.find({ menuDayId: menuId });
      expect(itemsInDb.length).toBe(0);

      // 4. Intentar publicar el menú vacío debe responder 422 VALIDATION_ERROR
      const pubRes = await request(app)
        .post(`/api/menu/days/${menuId}/publish`)
        .set('Authorization', `Bearer ${encargadoToken}`);

      expect(pubRes.status).toBe(422);
      expect(pubRes.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Gestión y Auditoría de Raciones', () => {
    it('debe permitir reponer raciones (MOZO o ENCARGADO) y registrar la auditoría', async () => {
      const item = await MenuItem.findOne({ dishName: 'Chaufa de marisco' });
      expect(item).toBeDefined();

      const res = await request(app)
        .post(`/api/menu-items/${item!._id}/rations/replenish`)
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({ quantity: 10, reason: 'Llegaron 10 porciones más de cocina' });

      expect(res.status).toBe(200);
      expect(res.body.remainingRations).toBe(40);

      // Verificar registro en RationAdjustment
      const audit = await RationAdjustment.findOne({ menuItemId: item!._id, type: 'REPLENISH' });
      expect(audit).toBeDefined();
      expect(audit?.previousRemaining).toBe(30);
      expect(audit?.newRemaining).toBe(40);
      expect(audit?.actorRole).toBe('MOZO');
      expect(audit?.reason).toBe('Llegaron 10 porciones más de cocina');
    });

    it('debe permitir ajustar el conteo a un ENCARGADO y rechazar al MOZO', async () => {
      const item = await MenuItem.findOne({ dishName: 'Chaufa de marisco' });

      // Mozo intenta ajustar -> 403
      const mozoRes = await request(app)
        .post(`/api/menu-items/${item!._id}/rations/adjust`)
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({ remainingRations: 15, reason: 'Ajuste inventario' });
      expect(mozoRes.status).toBe(403);

      // Encargado ajusta -> 200
      const encRes = await request(app)
        .post(`/api/menu-items/${item!._id}/rations/adjust`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ remainingRations: 4, reason: 'Recuento físico real en cocina' });

      expect(encRes.status).toBe(200);
      expect(encRes.body.remainingRations).toBe(4);
      // Con 4 raciones y umbral de 5, el estado derivado debe ser ULTIMAS_RACIONES
      expect(encRes.body.status).toBe('ULTIMAS_RACIONES');

      const audit = await RationAdjustment.findOne({ menuItemId: item!._id, type: 'ADJUSTMENT' });
      expect(audit).toBeDefined();
      expect(audit?.newRemaining).toBe(4);
      expect(audit?.actorRole).toBe('ENCARGADO');
    });

    it('la reposición de raciones NO debe limpiar manuallySoldOut (requiere reactivación explícita)', async () => {
      const item = await MenuItem.findOne({ dishName: 'Chaufa de marisco' });

      // 1. Marcar agotado manualmente por ENCARGADO
      const soldRes = await request(app)
        .post(`/api/menu-items/${item!._id}/sold-out`)
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ reason: 'Falta mariscos en plaza' });

      expect(soldRes.status).toBe(200);
      expect(soldRes.body.manuallySoldOut).toBe(true);
      expect(soldRes.body.status).toBe('AGOTADO');

      // 2. Mozo repone 5 raciones
      const repRes = await request(app)
        .post(`/api/menu-items/${item!._id}/rations/replenish`)
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({ quantity: 5, reason: 'Llegó pedido proveedor' });

      expect(repRes.status).toBe(200);
      expect(repRes.body.manuallySoldOut).toBe(true);
      // Sigue AGOTADO porque manuallySoldOut tiene precedencia
      expect(repRes.body.status).toBe('AGOTADO');

      // 3. Reactivar manualmente
      const reactivateRes = await request(app)
        .post(`/api/menu-items/${item!._id}/reactivate`)
        .set('Authorization', `Bearer ${encargadoToken}`);

      expect(reactivateRes.status).toBe(200);
      expect(reactivateRes.body.manuallySoldOut).toBe(false);
      expect(reactivateRes.body.status).not.toBe('AGOTADO');
    });
  });

  describe('Settings / Configuración (rest-api.md §10)', () => {
    it('debe retornar settings a cualquier rol autenticado', async () => {
      const res = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${mozoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.restaurantName).toBe('Cevichería Lucy');
      expect(res.body.currency).toBe('PEN');
      expect(res.body.lowStockThreshold).toBe(5);
    });

    it('debe permitir a ENCARGADO actualizar settings y rechazar a MOZO', async () => {
      // Mozo intenta actualizar -> 403
      const mozoRes = await request(app)
        .patch('/api/settings')
        .set('Authorization', `Bearer ${mozoToken}`)
        .send({ lowStockThreshold: 3 });
      expect(mozoRes.status).toBe(403);

      // Encargado actualiza -> 200
      const encRes = await request(app)
        .patch('/api/settings')
        .set('Authorization', `Bearer ${encargadoToken}`)
        .send({ lowStockThreshold: 3 });

      expect(encRes.status).toBe(200);
      expect(encRes.body.lowStockThreshold).toBe(3);
    });
  });

  describe('Prueba de Regresión FINDINGS-01 (H4)', () => {
    it('H4: 10 reposiciones concurrentes de +1 deben aumentar remainingRations en exactamente 10 y registrar 10 auditorías REPLENISH sin perder ninguna', async () => {
      const item = await MenuItem.findOne({ dishName: 'Chaufa de marisco' });
      expect(item).toBeDefined();

      // Configurar stock inicial exactamente en 5
      await MenuItem.findByIdAndUpdate(item!._id, {
        $set: {
          hasRationsLimit: true,
          totalRations: 20,
          remainingRations: 5,
          version: 0
        }
      });

      // 10 reposiciones concurrentes de +1
      const promises = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post(`/api/menu-items/${item!._id}/rations/replenish`)
          .set('Authorization', `Bearer ${mozoToken}`)
          .send({ quantity: 1, reason: `Reposición concurrente H4 #${i + 1}` })
      );

      const responses = await Promise.all(promises);

      // Todas deben responder 200
      for (const res of responses) {
        expect(res.status).toBe(200);
      }

      // Assert H4: remainingRations final debe ser exactamente 5 + 10 = 15
      const finalItem = await MenuItem.findById(item!._id);
      expect(finalItem?.remainingRations).toBe(15);

      // Assert H4: deben existir exactamente 10 registros de auditoría REPLENISH
      const auditRecords = await RationAdjustment.find({
        menuItemId: item!._id,
        type: 'REPLENISH',
        reason: { $regex: /Reposición concurrente H4/ }
      });
      expect(auditRecords.length).toBe(10);
    });
  });
});
