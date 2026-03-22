const fs = require('fs');
let clientTs = fs.readFileSync('/home/user/webapp/src/api/client.ts', 'utf8');

const apiFetchFunc = `
export async function apiFetch(url: string, options: RequestInit = {}) {
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

if (!clientTs.includes('export async function apiFetch')) {
  clientTs = apiFetchFunc + '\n' + clientTs;
  
  // replace all remaining fetch calls inside client.ts
  clientTs = clientTs.replace(/await fetch\(/g, 'await apiFetch(');
  clientTs = clientTs.replace(/, "Authorization": `Bearer \$\{localStorage\.getItem\('auth_token'\)\}`/g, '');
  clientTs = clientTs.replace(/, 'Authorization': `Bearer \$\{localStorage\.getItem\('auth_token'\)\}`/g, '');
  clientTs = clientTs.replace(/'Authorization': `Bearer \$\{localStorage\.getItem\('auth_token'\)\}`/g, '');
  
  fs.writeFileSync('/home/user/webapp/src/api/client.ts', clientTs);
  console.log('Added apiFetch to client.ts');
} else {
  console.log('Already exists');
}
