const fs = require('fs');

// 1. src/types/index.ts の修正
let typesFile = fs.readFileSync('src/types/index.ts', 'utf-8');
// role: UserRole; を role: UserRole | UserRole[]; に変更する
typesFile = typesFile.replace(/role:\s*UserRole;/g, "roles: UserRole[]; // 複数兼任対応");
// 念のため role が残っていないか確認
fs.writeFileSync('src/types/index.ts', typesFile);

// 2. src/mocks/mockData.ts の修正
let mockFile = fs.readFileSync('src/mocks/mockData.ts', 'utf-8');
mockFile = mockFile.replace(/role:\s*"([^"]+)"/g, 'roles: ["$1"]');
fs.writeFileSync('src/mocks/mockData.ts', mockFile);

// 3. src/api/client.ts の修正
let clientFile = fs.readFileSync('src/api/client.ts', 'utf-8');
clientFile = clientFile.replace(/role:\s*"([^"]+)"/g, 'roles: ["$1"]');
fs.writeFileSync('src/api/client.ts', clientFile);

console.log('Fixed basic types and mock data for roles.');
