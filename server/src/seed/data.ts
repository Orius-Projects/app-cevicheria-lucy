import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db';
import { hashPassword } from '../utils/password';
import { User } from '../models/user.model';
import { Table } from '../models/table.model';
import { MenuSection } from '../models/menu-section.model';
import { Dish } from '../models/dish.model';
import { MenuDay } from '../models/menu-day.model';
import { MenuItem } from '../models/menu-item.model';
import { Shift } from '../models/shift.model';
import { Settings } from '../models/settings.model';
import { Counter } from '../models/counter.model';

export function getTodayLimaDate(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(now);
}

export async function seedData() {
  const today = getTodayLimaDate();

  // 1. Settings (global singleton)
  await Settings.findOneAndUpdate(
    { _id: 'global' },
    {
      $set: {
        restaurantName: 'Cevichería Lucy',
        currency: 'PEN',
        lowStockThreshold: 5,
        updatedAt: new Date()
      }
    },
    { upsert: true, new: true }
  );

  // 2. Counter para numeración atómica
  await Counter.findOneAndUpdate(
    { _id: 'orders' },
    { $setOnInsert: { seq: 0 } },
    { upsert: true, new: true }
  );

  // 3. Usuarios de demostración
  const defaultPasswordHash = await hashPassword('encargado123');
  const mozo1PasswordHash = await hashPassword('mozo123');
  const mozo2PasswordHash = await hashPassword('mozo223');
  const cocinaPasswordHash = await hashPassword('cocina123');

  const users = [
    {
      username: 'encargado1',
      displayName: 'Encargado Demo',
      role: 'ENCARGADO',
      passwordHash: defaultPasswordHash,
      active: true
    },
    {
      username: 'mozo1',
      displayName: 'Mozo 1',
      role: 'MOZO',
      passwordHash: mozo1PasswordHash,
      active: true
    },
    {
      username: 'mozo2',
      displayName: 'Mozo 2',
      role: 'MOZO',
      passwordHash: mozo2PasswordHash,
      active: true
    },
    {
      username: 'cocinero1',
      displayName: 'Cocinero 1',
      role: 'COCINERO',
      passwordHash: cocinaPasswordHash,
      active: true
    }
  ];

  const userMap: Record<string, any> = {};
  for (const u of users) {
    const userDoc = await User.findOneAndUpdate(
      { username: u.username },
      { $set: u },
      { upsert: true, new: true }
    );
    userMap[u.username] = userDoc;
  }

  // 4. Mesas (12 mesas: 4 en primer piso, 4 en segundo piso, 4 afuera del local)
  const tables = [
    // Primer Piso (4 mesas)
    { code: 'M01', zone: 'Primer Piso', seats: 4 },
    { code: 'M02', zone: 'Primer Piso', seats: 4 },
    { code: 'M03', zone: 'Primer Piso', seats: 4 },
    { code: 'M04', zone: 'Primer Piso', seats: 4 },
    // Segundo Piso (4 mesas)
    { code: 'M05', zone: 'Segundo Piso', seats: 4 },
    { code: 'M06', zone: 'Segundo Piso', seats: 4 },
    { code: 'M07', zone: 'Segundo Piso', seats: 4 },
    { code: 'M08', zone: 'Segundo Piso', seats: 4 },
    // Afuera del local / Terraza (4 mesas: M09 a M12)
    { code: 'M09', zone: 'Afuera (Terraza)', seats: 4 },
    { code: 'M10', zone: 'Afuera (Terraza)', seats: 4 },
    { code: 'M11', zone: 'Afuera (Terraza)', seats: 4 },
    { code: 'M12', zone: 'Afuera (Terraza)', seats: 4 }
  ];

  for (const t of tables) {
    await Table.findOneAndUpdate(
      { code: t.code },
      { $set: { zone: t.zone, seats: t.seats, active: true } },
      { upsert: true, new: true }
    );
  }

  // 5. Secciones de menú.
  // A_LA_CARTA se conserva como registro histórico, pero queda inactiva:
  // no aparece en la navegación del menú del día ni recibe nuevos ítems.
  const sections = [
    { key: 'CRIOLLO', name: 'Criollo', sortOrder: 1, active: true },
    { key: 'ENTRADA', name: 'Entrada', sortOrder: 2, active: true },
    { key: 'MARINO', name: 'Marino', sortOrder: 3, active: true },
    { key: 'BEBIDAS', name: 'Bebidas', sortOrder: 4, active: true },
    { key: 'A_LA_CARTA', name: 'A la carta', sortOrder: 9, active: false }
  ];

  const sectionMap: Record<string, any> = {};
  for (const s of sections) {
    const secDoc = await MenuSection.findOneAndUpdate(
      { key: s.key },
      { $set: s },
      { upsert: true, new: true }
    );
    sectionMap[s.key] = secDoc;
  }

  // 6. Platos maestros: catálogo real del restaurante.
  // Los precios son provisionales, editables desde la UI y están documentados
  // como supuesto en specs/008-gestion-platos-raciones/spec.md.
  const dishCatalog = [
    // ── CRIOLLO fijos (incluyen arroz + papa frita) ──
    {
      name: 'Chicharrón de pollo',
      sectionKey: 'CRIOLLO',
      description: 'Trozos de pollo crocantes acompañados de arroz y papa frita.',
      priceCents: 2200,
      course: 'FONDO',
      isFixed: true,
      isRotating: false,
      sortOrder: 1,
      variations: []
    },
    {
      name: 'Milanesa de pollo',
      sectionKey: 'CRIOLLO',
      description: 'Milanesa de pollo dorada, servida con arroz y papa frita.',
      priceCents: 2200,
      course: 'FONDO',
      isFixed: true,
      isRotating: false,
      sortOrder: 2,
      variations: []
    },
    {
      name: 'Filete de pollo',
      sectionKey: 'CRIOLLO',
      description: 'Filete de pollo a la plancha con arroz y papa frita.',
      priceCents: 2300,
      course: 'FONDO',
      isFixed: true,
      isRotating: false,
      sortOrder: 3,
      variations: []
    },
    // ── CRIOLLO fijos premium (con papa frita) ──
    {
      name: 'Bisteck con papa frita',
      sectionKey: 'CRIOLLO',
      description: 'Bisteck de res a la plancha acompañado de papa frita.',
      priceCents: 2800,
      course: 'FONDO',
      isFixed: true,
      isRotating: false,
      sortOrder: 4,
      variations: [
        { id: 'v_termino_medio', name: 'Término medio', sortOrder: 1, active: true },
        { id: 'v_bien_cocido', name: 'Bien cocido', sortOrder: 2, active: true }
      ]
    },
    {
      name: 'Chuleta de cerdo con papa frita',
      sectionKey: 'CRIOLLO',
      description: 'Chuleta de cerdo dorada acompañada de papa frita.',
      priceCents: 2800,
      course: 'FONDO',
      isFixed: true,
      isRotating: false,
      sortOrder: 5,
      variations: []
    },
    {
      name: 'Trucha frita con papa frita',
      sectionKey: 'CRIOLLO',
      description: 'Trucha fresca frita, servida con papa frita.',
      priceCents: 3000,
      course: 'FONDO',
      isFixed: true,
      isRotating: false,
      sortOrder: 6,
      variations: []
    },
    {
      name: 'Chaufa de cecina',
      sectionKey: 'CRIOLLO',
      description: 'Arroz chaufa salteado al wok con cecina de cerdo.',
      priceCents: 2600,
      course: 'FONDO',
      isFixed: true,
      isRotating: false,
      sortOrder: 7,
      variations: []
    },
    // ── CRIOLLO rotativos de ejemplo ──
    {
      name: 'Ají de gallina',
      sectionKey: 'CRIOLLO',
      description: 'Pollo deshilachado en crema de ají amarillo con arroz y papa.',
      priceCents: 2400,
      course: 'FONDO',
      isFixed: false,
      isRotating: true,
      sortOrder: 8,
      variations: []
    },
    {
      name: 'Arroz con pollo',
      sectionKey: 'CRIOLLO',
      description: 'Arroz verde con pollo guisado y papa a la huancaína.',
      priceCents: 2400,
      course: 'FONDO',
      isFixed: false,
      isRotating: true,
      sortOrder: 9,
      variations: []
    },
    {
      name: 'Seco de res',
      sectionKey: 'CRIOLLO',
      description: 'Estofado de res en salsa de culantro con arroz y frijoles.',
      priceCents: 2600,
      course: 'FONDO',
      isFixed: false,
      isRotating: true,
      sortOrder: 10,
      variations: []
    },
    {
      name: 'Tallarín saltado',
      sectionKey: 'CRIOLLO',
      description: 'Tallarines salteados al wok con verduras y carne de res.',
      priceCents: 2500,
      course: 'FONDO',
      isFixed: false,
      isRotating: true,
      sortOrder: 11,
      variations: []
    },
    // ── ENTRADAS ──
    {
      name: 'Caldo de pollo',
      sectionKey: 'ENTRADA',
      description: 'Caldo casero de pollo con verduras.',
      priceCents: 1200,
      course: 'ENTRADA',
      isFixed: true,
      isRotating: false,
      sortOrder: 12,
      variations: []
    },
    {
      name: 'Ceviche',
      sectionKey: 'ENTRADA',
      description: 'Pescado fresco del día marinado en limón con cebolla y ají limo.',
      priceCents: 2800,
      course: 'ENTRADA',
      isFixed: true,
      isRotating: false,
      sortOrder: 13,
      variations: [
        { id: 'v_pic_bajo', name: 'Poco picante', sortOrder: 1, active: true },
        { id: 'v_pic_med', name: 'Picante medio', sortOrder: 2, active: true },
        { id: 'v_pic_alto', name: 'Bien picante', sortOrder: 3, active: true }
      ]
    },
    {
      name: 'Papa rellena',
      sectionKey: 'ENTRADA',
      description: 'Papa rellena de carne, empanizada y frita.',
      priceCents: 1000,
      course: 'ENTRADA',
      isFixed: true,
      isRotating: false,
      sortOrder: 14,
      variations: []
    },
    {
      name: 'Causa de atún',
      sectionKey: 'ENTRADA',
      description: 'Papa amarilla prensada con ají amarillo y relleno de atún.',
      priceCents: 1800,
      course: 'ENTRADA',
      isFixed: true,
      isRotating: false,
      sortOrder: 15,
      variations: []
    },
    {
      name: 'Alita broster',
      sectionKey: 'ENTRADA',
      description: 'Alitas de pollo broster crocantes con salsa de la casa.',
      priceCents: 1500,
      course: 'ENTRADA',
      isFixed: true,
      isRotating: false,
      sortOrder: 16,
      variations: []
    },
    {
      name: 'Chilcano',
      sectionKey: 'ENTRADA',
      description: 'Sopa de pescado con ají, limón y culantro.',
      priceCents: 1500,
      course: 'ENTRADA',
      isFixed: true,
      isRotating: false,
      sortOrder: 17,
      variations: []
    },
    {
      name: 'Combinado',
      sectionKey: 'ENTRADA',
      description: 'Combinado criollo con arroz, papa, carne y ensalada.',
      priceCents: 2000,
      course: 'ENTRADA',
      isFixed: true,
      isRotating: false,
      sortOrder: 18,
      variations: []
    },
    {
      name: 'Ensalada con palta',
      sectionKey: 'ENTRADA',
      description: 'Ensalada fresca de verduras con palta.',
      priceCents: 1400,
      course: 'ENTRADA',
      isFixed: true,
      isRotating: false,
      sortOrder: 19,
      variations: []
    },
    {
      name: 'Tequeños',
      sectionKey: 'ENTRADA',
      description: 'Tequeños de queso fritos con salsa de la casa.',
      priceCents: 1200,
      course: 'ENTRADA',
      isFixed: true,
      isRotating: false,
      sortOrder: 20,
      variations: []
    },
    // ── MARINO ──
    {
      name: 'Arroz con mariscos',
      sectionKey: 'MARINO',
      description: 'Arroz criollo con mixtura de mariscos y aroma de culantro.',
      priceCents: 3000,
      course: 'FONDO',
      isFixed: true,
      isRotating: false,
      sortOrder: 21,
      variations: [
        { id: 'v_sin_culantro', name: 'Sin culantro', sortOrder: 1, active: true }
      ]
    },
    {
      name: 'Sudado de pescado',
      sectionKey: 'MARINO',
      description: 'Pescado sudado en salsa de tomate y ají.',
      priceCents: 2800,
      course: 'FONDO',
      isFixed: true,
      isRotating: false,
      sortOrder: 22,
      variations: []
    },
    {
      name: 'Chicharrón de pescado',
      sectionKey: 'MARINO',
      description: 'Trozos de pescado crocantes con yuca y sarza criolla.',
      priceCents: 2600,
      course: 'FONDO',
      isFixed: true,
      isRotating: false,
      sortOrder: 23,
      variations: []
    },
    {
      name: 'Chaufa de marisco',
      sectionKey: 'MARINO',
      description: 'Arroz chaufa salteado al wok con pescado y mariscos.',
      priceCents: 3200,
      course: 'FONDO',
      isFixed: true,
      isRotating: false,
      sortOrder: 24,
      variations: [
        { id: 'v_sin_aji', name: 'Sin ají', sortOrder: 1, active: true },
        { id: 'v_con_aji', name: 'Con ají', sortOrder: 2, active: true }
      ]
    },
    // ── BEBIDAS ──
    {
      name: 'Chicha morada 1L',
      sectionKey: 'BEBIDAS',
      description: 'Elaborada artesanalmente con maíz morado, piña y canela.',
      priceCents: 1200,
      course: 'BEBIDA',
      isFixed: true,
      isRotating: false,
      sortOrder: 25,
      variations: []
    },
    {
      name: 'Limonada frozen 1L',
      sectionKey: 'BEBIDAS',
      description: 'Refrescante limonada batida con hielo frappé.',
      priceCents: 1400,
      course: 'BEBIDA',
      isFixed: true,
      isRotating: false,
      sortOrder: 26,
      variations: []
    }
  ];

  const dishMap: Record<string, any> = {};
  for (const dish of dishCatalog) {
    const { sectionKey, ...fields } = dish;
    const dishDoc = await Dish.findOneAndUpdate(
      { name: dish.name },
      {
        $set: {
          ...fields,
          sectionId: sectionMap[sectionKey]._id,
          active: true
        }
      },
      { upsert: true, new: true }
    );
    dishMap[dish.name] = dishDoc;
  }

  // Platos del seed anterior que ya no forman parte del menú real.
  // No se eliminan: se desactivan para conservar pedidos e historial.
  const legacyDishNames = [
    'Ceviche clásico',
    'Ceviche mixto',
    'Jalea mixta',
    'Chicharrón de calamar',
    'Lomo saltado',
    'Parihuela especial'
  ];
  const legacyDishes = await Dish.find({ name: { $in: legacyDishNames } });

  await Dish.updateMany(
    {
      $or: [
        { name: { $in: legacyDishNames } },
        { sectionId: sectionMap['A_LA_CARTA']._id }
      ]
    },
    { $set: { active: false } }
  );

  // 7. Menú del día publicado (idempotente)
  const menuDay = await MenuDay.findOneAndUpdate(
    { date: today },
    {
      $set: {
        date: today,
        status: 'PUBLICADO',
        publishedBy: userMap['encargado1']._id,
        publishedAt: new Date(),
        notes: 'Menú real de temporada: criollo, entradas, marino y bebidas.'
      }
    },
    { upsert: true, new: true }
  );

  // Limpia únicamente los ítems de hoy que pertenecen al catálogo anterior o
  // a la sección inactiva A_LA_CARTA. No toca pedidos ni menús históricos.
  const legacyDishIds = legacyDishes.map((dish) => dish._id);
  await MenuItem.deleteMany({
    menuDayId: menuDay._id,
    $or: [{ dishId: { $in: legacyDishIds } }, { sectionKey: 'A_LA_CARTA' }]
  });

  // Ítems del menú de hoy con estados variados para la demo:
  // - varios platos con límite de raciones
  // - uno en últimas raciones (Ají de gallina: 4/15)
  // - uno agotado por insumo (Arroz con mariscos)
  interface MenuItemSeed {
    name: string;
    hasRationsLimit: boolean;
    totalRations?: number;
    remainingRations?: number;
    manuallySoldOut?: boolean;
    soldOutReason?: string;
  }

  const menuItems: MenuItemSeed[] = [
    // CRIOLLO fijos (7)
    { name: 'Chicharrón de pollo', hasRationsLimit: true, totalRations: 25, remainingRations: 25 },
    { name: 'Milanesa de pollo', hasRationsLimit: true, totalRations: 20, remainingRations: 20 },
    { name: 'Filete de pollo', hasRationsLimit: true, totalRations: 15, remainingRations: 15 },
    { name: 'Bisteck con papa frita', hasRationsLimit: true, totalRations: 15, remainingRations: 15 },
    {
      name: 'Chuleta de cerdo con papa frita',
      hasRationsLimit: true,
      totalRations: 12,
      remainingRations: 12
    },
    {
      name: 'Trucha frita con papa frita',
      hasRationsLimit: true,
      totalRations: 10,
      remainingRations: 10
    },
    { name: 'Chaufa de cecina', hasRationsLimit: true, totalRations: 12, remainingRations: 12 },
    // CRIOLLO rotativos de ejemplo (4)
    { name: 'Ají de gallina', hasRationsLimit: true, totalRations: 15, remainingRations: 4 },
    { name: 'Arroz con pollo', hasRationsLimit: true, totalRations: 20, remainingRations: 20 },
    { name: 'Seco de res', hasRationsLimit: false },
    { name: 'Tallarín saltado', hasRationsLimit: false },
    // ENTRADAS (9)
    { name: 'Caldo de pollo', hasRationsLimit: false },
    { name: 'Ceviche', hasRationsLimit: true, totalRations: 30, remainingRations: 30 },
    { name: 'Papa rellena', hasRationsLimit: true, totalRations: 12, remainingRations: 12 },
    { name: 'Causa de atún', hasRationsLimit: false },
    { name: 'Alita broster', hasRationsLimit: false },
    { name: 'Chilcano', hasRationsLimit: false },
    { name: 'Combinado', hasRationsLimit: false },
    { name: 'Ensalada con palta', hasRationsLimit: false },
    { name: 'Tequeños', hasRationsLimit: false },
    // MARINO (4)
    {
      name: 'Arroz con mariscos',
      hasRationsLimit: false,
      manuallySoldOut: true,
      soldOutReason: 'Agotado por falta de insumos frescos'
    },
    { name: 'Sudado de pescado', hasRationsLimit: false },
    { name: 'Chicharrón de pescado', hasRationsLimit: false },
    { name: 'Chaufa de marisco', hasRationsLimit: true, totalRations: 30, remainingRations: 30 },
    // BEBIDAS (2)
    { name: 'Chicha morada 1L', hasRationsLimit: false },
    { name: 'Limonada frozen 1L', hasRationsLimit: false }
  ];

  for (const item of menuItems) {
    const dish = dishMap[item.name];
    const sectionKey = dishCatalog.find((d) => d.name === item.name)!.sectionKey;
    await MenuItem.findOneAndUpdate(
      { menuDayId: menuDay._id, dishId: dish._id },
      {
        $set: {
          dishName: dish.name,
          sectionKey,
          priceCents: dish.priceCents,
          active: true,
          hasRationsLimit: item.hasRationsLimit,
          totalRations: item.hasRationsLimit ? item.totalRations ?? 30 : null,
          remainingRations: item.hasRationsLimit
            ? item.remainingRations ?? item.totalRations ?? 30
            : null,
          lowStockThreshold: 5,
          manuallySoldOut: item.manuallySoldOut ?? false,
          soldOutReason: item.soldOutReason ?? null,
          soldOutBy: null,
          soldOutAt: null,
          version: 0
        }
      },
      { upsert: true, new: true }
    );
  }

  // 8. Turno abierto 'Almuerzo' para la fecha actual.
  // Se crea solo si no existe: si el encargado ya lo abrió o cerró, se respeta.
  await Shift.findOneAndUpdate(
    { date: today, label: 'Almuerzo' },
    {
      $setOnInsert: {
        date: today,
        label: 'Almuerzo',
        status: 'ABIERTO',
        openedBy: userMap['encargado1']._id,
        openedAt: new Date()
      }
    },
    { upsert: true, new: true }
  );

  return {
    today,
    usersCount: Object.keys(userMap).length,
    tablesCount: tables.length,
    sectionsCount: sections.length,
    dishesCount: dishCatalog.length,
    menuItemsCount: menuItems.length
  };
}

