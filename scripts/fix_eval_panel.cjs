const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/JournalDetailPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldCheck = `const EvaluationPanel: React.FC<EvalPanelProps> = ({ evalData, growthData, weekNumber, currentSelfEval }) => {
  const fs = evalData.factor_scores;`;

const newCheck = `const EvaluationPanel: React.FC<EvalPanelProps> = ({ evalData, growthData, weekNumber, currentSelfEval }) => {
  if (!evalData || !evalData.factor_scores || !evalData.evaluation_items) {
    return (
      <Box mt={4}>
        <Alert severity="info">評価データが未生成、または形式が不正です。</Alert>
      </Box>
    );
  }
  const fs = evalData.factor_scores;`;

if (content.includes(oldCheck)) {
  content = content.replace(oldCheck, newCheck);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed EvaluationPanel early return');
} else {
  console.log('Could not find oldCheck');
}
