const fs = require('fs');
const path = '/home/user/webapp/src/pages/SCATAnalysisPage.tsx';
let code = fs.readFileSync(path, 'utf8');

// Update CSV headers
code = code.replace(
  'const headers = ["id", "week", "factor", "text", "keywords", "thesaurus", "concept", "theme", "memo", "coder_id"];',
  'const headers = ["segment_id", "week", "factor", "raw_text", "step1_focus_words", "step2_outside_words", "step3_explanatory_words", "step4_theme_construct", "step5_questions_issues", "coder_id"];'
);

// We need to map `r` correctly in the CSV row generation, because `r` still has the old internal names
const oldDataMap = `  const data = rows.map((r) => headers.map((h) => {
    const v = (r as unknown as unknown as Record<string, unknown>)[h] ?? "";`;

const newDataMap = `  const data = rows.map((r) => {
    const rowObj: Record<string, any> = {
      segment_id: r.id, week: r.week, factor: r.factor,
      raw_text: r.text, step1_focus_words: r.keywords, step2_outside_words: r.thesaurus,
      step3_explanatory_words: r.concept, step4_theme_construct: r.theme, step5_questions_issues: r.memo,
      coder_id: r.coder_id
    };
    return headers.map((h) => {
      const v = rowObj[h] ?? "";`;

code = code.replace(oldDataMap, newDataMap);

fs.writeFileSync(path, code);
