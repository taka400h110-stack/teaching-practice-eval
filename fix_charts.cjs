const fs = require('fs');
let code = fs.readFileSync('src/pages/LongitudinalAnalysisPage.tsx', 'utf8');

// 1. lgcmPlotData の作成を追加
if (!code.includes("const lgcmPlotData =")) {
  code = code.replace(
    /const lcgaTrajectories = genLCGATrajectories\(weeks\);/,
    `const lcgaTrajectories = genLCGATrajectories(weeks);\n  const lgcmPlotData = Array.from({ length: weeks }, (_, i) => ({ week: i + 1, predicted: +(LGCM_RESULT.intercept_mean + LGCM_RESULT.slope_mean * i).toFixed(2), observed: weeklyStats[i]?.total_mean }));\n  const lcgaPlotData = Array.from({ length: weeks }, (_, i) => { const row: any = { week: i + 1 }; lcgaTrajectories.forEach(cls => { row[cls.id] = cls.trajectory[i].score; }); return row; });\n  const overlayPlotData = Array.from({ length: weeks }, (_, i) => { const row: any = { week: i + 1 }; (cohorts ?? []).slice(0, 10).forEach((p, idx) => { const ws = p.weekly_scores.find((w: any) => w.week === i + 1); if(ws) row[\`user_\${idx}\`] = ws.total; }); return row; });`
  );
}

// 2. 個人軌跡オーバーレイの LineChart 修正
code = code.replace(
  /<LineChart>[\s\S]*?<CartesianGrid strokeDasharray="3 3" \/>[\s\S]*?<XAxis type="number" dataKey="week" domain=\{\[1, weeks\]\} \/>[\s\S]*?<YAxis domain=\{\[1\.5, 4\.8\]\} \/>[\s\S]*?<RechartTooltip \/>[\s\S]*?\{\(cohorts \?\? \[\]\)\.slice\(0, 10\)\.map\(\(p, i\) => \([\s\S]*?<Line key=\{p\.id\}[\s\S]*?data=\{p\.weekly_scores\.map\(\(ws\) => \(\{ week: ws\.week, score: ws\.total \}\)\)\}[\s\S]*?dataKey="score" dot=\{false\}[\s\S]*?stroke=\{\`hsl\(\$\{i \* 36\}, 65%, 50%\)\`\} strokeWidth=\{1\.5\} opacity=\{0\.75\}[\s\S]*?\/>[\s\S]*?\)\)\}[\s\S]*?<\/LineChart>/,
  `<LineChart data={overlayPlotData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="week" domain={[1, weeks]} />
                    <YAxis domain={[1.5, 4.8]} />
                    <RechartTooltip />
                    {(cohorts ?? []).slice(0, 10).map((p, i) => (
                      <Line key={p.id}
                        type="monotone"
                        dataKey={\`user_\${i}\`} dot={false}
                        stroke={\`hsl(\${i * 36}, 65%, 50%)\`} strokeWidth={1.5} opacity={0.75}
                      />
                    ))}
                  </LineChart>`
);

// 3. LGCM 予測成長軌跡の LineChart 修正
code = code.replace(
  /<LineChart>[\s\S]*?<CartesianGrid strokeDasharray="3 3" \/>[\s\S]*?<XAxis type="number" dataKey="week" domain=\{\[1, weeks\]\}[\s\S]*?label=\{\{ value: "実習週", position: "insideBottomRight", offset: -5 \}\} \/>[\s\S]*?<YAxis domain=\{\[1\.5, 4\.5\]\}[\s\S]*?label=\{\{ value: "予測スコア（5段階）", angle: -90, position: "insideLeft" \}\} \/>[\s\S]*?<RechartTooltip \/>[\s\S]*?<Legend \/>[\s\S]*?\{\/\* 平均的な成長軌跡 \*\/\}[\s\S]*?<Line[\s\S]*?data=\{Array\.from\(\{ length: weeks \}, \(_, i\) => \(\{[\s\S]*?week: i \+ 1,[\s\S]*?predicted: \+\(LGCM_RESULT\.intercept_mean \+ LGCM_RESULT\.slope_mean \* i\)\.toFixed\(2\),[\s\S]*?\}\)\)\}[\s\S]*?type="monotone" dataKey="predicted" stroke="#1976d2" strokeWidth=\{3\}[\s\S]*?strokeDasharray="8 3" dot=\{false\} name="LGCM予測（平均）"[\s\S]*?\/>[\s\S]*?\{\/\* 観測値 \*\/\}[\s\S]*?<Line[\s\S]*?data=\{weeklyStats\.map\(\(d\) => \(\{ week: d\.week, observed: d\.total_mean \}\)\)\}[\s\S]*?type="monotone" dataKey="observed" stroke="#43a047" strokeWidth=\{2\}[\s\S]*?dot=\{\{ r: 5 \}\} name="観測値（コーホート平均）"[\s\S]*?\/>[\s\S]*?<\/LineChart>/,
  `<LineChart data={lgcmPlotData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="week" domain={[1, weeks]}
                      label={{ value: "実習週", position: "insideBottomRight", offset: -5 }} />
                    <YAxis domain={[1.5, 4.5]}
                      label={{ value: "予測スコア（5段階）", angle: -90, position: "insideLeft" }} />
                    <RechartTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="predicted" stroke="#1976d2" strokeWidth={3}
                      strokeDasharray="8 3" dot={false} name="LGCM予測（平均）" />
                    <Line type="monotone" dataKey="observed" stroke="#43a047" strokeWidth={2}
                      dot={{ r: 5 }} name="観測値（コーホート平均）" />
                  </LineChart>`
);

// 4. LCGA 潜在クラス別 成長軌跡の LineChart 修正
code = code.replace(
  /<LineChart>[\s\S]*?<CartesianGrid strokeDasharray="3 3" \/>[\s\S]*?<XAxis type="number" dataKey="week" domain=\{\[1, weeks\]\}[\s\S]*?label=\{\{ value: "実習週", position: "insideBottomRight", offset: -5 \}\} \/>[\s\S]*?<YAxis domain=\{\[1\.5, 4\.8\]\}[\s\S]*?label=\{\{ value: "スコア（5段階）", angle: -90, position: "insideLeft" \}\} \/>[\s\S]*?<RechartTooltip \/>[\s\S]*?<Legend \/>[\s\S]*?\{lcgaTrajectories\.map\(\(cls\) => \([\s\S]*?<Line[\s\S]*?key=\{cls\.id\}[\s\S]*?data=\{cls\.trajectory\}[\s\S]*?type="monotone" dataKey="score"[\s\S]*?stroke=\{cls\.color\} strokeWidth=\{3\}[\s\S]*?name=\{cls\.label\} dot=\{\{ r: 4 \}\}[\s\S]*?\/>[\s\S]*?\)\)\}[\s\S]*?<\/LineChart>/,
  `<LineChart data={lcgaPlotData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="week" domain={[1, weeks]}
                      label={{ value: "実習週", position: "insideBottomRight", offset: -5 }} />
                    <YAxis domain={[1.5, 4.8]}
                      label={{ value: "スコア（5段階）", angle: -90, position: "insideLeft" }} />
                    <RechartTooltip />
                    <Legend />
                    {lcgaTrajectories.map((cls) => (
                      <Line key={cls.id} type="monotone" dataKey={cls.id} stroke={cls.color} strokeWidth={3} name={cls.label} dot={{ r: 4 }} />
                    ))}
                  </LineChart>`
);

fs.writeFileSync('src/pages/LongitudinalAnalysisPage.tsx', code);
console.log("Charts fixed.");
