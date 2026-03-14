const fs = require('fs');

let code = fs.readFileSync('src/components/AppLayout.tsx', 'utf-8');

// src/components/AppLayout.tsx の roles の部分を直す
// ChipやAvatarのところを直す
code = code.replace(/\{user && !user\.roles && \(user as any\)\.role\) roles\.push\(\(user as any\)\.role\);/g, '{user && !(user as any).roles && (user as any).role) roles.push((user as any).role);');

// `role === "student"` で判定している部分（ユーザー情報表示など）を `roles.includes("student")` に直す
// さっき戻してしまったので
code = code.replace(/\{role === "student" && \(/g, '{roles.includes("student") && (');
code = code.replace(/\{role !== "student" && \(/g, '{!roles.includes("student") && (');

// ROLE_COLOR[roles[0]] などのエラー
code = code.replace(/ROLE_COLOR\[roles\[0\]\]/g, 'ROLE_COLOR[roles[0] as UserRole]');

fs.writeFileSync('src/components/AppLayout.tsx', code);
