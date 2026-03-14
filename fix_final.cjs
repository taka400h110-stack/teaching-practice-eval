const fs = require('fs');

let client = fs.readFileSync('src/api/client.ts', 'utf-8');
client = client.replace(/user\.role/g, '(user.roles?.[0] || "student")');
fs.writeFileSync('src/api/client.ts', client);

let mock = fs.readFileSync('src/mocks/mockData.ts', 'utf-8');
mock = mock.replace(/student_id:\s*"2023A001",/g, ''); // Userインターフェースにstudent_idはないため削除
fs.writeFileSync('src/mocks/mockData.ts', mock);

let reg = fs.readFileSync('src/pages/UserRegistrationPage.tsx', 'utf-8');
reg = reg.replace(/const \[selectedRoles, setSelectedRoles\] = useState<UserRole\[\]>\(\["univ_teacher"\]\);/g, 'const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(["univ_teacher"]);');
reg = reg.replace(/c!\.role/g, 'c.role');
reg = reg.replace(/c!\.label/g, 'c.label');
reg = reg.replace(/c!\.color/g, 'c.color');
reg = reg.replace(/\{cfgs\.map\(c => \(/g, '{cfgs.filter(Boolean).map(c => (');
reg = reg.replace(/u\.role/g, '(u.roles?.[0] || "student")'); // u.roleが残っている箇所を修正
fs.writeFileSync('src/pages/UserRegistrationPage.tsx', reg);

let appLayout = fs.readFileSync('src/components/AppLayout.tsx', 'utf-8');
appLayout = appLayout.replace(/user\?\.roles/g, '((user as any)?.roles || [(user as any)?.role || "student"])');
fs.writeFileSync('src/components/AppLayout.tsx', appLayout);

