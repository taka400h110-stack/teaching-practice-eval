const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/api/routes/data.ts');
let content = fs.readFileSync(filePath, 'utf8');

// replace roles for /scat/journals/:journalId
const searchString = 'dataRouter.get("/scat/journals/:journalId", requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {';
const replaceString = 'dataRouter.get("/scat/journals/:journalId", requireRoles(["researcher", "admin", "collaborator", "board_observer"]), async (c) => {';

if (content.includes(searchString)) {
  content = content.replace(searchString, replaceString);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed API roles for /scat/journals/:journalId');
} else {
  console.log('Could not find exact string');
}
