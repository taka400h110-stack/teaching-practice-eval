const fs = require('fs');
let file = fs.readFileSync('src/pages/SCATAnalysisPage.tsx', 'utf8');

file = file.replace(/function computeCohenKappa\([\s\S]*?\} \{[\s\S]*?return \{[\s\S]*?\};\n\}/m,
`function computeCohenKappa(
  coder1: { id: string; code: string }[],
  coder2: { id: string; code: string }[],
): { kappa: number; agreement: number; interpretation: string; n: number } {
  // セグメントIDによる厳密な突合
  const map2 = new Map(coder2.map((c) => [c.id, c.code]));
  const matched = coder1
    .filter((c) => map2.has(c.id))
    .map((c) => ({ code1: c.code, code2: map2.get(c.id)! }));

  const n = matched.length;
  if (n === 0) return { kappa: 0, agreement: 0, interpretation: "データなし", n: 0 };

  const agree = matched.filter((m) => m.code1 === m.code2).length;
  const po = agree / n;

  // 期待一致率
  const allCodes1 = matched.map(m => m.code1);
  const allCodes2 = matched.map(m => m.code2);
  const categories = [...new Set([...allCodes1, ...allCodes2])];
  
  let pe = 0;
  for (const cat of categories) {
    const p1 = allCodes1.filter((v) => v === cat).length / n;
    const p2 = allCodes2.filter((v) => v === cat).length / n;
    pe += p1 * p2;
  }

  const kappa = pe === 1 ? 1 : (po - pe) / (1 - pe);
  const interpretation =
    kappa >= 0.8 ? "非常に良好（研究使用可）" :
    kappa >= 0.6 ? "良好（概ね一致）" :
    kappa >= 0.4 ? "中程度（要改善）" :
    "不十分";

  return {
    kappa: Math.round(kappa * 1000) / 1000,
    agreement: Math.round(po * 100) / 100,
    interpretation,
    n
  };
}`);

file = file.replace(/const coder1 = rows.map\(\(r\) => r.theme\);\n\s*const coder2 = rows.map\(\(r, i\) => i % 5 === 0 \? \(r.theme \+ "（変更）"\) : r.theme\);/m,
`const coder1 = rows.map((r) => ({ id: r.id, code: r.theme }));
    const coder2 = rows.map((r, i) => ({ id: r.id, code: i % 5 === 0 ? (r.theme + "（変更）") : r.theme }));`);

file = file.replace(/useState<\{ kappa: number; agreement: number; interpretation: string \} \| null>/, 
  `useState<{ kappa: number; agreement: number; interpretation: string; n: number } | null>`);

file = file.replace(/一致率 = \{\(kappaResult.agreement \* 100\).toFixed\(1\)\}%、/,
  `一致率 = {(kappaResult.agreement * 100).toFixed(1)}% (N={kappaResult.n})、`);

fs.writeFileSync('src/pages/SCATAnalysisPage.tsx', file);
