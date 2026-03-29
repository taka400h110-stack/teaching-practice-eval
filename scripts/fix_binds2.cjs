const fs = require('fs');
let file = '/home/user/webapp/src/api/routes/exports.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '.bind(\n    id || "", user?.id || "", user?.role || "", request_type || "", body.dataset_type || "", body.scope_level || "", body.course_id || null, body.cohort_id || null, body.student_id || null, body.requested_anonymization_level || "", body.purpose || "", body.justification || null, body.field_filters_json ? JSON.stringify(body.field_filters_json) : null\n  )',
  '.bind(...[\n    id, user?.id, user?.role, request_type, body.dataset_type, body.scope_level, body.course_id, body.cohort_id, body.student_id, body.requested_anonymization_level, body.purpose, body.justification, body.field_filters_json ? JSON.stringify(body.field_filters_json) : null\n  ].map(v => v === undefined ? null : v))'
);

fs.writeFileSync(file, content);
