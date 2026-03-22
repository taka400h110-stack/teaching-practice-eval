const fs = require('fs');

let content = fs.readFileSync('src/api/routes/data.ts', 'utf8');

const authCheck = `
  const role = c.req.header("X-User-Role");
  if (role !== "researcher" && role !== "admin") return c.text("Forbidden", 403);
`;

function addAuthCheck(endpoint) {
  const marker = `dataRouter.get("${endpoint}", async (c) => {\n  const db`;
  const replacement = `dataRouter.get("${endpoint}", async (c) => {\n${authCheck}\n  const db`;
  content = content.replace(marker, replacement);
}

addAuthCheck('/export/evaluations-csv');
addAuthCheck('/export/reliability-csv');

fs.writeFileSync('src/api/routes/data.ts', content);
console.log("Auth checks added to data exports.");
