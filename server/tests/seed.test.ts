import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDB, teardownTestDB } from './setup';
import { seedData } from '../src/seed/data';
import { User } from '../src/models/user.model';
import { Table } from '../src/models/table.model';
import { MenuSection } from '../src/models/menu-section.model';
import { Dish } from '../src/models/dish.model';
import { MenuDay } from '../src/models/menu-day.model';
import { MenuItem } from '../src/models/menu-item.model';
import { Shift } from '../src/models/shift.model';
import { Settings } from '../src/models/settings.model';

describe('Prueba de Seed Idempotente (T066–T070)', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('debe sembrar los datos y mantener conteos idénticos tras ejecutarse dos veces consecutivas', async () => {
    // Primera ejecución
    const firstRun = await seedData();
    expect(firstRun.usersCount).toBe(4);
    expect(firstRun.tablesCount).toBe(12);
    expect(firstRun.sectionsCount).toBe(5);
    expect(firstRun.dishesCount).toBe(26);
    expect(firstRun.menuItemsCount).toBe(26);

    const usersCount1 = await User.countDocuments();
    const tablesCount1 = await Table.countDocuments();
    const sectionsCount1 = await MenuSection.countDocuments();
    const dishesCount1 = await Dish.countDocuments();
    const activeDishesCount1 = await Dish.countDocuments({ active: true });
    const menuDaysCount1 = await MenuDay.countDocuments();
    const menuItemsCount1 = await MenuItem.countDocuments();
    const shiftsCount1 = await Shift.countDocuments();
    const settingsCount1 = await Settings.countDocuments();

    expect(usersCount1).toBe(4);
    expect(tablesCount1).toBe(12);
    expect(sectionsCount1).toBe(5);
    expect(dishesCount1).toBe(26);
    expect(activeDishesCount1).toBe(26);
    expect(menuDaysCount1).toBe(1);
    expect(menuItemsCount1).toBe(26);
    expect(shiftsCount1).toBe(1);
    expect(settingsCount1).toBe(1);

    // Segunda ejecución (prueba de idempotencia)
    const secondRun = await seedData();
    expect(secondRun.usersCount).toBe(firstRun.usersCount);

    const usersCount2 = await User.countDocuments();
    const tablesCount2 = await Table.countDocuments();
    const sectionsCount2 = await MenuSection.countDocuments();
    const dishesCount2 = await Dish.countDocuments();
    const menuDaysCount2 = await MenuDay.countDocuments();
    const menuItemsCount2 = await MenuItem.countDocuments();
    const shiftsCount2 = await Shift.countDocuments();
    const settingsCount2 = await Settings.countDocuments();

    // Comprobación exacta de conteos
    expect(usersCount2).toBe(usersCount1);
    expect(tablesCount2).toBe(tablesCount1);
    expect(sectionsCount2).toBe(sectionsCount1);
    expect(dishesCount2).toBe(dishesCount1);
    expect(menuDaysCount2).toBe(menuDaysCount1);
    expect(menuItemsCount2).toBe(menuItemsCount1);
    expect(shiftsCount2).toBe(shiftsCount1);
    expect(settingsCount2).toBe(settingsCount1);

    // Verificar datos clave sembrados
    const cevicheMixtoItem = await MenuItem.findOne({ dishName: 'Chaufa de marisco' });
    expect(cevicheMixtoItem).toBeDefined();
    expect(cevicheMixtoItem?.hasRationsLimit).toBe(true);
    expect(cevicheMixtoItem?.totalRations).toBe(30);
    expect(cevicheMixtoItem?.remainingRations).toBe(30);

    const arrozMariscosItem = await MenuItem.findOne({ dishName: 'Arroz con mariscos' });
    expect(arrozMariscosItem).toBeDefined();
    expect(arrozMariscosItem?.manuallySoldOut).toBe(true);
    expect(arrozMariscosItem?.soldOutReason).toBe('Agotado por falta de insumos frescos');

    const openShift = await Shift.findOne({ status: 'ABIERTO', label: 'Almuerzo' });
    expect(openShift).toBeDefined();

    // Catálogo real: secciones activas y A_LA_CARTA inactiva sin ítems.
    const activeSections = await MenuSection.find({ active: true }).sort({ sortOrder: 1 });
    expect(activeSections.map((s) => s.key)).toEqual([
      'CRIOLLO',
      'ENTRADA',
      'MARINO',
      'BEBIDAS'
    ]);
    const aLaCarta = await MenuSection.findOne({ key: 'A_LA_CARTA' });
    expect(aLaCarta?.active).toBe(false);
    const aLaCartaItems = await MenuItem.countDocuments({ sectionKey: 'A_LA_CARTA' });
    expect(aLaCartaItems).toBe(0);

    // Si la base ya tenía los platos del seed anterior, quedan desactivados
    // (no se eliminan) para conservar pedidos e historial.
    const legacyActive = await Dish.countDocuments({
      name: {
        $in: [
          'Ceviche clásico',
          'Ceviche mixto',
          'Jalea mixta',
          'Chicharrón de calamar',
          'Lomo saltado',
          'Parihuela especial'
        ]
      },
      active: true
    });
    expect(legacyActive).toBe(0);

    const criollos = await MenuItem.countDocuments({ sectionKey: 'CRIOLLO' });
    const entradas = await MenuItem.countDocuments({ sectionKey: 'ENTRADA' });
    const marinos = await MenuItem.countDocuments({ sectionKey: 'MARINO' });
    const bebidas = await MenuItem.countDocuments({ sectionKey: 'BEBIDAS' });
    expect(criollos).toBe(11);
    expect(entradas).toBe(9);
    expect(marinos).toBe(4);
    expect(bebidas).toBe(2);

    const settings = await Settings.findById('global');
    expect(settings?.restaurantName).toBe('Cevichería Lucy');
    expect(settings?.currency).toBe('PEN');
    expect(settings?.lowStockThreshold).toBe(5);
  });
});
