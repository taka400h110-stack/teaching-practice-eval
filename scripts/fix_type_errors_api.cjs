const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, '../src/api/client.ts');
let content = fs.readFileSync(apiPath, 'utf8');

// Fix overall_score
content = content.replace('overall_score: 0', '// overall_score: 0'); // just comment it out since it's mock

// Fix data unknown (line 308 and 320)
content = content.replace('const data = await res.json();', 'const data = (await res.json()) as any;');
content = content.replace('const data = await res.json();', 'const data = (await res.json()) as any;'); // if multiple

// Fix student_id missing
content = content.replace('return { weekly_scores: [] };', 'return { student_id: studentId, weekly_scores: [] };');

// Fix ChatSession
content = content.replace('return { id: "chat_1",', 'return { id: "chat_1", student_id: "student_1",');
content = content.replace('return { id: "chat_123",', 'return { id: "chat_123", student_id: "student_1",');
content = content.replace('return { id: "sess_123",', 'return { id: "sess_123", student_id: "student_1",'); // just in case

fs.writeFileSync(apiPath, content, 'utf8');

// Also TeacherDashboardPage
const teacherPath = path.join(__dirname, '../src/pages/TeacherDashboardPage.tsx');
let teacherContent = fs.readFileSync(teacherPath, 'utf8');
teacherContent = teacherContent.replace('SCHOOL_TYPES[p.school_type] || "不明"', 'SCHOOL_TYPES[p.school_type as keyof typeof SCHOOL_TYPES] || "不明"');
fs.writeFileSync(teacherPath, teacherContent, 'utf8');

