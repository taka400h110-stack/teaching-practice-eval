const fs = require('fs');
let code = fs.readFileSync('src/pages/UserRegistrationPage.tsx', 'utf-8');

// selectedRole -> selectedRoles の再修正
code = code.replace(
  /const \[selectedRole, setSelectedRole\] = useState<UserRole>\("univ_teacher"\);/g,
  `const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(["univ_teacher"]);`
);

code = code.replace(
  /value=\{selectedRole\}\n\s*onChange=\{\(e\) => setSelectedRole\(e\.target\.value as UserRole\)\}/g,
  `multiple\n                value={selectedRoles}\n                onChange={(e) => {\n                  const val = e.target.value;\n                  setSelectedRoles(typeof val === 'string' ? (val.split(',') as UserRole[]) : (val as UserRole[]));\n                }}\n                renderValue={(selected) => (\n                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>\n                    {selected.map((value) => {\n                      const cfg = ROLE_CONFIGS.find(r => r.role === value);\n                      return <Chip key={value} label={cfg?.label} size="small" sx={{ bgcolor: cfg?.color, color: 'white' }} />;\n                    })}\n                  </Box>\n                )}`
);

// 416行目付近のエラー (cfg -> cfgs 等)
code = code.replace(
  /<Chip\n\s*label=\{cfg\?\.label \?\? u\.role\}\n\s*size="small"\n\s*sx=\{\{ bgcolor: cfg\?\.color, color: "white", fontWeight: "bold" \}\}\n\s*\/>/g,
  `{cfgs.map(c => (\n                                <Chip\n                                  key={c!.role}\n                                  label={c!.label}\n                                  size="small"\n                                  sx={{ bgcolor: c!.color, color: "white", fontWeight: "bold", mr: 0.5, mb: 0.5 }}\n                                />\n                              ))}`
);

fs.writeFileSync('src/pages/UserRegistrationPage.tsx', code);
console.log('Fixed state in UserRegistrationPage');
