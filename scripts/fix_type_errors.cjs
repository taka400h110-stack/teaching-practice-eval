const fs = require('fs');
const path = require('path');

// Fix api/client.ts
const clientPath = path.join(__dirname, '../src/api/client.ts');
let clientContent = fs.readFileSync(clientPath, 'utf8');

// Replace "const data = await res.json();" with "const data = await res.json() as any;"
clientContent = clientContent.replace(/const data = await res\.json\(\);/g, 'const data = await res.json() as any;');
clientContent = clientContent.replace(/const resData = await res\.json\(\);/g, 'const resData = await res.json() as any;');

fs.writeFileSync(clientPath, clientContent, 'utf8');

// Fix ExternalAnalysisJobPanel.tsx
const jobPanelPath = path.join(__dirname, '../src/components/ExternalAnalysisJobPanel.tsx');
let jobPanelContent = fs.readFileSync(jobPanelPath, 'utf8');

jobPanelContent = jobPanelContent.replace('const data = await res.json();', 'const data = await res.json() as any;');
jobPanelContent = jobPanelContent.replace(/res\.success/g, 'data.success');
jobPanelContent = jobPanelContent.replace(/res\.job_id/g, 'data.job_id');
jobPanelContent = jobPanelContent.replace(/res\.error/g, 'data.error');

fs.writeFileSync(jobPanelPath, jobPanelContent, 'utf8');

// Fix TeacherDashboardPage.tsx
const teacherPath = path.join(__dirname, '../src/pages/TeacherDashboardPage.tsx');
let teacherContent = fs.readFileSync(teacherPath, 'utf8');

teacherContent = teacherContent.replace('SCHOOL_TYPES[p.school_type] || "不明"', 'SCHOOL_TYPES[p.school_type as keyof typeof SCHOOL_TYPES] || "不明"');

fs.writeFileSync(teacherPath, teacherContent, 'utf8');

console.log('Done fixing type errors');
