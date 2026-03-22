const fs = require('fs');

let dataTs = fs.readFileSync('/home/user/webapp/src/api/routes/data.ts', 'utf8');

// replace the dummy generation
const oldCode = `  // To avoid empty charts if DB is completely empty (no real usage yet), we generate some deterministic fallback seed data
  // ONLY if real data is less than 5 students
  let finalCohorts = Object.values(studentsMap);
  if (finalCohorts.length < 5) {
    const seed = [];
    for (let i = 1; i <= 30; i++) {
      const isHigh = i % 3 === 0;
      const isLow = i % 3 === 1;
      const ws = [];
      let current = isHigh ? 2.0 : isLow ? 2.5 : 2.2;
      for (let w = 1; w <= 10; w++) {
        const step = isHigh ? 0.25 : isLow ? 0.05 : 0.15;
        current += step + (Math.random() * 0.2 - 0.1);
        current = Math.max(1, Math.min(5, current));
        ws.push({
          week: w,
          factor1: current, factor2: current, factor3: current, factor4: current,
          total: current
        });
      }
      seed.push({ id: \`student-\${i}\`, name: \`Student \${i}\`, weekly_scores: ws });
    }
    finalCohorts = seed;
  }`;

const newCode = `  let finalCohorts = Object.values(studentsMap);`;

dataTs = dataTs.replace(oldCode, newCode);

fs.writeFileSync('/home/user/webapp/src/api/routes/data.ts', dataTs);
console.log('Removed dummy cohort data generation from API');
