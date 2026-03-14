const fs = require('fs');

let code = fs.readFileSync('src/api/routes/data.ts', 'utf8');

// We want to calculate the scores from items for AI evaluation as well
// Locate the POST /evaluations handler

const aiPostBlock = code.match(/dataRouter\.post\("\/evaluations", async \(c\) => \{[\s\S]*?body\.evaluation\.total_score,[\s\S]*?\}\);/);
if (aiPostBlock) {
  let block = aiPostBlock[0];
  console.log("Found evaluations block, patching...");
  
  // We need to inject the same calculation as human-evals right after we get `body`
  const injection = `
  try {
    const scores = { f1: [] as number[], f2: [] as number[], f3: [] as number[], f4: [] as number[] };
    body.evaluation.items.forEach((item) => {
      if (item.is_na || !item.score) return;
      if (item.item_number <= 7) scores.f1.push(item.score);
      else if (item.item_number <= 13) scores.f2.push(item.score);
      else if (item.item_number <= 17) scores.f3.push(item.score);
      else scores.f4.push(item.score);
    });

    const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 100) / 100 : null;
    const allScores = [...scores.f1, ...scores.f2, ...scores.f3, ...scores.f4];
    
    const computedTotal = avg(allScores);
    const f1Score = avg(scores.f1);
    const f2Score = avg(scores.f2);
    const f3Score = avg(scores.f3);
    const f4Score = avg(scores.f4);
    
    const evalId = genId();`;

  block = block.replace(/try\s*\{\s*const evalId = genId\(\);/, injection);
  block = block.replace(/body\.evaluation\.total_score,/, "computedTotal,");
  block = block.replace(/body\.evaluation\.factor_scores\.factor1,/, "f1Score,");
  block = block.replace(/body\.evaluation\.factor_scores\.factor2,/, "f2Score,");
  block = block.replace(/body\.evaluation\.factor_scores\.factor3,/, "f3Score,");
  block = block.replace(/body\.evaluation\.factor_scores\.factor4,/, "f4Score,");
  
  code = code.replace(aiPostBlock[0], block);
  fs.writeFileSync('src/api/routes/data.ts', code);
  console.log("AI evaluation strictly enforces 23-item logic!");
} else {
  console.log("Could not find POST /evaluations block.");
}
