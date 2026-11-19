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
    expect(firstRun.tablesCount).toBe(8);
    expect(firstRun.sectionsCount).toBe(4);
    expect(firstRun.dishesCount).toBeGreaterThanOrEqual(10);
    expect(firstRun.menuItemsCount).toBeGreaterThanOrEqual(8);

    const usersCount1 = await User.countDocuments();
    const tablesCount1 = await Table.countDocuments();
    const sectionsCount1 = await MenuSection.countDocuments();
    const dishesCount1 = await Dish.countDocuments();
    const menuDaysCount1 = await MenuDay.countDocuments();
    const menuItemsCount1 = await MenuItem.countDocuments();
    const shiftsCount1 = await Shift.countDocuments();
    const settingsCount1 = await Settings.countDocuments();

    expect(usersCount1).toBe(4);
    expect(tablesCount1).toBe(8);
    expect(sectionsCount1).toBe(4);
    expect(dishesCount1).toBeGreaterThanOrEqual(10);
    expect(menuDaysCount1).toBe(1);
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
    const cevicheMixtoItem = await MenuItem.findOne({ dishName: 'Ceviche mixto' });
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

    const settings = await Settings.findById('global');
    expect(settings?.restaurantName).toBe('Cevichería Lucy');
    expect(settings?.currency).toBe('PEN');
    expect(settings?.lowStockThreshold).toBe(5);
  });
});
