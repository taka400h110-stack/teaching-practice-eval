const fs = require('fs');

function patch(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Fix .filter calls by adding ?? []
  content = content.replace(/journals\.filter/g, '(journals ?? []).filter');
  content = content.replace(/goals\.filter/g, '(goals ?? []).filter');

  // Fix .length calls by adding ?? []
  content = content.replace(/journals\.length/g, '(journals ?? []).length');
  content = content.replace(/goals\.length/g, '(goals ?? []).length');
  content = content.replace(/selfEvals\.length/g, '(selfEvals ?? []).length');

  fs.writeFileSync(file, content);
  console.log("Patched " + file);
}

patch('src/pages/DashboardPage.tsx');
