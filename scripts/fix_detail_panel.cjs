const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/pages/JournalDetailPage.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /if \(\!evalData \|\| !evalData\.factor_scores \|\| \!evalData\.evaluation_items\) \{[\s\S]*?return \([\s\S]*?<Box mt=\{4\}>[\s\S]*?<Alert severity="info">評価データが未生成、または形式が不正です。<\/Alert>[\s\S]*?<\/Box>[\s\S]*?\);[\s\S]*?\}/,
  `if (!evalData || !evalData.factor_scores || !evalData.evaluation_items || evalData.evaluation_items.length === 0 || evalData.total_score === 0) {
    return (
      <Box mt={4}>
        <Alert severity="warning">
          AI評価が正常に完了していません（項目数: {evalData?.evaluation_items?.length || 0} / 23）。再度評価を実行してください。
        </Alert>
      </Box>
    );
  }`
);

fs.writeFileSync(file, content);
console.log("Fixed EvaluationPanel guard in JournalDetailPage.tsx");
