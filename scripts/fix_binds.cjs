const fs = require('fs');
let file = '/home/user/webapp/src/api/routes/exports.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  'id, user.id, user.role, request_type, (body.dataset_type ?? null), (body.scope_level ?? null),\n    body.course_id ?? null, body.cohort_id ?? null, body.student_id ?? null,\n    (body.requested_anonymization_level ?? null), (body.purpose ?? null), (body.justification ?? null),\n    body.field_filters_json ? JSON.stringify(body.field_filters_json) : null',
  'id || "", user?.id || "", user?.role || "", request_type || "", body.dataset_type || "", body.scope_level || "", body.course_id || null, body.cohort_id || null, body.student_id || null, body.requested_anonymization_level || "", body.purpose || "", body.justification || null, body.field_filters_json ? JSON.stringify(body.field_filters_json) : null'
);
fs.writeFileSync(file, content);
