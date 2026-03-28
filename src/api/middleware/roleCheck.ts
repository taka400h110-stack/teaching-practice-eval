import { Context, Next } from "hono";
import { UserRole } from "../../types";

export const requireRoles = (allowedRoles: UserRole[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    if (!user || !user.role) {
      return c.json({ success: false, error: "unauthorized", message: "User not authenticated or role missing" }, 401);
    }
    
    // Support either roles array or single role string
    const userRoles: string[] = user.roles || [user.role];
    const hasRole = userRoles.some(r => allowedRoles.includes(r as UserRole));
    
    if (!hasRole) {
      return c.json({ success: false, error: "forbidden", message: "You do not have permission to access this resource." }, 403);
    }
    
    await next();
  };
};
