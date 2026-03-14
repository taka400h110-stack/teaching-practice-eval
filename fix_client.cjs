const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/api/client.ts');
let content = fs.readFileSync(file, 'utf8');

// Fix missing emails
content = content.replace(/id: "user-001", name: "山田 太郎"/g, 'id: "user-001", email: "student@teaching-eval.jp", name: "山田 太郎"');
content = content.replace(/id: "user-002", name: "佐藤 花子"/g, 'id: "user-002", email: "teacher@teaching-eval.jp", name: "佐藤 花子"');
content = content.replace(/id: "user-003", name: "鈴木 一郎"/g, 'id: "user-003", email: "mentor@teaching-eval.jp", name: "鈴木 一郎"');
content = content.replace(/id: "user-004", name: "田中 管理者"/g, 'id: "user-004", email: "admin@teaching-eval.jp", name: "田中 管理者"');
content = content.replace(/id: "user-005", name: "伊藤 研究者"/g, 'id: "user-005", email: "researcher@teaching-eval.jp", name: "伊藤 研究者"');
content = content.replace(/id: "user-006", name: "渡辺 協力者"/g, 'id: "user-006", email: "collaborator@teaching-eval.jp", name: "渡辺 協力者"');
content = content.replace(/id: "user-007", name: "中村 委員"/g, 'id: "user-007", email: "observer@teaching-eval.jp", name: "中村 委員"');
content = content.replace(/id: "user-008", name: "小林 評価者"/g, 'id: "user-008", email: "evaluator@teaching-eval.jp", name: "小林 評価者"');

// Fix role to roles
content = content.replace(/demo\.role/g, 'demo.roles[0]');
content = content.replace(/demo\.roles as unknown as UserRole/g, 'demo.roles[0]');

fs.writeFileSync(file, content);
console.log("Fixed client.ts");
