const fs = require('fs');

let code = fs.readFileSync('src/components/AppLayout.tsx', 'utf-8');

// AppLayout.tsx 内の "管理者（admin）: 全メニュー" の部分を書き換える
code = code.replace(
  /\/\/ ── 管理者（admin）: 全メニュー ──\n  if \(role === "admin"\) \{[\s\S]*?\n  \}/g,
  `// ── 管理者（admin）: 管理機能のみ ──\n  if (role === "admin") {\n    return [\n      {\n        group: "システム管理",\n        items: [\n          { label: "管理ダッシュボード", path: "/admin",     icon: <AdminPanelSettingsIcon /> },\n          { label: "ユーザー登録",       path: "/register-user", icon: <PersonAddIcon /> },\n        ],\n      },\n    ];\n  }`
);

// 既存のコードが return [...] で終わっていた場合の対応
code = code.replace(
  /\/\/ ── 管理者（admin）: 全メニュー ──[\s\S]*?\];\n\}/g,
  `// ── 管理者（admin）: 管理機能のみ ──\n  if (role === "admin") {\n    return [\n      {\n        group: "システム管理",\n        items: [\n          { label: "管理ダッシュボード", path: "/admin",     icon: <AdminPanelSettingsIcon /> },\n          { label: "ユーザー登録",       path: "/register-user", icon: <PersonAddIcon /> },\n        ],\n      },\n    ];\n  }\n  return [];\n}`
);

fs.writeFileSync('src/components/AppLayout.tsx', code);
console.log('Fixed admin menu in AppLayout.tsx');
