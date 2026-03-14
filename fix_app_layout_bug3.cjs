const fs = require('fs');

let code = fs.readFileSync('src/components/AppLayout.tsx', 'utf-8');

// 321行目付近の role を roles[0] にする、もしくは map を使う
// 先ほどの置換で失敗したところを修正
code = code.replace(
  /<Chip\n\s*label=\{ROLE_LABEL\[role\] \?\? role\}\n\s*size="small"/g,
  `{roles.map(r => (\n              <Chip\n                key={r}\n                label={ROLE_LABEL[r as UserRole] ?? r}\n                size="small"`
);

// 358行目付近の {!role === "student" && ( を {!roles.includes("student") && ( に直す
code = code.replace(/\{!role === "student" && \(/g, '{!roles.includes("student") && (');

// 念のため、見落としを正規表現でさらにチェック
code = code.replace(/ROLE_LABEL\[role\]/g, 'ROLE_LABEL[roles[0] as UserRole]');
code = code.replace(/\?\? role\}/g, '?? roles[0]}');

fs.writeFileSync('src/components/AppLayout.tsx', code);
