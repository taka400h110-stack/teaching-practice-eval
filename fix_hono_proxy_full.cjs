const fs = require('fs');

let file = fs.readFileSync('src/api/routes/stats.ts', 'utf8');

// Update Missing Data Endpoint to use proxy
file = file.replace(/statsRouter\.post\("\/missing-data-process", async \(c\) => \{[\s\S]*?try \{/, 
`statsRouter.post("/missing-data-process", async (c) => {
  const body = await c.req.json() as {
    data: (number | null)[][];
    method?: "listwise" | "fcs" | "mean_imputation";
  };
  try {
    const STATS_API_URL = c.env?.STAT_API_URL as string | undefined;
    if (STATS_API_URL) {
      const response = await fetch(\`\${STATS_API_URL}/api/missing-data\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (response.ok) return c.json(await response.json());
    }`);

// Update LCGA Endpoint to use proxy
file = file.replace(/statsRouter\.post\("\/lcga", async \(c\) => \{[\s\S]*?try \{/, 
`statsRouter.post("/lcga", async (c) => {
  const body = await c.req.json() as {
    weekly_scores: number[][];
    max_classes?: number;
  };
  try {
    const STATS_API_URL = c.env?.STAT_API_URL as string | undefined;
    if (STATS_API_URL) {
      const response = await fetch(\`\${STATS_API_URL}/api/lcga\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (response.ok) return c.json(await response.json());
    }`);

// Update LGCM Endpoint to use proxy
file = file.replace(/statsRouter\.post\("\/lgcm", async \(c\) => \{[\s\S]*?try \{/, 
`statsRouter.post("/lgcm", async (c) => {
  const body = await c.req.json() as {
    weekly_scores: number[][];  // [student][week]
    factor?: string;
  };
  try {
    const STATS_API_URL = c.env?.STAT_API_URL as string | undefined;
    if (STATS_API_URL) {
      const response = await fetch(\`\${STATS_API_URL}/api/lgcm\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (response.ok) return c.json(await response.json());
    }`);

fs.writeFileSync('src/api/routes/stats.ts', file);
