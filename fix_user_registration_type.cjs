const fs = require('fs');

let code = fs.readFileSync('src/pages/UserRegistrationPage.tsx', 'utf-8');

// RegisteredUser 型
code = code.replace(
  /role: UserRole;/g,
  `roles: UserRole[];`
);

// INITIAL_USERS の修正（もし残っていれば）
// code = code.replace(/role: "([^"]+)"/g, 'roles: ["$1"]'); // すでに置換されているはずだが

// ROLE_CONFIGS の中の role は単一の役職の定義なので `role: UserRole` のままでよい
// ただし前の置換で `roles: UserRole[];` になってしまっている場合は戻す
code = code.replace(
  /const ROLE_CONFIGS: Array<\{\n\s*roles: UserRole\[\];/g,
  `const ROLE_CONFIGS: Array<{\n  role: UserRole;`
);

code = code.replace(
  /roles:\s*"student",/g,
  `role: "student",`
);
code = code.replace(/roles:\s*"univ_teacher",/g, `role: "univ_teacher",`);
code = code.replace(/roles:\s*"school_mentor",/g, `role: "school_mentor",`);
code = code.replace(/roles:\s*"evaluator",/g, `role: "evaluator",`);
code = code.replace(/roles:\s*"researcher",/g, `role: "researcher",`);
code = code.replace(/roles:\s*"collaborator",/g, `role: "collaborator",`);
code = code.replace(/roles:\s*"board_observer",/g, `role: "board_observer",`);
code = code.replace(/roles:\s*"admin",/g, `role: "admin",`);

// users.filter の修正
code = code.replace(
  /const cnt = users\.filter\(\(u\) => u\.roles\?\.includes\(r\.role\)\)\.length;/g,
  `const cnt = users.filter((u) => u.roles && u.roles.includes(r.role)).length;`
);

// setSelectedRole 関連
code = code.replace(
  /const \[selectedRole, setSelectedRole\] = useState<UserRole>\("student"\);/g,
  `const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(["student"]);`
);

fs.writeFileSync('src/pages/UserRegistrationPage.tsx', code);
console.log('Fixed types in UserRegistrationPage');
