import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import request from 'supertest';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { app } from '../src/app';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup';
import { seedData } from '../src/seed/data';
import { User, Table, Dish } from '../src/models';
import { signToken } from '../src/utils/jwt';
import {
  initRealtime,
  closeRealtime,
  getIO,
  emitOrderCreated,
  emitOrderReady,
  emitOrderDelivered,
  emitOrderCancelled,
  emitOrderManualClosed,
  emitMenuAvailabilityChanged,
  emitShiftClosed
} from '../src/realtime';

describe('Spec 005 — Tiempo Real (Socket.IO Backend)', () => {
  let httpServer: http.Server;
  let serverUrl: string;
  const activeSockets: ClientSocketType[] = [];

  let mozoUser: any;
  let cocineroUser: any;
  let mozoToken: string;
  let cocineroToken: string;

  function createClientSocket(token?: string): ClientSocketType {
    const socket = ClientSocket(serverUrl, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      autoConnect: true,
      reconnection: false
    });
    activeSockets.push(socket);
    return socket;
  }

  beforeAll(async () => {
    await setupTestDB();
  }, 30000);

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedData();

    mozoUser = await User.findOne({ username: 'mozo1' });
    cocineroUser = await User.findOne({ username: 'cocinero1' });

    mozoToken = signToken({
      id: mozoUser._id.toString(),
      username: mozoUser.username,
      displayName: mozoUser.displayName,
      role: mozoUser.role
    });

    cocineroToken = signToken({
      id: cocineroUser._id.toString(),
      username: cocineroUser.username,
      displayName: cocineroUser.displayName,
      role: cocineroUser.role
    });

    httpServer = http.createServer(app);
    initRealtime(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const port = (httpServer.address() as AddressInfo).port;
        serverUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  }, 30000);

  afterEach(async () => {
    for (const s of activeSockets) {
      if (s.connected) {
        s.disconnect();
      }
    }
    activeSockets.length = 0;

    await closeRealtime();

    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  it('1. Handshake sin token responde connect_error UNAUTHORIZED; token válido conecta', async () => {
    // Sin token -> error UNAUTHORIZED
    const socketSinToken = createClientSocket();
    const errSinToken: any = await new Promise((resolve) => {
      socketSinToken.on('connect_error', resolve);
    });
    expect(errSinToken.message).toBe('UNAUTHORIZED');

    // Token válido -> conecta con éxito
    const socketValido = createClientSocket(mozoToken);
    await new Promise<void>((resolve) => {
      socketValido.on('connect', resolve);
    });
    expect(socketValido.connected).toBe(true);
  });

  it('2. Usuario inactivo responde connect_error FORBIDDEN', async () => {
    const inactiveUser = await User.create({
      username: 'usuario_inactivo',
      passwordHash: 'dummy',
      displayName: 'Usuario Inactivo',
      role: 'MOZO',
      active: false
    });

    const inactiveToken = signToken({
      id: inactiveUser._id.toString(),
      username: inactiveUser.username,
      displayName: inactiveUser.displayName,
      role: inactiveUser.role
    });

    const socketInactivo = createClientSocket(inactiveToken);
    const errInactivo: any = await new Promise((resolve) => {
      socketInactivo.on('connect_error', resolve);
    });
    expect(errInactivo.message).toBe('FORBIDDEN');
  });

  it('3. Salas: MOZO recibe order:ready; COCINERO recibe order:created', async () => {
    const mozoSocket = createClientSocket(mozoToken);
    const cocineroSocket = createClientSocket(cocineroToken);

    await Promise.all([
      new Promise<void>((resolve) => mozoSocket.on('connect', resolve)),
      new Promise<void>((resolve) => cocineroSocket.on('connect', resolve))
    ]);

    const dummyOrder = {
      id: '66f4c0000000000000000001',
      orderNumber: 10,
      table: { id: '66f200000000000000000001', code: 'M01', zone: 'Salón' },
      status: 'LISTO',
      version: 1
    };

    // 1. emitOrderReady debe llegar a mozoSocket
    const readyPromise = new Promise<any>((resolve) => {
      mozoSocket.on('order:ready', resolve);
    });

    emitOrderReady(dummyOrder, {
      id: cocineroUser._id.toString(),
      name: cocineroUser.displayName,
      role: cocineroUser.role
    });

    const readyEvent = await readyPromise;
    expect(readyEvent.type).toBe('order:ready');
    expect(readyEvent.orderId).toBe(dummyOrder.id);
    expect(readyEvent.payload.order.status).toBe('LISTO');

    // 2. emitOrderCreated debe llegar a cocineroSocket
    const createdPromise = new Promise<any>((resolve) => {
      cocineroSocket.on('order:created', resolve);
    });

    emitOrderCreated(
      { ...dummyOrder, status: 'ENVIADO', version: 0 },
      {
        id: mozoUser._id.toString(),
        name: mozoUser.displayName,
        role: mozoUser.role
      }
    );

    const createdEvent = await createdPromise;
    expect(createdEvent.type).toBe('order:created');
    expect(createdEvent.payload.order.status).toBe('ENVIADO');
  });

  it('4. Envelope contiene eventId (UUID), schemaVersion: 2, type, version, orderId y payload.changedBy', async () => {
    const mozoSocket = createClientSocket(mozoToken);
    await new Promise<void>((resolve) => mozoSocket.on('connect', resolve));

    const dummyOrder = {
      id: '66f4c0000000000000000002',
      orderNumber: 11,
      version: 3,
      status: 'LISTO'
    };

    const eventPromise = new Promise<any>((resolve) => {
      mozoSocket.on('order:ready', resolve);
    });

    emitOrderReady(dummyOrder, {
      id: cocineroUser._id.toString(),
      name: 'Cocinero Test',
      role: 'COCINERO'
    });

    const envelope = await eventPromise;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    expect(envelope.eventId).toMatch(uuidRegex);
    expect(envelope.schemaVersion).toBe(2);
    expect(envelope.type).toBe('order:ready');
    expect(envelope.version).toBe(3);
    expect(envelope.orderId).toBe(dummyOrder.id);
    expect(envelope.occurredAt).toBeDefined();
    expect(envelope.payload.changedBy).toEqual({
      id: cocineroUser._id.toString(),
      name: 'Cocinero Test',
      role: 'COCINERO'
    });
  });

  it('5. Flujo real de pedido (crear + ready) emite order:created y order:ready a las salas correspondientes', async () => {
    const mozoSocket = createClientSocket(mozoToken);
    const cocineroSocket = createClientSocket(cocineroToken);

    await Promise.all([
      new Promise<void>((resolve) => mozoSocket.on('connect', resolve)),
      new Promise<void>((resolve) => cocineroSocket.on('connect', resolve))
    ]);

    const table = await Table.findOne({ code: 'M01' });
    const dish = await Dish.findOne({ name: 'Ceviche' });

    // Preparar listener para order:created
    const orderCreatedPromise = new Promise<any>((resolve) => {
      cocineroSocket.on('order:created', resolve);
    });

    // Crear pedido vía REST
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozoToken}`)
      .send({
        tableId: table!._id.toString(),
        items: [{ dishId: dish!._id.toString(), quantity: 1 }]
      });
    expect(createRes.status).toBe(201);
    const createdOrderId = createRes.body.id;

    // Verificar recepción de order:created en cocina
    const createdEvent = await orderCreatedPromise;
    expect(createdEvent.type).toBe('order:created');
    expect(createdEvent.orderId).toBe(createdOrderId);
    expect(createdEvent.payload.order.status).toBe('ENVIADO');

    // Preparar listener para order:ready en mozo
    const orderReadyPromise = new Promise<any>((resolve) => {
      mozoSocket.on('order:ready', resolve);
    });

    // Cocinero marca listo vía REST
    const readyRes = await request(app)
      .patch(`/api/orders/${createdOrderId}/ready`)
      .set('Authorization', `Bearer ${cocineroToken}`)
      .send({ version: 0 });
    expect(readyRes.status).toBe(200);

    // Verificar recepción de order:ready en mozo
    const readyEvent = await orderReadyPromise;
    expect(readyEvent.type).toBe('order:ready');
    expect(readyEvent.orderId).toBe(createdOrderId);
    expect(readyEvent.payload.order.status).toBe('LISTO');
    expect(readyEvent.payload.previousStatus).toBe('ENVIADO');
  });

  it('6. payload.order no contiene passwordHash, clientRequestId ni statusHistory', async () => {
    const cocineroSocket = createClientSocket(cocineroToken);
    await new Promise<void>((resolve) => cocineroSocket.on('connect', resolve));

    const table = await Table.findOne({ code: 'M02' });
    const dish = await Dish.findOne({ name: 'Ceviche' });

    const orderCreatedPromise = new Promise<any>((resolve) => {
      cocineroSocket.on('order:created', resolve);
    });

    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozoToken}`)
      .send({
        tableId: table!._id.toString(),
        items: [{ dishId: dish!._id.toString(), quantity: 1 }],
        clientRequestId: 'req-clean-test-uuid'
      });
    expect(createRes.status).toBe(201);

    const event = await orderCreatedPromise;
    const orderSnapshot = event.payload.order;

    expect(orderSnapshot.statusHistory).toBeUndefined();
    expect(orderSnapshot.clientRequestId).toBeUndefined();

    const jsonStr = JSON.stringify(orderSnapshot);
    expect(jsonStr).not.toContain('passwordHash');
    expect(jsonStr).not.toContain('password');
  });

  it('7. Con IO no inicializado, las funciones de emisión son no-op y no lanzan excepciones', async () => {
    // Cerramos el servidor realtime explícitamente para garantizar que getIO() === null
    await closeRealtime();
    expect(getIO()).toBeNull();

    const dummyUser = { id: 'usr-1', name: 'Tester', role: 'MOZO' };
    const dummyOrder = { id: 'ord-1', version: 1 };

    expect(() => emitOrderCreated(dummyOrder, dummyUser)).not.toThrow();
    expect(() => emitOrderReady(dummyOrder, dummyUser)).not.toThrow();
    expect(() => emitOrderDelivered(dummyOrder, dummyUser)).not.toThrow();
    expect(() => emitOrderCancelled(dummyOrder, 'ENVIADO', dummyUser)).not.toThrow();
    expect(() => emitOrderManualClosed(dummyOrder, 'LISTO', dummyUser)).not.toThrow();
    expect(() =>
      emitMenuAvailabilityChanged({
        menuDayId: 'm-1',
        menuItemId: 'mi-1',
        dishId: 'd-1',
        dishName: 'Ceviche',
        state: 'DISPONIBLE',
        remainingRations: 10,
        manuallySoldOut: false,
        changeType: 'REPLENISH',
        changedBy: dummyUser
      })
    ).not.toThrow();
    expect(() =>
      emitShiftClosed({
        shiftId: 's-1',
        date: '2026-11-18',
        label: 'Almuerzo',
        closedBy: dummyUser
      })
    ).not.toThrow();
  });
});
