const fs = require('fs');

function replaceFile(path, regex, replacer) {
  let code = fs.readFileSync(path, 'utf-8');
  code = code.replace(regex, replacer);
  fs.writeFileSync(path, code);
}

// client.ts
replaceFile('src/api/client.ts', /const data = await response\.json\(\);/g, 'const data: any = await response.json();');
replaceFile('src/api/client.ts', /const data = await chatRes\.json\(\);/g, 'const data: any = await chatRes.json();');
replaceFile('src/api/client.ts', /const data = await evalRes\.json\(\);/g, 'const data: any = await evalRes.json();');
replaceFile('src/api/client.ts', /const aiData = await aiRes\.json\(\);/g, 'const aiData: any = await aiRes.json();');
replaceFile('src/api/client.ts', /const data = await r\.json\(\);/g, 'const data: any = await r.json();');
replaceFile('src/api/client.ts', /const data = await res\.json\(\);/g, 'const data: any = await res.json();');
// data.ts
replaceFile('src/api/routes/data.ts', /as keyof Omit<BFIResponse, "id" \| "user_id" \| "created_at">\]/g, 'as any]');
// openai.ts
replaceFile('src/api/routes/openai.ts', /const data = await response\.json\(\)/g, 'const data: any = await response.json()');
replaceFile('src/api/routes/openai.ts', /OPENAI_API_KEY/g, 'OPENAI_API_KEY'); // don't mess it up
replaceFile('src/api/routes/openai.ts', /c\.env\?\.OPENAI_API_KEY/g, '(c.env as any)?.OPENAI_API_KEY');
// stats.ts
replaceFile('src/api/routes/stats.ts', /\| "mean_imputation" \| "fcs"/g, '| "mean_imputation"');
// ChatBotPage.tsx
replaceFile('src/pages/ChatBotPage.tsx', /const rdData = await rdResponse\.json\(\);/g, 'const rdData: any = await rdResponse.json();');
// EvaluationResultPage.tsx
replaceFile('src/pages/EvaluationResultPage.tsx', /score\?/g, '(score||0)');
replaceFile('src/pages/EvaluationResultPage.tsx', /score \</g, '(score||0) <');
replaceFile('src/pages/EvaluationResultPage.tsx', /score \>/g, '(score||0) >');
replaceFile('src/pages/EvaluationResultPage.tsx', /score ===/g, '(score||0) ===');
replaceFile('src/pages/EvaluationResultPage.tsx', /score \-/g, '(score||0) -');
replaceFile('src/pages/EvaluationResultPage.tsx', /score \+/g, '(score||0) +');
replaceFile('src/pages/EvaluationResultPage.tsx', /score={score}/g, 'score={(score||0)}');
replaceFile('src/pages/EvaluationResultPage.tsx', /Math\.max\(0, score - 1\)/g, 'Math.max(0, (score||0) - 1)');
replaceFile('src/pages/EvaluationResultPage.tsx', /Math\.min\(5, score \+ 1\)/g, 'Math.min(5, (score||0) + 1)');
// EvaluationsPage.tsx
replaceFile('src/pages/EvaluationsPage.tsx', /\(he\) =>/g, '(he: any) =>');
// GrowthVisualizationPage.tsx
replaceFile('src/pages/GrowthVisualizationPage.tsx', /delta > 0/g, 'fDelta > 0');
replaceFile('src/pages/GrowthVisualizationPage.tsx', /delta < 0/g, 'fDelta < 0');
// InternationalComparisonPage.tsx
replaceFile('src/pages/InternationalComparisonPage.tsx', /as Record<string, \{ m: number; sd: number \}>/g, 'as unknown as Record<string, { m: number; sd: number }>');
// JournalDetailPage.tsx
replaceFile('src/pages/JournalDetailPage.tsx', /value=\{item\.score\}/g, 'value={item.score || 0}');
replaceFile('src/pages/JournalDetailPage.tsx', /value=\{factorScore\}/g, 'value={factorScore || 0}');
// JournalWorkflowPage.tsx
replaceFile('src/pages/JournalWorkflowPage.tsx', /const outcomesRes = await fetch/g, 'const outcomesRes: any = await fetch');
replaceFile('src/pages/JournalWorkflowPage.tsx', /const outcomesData = await outcomesRes\.json\(\);/g, 'const outcomesData: any = await outcomesRes.json();');
replaceFile('src/pages/JournalWorkflowPage.tsx', /const evData = await evRes\.json\(\);/g, 'const evData: any = await evRes.json();');
replaceFile('src/pages/JournalWorkflowPage.tsx', /const rdData = await rdRes\.json\(\);/g, 'const rdData: any = await rdRes.json();');
// LongitudinalAnalysisPage.tsx
replaceFile('src/pages/LongitudinalAnalysisPage.tsx', /week=\{\[1, 2, 3\]\}/g, '');
// ReliabilityAnalysisPage.tsx
replaceFile('src/pages/ReliabilityAnalysisPage.tsx', /let allEvals = \[\];/g, 'let allEvals: any[] = [];');
replaceFile('src/pages/ReliabilityAnalysisPage.tsx', /\(p\) =>/g, '(p: any) =>');
// SCATAnalysisPage.tsx
replaceFile('src/pages/SCATAnalysisPage.tsx', /as Record<string, unknown>/g, 'as unknown as Record<string, unknown>');
// renderer.tsx
replaceFile('src/renderer.tsx', /FC/g, 'any');

