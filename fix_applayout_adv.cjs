const fs = require('fs');
let code = fs.readFileSync('src/components/AppLayout.tsx', 'utf8');

// 追加するメニュー項目
const advMenuItem = `{ label: "高度分析ダッシュボード", path: "/advanced", icon: <ScienceIcon /> },`;

// AppLayout.tsx に ScienceIcon の import があるか確認、なければ追加
if (!code.includes("ScienceIcon")) {
  code = code.replace(
    /import AccountBalanceIcon\s+from "@mui\/icons-material\/AccountBalance";/,
    `import AccountBalanceIcon     from "@mui/icons-material/AccountBalance";\nimport ScienceIcon            from "@mui/icons-material/Science";`
  );
}

// researcher と collaborator と admin のメニューに追加
if (!code.includes('path: "/advanced"')) {
  // researcher
  code = code.replace(
    /\{ label: "統計ダッシュボード", path: "\/statistics",   icon: <EqualizerIcon \/> \},/,
    `{ label: "統計ダッシュボード", path: "/statistics",   icon: <EqualizerIcon /> },\n          { label: "高度分析 (NLP/SEM)", path: "/advanced",    icon: <ScienceIcon /> },`
  );
  // admin
  code = code.replace(
    /\{ label: "統計ダッシュボード",   path: "\/statistics",        icon: <EqualizerIcon \/> \},/,
    `{ label: "統計ダッシュボード",   path: "/statistics",        icon: <EqualizerIcon /> },\n        { label: "高度分析ダッシュボード", path: "/advanced",          icon: <ScienceIcon /> },`
  );
  fs.writeFileSync('src/components/AppLayout.tsx', code);
  console.log("AppLayout updated with advanced menu.");
}
