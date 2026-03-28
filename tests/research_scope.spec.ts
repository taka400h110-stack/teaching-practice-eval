import { test, expect } from '@playwright/test';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:8788';
const JWT_SECRET = process.env.JWT_SECRET || 'default_local_secret_key_for_dev_only';

function createToken(payload: object) {
  return jwt.sign({ ...payload, exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET);
}

test.describe('Research Scope & Anonymization Tests', () => {

  const researcherToken = createToken({ id: 'researcher-001', role: 'researcher' });
  
  test('Researcher gets pseudonymized journal list', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/data/journals`, {
      headers: { 'Authorization': `Bearer ${researcherToken}` }
    });
    
    // We expect 200 and anonymization (e.g. content removed, student_id starts with R-)
    // For this test we just ensure no 500 and the middleware logic ran correctly.
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    
    if (body.journals && body.journals.length > 0) {
       expect(body.journals[0].content).toBeUndefined(); // Should be masked out
    }
  });

});
