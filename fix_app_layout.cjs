const fs = require('fs');

let code = fs.readFileSync('src/components/AppLayout.tsx', 'utf-8');

// role: UserRole -> roles: UserRole[] に修正
code = code.replace(
  /const role: UserRole = user\?\.role \?\? "student";/g,
  `const roles: UserRole[] = user?.roles ?? ["student"];\n  // 下位互換性のため古い role も fallback として扱う\n  if (user && !user.roles && (user as any).role) roles.push((user as any).role);`
);

// getNavGroups の引数を role: UserRole から roles: UserRole[] に変更
// そして、各Roleについてグループを取得して、同名グループがあればマージする
code = code.replace(
  /function getNavGroups\(role: UserRole\): NavGroup\[\] \{/g,
  `function getNavGroupsForSingleRole(role: UserRole): NavGroup[] {`
);

code = code.replace(
  /\/\/ ────────────────────────────────────────────\n\/\/ コンポーネント本体/g,
  `function getNavGroups(roles: UserRole[]): NavGroup[] {\n  const merged = new Map<string, NavItem[]>();\n  roles.forEach(role => {\n    const groups = getNavGroupsForSingleRole(role);\n    groups.forEach(g => {\n      if (!merged.has(g.group)) merged.set(g.group, []);\n      const items = merged.get(g.group)!;\n      g.items.forEach(item => {\n        if (!items.find(i => i.path === item.path)) items.push(item);\n      });\n    });\n  });\n  return Array.from(merged.entries()).map(([group, items]) => ({ group, items }));\n}\n\n// ────────────────────────────────────────────\n// コンポーネント本体`
);

code = code.replace(
  /const navGroups = getNavGroups\(role\);/g,
  `const navGroups = getNavGroups(roles);`
);

code = code.replace(
  /bgcolor: ROLE_COLOR\[role\] \?\? "primary\.main"/g,
  `bgcolor: ROLE_COLOR[roles[0]] ?? "primary.main"`
);

// Chipの複数表示
code = code.replace(
  /<Chip\n\s*label=\{ROLE_LABEL\[role\] \?\? role\}\n\s*size="small"\n\s*sx=\{\{\n\s*fontSize: 9, height: 16,\n\s*bgcolor: ROLE_COLOR\[role\] \?\? "primary\.main",\n\s*color: "white", mt: 0\.3, mb: 0\.3,\n\s*\}\}\n\s*\/>/g,
  `{roles.map(r => (\n              <Chip\n                key={r}\n                label={ROLE_LABEL[r] ?? r}\n                size="small"\n                sx={{\n                  fontSize: 9, height: 16,\n                  bgcolor: ROLE_COLOR[r] ?? "primary.main",\n                  color: "white", mt: 0.3, mb: 0.3, mr: 0.5\n                }}\n              />\n            ))}`
);

code = code.replace(
  /<Chip\n\s*label=\{ROLE_LABEL\[role\] \?\? role\}\n\s*size="small"\n\s*sx=\{\{ bgcolor: "rgba\(255,255,255,0\.25\)", color: "white", fontSize: 10, height: 20 \}\}\n\s*\/>/g,
  `{roles.map(r => (\n            <Chip\n              key={r}\n              label={ROLE_LABEL[r] ?? r}\n              size="small"\n              sx={{ bgcolor: "rgba(255,255,255,0.25)", color: "white", fontSize: 10, height: 20, ml: 0.5 }}\n            />\n          ))}`
);

// role === "student" などの判定を roles.includes に変更
code = code.replace(/role === "student"/g, `roles.includes("student")`);
code = code.replace(/role !== "student"/g, `!roles.includes("student")`);

// isActive 判定のカラー修正
code = code.replace(
  /ROLE_COLOR\[role\] \?\? "#1976d2"/g,
  `ROLE_COLOR[roles[0]] ?? "#1976d2"`
);

fs.writeFileSync('src/components/AppLayout.tsx', code);
console.log('Fixed AppLayout.tsx for multiple roles');
