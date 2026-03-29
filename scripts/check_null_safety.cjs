const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('src/**/*.{ts,tsx}');
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  let lines = content.split('\n');
  let hasChanges = false;

  // 簡単なパターンマッチで危険な呼び出しを探す
  lines.forEach((line, idx) => {
    // string などの slice の前が null の可能性
    // 例: title.slice -> title?.slice
    // ここでは単に報告する
    if (line.includes('.slice(')) {
      // 既に ?? [] などで防がれているものはOK
      if (!line.includes('??') && !line.includes('?.')) {
        // console.log(`${file}:${idx+1} - ${line.trim()}`);
      }
    }
  });
});
