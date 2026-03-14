const fs = require('fs');
let file = fs.readFileSync('src/api/routes/stats.ts', 'utf8');

// Replace top logic to handle STAT_API_URL
const proxyCode = `
const STATS_API_URL = c.env?.STAT_API_URL;
  if (STATS_API_URL) {
    try {
      const response = await fetch(\`\${STATS_API_URL}/api/icc\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (response.ok) {
        return c.json(await response.json());
      }
    } catch (e) {
      console.warn("External STAT_API failed, falling back to local approximation", e);
    }
  }
`;

file = file.replace(/statsRouter\.post\("\/icc", async \(c\) => \{\n  const body = await c\.req\.json\(\) as \{/m, 
`statsRouter.post("/icc", async (c) => {
  const body = await c.req.json() as {`);
  
file = file.replace(/try \{\n    const result = computeICC21\(body\.ratings\);/, 
`try {
    const STATS_API_URL = c.env?.STAT_API_URL as string | undefined;
    if (STATS_API_URL) {
      const response = await fetch(\`\${STATS_API_URL}/api/icc\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (response.ok) return c.json(await response.json());
    }
    const result = computeICC21(body.ratings);`);

file = file.replace(/statsRouter\.post\("\/bland-altman", async \(c\) => \{[\s\S]*?try \{/m, 
`statsRouter.post("/bland-altman", async (c) => {
  const body = await c.req.json() as {
    method1: number[];
    method2: number[];
    factor?: string;
  };
  try {
    const STATS_API_URL = c.env?.STAT_API_URL as string | undefined;
    if (STATS_API_URL) {
      const response = await fetch(\`\${STATS_API_URL}/api/bland-altman\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (response.ok) return c.json(await response.json());
    }
`);

fs.writeFileSync('src/api/routes/stats.ts', file);

// Update types
let types = fs.readFileSync('src/types/index.ts', 'utf8');
if (!types.includes('STAT_API_URL?: string;')) {
  fs.writeFileSync('src/types/index.ts', types + '\nexport interface CloudflareBindings {\n  DB: any;\n  STAT_API_URL?: string;\n}\n');
}

