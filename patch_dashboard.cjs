const fs = require('fs');

function patch(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Fix growth?.weekly_scores.slice
  content = content.replace(/growth\?\.weekly_scores\.slice/g, '(growth?.weekly_scores ?? []).slice');
  
  // Fix selfEvals.slice
  content = content.replace(/selfEvals\.slice/g, '(selfEvals ?? []).slice');
  
  // Fix journals.slice
  content = content.replace(/journals\.slice/g, '(journals ?? []).slice');
  
  // Fix goals.slice
  content = content.replace(/goals\.slice/g, '(goals ?? []).slice');

  fs.writeFileSync(file, content);
  console.log("Patched " + file);
}

patch('src/pages/DashboardPage.tsx');
