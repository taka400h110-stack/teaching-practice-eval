const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const replaceInFile = (filePath, searchValue, replaceValue) => {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(new RegExp(searchValue, 'g'), replaceValue);
  fs.writeFileSync(filePath, content);
};

// Forbidden / Unauthorized の置換
const filesToFix = [
  'src/api/routes/adminAnalytics.ts',
  'src/api/routes/data.ts',
  'src/api/routes/exports.ts',
  'src/api/routes/openai.ts',
  'src/api/routes/adminAlerts.ts',
  'src/api/routes/externalJobs.ts',
  'src/api/routes/emailWebhooks.ts'
];

filesToFix.forEach(f => {
  const fp = path.join('/home/user/webapp', f);
  if (fs.existsSync(fp)) {
    replaceInFile(fp, "'Forbidden'", "'アクセス権限がありません'");
    replaceInFile(fp, '"Forbidden"', '"アクセス権限がありません"');
    replaceInFile(fp, "'Unauthorized'", "'認証されていません'");
    replaceInFile(fp, '"Unauthorized"', '"認証されていません"');
    replaceInFile(fp, '"Not found"', '"見つかりません"');
    replaceInFile(fp, '"Job not found"', '"ジョブが見つかりません"');
    replaceInFile(fp, '"Object not found"', '"オブジェクトが見つかりません"');
  }
});

console.log('Fixed backend error messages');
