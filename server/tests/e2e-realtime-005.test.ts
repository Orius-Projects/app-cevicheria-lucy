import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import request from 'supertest';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { app } from '../src/app';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup';
import { seedData } from '../src/seed/data';
import { Table } from '../src/models/table.model';
import { Dish } from '../src/models/dish.model';
import { Order } from '../src/models/order.model';
import { initRealtime, closeRealtime } from '../src/realtime';

describe('Spec 005 E2E — Realtime (Socket.IO Backend & Clientes)', () => {
  let httpServer: http.Server;
  let serverUrl: string;
  const activeSockets: ClientSocketType[] = [];

  let mozo1Token: string;
  let mozo2Token: string;
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
    await Order.deleteMany({});

    // Obtener tokens reales mediante login REST
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

    // Inicializar servidor HTTP y Socket.IO en puerto efímero
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

  it('1. Cliente sin token de autenticación es rechazado con UNAUTHORIZED en el handshake', async () => {
    const socketSinToken = createClientSocket();

    const errSinToken: any = await new Promise((resolve) => {
      socketSinToken.on('connect_error', resolve);
    });

    expect(errSinToken).toBeDefined();
    expect(errSinToken.message).toBe('UNAUTHORIZED');
    expect(socketSinToken.connected).toBe(false);
  });

  it('2. Cocina recibe order:created en <= 2s con envelope schemaVersion: 2 y version: 0 al crear pedido por API', async () => {
    const mozoSocket = createClientSocket(mozo1Token);
    const cocineroSocket = createClientSocket(cocineroToken);

    await Promise.all([
      new Promise<void>((resolve) => mozoSocket.on('connect', resolve)),
      new Promise<void>((resolve) => cocineroSocket.on('connect', resolve))
    ]);

    const table = await Table.findOne({ code: 'M01' });
    const dish = await Dish.findOne({ name: 'Ceviche clásico' });
    expect(table).toBeDefined();
    expect(dish).toBeDefined();

    // Listener para capturar order:created en socket de cocina
    const orderCreatedPromise = new Promise<{ envelope: any; durationMs: number }>((resolve) => {
      const startTime = Date.now();
      cocineroSocket.on('order:created', (envelope: any) => {
        const durationMs = Date.now() - startTime;
        resolve({ envelope, durationMs });
      });
    });

    // Mozo crea pedido vía API REST
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozo1Token}`)
      .send({
        tableId: table!._id.toString(),
        items: [{ dishId: dish!._id.toString(), quantity: 2 }]
      });
    expect(createRes.status).toBe(201);
    const createdOrderId = createRes.body.id;

    // Recepción del evento en cocina en <= 2 segundos
    const { envelope, durationMs } = await orderCreatedPromise;
    expect(durationMs).toBeLessThanOrEqual(2000);

    // Verificación estricta de estructura del envelope canónico
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(envelope.eventId).toMatch(uuidRegex);
    expect(envelope.schemaVersion).toBe(2);
    expect(envelope.type).toBe('order:created');
    expect(envelope.version).toBe(0);
    expect(envelope.orderId).toBe(createdOrderId);
    expect(envelope.occurredAt).toBeDefined();

    // Verificación de datos de orden y autor
    expect(envelope.payload.order.status).toBe('ENVIADO');
    expect(envelope.payload.order.orderNumber).toBeGreaterThan(0);
    expect(envelope.payload.changedBy.role).toBe('MOZO');
  });

  it('3. Mozo recibe order:ready para TODOS los mozos conectados al despachar cocinero', async () => {
    // Conectar dos mozos y un cocinero
    const mozo1Socket = createClientSocket(mozo1Token);
    const mozo2Socket = createClientSocket(mozo2Token);
    const cocineroSocket = createClientSocket(cocineroToken);

    await Promise.all([
      new Promise<void>((resolve) => mozo1Socket.on('connect', resolve)),
      new Promise<void>((resolve) => mozo2Socket.on('connect', resolve)),
      new Promise<void>((resolve) => cocineroSocket.on('connect', resolve))
    ]);

    const table = await Table.findOne({ code: 'M02' });
    const dish = await Dish.findOne({ name: 'Ceviche mixto' });
    expect(table).toBeDefined();
    expect(dish).toBeDefined();

    // Crear pedido vía REST
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozo1Token}`)
      .send({
        tableId: table!._id.toString(),
        items: [{ dishId: dish!._id.toString(), quantity: 1 }]
      });
    expect(createRes.status).toBe(201);
    const orderId = createRes.body.id;

    // Configurar listeners en AMBOS clientes de mozo
    const mozo1EventPromise = new Promise<any>((resolve) => {
      mozo1Socket.on('order:ready', resolve);
    });
    const mozo2EventPromise = new Promise<any>((resolve) => {
      mozo2Socket.on('order:ready', resolve);
    });

    // Cocinero marca pedido listo vía API REST
    const readyRes = await request(app)
      .patch(`/api/orders/${orderId}/ready`)
      .set('Authorization', `Bearer ${cocineroToken}`)
      .send({ version: 0 });
    expect(readyRes.status).toBe(200);

    // Ambos mozos reciben el evento de despacho
    const [eventMozo1, eventMozo2] = await Promise.all([
      mozo1EventPromise,
      mozo2EventPromise
    ]);

    // Verificación para mozo1
    expect(eventMozo1.type).toBe('order:ready');
    expect(eventMozo1.schemaVersion).toBe(2);
    expect(eventMozo1.version).toBe(1);
    expect(eventMozo1.orderId).toBe(orderId);
    expect(eventMozo1.payload.order.status).toBe('LISTO');
    expect(eventMozo1.payload.previousStatus).toBe('ENVIADO');
    expect(eventMozo1.payload.changedBy.role).toBe('COCINERO');

    // Verificación para mozo2 (recepción para TODOS los mozos)
    expect(eventMozo2.type).toBe('order:ready');
    expect(eventMozo2.schemaVersion).toBe(2);
    expect(eventMozo2.version).toBe(1);
    expect(eventMozo2.orderId).toBe(orderId);
    expect(eventMozo2.payload.order.status).toBe('LISTO');
    expect(eventMozo2.payload.previousStatus).toBe('ENVIADO');

    // Mismo identificador de evento transmitido a la sala común de mozos
    expect(eventMozo1.eventId).toBe(eventMozo2.eventId);
  });

  it('4. Deduplicación por eventId en el cliente de prueba: un evento repetido no se duplica en el estado', async () => {
    const mozoSocket = createClientSocket(mozo1Token);
    const cocineroSocket = createClientSocket(cocineroToken);

    await Promise.all([
      new Promise<void>((resolve) => mozoSocket.on('connect', resolve)),
      new Promise<void>((resolve) => cocineroSocket.on('connect', resolve))
    ]);

    const table = await Table.findOne({ code: 'M03' });
    const dish = await Dish.findOne({ name: 'Ceviche clásico' });

    // Crear y preparar orden 1
    const createRes1 = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozo1Token}`)
      .send({
        tableId: table!._id.toString(),
        items: [{ dishId: dish!._id.toString(), quantity: 1 }]
      });
    const order1Id = createRes1.body.id;

    // Almacén de deduplicación del cliente receptor
    const seenEventIds = new Set<string>();
    const orderState: any[] = [];
    let receivedEventsCount = 0;

    function handleIncomingEnvelope(envelope: any): boolean {
      receivedEventsCount++;
      if (seenEventIds.has(envelope.eventId)) {
        return false; // Descartado por deduplicación
      }
      seenEventIds.add(envelope.eventId);
      orderState.push(envelope.payload.order);
      return true; // Procesado
    }

    // Esperar primer evento order:ready en mozoSocket
    const firstReadyPromise = new Promise<any>((resolve) => {
      mozoSocket.on('order:ready', resolve);
    });

    await request(app)
      .patch(`/api/orders/${order1Id}/ready`)
      .set('Authorization', `Bearer ${cocineroToken}`)
      .send({ version: 0 });

    const realEnvelope1 = await firstReadyPromise;

    // 1. Primer arribo del evento: debe procesarse con éxito
    const firstProcessed = handleIncomingEnvelope(realEnvelope1);
    expect(firstProcessed).toBe(true);
    expect(receivedEventsCount).toBe(1);
    expect(orderState).toHaveLength(1);
    expect(orderState[0].id).toBe(order1Id);

    // 2. Simulación de retransmisión de red del MISMO evento (mismo eventId)
    const duplicateProcessed = handleIncomingEnvelope(realEnvelope1);
    expect(duplicateProcessed).toBe(false); // Detectado y descartado
    expect(receivedEventsCount).toBe(2);
    expect(orderState).toHaveLength(1); // El estado NO duplicó la orden

    // 3. Crear una segunda orden distinta para verificar que eventos nuevos sí se procesan
    const table2 = await Table.findOne({ code: 'M04' });
    const createRes2 = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${mozo1Token}`)
      .send({
        tableId: table2!._id.toString(),
        items: [{ dishId: dish!._id.toString(), quantity: 1 }]
      });
    const order2Id = createRes2.body.id;

    const secondReadyPromise = new Promise<any>((resolve) => {
      mozoSocket.once('order:ready', resolve);
    });

    await request(app)
      .patch(`/api/orders/${order2Id}/ready`)
      .set('Authorization', `Bearer ${cocineroToken}`)
      .send({ version: 0 });

    const realEnvelope2 = await secondReadyPromise;

    const secondProcessed = handleIncomingEnvelope(realEnvelope2);
    expect(secondProcessed).toBe(true);
    expect(receivedEventsCount).toBe(3);
    expect(orderState).toHaveLength(2); // Segunda orden agregada correctamente
    expect(orderState[1].id).toBe(order2Id);
  });
});
