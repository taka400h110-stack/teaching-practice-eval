import { test, expect } from '@playwright/test';

// Define tokens correctly signed with the dev secret
const STUDENT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXItMDAxIiwicm9sZSI6InN0dWRlbnQiLCJleHAiOjI1MjQ2MDgwMDB9.i3g1J7Qy1YfK9Z5u_3w-E2o1J6R7U9WfK9Z5u_3w-E2"; // Won't actually work locally without right signature, but since we are calling fetch from Playwright test running IN Node.js against the Cloudflare server, let's use the real ones:

// Actually, generating tokens fresh on the fly might be better if we run it in playwright node context.
// However, the test runs on the host against the server on 8788.

// Playwright tests run in node, so we CAN require jsonwebtoken:
import jwt from 'jsonwebtoken';
const SECRET = 'default_local_secret_key_for_dev_only';
const tokens = {
  student: jwt.sign({ id: 'user-001', role: 'student', exp: Math.floor(Date.now() / 1000) + 3600 }, SECRET),
  admin: jwt.sign({ id: 'user-004', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 }, SECRET),
  teacher: jwt.sign({ id: 'user-002', role: 'univ_teacher', exp: Math.floor(Date.now() / 1000) + 3600 }, SECRET),
};

const BASE_URL = 'http://localhost:8788';

test.describe('Backend API Role Guard Tests', () => {

  test('Unauthenticated user receives 401 on protected API', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/data/journals`);
    expect(res.status()).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe("unauthorized");
  });

  test('Student cannot access admin users API (403)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/data/users`, {
      headers: { 'Authorization': `Bearer ${tokens.student}` }
    });
    expect(res.status()).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe("forbidden");
  });

  test('Student can access journals API (allowed)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/data/journals`, {
      headers: { 'Authorization': `Bearer ${tokens.student}` }
    });
    // the route returns an empty array or an error from D1, but NOT 401 or 403
    expect(res.status()).not.toBe(401);
    expect(res.status()).not.toBe(403);
  });

  test('Admin can access admin users API (allowed)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/data/users`, {
      headers: { 'Authorization': `Bearer ${tokens.admin}` }
    });
    expect(res.status()).not.toBe(401);
    expect(res.status()).not.toBe(403);
  });

  test('Teacher cannot access researcher longitudinal stats API (403)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/stats/lgcm`, {
      headers: { 'Authorization': `Bearer ${tokens.teacher}` },
      data: {}
    });
    expect(res.status()).toBe(403);
  });

});
