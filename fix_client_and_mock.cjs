const fs = require('fs');

// client.ts のエラー修正
let client = fs.readFileSync('src/api/client.ts', 'utf-8');
client = client.replace(/roles: \["([^"]+)"\]/g, 'role: "$1"');
// user.role の型エラーは残るかもしれないので、型定義の部分だけ直す

// User型では roles: UserRole[]; にしたが、
// ChatMessage型には role: "user" | "assistant" がある。
// UserRegistrationPage には SelectedRoles があるが変数の置き換えが失敗している。
fs.writeFileSync('src/api/client.ts', client);

// mockData.ts のエラー修正
let mock = fs.readFileSync('src/mocks/mockData.ts', 'utf-8');
mock = mock.replace(/roles: \["([^"]+)"\]/g, 'roles: ["$1"]'); // mockDataでは rolesのままでよいが
// ただし ChatMessage の role は rolesではなく role: "assistant"|"user"
mock = mock.replace(/roles: \["user"\]/g, 'role: "user"');
mock = mock.replace(/roles: \["assistant"\]/g, 'role: "assistant"');
fs.writeFileSync('src/mocks/mockData.ts', mock);

console.log('Fixed client.ts and mockData.ts');
