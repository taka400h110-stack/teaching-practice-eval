const fs = require('fs');

let code = fs.readFileSync('src/pages/UserRegistrationPage.tsx', 'utf-8');

// DEMO_INITIAL_USERS の部分は roles: ["..."] に戻す
code = code.replace(/name: "山田 太郎",\s*role: "student"/g, 'name: "山田 太郎",   roles: ["student"]');
code = code.replace(/name: "佐藤 花子",\s*role: "univ_teacher"/g, 'name: "佐藤 花子",   roles: ["univ_teacher"]');
code = code.replace(/name: "鈴木 一郎",\s*role: "school_mentor"/g, 'name: "鈴木 一郎",   roles: ["school_mentor"]');
code = code.replace(/name: "田中 管理者",\s*role: "admin"/g, 'name: "田中 管理者", roles: ["admin"]');
code = code.replace(/name: "伊藤 研究者",\s*role: "researcher"/g, 'name: "伊藤 研究者", roles: ["researcher"]');
code = code.replace(/name: "渡辺 協力者",\s*role: "collaborator"/g, 'name: "渡辺 協力者", roles: ["collaborator"]');
code = code.replace(/name: "中村 委員",\s*role: "board_observer"/g, 'name: "中村 委員",   roles: ["board_observer"]');
code = code.replace(/name: "小林 評価者",\s*role: "evaluator"/g, 'name: "小林 評価者", roles: ["evaluator"]');

fs.writeFileSync('src/pages/UserRegistrationPage.tsx', code);
