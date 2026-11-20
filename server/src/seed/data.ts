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

  await Table.deleteMany({ code: { $in: ['M13', 'M14', 'M15', 'M16'] } });

  for (const t of tables) {
    await Table.findOneAndUpdate(
      { code: t.code },
      { $set: { zone: t.zone, seats: t.seats, active: true } },
      { upsert: true, new: true }
    );
  }

  // 5. Secciones de Menú
  const sections = [
    { key: 'CRIOLLO', name: 'Criollo', sortOrder: 1, active: true },
    { key: 'MARINO', name: 'Marino', sortOrder: 2, active: true },
    { key: 'A_LA_CARTA', name: 'A la carta', sortOrder: 3, active: true },
    { key: 'BEBIDAS', name: 'Bebidas', sortOrder: 4, active: true }
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

  // 6. Platos Maestros (12 platos con precios y variaciones sin costo)
  const dishes = [
    {
      name: 'Ceviche clásico',
      sectionId: sectionMap['MARINO']._id,
      sectionKey: 'MARINO',
      description: 'Pescado fresco del día marinado en zumo de limón con cebolla y ají limo',
      priceCents: 2800,
      course: 'FONDO',
      isFixed: true,
      isRotating: false,
      sortOrder: 1,
      active: true,
      variations: [
        { id: 'v_pic_bajo', name: 'Poco picante', sortOrder: 1, active: true },
        { id: 'v_pic_med', name: 'Picante medio', sortOrder: 2, active: true },
        { id: 'v_pic_alto', name: 'Bien picante', sortOrder: 3, active: true }
      ]
    },
    {
      name: 'Ceviche mixto',
      sectionId: sectionMap['MARINO']._id,
      sectionKey: 'MARINO',
      description: 'Pescado y mariscos seleccionados al limón con camote y choclo',
      priceCents: 3200,
      course: 'FONDO',
      isFixed: true,
      isRotating: false,
      sortOrder: 2,
      active: true,
      variations: [
        { id: 'v_sin_aji', name: 'Sin ají', sortOrder: 1, active: true },
        { id: 'v_con_aji', name: 'Con ají', sortOrder: 2, active: true }
      ]
    },
    {
      name: 'Arroz con mariscos',
      sectionId: sectionMap['MARINO']._id,
      sectionKey: 'MARINO',
      description: 'Arroz criollo con mixtura de mariscos y aroma de culantro',
      priceCents: 3000,
      course: 'FONDO',
      isFixed: true,
      isRotating: false,
      sortOrder: 3,
      active: true,
      variations: [
        { id: 'v_sin_culantro', name: 'Sin culantro', sortOrder: 1, active: true }
      ]
    },
    {
      name: 'Jalea mixta',
      sectionId: sectionMap['MARINO']._id,
      sectionKey: 'MARINO',
      description: 'Chicharrón de mariscos y pescado crocante con yuca y sarza criolla',
      priceCents: 3500,
      course: 'FONDO',
      isFixed: true,
      isRotating: false,
      sortOrder: 4,
      active: true,
      variations: [
        { id: 'v_tartara_extra', name: 'Con salsa tártara extra', sortOrder: 1, active: true }
      ]
    },
    {
      name: 'Causa de atún',
      sectionId: sectionMap['MARINO']._id,
      sectionKey: 'MARINO',
      description: 'Papa amarilla prensada con ají amarillo y relleno de atún',
      priceCents: 1800,
      course: 'ENTRADA',
      isFixed: true,
      isRotating: false,
      sortOrder: 5,
      active: true,
      variations: []
    },
    {
      name: 'Chicharrón de calamar',
      sectionId: sectionMap['MARINO']._id,
      sectionKey: 'MARINO',
      description: 'Aros de calamar crocantes con tártara y chifle',
      priceCents: 2600,
      course: 'FONDO',
      isFixed: true,
      isRotating: false,
      sortOrder: 6,
      active: true,
      variations: []
    },
    {
      name: 'Lomo saltado',
      sectionId: sectionMap['CRIOLLO']._id,
      sectionKey: 'CRIOLLO',
      description: 'Tiras de lomo salteadas al wok con cebolla, tomate y papas fritas',
      priceCents: 3200,
      course: 'FONDO',
      isFixed: true,
      isRotating: false,
      sortOrder: 7,
      active: true,
      variations: [
        { id: 'v_termino_medio', name: 'Término medio', sortOrder: 1, active: true },
        { id: 'v_bien_cocido', name: 'Bien cocido', sortOrder: 2, active: true }
      ]
    },
    {
      name: 'Chicharrón de pollo',
      sectionId: sectionMap['CRIOLLO']._id,
      sectionKey: 'CRIOLLO',
      description: 'Trozos de pechuga crocantes acompañados de papas doradas',
      priceCents: 2200,
      course: 'FONDO',
      isFixed: true,
      isRotating: false,
      sortOrder: 8,
      active: true,
      variations: [
        { id: 'v_papas_fritas', name: 'Con papas fritas', sortOrder: 1, active: true }
      ]
    },
    {
      name: 'Ají de gallina',
      sectionId: sectionMap['CRIOLLO']._id,
      sectionKey: 'CRIOLLO',
      description: 'Pollo deshilachado en crema de ají amarillo con arroz blanco',
      priceCents: 2400,
      course: 'FONDO',
      isFixed: true,
      isRotating: false,
      sortOrder: 9,
      active: true,
      variations: []
    },
    {
      name: 'Parihuela especial',
      sectionId: sectionMap['A_LA_CARTA']._id,
      sectionKey: 'A_LA_CARTA',
      description: 'Sopa concentrada marina con cangrejo y frutos del mar',
      priceCents: 3800,
      course: 'FONDO',
      isFixed: false,
      isRotating: true,
      sortOrder: 10,
      active: true,
      variations: []
    },
    {
      name: 'Chicha morada 1L',
      sectionId: sectionMap['BEBIDAS']._id,
      sectionKey: 'BEBIDAS',
      description: 'Elaborada artesanalmente con maíz morado, piña y canela',
      priceCents: 1200,
      course: 'BEBIDA',
      isFixed: true,
      isRotating: false,
      sortOrder: 11,
      active: true,
      variations: []
    },
    {
      name: 'Limonada frozen 1L',
      sectionId: sectionMap['BEBIDAS']._id,
      sectionKey: 'BEBIDAS',
      description: 'Refrescante limonada batida con hielo frappé',
      priceCents: 1400,
      course: 'BEBIDA',
      isFixed: true,
      isRotating: false,
      sortOrder: 12,
      active: true,
      variations: []
    }
  ];

  const dishMap: Record<string, any> = {};
  for (const d of dishes) {
    const dishDoc = await Dish.findOneAndUpdate(
      { name: d.name },
      { $set: d },
      { upsert: true, new: true }
    );
    dishMap[d.name] = dishDoc;
  }

  // 7. Menú del día publicado
  const menuDay = await MenuDay.findOneAndUpdate(
    { date: today },
    {
      $set: {
        date: today,
        status: 'PUBLICADO',
        publishedBy: userMap['encargado1']._id,
        publishedAt: new Date(),
        notes: 'Menú especial de temporada'
      }
    },
    { upsert: true, new: true }
  );

  // Items del menú del día:
  // - un plato limitado a 30 raciones (Ceviche mixto)
  // - un plato agotado por insumo (manuallySoldOut: true, Arroz con mariscos)
  // - otros platos sin límite de raciones
  const menuItems = [
    {
      dish: dishMap['Ceviche clásico'],
      sectionKey: 'MARINO',
      hasRationsLimit: false,
      totalRations: null,
      remainingRations: null,
      manuallySoldOut: false
    },
    {
      dish: dishMap['Ceviche mixto'],
      sectionKey: 'MARINO',
      hasRationsLimit: true,
      totalRations: 30,
      remainingRations: 30,
      manuallySoldOut: false
    },
    {
      dish: dishMap['Arroz con mariscos'],
      sectionKey: 'MARINO',
      hasRationsLimit: false,
      totalRations: null,
      remainingRations: null,
      manuallySoldOut: true,
      soldOutReason: 'Agotado por falta de insumos frescos'
    },
    {
      dish: dishMap['Jalea mixta'],
      sectionKey: 'MARINO',
      hasRationsLimit: false,
      totalRations: null,
      remainingRations: null,
      manuallySoldOut: false
    },
    {
      dish: dishMap['Causa de atún'],
      sectionKey: 'MARINO',
      hasRationsLimit: false,
      totalRations: null,
      remainingRations: null,
      manuallySoldOut: false
    },
    {
      dish: dishMap['Chicharrón de pollo'],
      sectionKey: 'CRIOLLO',
      hasRationsLimit: false,
      totalRations: null,
      remainingRations: null,
      manuallySoldOut: false
    },
    {
      dish: dishMap['Lomo saltado'],
      sectionKey: 'CRIOLLO',
      hasRationsLimit: false,
      totalRations: null,
      remainingRations: null,
      manuallySoldOut: false
    },
    {
      dish: dishMap['Chicha morada 1L'],
      sectionKey: 'BEBIDAS',
      hasRationsLimit: false,
      totalRations: null,
      remainingRations: null,
      manuallySoldOut: false
    },
    {
      dish: dishMap['Limonada frozen 1L'],
      sectionKey: 'BEBIDAS',
      hasRationsLimit: false,
      totalRations: null,
      remainingRations: null,
      manuallySoldOut: false
    }
  ];

  for (const item of menuItems) {
    await MenuItem.findOneAndUpdate(
      { menuDayId: menuDay._id, dishId: item.dish._id },
      {
        $set: {
          dishName: item.dish.name,
          sectionKey: item.sectionKey,
          priceCents: item.dish.priceCents,
          active: true,
          hasRationsLimit: item.hasRationsLimit,
          totalRations: item.totalRations,
          remainingRations: item.remainingRations,
          lowStockThreshold: 5,
          manuallySoldOut: item.manuallySoldOut,
          soldOutReason: item.soldOutReason || null,
          version: 0
        }
      },
      { upsert: true, new: true }
    );
  }

  // 8. Turno abierto 'Almuerzo' para la fecha actual
  await Shift.findOneAndUpdate(
    { date: today, label: 'Almuerzo' },
    {
      $set: {
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
    dishesCount: dishes.length,
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
