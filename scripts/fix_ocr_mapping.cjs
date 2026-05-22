const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/pages/JournalOCRPage.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '{ keywords: ["省察", "振り返り", "リフレクション", "感想", "気づき"], field: "reflection", label: "省察・振り返り" }',
  '{ keywords: ["省察", "振り返り", "リフレクション", "感想", "気づき", "学ばせていただいたこと", "学ばせていただいた", "次回に向けて", "抱負"], field: "reflection", label: "省察・振り返り" }'
);

fs.writeFileSync(file, content);
console.log("Fixed OCR mapping keywords for reflection.");
