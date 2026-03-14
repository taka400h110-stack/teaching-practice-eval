const fs = require('fs');

let code = fs.readFileSync('src/api/client.ts', 'utf-8');

// DemoUserDef の修正
code = code.replace(/type DemoUserDef = \{[^}]+\};/, `type DemoUserDef = {\n  email: string;\n  name: string;\n  roles: UserRole[];\n  student_number?: string;\n  grade?: number;\n  school_type?: "elementary" | "middle" | "high" | "special";\n  internship_type?: "intensive" | "distributed";\n  weeks?: number;\n  organization?: string;\n  position?: string;\n};`);

code = code.replace(
  /role:\s*"([^"]+)"/g,
  `roles: ["$1"]`
);

// 複数置き換わってしまった ChatMessage の role を戻す
code = code.replace(/roles: \["user"\]/g, 'role: "user"');
code = code.replace(/roles: \["assistant"\]/g, 'role: "assistant"');

fs.writeFileSync('src/api/client.ts', code);
