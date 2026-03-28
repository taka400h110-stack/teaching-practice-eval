const fs = require('fs');

let content = fs.readFileSync('/home/user/webapp/src/api/routes/exports.ts', 'utf-8');

// fix anonLevel
content = content.replace(/anonymizationLevel: String\(anonLevel\),/g, "anonymizationLevel: anonLevel as 'raw' | 'pseudonymized' | 'aggregated',");

// fix headers issue
content = content.replace(/object\.writeHttpMetadata\(headers\);/g, 'object.writeHttpMetadata(headers as any);');
content = content.replace(/return new Response\(object\.body, \{ headers \}\);/g, 'return new Response(object.body as any, { headers });');

fs.writeFileSync('/home/user/webapp/src/api/routes/exports.ts', content);
