const fs = require('fs');
let page = fs.readFileSync('/home/user/webapp/src/pages/LongitudinalAnalysisPage.tsx', 'utf8');

// replace genWeeklyStats and its type
const dummyFunc = `function genWeeklyStats(weeks: number) {
  return Array.from({ length: weeks }, (_, i) => {
    const t = i / (weeks - 1);
    return {
      week: i + 1,
      f1_mean: +(2.2 + t * 1.1).toFixed(2), f1_sd: +(0.32 + t * 0.05).toFixed(2),
      f2_mean: +(2.4 + t * 1.2).toFixed(2), f2_sd: +(0.28 + t * 0.04).toFixed(2),
      f3_mean: +(2.1 + t * 1.0).toFixed(2), f3_sd: +(0.35 + t * 0.05).toFixed(2),
      f4_mean: +(2.3 + t * 1.1).toFixed(2), f4_sd: +(0.30 + t * 0.04).toFixed(2),
      total_mean: +(2.25 + t * 1.1).toFixed(2),
      total_sd: +(0.31 + t * 0.045).toFixed(2),
    };
  });
}`;

page = page.replace(dummyFunc, '');
page = page.replace('ReturnType<typeof genWeeklyStats>', 'any[]');

fs.writeFileSync('/home/user/webapp/src/pages/LongitudinalAnalysisPage.tsx', page);
console.log('Cleaned LongitudinalAnalysisPage');
