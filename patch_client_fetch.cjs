const fs = require('fs');

let clientTs = fs.readFileSync('/home/user/webapp/src/api/client.ts', 'utf8');

const apiFetchFunc = `
async function apiFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');
  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': \`Bearer \${token}\` } : {})
  };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem("user_info");
    localStorage.removeItem("auth_token");
    window.location.href = '/login';
    throw new Error("Unauthorized or token expired");
  }
  return res;
}
`;

if (!clientTs.includes('async function apiFetch')) {
  // insert after imports
  clientTs = clientTs.replace(
    /import \{ User, [\s\S]*?\} from "\.\/types";/,
    `import { User, JournalEntry, EvaluationResult, SelfEvaluation, GoalEntry, ChatSession, ChatMessage, HumanEvalEntry } from "./types";\n${apiFetchFunc}`
  );
  
  // replace all fetch calls inside apiClient (except the ones already handled if any)
  clientTs = clientTs.replace(/await fetch\(/g, 'await apiFetch(');
  
  // remove redundant Authorization headers manually added before
  clientTs = clientTs.replace(/, "Authorization": `Bearer \$\{localStorage\.getItem\('auth_token'\)\}`/g, '');
  clientTs = clientTs.replace(/, 'Authorization': `Bearer \$\{localStorage\.getItem\('auth_token'\)\}`/g, '');
  clientTs = clientTs.replace(/'Authorization': `Bearer \$\{localStorage\.getItem\('auth_token'\)\}`/g, '');
  
  fs.writeFileSync('/home/user/webapp/src/api/client.ts', clientTs);
  console.log('Updated client.ts to use apiFetch');
} else {
  console.log('Already has apiFetch');
}
