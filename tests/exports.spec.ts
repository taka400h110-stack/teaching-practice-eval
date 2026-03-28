import { test, expect } from '@playwright/test';
import jwt from 'jsonwebtoken';

const DEV_SECRET = 'default_local_secret_key_for_dev_only';
const BASE_URL = 'http://localhost:8788';

const adminToken = jwt.sign({
  id: 'admin-1',
  role: 'admin',
  email: 'admin@test.com'
}, DEV_SECRET, { expiresIn: '1h' });

const researcherToken = jwt.sign({
  id: 'researcher-1',
  role: 'researcher',
  email: 'researcher@test.com'
}, DEV_SECRET, { expiresIn: '1h' });

const studentToken = jwt.sign({
  id: 'student-1',
  role: 'student',
  email: 'student@test.com'
}, DEV_SECRET, { expiresIn: '1h' });

test.describe('Dataset Exports', () => {
  let requestId: string;

  test('Student cannot request export', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/data/exports/requests`, {
      headers: { Authorization: `Bearer ${studentToken}` },
      data: {
        dataset_type: 'journals',
        scope_level: 'cohort',
        requested_anonymization_level: 'pseudonymized',
        purpose: 'Research'
      }
    });
    expect(res.status()).toBe(403);
  });

  test('Researcher can request export', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/data/exports/requests`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
      data: {
        dataset_type: 'journals',
        scope_level: 'cohort',
        requested_anonymization_level: 'pseudonymized',
        purpose: 'Research analysis'
      }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.status).toBe('pending');
    requestId = body.id;
  });

  test('Admin can approve export request', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/data/exports/requests/${requestId}/approve`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        max_download_count: 2
      }
    });
    expect(res.status()).toBe(200);
  });

  test('Researcher can generate export', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/data/exports/requests/${requestId}/generate`, {
      headers: { Authorization: `Bearer ${researcherToken}` }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('completed');
  });

  test('Researcher can get download token', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/data/exports/requests/${requestId}/download-token`, {
      headers: { Authorization: `Bearer ${researcherToken}` }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.token).toBeDefined();
  });

  test('Researcher can download data with token', async ({ request }) => {
    // get token again
    const resTok = await request.post(`${BASE_URL}/api/data/exports/requests/${requestId}/download-token`, {
      headers: { Authorization: `Bearer ${researcherToken}` }
    });
    const { token } = await resTok.json();

    const resDownload = await request.get(`${BASE_URL}/api/data/exports/download/${token}`, { headers: { Authorization: `Bearer ${researcherToken}` } });
    expect(resDownload.status()).toBe(200);
    const text = await resDownload.text();
    expect(text).toBe("[]");
    
    // Trying third download should fail since max was 2
    // Download again to reach max
    const resDownload2 = await request.get(`${BASE_URL}/api/data/exports/download/${token}`, { headers: { Authorization: `Bearer ${researcherToken}` } });
    expect(resDownload2.status()).toBe(403); // token revoked
    
    // new token and download
    const resTok3 = await request.post(`${BASE_URL}/api/data/exports/requests/${requestId}/download-token`, {
      headers: { Authorization: `Bearer ${researcherToken}` }
    });
    const { token: token3 } = await resTok3.json();
    const resDownload3 = await request.get(`${BASE_URL}/api/data/exports/download/${token3}`, { headers: { Authorization: `Bearer ${researcherToken}` } });
    expect(resDownload3.status()).toBe(200);
    
    // now we are at max count
    const resTok4 = await request.post(`${BASE_URL}/api/data/exports/requests/${requestId}/download-token`, {
      headers: { Authorization: `Bearer ${researcherToken}` }
    });
    expect(resTok4.status()).toBe(403);
  });
});
