import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mock Prisma so these tests run without a live database — they exercise the
// validation/middleware layer, which is what's most valuable to test in CI
// without infra. Full DB-backed integration tests are listed in README.md
// under "Testing" with instructions for running against a real Postgres.
vi.mock('../src/config/prisma', () => ({
  prisma: {
    user: { findFirst: vi.fn().mockResolvedValue(null), findUnique: vi.fn().mockResolvedValue(null) },
  },
}));

import { createApp } from '../src/app';

describe('POST /api/auth/register validation', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  it('rejects an invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'not-an-email',
      username: 'validuser',
      password: 'password123',
    });
    expect(res.status).toBe(400);
  });

  it('rejects a short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      username: 'validuser',
      password: 'short',
    });
    expect(res.status).toBe(400);
  });

  it('rejects a username with invalid characters', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      username: 'invalid username!',
      password: 'password123',
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/health', () => {
  it('returns ok status', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
