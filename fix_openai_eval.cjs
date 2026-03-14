const fs = require('fs');

let code = fs.readFileSync('src/api/routes/openai.ts', 'utf8');

const postBlock = code.match(/openaiRouter\.post\("\/evaluate", async \(c\) => \{[\s\S]*?const result = JSON\.parse\(raw\);[\s\S]*?return c\.json\(\{/);
if (postBlock) {
  let block = postBlock[0];
  console.log("Found openai evaluate block, patching...");
  
  const injection = `const result = JSON.parse(raw);
    
    // 厳密な23項目平均（NULL除外、半端四捨五入）の再計算
    if (result.items && Array.isArray(result.items)) {
      const scores = { f1: [] as number[], f2: [] as number[], f3: [] as number[], f4: [] as number[] };
      result.items.forEach((item: any) => {
        if (item.is_na || !item.score) return;
        if (item.item_number <= 7) scores.f1.push(item.score);
        else if (item.item_number <= 13) scores.f2.push(item.score);
        else if (item.item_number <= 17) scores.f3.push(item.score);
        else scores.f4.push(item.score);
      });

      const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 100) / 100 : 0;
      const allScores = [...scores.f1, ...scores.f2, ...scores.f3, ...scores.f4];
      
      result.total_score = avg(allScores);
      result.factor_scores = {
        factor1: avg(scores.f1),
        factor2: avg(scores.f2),
        factor3: avg(scores.f3),
        factor4: avg(scores.f4),
      };
      
      // 未評価項目数カウント
      const evaluated_item_count = allScores.length;
      result.evaluated_item_count = evaluated_item_count;
    }

    return c.json({`;

  block = block.replace(/const result = JSON\.parse\(raw\);\s*return c\.json\(\{/, injection);
  
  code = code.replace(postBlock[0], block);
  fs.writeFileSync('src/api/routes/openai.ts', code);
  console.log("openai.ts evaluate strictly enforces 23-item logic!");
} else {
  console.log("Could not find POST /evaluate block in openai.ts.");
}
