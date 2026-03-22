const fs = require('fs');

let content = fs.readFileSync('src/api/routes/stats.ts', 'utf8');

const authMiddleware = `
statsRouter.use("*", async (c, next) => {
  // Only apply to actual API endpoints, not health checks or CORS preflights if any
  if (c.req.method === 'OPTIONS') {
    return next();
  }
  const role = c.req.header("X-User-Role");
  if (role !== "researcher" && role !== "admin") {
    return c.json({ error: "Forbidden: researcher or admin role required" }, 403);
  }
  await next();
});
`;

if (!content.includes('role !== "researcher"')) {
  content = content.replace('statsRouter.use("*", cors());', 'statsRouter.use("*", cors());\n' + authMiddleware);
  fs.writeFileSync('src/api/routes/stats.ts', content);
  console.log("Auth middleware added to stats.ts");
} else {
  console.log("Auth middleware already exists in stats.ts");
}
