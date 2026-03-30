const fs = require('fs');

const dataTsPath = 'src/api/routes/data.ts';
let code = fs.readFileSync(dataTsPath, 'utf8');

code = code.replace(
  'const { journal_id, evaluation, model_name, prompt_version, overall_comment, total_score, factor_scores } = body;',
  'const { journal_id, evaluation, model_name, prompt_version } = body;\n  const total_score = body.total_score ?? evaluation?.total_score;\n  const factor_scores = body.factor_scores ?? evaluation?.factor_scores;\n  const overall_comment = body.overall_comment ?? evaluation?.overall_comment;'
);

fs.writeFileSync(dataTsPath, code);
console.log("Fixed evaluations post extraction");
