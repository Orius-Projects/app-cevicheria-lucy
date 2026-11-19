import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { setupTestDB, teardownTestDB } from './setup';

describe('GET /api/health (contracts/rest-api.md §4)', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('debe responder 200 con status ok y db connected', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('connected');
    expect(typeof res.body.uptimeSeconds).toBe('number');
    expect(res.body.timestamp).toBeDefined();
  });
});
