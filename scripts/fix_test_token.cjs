const fs = require('fs');
const path = require('path');

const pwPath = path.join(__dirname, '../tests/admin-cleanup-metrics.spec.ts');
let pwContent = fs.readFileSync(pwPath, 'utf8');

// The base64 encoding is failing hono/jwt verification because it uses standard btoa instead of base64url.
// Let's replace createJwt function

pwContent = pwContent.replace(/function createJwt[\s\S]*?return[^;]+;/m, `
function base64url(source) {
  let encodedSource = Buffer.from(source).toString('base64');
  encodedSource = encodedSource.replace(/=+$/, '');
  encodedSource = encodedSource.replace(/\\+/g, '-');
  encodedSource = encodedSource.replace(/\\//g, '_');
  return encodedSource;
}

function createJwt(role: string, userId: string) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify({ 
    sub: userId, 
    role, 
    roles: [role],
    exp: Math.floor(Date.now() / 1000) + 3600,
    user: { id: userId, email: userId + "@example.com", name: "Test", role }
  }));
  // Import crypto from node in test context
  const crypto = require('crypto');
  const signatureInput = encodedHeader + '.' + encodedPayload;
  const signature = crypto.createHmac('sha256', 'default_local_secret_key_for_dev_only').update(signatureInput).digest('base64');
  const encodedSignature = base64url(Buffer.from(signature, 'base64'));
  return signatureInput + '.' + encodedSignature;
}
`);

fs.writeFileSync(pwPath, pwContent);
