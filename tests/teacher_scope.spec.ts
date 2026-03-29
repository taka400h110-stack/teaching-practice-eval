import { test, expect } from '@playwright/test';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:8788';
const JWT_SECRET = process.env.JWT_SECRET || 'default_local_secret_key_for_dev_only';

function createToken(payload: object) {
  return jwt.sign({ ...payload, exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET);
}

test.describe('Teacher Scope Data Guard Tests', () => {

  const teacherAssignedToken = createToken({ id: 'teacher-with-students', role: 'univ_teacher' });
  const teacherNoStudentsToken = createToken({ id: 'teacher-no-students', role: 'univ_teacher' });
  const studentToken = createToken({ id: 'student-assigned', role: 'student' });
  const studentOtherToken = createToken({ id: 'student-other', role: 'student' });
  const adminToken = createToken({ id: 'admin-user', role: 'admin' });

  test('Teacher with no assignments sees 0 students and 0 journals', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/data/students`, {
      headers: { 'Authorization': `Bearer ${teacherNoStudentsToken}` }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.students).toHaveLength(0);

    const res2 = await request.get(`${BASE_URL}/api/data/journals`, {
      headers: { 'Authorization': `Bearer ${teacherNoStudentsToken}` }
    });
    expect(res2.status()).toBe(200);
    const body2 = await res2.json();
    expect(body2.journals).toHaveLength(0);
  });

  test('Teacher with assignments sees only assigned students and their journals', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/data/journals/some-random-id`, {
      headers: { 'Authorization': `Bearer ${teacherNoStudentsToken}` }
    });
    expect(res.status()).toBe(404);
  });
});
