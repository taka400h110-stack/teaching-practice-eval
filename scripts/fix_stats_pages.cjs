const fs = require('fs');

const replaceInFile = (file) => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');
  // replace .toFixed with optional chaining where possible, or replace (.toFixed) directly.
  // Actually, a simpler way is to replace .toFixed with a custom safeToFixed function if we can, but replacing the text is easier.
  // We can just add a global function and replace `.toFixed(` with `?.toFixed(` or `|| 0).toFixed(`.
  // But wait, what if it's `val.toFixed`? We can replace `\.toFixed\(` with `?.toFixed(`? No, `+val?.toFixed(2)` yields NaN if val is null.
  // A better way is to do `(val || 0).toFixed(2)`.
  
  // Let's replace `.toFixed(` with `?.toFixed(` first to prevent crashes.
  // Actually, NaN won't crash the React render unless it's an object. NaN just displays as "NaN".
  
  code = code.replace(/(\w+)\.toFixed\(/g, '($1 || 0).toFixed(');
  code = code.replace(/\(\(.*?\|\| 0\)\s*\|\|\s*0\)/g, '($1)'); // cleanup double wraps
  
  fs.writeFileSync(file, code);
  console.log('Fixed ' + file);
};

replaceInFile('/home/user/webapp/src/pages/StatisticsPage.tsx');
replaceInFile('/home/user/webapp/src/pages/TeacherStatisticsPage.tsx');
replaceInFile('/home/user/webapp/src/pages/LongitudinalAnalysisPage.tsx');
replaceInFile('/home/user/webapp/src/pages/EvaluationResultPage.tsx');
