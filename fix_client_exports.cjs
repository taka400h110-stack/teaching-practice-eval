const fs = require('fs');
const path = '/home/user/webapp/src/api/client.ts';
let content = fs.readFileSync(path, 'utf8');

const start = content.indexOf('// SCAT API');
const end = content.indexOf('getResponses: async');
if (start !== -1 && end !== -1) {
  const scatStr = content.substring(start, end);
  content = content.replace(scatStr, '');
  
  const mockApiEnd = content.indexOf('};\n\nexport default mockApi;');
  content = content.substring(0, mockApiEnd) + ',\n  ' + scatStr + content.substring(mockApiEnd);
}

fs.writeFileSync(path, content);
