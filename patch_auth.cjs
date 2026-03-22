const fs = require('fs');

let indexTsx = fs.readFileSync('/home/user/webapp/src/index.tsx', 'utf8');

// replace authMiddleware implementation
const oldMiddleware = `// 簡易的な認証ミドルウェア
export const authMiddleware = async (c: Context, next: Next) => {
  // /auth はスキップ
  if (c.req.path.startsWith('/api/data/auth') || c.req.path === '/api/health') {
    await next();
    return;
  }
  
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // 互換性のため一旦X-User-Roleも許容するが推奨しない
    const fallbackRole = c.req.header("X-User-Role");
    if (fallbackRole) {
      c.set("user", { role: fallbackRole, id: 'unknown' });
      await next();
      return;
    }
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    const token = authHeader.split(" ")[1];
    const user = JSON.parse(atob(token));
    c.set("user", user);
    await next();
  } catch (err) {
    return c.json({ error: "Invalid token" }, 401);
  }
};`;

const newMiddleware = `import { verify } from 'hono/jwt';

// 本格的なJWT認証ミドルウェア
export const authMiddleware = async (c: Context, next: Next) => {
  // /auth と healthcheck はスキップ
  if (c.req.path.startsWith('/api/data/auth') || c.req.path === '/api/health') {
    await next();
    return;
  }
  
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized: Missing or invalid Authorization header" }, 401);
  }
  
  try {
    const token = authHeader.split(" ")[1];
    const secret = (c.env as any)?.JWT_SECRET || "default_local_secret_key_for_dev_only";
    const payload = await verify(token, secret);
    c.set("user", payload);
    await next();
  } catch (err) {
    console.error("JWT Verification failed:", err);
    return c.json({ error: "Unauthorized: Invalid token" }, 401);
  }
};`;

if (indexTsx.includes('JSON.parse(atob(token))')) {
  indexTsx = indexTsx.replace(oldMiddleware, newMiddleware);
  fs.writeFileSync('/home/user/webapp/src/index.tsx', indexTsx);
  console.log('Updated src/index.tsx authMiddleware');
} else {
  console.log('Could not find old middleware in src/index.tsx');
}

// ------------------------------------
// Update data.ts
// ------------------------------------
let dataTs = fs.readFileSync('/home/user/webapp/src/api/routes/data.ts', 'utf8');

// 1. Add password_hash to schema
dataTs = dataTs.replace(
  "grade INTEGER,",
  "grade INTEGER,\n      password_hash TEXT,"
);

// 2. Add safe alter table for password_hash
const alterTableCode = `
  try {
    await db.prepare("ALTER TABLE users ADD COLUMN password_hash TEXT;").run();
  } catch(e) {
    // Ignore if column already exists
  }
`;
dataTs = dataTs.replace(
  "// デモユーザーの初期化",
  alterTableCode + "\n    // デモユーザーの初期化"
);

// 3. Update seed users with password_hash
// hashed password for 'password'
const defaultHash = "$2b$10$lHMsxgQ9lQLjT98iedCPm..oZV4CKKRk3u6sq8XlSmRUEy0weKdh6";
dataTs = dataTs.replace(
  "INSERT INTO users (id, email, name, role, student_number, grade) VALUES ",
  "INSERT INTO users (id, email, name, role, student_number, grade, password_hash) VALUES "
);
dataTs = dataTs.replace(/\('user-001'.*?\),/g, match => match.replace("),", `, '${defaultHash}'),`));
dataTs = dataTs.replace(/\('user-002'.*?\),/g, match => match.replace("),", `, '${defaultHash}'),`));
dataTs = dataTs.replace(/\('user-003'.*?\),/g, match => match.replace("),", `, '${defaultHash}'),`));
dataTs = dataTs.replace(/\('user-004'.*?\),/g, match => match.replace("),", `, '${defaultHash}'),`));
dataTs = dataTs.replace(/\('user-005'.*?\),/g, match => match.replace("),", `, '${defaultHash}'),`));
dataTs = dataTs.replace(/\('user-006'.*?\),/g, match => match.replace("),", `, '${defaultHash}'),`));
dataTs = dataTs.replace(/\('user-007'.*?\),/g, match => match.replace("),", `, '${defaultHash}'),`));
dataTs = dataTs.replace(/\('user-008'.*?\)\]*/g, match => match.replace(")", `, '${defaultHash}')`)); // Last one doesn't have trailing comma in standard case, but could have it depending on the match


// 4. Rewrite /auth/login route to use bcryptjs and hono/jwt
const oldLoginRouteRegex = /dataRouter\.post\("\/auth\/login", async \(c\) => \{[\s\S]*?\}\);/g;

const newLoginRoute = `import bcrypt from "bcryptjs";
import { sign } from "hono/jwt";

dataRouter.post("/auth/login", async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  
  const body = await c.req.json();
  const { email, password } = body;
  
  if (!email || !password) {
    return c.json({ error: "Email and password required" }, 400);
  }
  
  try {
    const user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
    if (!user) {
      return c.json({ error: "User not found" }, 401);
    }
    
    // Check password
    if (user.password_hash) {
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return c.json({ error: "Invalid credentials" }, 401);
      }
    } else {
      // For legacy seed users that don't have password_hash, let's accept 'password' and update hash later ideally, but here just reject
      if (password !== 'password') {
        return c.json({ error: "Invalid credentials" }, 401);
      }
    }
    
    const secret = (c.env as any)?.JWT_SECRET || "default_local_secret_key_for_dev_only";
    
    // Generate actual JWT
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours expiration
    };
    
    const token = await sign(payload, secret);
    
    return c.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        student_number: user.student_number,
        grade: user.grade
      }, 
      token 
    });
  } catch (err) {
    console.error("Login error:", err);
    return c.json({ error: String(err) }, 500);
  }
});`;

if (dataTs.match(oldLoginRouteRegex)) {
  dataTs = dataTs.replace(oldLoginRouteRegex, newLoginRoute);
} else {
  console.log("Could not find /auth/login route in data.ts");
}

fs.writeFileSync('/home/user/webapp/src/api/routes/data.ts', dataTs);
console.log('Updated src/api/routes/data.ts');

