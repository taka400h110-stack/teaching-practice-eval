const fs = require('fs');

let code = fs.readFileSync('src/pages/UserRegistrationPage.tsx', 'utf-8');

code = code.replace(/roles: \["([^"]+)"\]/g, 'role: "$1"');

// filterの修正など、まだ残っているかも
code = code.replace(/selectedRole/g, 'selectedRoles');
code = code.replace(/setSelectedRole/g, 'setSelectedRoles');
// selectedRoles は配列なので、<Select>のvalueに入れている部分を適切に。すでに複数対応はしているが、変数名がおかしかった可能性。
// すでに修正済みかもしれないので、ひとまず role: "..." に戻す。

// 416, 418 行目の cfg
code = code.replace(/cfg\?/g, 'c?');
code = code.replace(/cfg!/g, 'c!');

fs.writeFileSync('src/pages/UserRegistrationPage.tsx', code);
