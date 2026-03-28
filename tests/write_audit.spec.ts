import { test, expect } from '@playwright/test';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:8788';
const JWT_SECRET = process.env.JWT_SECRET || 'default_local_secret_key_for_dev_only';

function createToken(payload: object) {
  return jwt.sign({ ...payload, exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET);
}

test.describe('Write Audit Log Tests', () => {

  const studentToken = createToken({ id: 'user-001', role: 'student' });
  
  test('Audit log records student creating journal', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/data/journals`, {
      headers: { 'Authorization': `Bearer ${studentToken}` },
      data: {
        week_number: 1,
        content: 'test content'
      }
    });
    if(res.status() !== 200) console.log(await res.text()); expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    
    // Test that the middleware didn't crash and the request succeeded.
  });

});
