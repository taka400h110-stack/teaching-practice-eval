const fs = require('fs');

function patch(file, replacer) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = replacer(content);
    fs.writeFileSync(file, content);
    console.log("Patched " + file);
  }
}

patch('src/pages/SelfEvaluationPage.tsx', c => c
  .replace(/aiGrowth\?\.weekly_scores\.slice/g, '(aiGrowth?.weekly_scores ?? []).slice')
);

