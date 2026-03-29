const fs = require('fs');

let code = fs.readFileSync('/home/user/webapp/src/api/middleware/scope.ts', 'utf8');

code = code.replace(/role === "univ_teacher" \|\| role === "school_mentor" \|\| role === "teacher"/, 'role === "univ_teacher" || role === "school_mentor"');

fs.writeFileSync('/home/user/webapp/src/api/middleware/scope.ts', code);
