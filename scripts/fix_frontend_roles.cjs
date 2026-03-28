const fs = require('fs');

const fixFile = (path) => {
  let content = fs.readFileSync(path, 'utf-8');
  content = content.replace(/univ_teacher:/g, 'teacher: "実習校教員 (Legacy)",\n    univ_teacher:');
  fs.writeFileSync(path, content);
};

fixFile('/home/user/webapp/src/components/AppLayout.tsx');
fixFile('/home/user/webapp/src/pages/OnboardingPage.tsx');

let dataContent = fs.readFileSync('/home/user/webapp/src/api/routes/data.ts', 'utf-8');
dataContent = dataContent.replace(/userId \+ 1/g, 'String(userId) + "1"'); // 1838 Operator '+' cannot be applied to types '{}' and 'number'.
dataContent = dataContent.replace(/req\.param\("userId"\)/g, 'req.param("userId") as string'); // 1353

// 1962: Type 'unknown' cannot be used as an index type
dataContent = dataContent.replace(/\[k\]/g, '[k as string]');

// 2044
dataContent = dataContent.replace(/await bcrypt.compare\(\(\(body as any\)\.password \|\| \"\"\) as string, String\(\(user as any\)\.password_hash\)\)/g, 
  'await bcrypt.compare(String((body as any).password || ""), String((user as any).password_hash))');

fs.writeFileSync('/home/user/webapp/src/api/routes/data.ts', dataContent);
