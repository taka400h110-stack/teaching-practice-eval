import { test, expect } from '@playwright/test';
import * as crypto from 'crypto';

const BASE_URL = 'http://localhost:8788';

function base64url(source: string) {
  let encodedSource = Buffer.from(source).toString('base64');
  encodedSource = encodedSource.replace(/=+$/, '');
  encodedSource = encodedSource.replace(/\+/g, '-');
  encodedSource = encodedSource.replace(/\//g, '_');
  return encodedSource;
}

function createJwt(role: string, userId: string) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify({ 
    sub: userId, 
    role, 
    roles: [role],
    exp: Math.floor(Date.now() / 1000) + 3600,
    user: { id: userId, email: userId + "@example.com", name: "Test", role }
  }));
  const signatureInput = encodedHeader + '.' + encodedPayload;
  const signature = crypto.createHmac('sha256', 'default_local_secret_key_for_dev_only').update(signatureInput).digest('base64');
  let encodedSignature = signature;
  encodedSignature = encodedSignature.replace(/=+$/, '');
  encodedSignature = encodedSignature.replace(/\+/g, '-');
  encodedSignature = encodedSignature.replace(/\//g, '_');
  return signatureInput + '.' + encodedSignature;
}

test.describe('Admin Cleanup Metrics API', () => {
  const adminToken = createJwt('admin', 'admin-1');
  const researcherToken = createJwt('researcher', 'researcher-1');

  test('Non-admin users receive 403', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/metrics/cleanup?range=7d`, {
      headers: { Authorization: `Bearer ${researcherToken}` }
    });
    expect(res.status()).toBe(403);
  });

  test('Missing range returns 400', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/metrics/cleanup`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(res.status()).toBe(400);
  });

  test('Invalid range returns 400', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/metrics/cleanup?range=90d`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(res.status()).toBe(400);
  });

  test('Valid request returns 7d metrics structure', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/metrics/cleanup?range=7d`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(res.status()).toBe(200);
    
    const data = await res.json();
    expect(data.range).toBe('7d');
    expect(data.summary).toBeDefined();
    expect(typeof data.summary.executions).toBe('number');
    expect(data.dailySeries).toBeDefined();
    expect(data.dailySeries.length).toBe(7);
    expect(data.recentRuns).toBeDefined();
    expect(Array.isArray(data.recentRuns)).toBe(true);
    expect(data.recentErrors).toBeDefined();
    expect(Array.isArray(data.recentErrors)).toBe(true);
  });

  test('Valid request returns 30d metrics structure', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/metrics/cleanup?range=30d`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(res.status()).toBe(200);
    
    const data = await res.json();
    expect(data.range).toBe('30d');
    expect(data.dailySeries.length).toBe(30);
  });
});
