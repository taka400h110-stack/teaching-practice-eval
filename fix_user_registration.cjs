const fs = require('fs');

let code = fs.readFileSync('src/pages/UserRegistrationPage.tsx', 'utf-8');

// role: UserRole を roles: UserRole[] に置き換える
code = code.replace(/role: UserRole;/g, "roles: UserRole[];");
// DEMO_INITIAL_USERS の role: "xxx" を roles: ["xxx"] に置き換える
code = code.replace(/role:\s*"([^"]+)"/g, 'roles: ["$1"]');

// selectedRole -> selectedRoles に変更
code = code.replace(/const \[selectedRole, setSelectedRole\] = useState<UserRole>\("student"\);/g, "const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(['student']);");

// 複数選択用の UI とロジックの修正
code = code.replace(
  /const roleConfig = ROLE_CONFIGS\.find\(\(r\) => r\.role === selectedRole\)!;/g,
  `const roleConfigs = selectedRoles.map(sr => ROLE_CONFIGS.find((r) => r.role === sr)).filter(Boolean) as typeof ROLE_CONFIGS;`
);

code = code.replace(
  /roleConfig\.fields\.forEach/g,
  `roleConfigs.flatMap(rc => rc.fields).forEach`
);

code = code.replace(
  /\? \{ \.\.\.u, name: form\.name, email: form\.email, role: selectedRole, extra: \{ \.\.\.form \} \}/g,
  `? { ...u, name: form.name, email: form.email, roles: selectedRoles, extra: { ...form } }`
);

code = code.replace(
  /role:\s*selectedRole,/g,
  `roles:      selectedRoles,`
);

code = code.replace(
  /setSnackMsg\(\`\$\{form\.name\}（\$\{roleConfig\.label\}\）を登録しました\`\);/g,
  `setSnackMsg(\`\${form.name}（\${roleConfigs.map(rc => rc.label).join('、')}）を登録しました\`);`
);

code = code.replace(
  /setSelectedRole\(user\.role\);/g,
  `setSelectedRoles(user.roles || []);`
);

// Selectの修正
code = code.replace(
  /<Select\s+value=\{selectedRole\}\s+onChange=\{\(e\) => setSelectedRole\(e\.target\.value as UserRole\)\}/g,
  `<Select\n                multiple\n                value={selectedRoles}\n                onChange={(e) => {\n                  const val = e.target.value;\n                  setSelectedRoles(typeof val === 'string' ? (val.split(',') as UserRole[]) : (val as UserRole[]));\n                }}\n                renderValue={(selected) => (\n                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>\n                    {selected.map((value) => {\n                      const cfg = ROLE_CONFIGS.find(r => r.role === value);\n                      return <Chip key={value} label={cfg?.label} size="small" sx={{ bgcolor: cfg?.color, color: 'white' }} />;\n                    })}\n                  </Box>\n                )}`
);

// roleConfig.description -> roleConfigs.map(rc => rc.description)
code = code.replace(
  /\{roleConfig\.description\}/g,
  `{roleConfigs.map(rc => rc.description).join(' / ')}`
);

// roleConfig.fields.map -> roleConfigs.flatMap(rc => rc.fields).map
code = code.replace(
  /\{roleConfig\.fields\.map/g,
  `{Array.from(new Set(roleConfigs.flatMap(rc => rc.fields))).map`
);

code = code.replace(
  /sx=\{\{ bgcolor: roleConfig\.color \}\}/g,
  `sx={{ bgcolor: roleConfigs[0]?.color || 'primary.main' }}`
);

// フィルタリングとカウントの修正
code = code.replace(
  /const cnt = users\.filter\(\(u\) => u\.role === r\.role\)\.length;/g,
  `const cnt = users.filter((u) => u.roles?.includes(r.role)).length;`
);

// テーブルの表示部分の修正
code = code.replace(
  /const cfg = ROLE_CONFIGS\.find\(\(r\) => r\.role === u\.role\);/g,
  `const cfgs = (u.roles || []).map(role => ROLE_CONFIGS.find((r) => r.role === role)).filter(Boolean);`
);

code = code.replace(
  /<Chip\n\s*label=\{cfg\?\.label \?\? u\.role\}\n\s*size="small"\n\s*sx=\{\{ bgcolor: cfg\?\.color, color: "white", fontWeight: "bold" \}\}\n\s*\/>/g,
  `{cfgs.map(cfg => (\n                                <Chip\n                                  key={cfg!.role}\n                                  label={cfg!.label}\n                                  size="small"\n                                  sx={{ bgcolor: cfg!.color, color: "white", fontWeight: "bold", mr: 0.5, mb: 0.5 }}\n                                />\n                              ))}`
);

code = code.replace(
  /\{ROLE_CONFIGS\.find\(\(r\) => r\.role === deleteTarget\?\.role\)\?\.label\}/g,
  `{(deleteTarget?.roles || []).map(role => ROLE_CONFIGS.find((r) => r.role === role)?.label).join('、')}`
);

fs.writeFileSync('src/pages/UserRegistrationPage.tsx', code);
console.log('Fixed UserRegistrationPage.tsx for multiple roles');
