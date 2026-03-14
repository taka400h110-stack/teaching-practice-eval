const fs = require('fs');
let code = fs.readFileSync('src/components/AppLayout.tsx', 'utf8');

// Replace for researcher
code = code.replace(
  '          { label: "統計ダッシュボード", path: "/statistics",   icon: <EqualizerIcon /> },\n        ],\n      },\n      {\n        group: "国際比較（RQ1）",',
  '          { label: "統計ダッシュボード", path: "/statistics",   icon: <EqualizerIcon /> },\n          { label: "高度分析 (NLP/SEM)", path: "/advanced",    icon: <ScienceIcon /> },\n        ],\n      },\n      {\n        group: "国際比較（RQ1）",'
);

fs.writeFileSync('src/components/AppLayout.tsx', code);
console.log("Updated AppLayout.tsx");
