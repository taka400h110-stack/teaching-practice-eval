const fs = require('fs');
const path = require('path');

const clientPath = path.join(__dirname, '../src/api/client.ts');
let content = fs.readFileSync(clientPath, 'utf8');

if (!content.includes('acknowledgeCleanupFailureAlert')) {
  content += `
export async function acknowledgeCleanupFailureAlert(fingerprint: string, status: "acknowledged" | "investigating" | "resolved", note?: string): Promise<any> {
  const token = getToken();
  const res = await fetch(\`\${API_BASE_URL}/api/admin/alerts/cleanup-failure/acknowledge\`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: \`Bearer \${token}\` } : {}),
    },
    body: JSON.stringify({ fingerprint, status, note }),
  });
  if (!res.ok) {
    throw new Error(\`Failed to acknowledge cleanup alert: \${res.status}\`);
  }
  return res.json();
}
`;
  fs.writeFileSync(clientPath, content);
}
console.log("Updated client.ts");
