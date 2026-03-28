const fs = require('fs');

let content = fs.readFileSync('/home/user/webapp/src/api/routes/exports.ts', 'utf8');

content = content.replace(
  'body.dataset_type, body.scope_level,',
  '(body.dataset_type ?? null), (body.scope_level ?? null),'
);

content = content.replace(
  'body.requested_anonymization_level, body.purpose, body.justification || null,',
  '(body.requested_anonymization_level ?? null), (body.purpose ?? null), (body.justification ?? null),'
);

content = content.replace(
  'body.course_id || null',
  'body.course_id ?? null'
);

content = content.replace(
  'body.cohort_id || null',
  'body.cohort_id ?? null'
);

content = content.replace(
  'body.student_id || null',
  'body.student_id ?? null'
);

fs.writeFileSync('/home/user/webapp/src/api/routes/exports.ts', content);
