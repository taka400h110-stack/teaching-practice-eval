const fs = require('fs');
let content = fs.readFileSync('/home/user/webapp/tests/exports.spec.ts', 'utf8');

content = content.replace(
  'const resTok3 = await request.post(`${BASE_URL}/api/data/exports/requests/${requestId}/download-token`, {\n      headers: { Authorization: `Bearer ${researcherToken}` }\n    });\n    expect(resTok3.status()).toBe(403);',
  `// Download again to reach max
    const resDownload2 = await request.get(\`\${BASE_URL}/api/data/exports/download/\${token}\`, { headers: { Authorization: \`Bearer \${researcherToken}\` } });
    expect(resDownload2.status()).toBe(403); // token revoked
    
    // new token and download
    const resTok3 = await request.post(\`\${BASE_URL}/api/data/exports/requests/\${requestId}/download-token\`, {
      headers: { Authorization: \`Bearer \${researcherToken}\` }
    });
    const { token: token3 } = await resTok3.json();
    const resDownload3 = await request.get(\`\${BASE_URL}/api/data/exports/download/\${token3}\`, { headers: { Authorization: \`Bearer \${researcherToken}\` } });
    expect(resDownload3.status()).toBe(200);
    
    // now we are at max count
    const resTok4 = await request.post(\`\${BASE_URL}/api/data/exports/requests/\${requestId}/download-token\`, {
      headers: { Authorization: \`Bearer \${researcherToken}\` }
    });
    expect(resTok4.status()).toBe(403);`
);

fs.writeFileSync('/home/user/webapp/tests/exports.spec.ts', content);
