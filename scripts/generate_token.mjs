import crypto from 'crypto';

function base64url(source) {
  let encodedSource = Buffer.from(source).toString('base64');
  encodedSource = encodedSource.replace(/=+$/, '');
  encodedSource = encodedSource.replace(/\+/g, '-');
  encodedSource = encodedSource.replace(/\//g, '_');
  return encodedSource;
}

function generateJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signatureInput = encodedHeader + '.' + encodedPayload;
  const signature = crypto.createHmac('sha256', secret).update(signatureInput).digest('base64');
  const encodedSignature = base64url(Buffer.from(signature, 'base64'));
  return signatureInput + '.' + encodedSignature;
}

const token = generateJwt({
  sub: 'admin-1',
  role: 'admin',
  roles: ['admin'],
  exp: Math.floor(Date.now() / 1000) + 3600
}, 'default_local_secret_key_for_dev_only');

console.log(token);
