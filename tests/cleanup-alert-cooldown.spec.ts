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

test.describe('Alert History & Server-side Dismiss API', () => {
  const adminToken = createJwt('admin', 'admin-1');

  test('Admin can fetch history', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/alerts/history?range=30d`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const text = await res.text();
    expect(res.status()).toBe(200);
    const data = JSON.parse(text);
    expect(Array.isArray(data.items)).toBe(true);
  });

  test('Server-side dismiss updates state', async ({ request }) => {
    // 1. Get current failure alert to get fingerprint
    const getRes = await request.get(`${BASE_URL}/api/admin/alerts/cleanup-failure`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    // Test dismiss with a test fingerprint
    const testFingerprint = "test-fingerprint-" + Date.now();
    const dismissRes = await request.post(`${BASE_URL}/api/admin/alerts/cleanup-failure/dismiss`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { fingerprint: testFingerprint }
    });
    expect(dismissRes.status()).toBe(200);
    const dismissData = await dismissRes.json();
    expect(dismissData.ok).toBe(true);
    expect(dismissData.fingerprint).toBe(testFingerprint);
    expect(dismissData.dismissedAt).toBeDefined();

    // Verify it shows up in history
    const historyRes = await request.get(`${BASE_URL}/api/admin/alerts/history?range=7d`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const historyData = await historyRes.json();
    const found = historyData.items.find((row: any) => row.fingerprint === testFingerprint);
    expect(found).toBeDefined();
    expect(found.eventType).toBe('dismissed');
  });

  test('Non-admin gets 403 on history and dismiss', async ({ request }) => {
    const researcherToken = createJwt('researcher', 'res-1');
    const res1 = await request.get(`${BASE_URL}/api/admin/alerts/history?range=30d`, {
      headers: { Authorization: `Bearer ${researcherToken}` }
    });
    expect(res1.status()).toBe(403);

    const res2 = await request.post(`${BASE_URL}/api/admin/alerts/cleanup-failure/dismiss`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
      data: { fingerprint: 'test' }
    });
    expect(res2.status()).toBe(403);
  });

  test('Dismiss is idempotent', async ({ request }) => {
    const testFingerprint = "idempotent-fingerprint-" + Date.now();
    const dismissRes1 = await request.post(`${BASE_URL}/api/admin/alerts/cleanup-failure/dismiss`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { fingerprint: testFingerprint }
    });
    expect(dismissRes1.status()).toBe(200);

    const dismissRes2 = await request.post(`${BASE_URL}/api/admin/alerts/cleanup-failure/dismiss`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { fingerprint: testFingerprint }
    });
    expect(dismissRes2.status()).toBe(200);
    const data1 = await dismissRes1.json();
    const data2 = await dismissRes2.json();
    expect(data1.ok).toBe(true);
    expect(data2.ok).toBe(true);
  });
});
