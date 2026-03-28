const fs = require('fs');
const path = '/home/user/webapp/src/pages/SCATAnalysisPage.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'SCAT（大谷, 2007/2011）：①元テキスト → ②注目語句 → ③テキスト外語句 → ④構成概念 → ⑤テーマ の順に分析します。',
  'SCAT（大谷, 2007/2011）：セグメントごとに、①注目語句 → ②言い換え語句 → ③説明語句 → ④テーマ・構成概念 → ⑤疑問・課題メモ の順に分析します。'
);

fs.writeFileSync(path, code);
