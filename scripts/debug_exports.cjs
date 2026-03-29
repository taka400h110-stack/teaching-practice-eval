const fs = require('fs');

let content = fs.readFileSync('/home/user/webapp/src/api/routes/exports.ts', 'utf8');

content = content.replace(
  'await db.prepare(',
  'console.log("BIND VARS:", {id, uid: user.id, role: user.role, request_type, dt: body.dataset_type, sl: body.scope_level, ci: body.course_id, cohi: body.cohort_id, si: body.student_id, ral: body.requested_anonymization_level, p: body.purpose, j: body.justification, ff: body.field_filters_json});\n  await db.prepare('
);

fs.writeFileSync('/home/user/webapp/src/api/routes/exports.ts', content);
