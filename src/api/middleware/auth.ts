import { Context, Next } from "hono";
import { verify } from 'hono/jwt';
import { UserRole } from "../../types";

export const requireAuth = async (c: Context, next: Next) => {
  // Check if skipped (auth endpoints)
  if (c.req.path.startsWith('/api/data/auth') || c.req.path === '/api/health') {
    await next();
    return;
  }
  
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, error: "unauthorized", message: "Missing or invalid Authorization header" }, 401);
  }
  
  try {
    const token = authHeader.split(" ")[1];
    const secret = (c.env as any)?.JWT_SECRET || "default_local_secret_key_for_dev_only";
    const payload = await verify(token, secret, "HS256");
    c.set("user", payload);
    await next();
  } catch (err) {
    console.error("JWT Verification failed:", err);
    return c.json({ success: false, error: "unauthorized", message: "Invalid or expired token" }, 401);
  }
};

export const requireRoles = (allowedRoles: UserRole[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    if (!user || !user.role) {
      return c.json({ success: false, error: "unauthorized", message: "User not authenticated or role missing" }, 401);
    }
    
    const userRoles: string[] = (user.roles || [user.role]).map((r: string) => r.toLowerCase());
    const hasRole = userRoles.some(r => allowedRoles.includes(r as UserRole));
    
    if (!hasRole) {
      return c.json({ success: false, error: "forbidden", message: "You do not have permission to access this resource." }, 403);
    }
    
    await next();
  };
};
