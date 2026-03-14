const fs = require('fs');
const file = '/home/user/webapp/src/pages/HumanEvaluationPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// replace the state definition
content = content.replace(
  /const \[scores, setScores\] = useState<Record<number, number>>\(\n\s*Object.fromEntries\(RUBRIC_ITEMS\.map\(\(item\) => \[item\.num, 3\]\)\)\n\s*\);/,
  `const [scores, setScores] = useState<Record<string, number>>({
    factor1: 3, factor2: 3, factor3: 3, factor4: 3
  });`
);

// replace strictScores usage
content = content.replace(
  /const itemsArray = RUBRIC_ITEMS\.map\(\(item\) => \(\{\n\s*item_number: item\.num,\n\s*score: scores\[item\.num\],\n\s*is_na: false\n\s*\}\)\);\n\s*const strictScores = computeStrictScores\(itemsArray\);\n\n\s*const factorAvg = \(factorKey: string\) => \{\n\s*if \(factorKey === "factor1"\) return strictScores\.factor1_score\?\.toFixed\(2\) \?\? "0\.00";\n\s*if \(factorKey === "factor2"\) return strictScores\.factor2_score\?\.toFixed\(2\) \?\? "0\.00";\n\s*if \(factorKey === "factor3"\) return strictScores\.factor3_score\?\.toFixed\(2\) \?\? "0\.00";\n\s*if \(factorKey === "factor4"\) return strictScores\.factor4_score\?\.toFixed\(2\) \?\? "0\.00";\n\s*return "0\.00";\n\s*\};\n\s*const totalAvg = strictScores\.total_score\?\.toFixed\(2\) \?\? "0\.00";/g,
  `const factorAvg = (factorKey: string) => scores[factorKey]?.toFixed(2) ?? "0.00";
  const totalAvg = ((scores.factor1 + scores.factor2 + scores.factor3 + scores.factor4) / 4).toFixed(2);`
);

// replace mutation payload
content = content.replace(
  /const items = Object\.entries\(scores\)\.map\(\(\[k, v\]\) => \(\{ item_number: parseInt\(k\), score: v \}\)\);/,
  `const items = [
        { item_number: 1, score: scores.factor1 },
        { item_number: 2, score: scores.factor2 },
        { item_number: 3, score: scores.factor3 },
        { item_number: 4, score: scores.factor4 },
      ];`
);

// replace the main rendering block for items
// We need to find the map block for factors and replace its inside
const startFactorMap = content.indexOf('{/* 23項目評価（因子別） */}');
const endFactorMap = content.indexOf('{/* 保存ボタン（下部） */}');

const newFactorMap = `{/* 4因子評価 */}
      {RUBRIC_FACTORS.map((factor) => {
        const currentScore = scores[factor.key] ?? 3;
        const rd = getRdByScore(currentScore);

        return (
          <Card key={factor.key} sx={{ mb: 3, borderLeft: \`4px solid \${factor.color}\` }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ color: factor.color }}>
                  第{factor.roman}因子：{factor.label}
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip
                    label={currentScore.toFixed(1)}
                    size="small"
                    sx={{ bgcolor: factor.color, color: "#fff", fontWeight: "bold", minWidth: 44 }}
                  />
                  <RdIndicator score={currentScore} />
                </Box>
              </Box>

              <Slider
                value={currentScore}
                onChange={(_, v) => setScores((prev) => ({ ...prev, [factor.key]: v as number }))}
                min={1} max={5} step={0.5}
                marks={REFLECTION_DEPTH_LEVELS.map((r) => ({
                  value: r.score,
                  label: (
                    <Typography component="span" sx={{ fontSize: 9, color: r.color, fontWeight: "bold" }}>
                      {r.rd}
                    </Typography>
                  ),
                }))}
                sx={{
                  color: factor.color, py: 1, mt: 1,
                  "& .MuiSlider-track": { bgcolor: rd.color },
                  "& .MuiSlider-thumb": { bgcolor: rd.color, width: 20, height: 20 },
                }}
              />
            </CardContent>
          </Card>
        );
      })}

      `;

if (startFactorMap !== -1 && endFactorMap !== -1) {
  content = content.substring(0, startFactorMap) + newFactorMap + content.substring(endFactorMap);
}

fs.writeFileSync(file, content);
console.log("Fixed HumanEvaluationPage.tsx");