// Ejecución directa por CLI
if (
  process.argv[1]?.replace(/\\/g, '/').endsWith('seed/data.ts') ||
  process.argv[1]?.replace(/\\/g, '/').endsWith('seed/data.js')
) {
  (async () => {
    let mongoServer: any = null;
    try {
      try {
        await connectDB();
      } catch (_err) {
        console.log('MongoDB en MONGODB_URI no alcanzable. Usando instancia de datos local...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const fs = await import('fs');
        const path = await import('path');
        const dbPath = path.resolve(__dirname, '../../.mongo-seed-data');
        if (!fs.existsSync(dbPath)) {
          fs.mkdirSync(dbPath, { recursive: true });
        }
        mongoServer = await MongoMemoryServer.create({
          instance: {
            dbPath,
            launchTimeout: 30000
          }
        });
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);
      }

      console.log('Sembrando datos iniciales en la base de datos...');
      const summary = await seedData();
      console.log('Seed completado con éxito:', summary);

      // Reporte de conteos en base de datos para verificación de idempotencia
      const counts = {
        users: await User.countDocuments(),
        tables: await Table.countDocuments(),
        sections: await MenuSection.countDocuments(),
        dishes: await Dish.countDocuments(),
        menuDays: await MenuDay.countDocuments(),
        menuItems: await MenuItem.countDocuments(),
        shifts: await Shift.countDocuments(),
        settings: await Settings.countDocuments()
      };
      console.log('Conteos verificados en la base de datos:', counts);

      if (mongoServer) {
        await mongoose.disconnect();
        await mongoServer.stop();
      } else {
        await disconnectDB();
      }
      process.exit(0);
    } catch (err) {
      console.error('Error durante la ejecución del seed:', err);
      if (mongoServer) await mongoServer.stop();
      await disconnectDB();
      process.exit(1);
    }
  })();
}
