const fs = require('fs');
let code = fs.readFileSync('src/pages/AdvancedAnalyticsPage.tsx', 'utf8');

// Add Select, MenuItem to imports
if (!code.includes("Select,")) {
  code = code.replace(
    /Tabs, Tab, Table, TableBody, TableCell,/,
    `Tabs, Tab, Table, TableBody, TableCell,\n  Select, MenuItem, FormControl, InputLabel,`
  );
}

// Add RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis to recharts imports
if (!code.includes("RadarChart")) {
  code = code.replace(
    /ScatterChart, Scatter, ZAxis/,
    `ScatterChart, Scatter, ZAxis, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis`
  );
}

// Add Tab
if (!code.includes('<Tab label="性格特性 (BigFive)" />')) {
  code = code.replace(
    /<Tab label="欠損値分析 \(MCAR\)" \/>/,
    `<Tab label="欠損値分析 (MCAR)" />\n        <Tab label="性格特性 (BigFive)" />`
  );
}

// Make sure cohorts is initialized as array
code = code.replace(
  /const \{ isLoading \} = useQuery\(\{ queryKey: \["cohorts"\], queryFn: \(\) => mockApi\.getCohortProfiles\(\) \}\);/,
  `const { data: cohorts = [], isLoading } = useQuery({ queryKey: ["cohorts"], queryFn: () => mockApi.getCohortProfiles() });\n  const [bfTrait, setBfTrait] = useState("conscientiousness");`
);

// Add TabPanel 4 for BigFive
const bigFivePanel = `
      {/* ━━ 性格特性 (BigFive) ━━ */}
      <TabPanel value={tab} index={4}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    BigFive と 成長量(Δ) の相関（散布図）
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>性格特性</InputLabel>
                    <Select
                      value={bfTrait}
                      label="性格特性"
                      onChange={(e) => setBfTrait(e.target.value as any)}
                    >
                      <MenuItem value="extraversion">外向性</MenuItem>
                      <MenuItem value="agreeableness">協調性</MenuItem>
                      <MenuItem value="conscientiousness">誠実性</MenuItem>
                      <MenuItem value="neuroticism">神経質傾向</MenuItem>
                      <MenuItem value="openness">開放性</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                {(() => {
                  const traitNames: Record<string, string> = {
                    extraversion: "外向性", agreeableness: "協調性", conscientiousness: "誠実性",
                    neuroticism: "神経質傾向", openness: "開放性"
                  };
                  const scatterData = cohorts.map(p => ({
                    x: (p.big_five as any)[bfTrait] || 0,
                    y: p.growth_delta || 0,
                    name: p.name
                  }));
                  // 相関係数の簡易計算
                  const n = scatterData.length || 1;
                  const sumX = scatterData.reduce((s, d) => s + d.x, 0);
                  const sumY = scatterData.reduce((s, d) => s + d.y, 0);
                  const meanX = sumX / n;
                  const meanY = sumY / n;
                  let num = 0, denX = 0, denY = 0;
                  scatterData.forEach(d => {
                    num += (d.x - meanX) * (d.y - meanY);
                    denX += (d.x - meanX) ** 2;
                    denY += (d.y - meanY) ** 2;
                  });
                  const r = denX * denY === 0 ? 0 : num / Math.sqrt(denX * denY);

                  return (
                    <>
                      <ResponsiveContainer width="100%" height={300}>
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" dataKey="x" name={traitNames[bfTrait]} label={{ value: traitNames[bfTrait], position: "insideBottom", offset: -10 }} domain={[1, 5]} />
                          <YAxis type="number" dataKey="y" name="成長量(Δ)" label={{ value: "成長量(Δ)", angle: -90, position: "insideLeft" }} />
                          <ZAxis type="number" range={[50, 50]} />
                          <ReTooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v: number) => v.toFixed(2)} />
                          <Scatter name="実習生" data={scatterData} fill="#1976d2" />
                        </ScatterChart>
                      </ResponsiveContainer>
                      <Box mt={1} textAlign="center">
                        <Chip 
                          label={\`相関係数 r = \${r.toFixed(2)}\`} 
                          color={Math.abs(r) >= 0.4 ? "primary" : "default"} 
                          variant={Math.abs(r) >= 0.4 ? "filled" : "outlined"} 
                        />
                      </Box>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  高成長群 vs 低成長群 の性格プロファイル比較
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  実習でのスコア上昇幅が上位25%の層と下位25%の層で、BigFive特性にどのような違いがあるかを示します。
                </Typography>
                {(() => {
                  const sorted = [...cohorts].sort((a, b) => b.growth_delta - a.growth_delta);
                  const q = Math.max(1, Math.floor(sorted.length / 4));
                  const top = sorted.slice(0, q);
                  const bot = sorted.slice(-q);

                  const getAvg = (grp: any[], key: string) => 
                    grp.length ? grp.reduce((s, p) => s + p.big_five[key], 0) / grp.length : 0;

                  const radarData = [
                    { subject: "外向性", top: getAvg(top, "extraversion"), bot: getAvg(bot, "extraversion") },
                    { subject: "協調性", top: getAvg(top, "agreeableness"), bot: getAvg(bot, "agreeableness") },
                    { subject: "誠実性", top: getAvg(top, "conscientiousness"), bot: getAvg(bot, "conscientiousness") },
                    { subject: "神経質傾向", top: getAvg(top, "neuroticism"), bot: getAvg(bot, "neuroticism") },
                    { subject: "開放性", top: getAvg(top, "openness"), bot: getAvg(bot, "openness") },
                  ];

                  return (
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis angle={30} domain={[1, 5]} />
                        <ReTooltip formatter={(val: number) => val.toFixed(2)} />
                        <Legend />
                        <Radar name="高成長群 (Top 25%)" dataKey="top" stroke="#4caf50" fill="#4caf50" fillOpacity={0.4} />
                        <Radar name="低成長群 (Bottom 25%)" dataKey="bot" stroke="#f44336" fill="#f44336" fillOpacity={0.4} />
                      </RadarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
`;

if (!code.includes("━━ 性格特性 (BigFive) ━━")) {
  const ending = "    </Box>\n  );\n}";
  code = code.replace(ending, bigFivePanel);
  fs.writeFileSync('src/pages/AdvancedAnalyticsPage.tsx', code);
  console.log("BigFive panel added to AdvancedAnalyticsPage.");
} else {
  console.log("BigFive panel already exists.");
}

