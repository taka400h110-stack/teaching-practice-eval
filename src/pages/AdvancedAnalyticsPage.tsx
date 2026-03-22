import React, { useState } from "react";
import {
  Box, Alert, Typography, Card, CardContent, Grid, Paper,
  Tabs, Tab, Table, TableBody, TableCell,
  Select, MenuItem, FormControl, InputLabel,
  TableContainer, TableHead, TableRow, Chip,
  LinearProgress, Tooltip, IconButton
} from "@mui/material";
import ScienceIcon from "@mui/icons-material/Science";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import { useQuery } from "@tanstack/react-query";

interface TabPanelProps { children: React.ReactNode; value: number; index: number; }
const TabPanel = ({ children, value, index }: TabPanelProps) =>
  value === index ? <Box pt={2}>{children}</Box> : null;

// モックデータ：自然言語処理（テキストマイニング）
const topicData = [
  { text: "児童", value: 120, group: "指導" },
  { text: "授業", value: 105, group: "指導" },
  { text: "発問", value: 85, group: "指導" },
  { text: "評価", value: 64, group: "自己評価" },
  { text: "改善", value: 55, group: "自己評価" },
  { text: "学級", value: 50, group: "経営" },
  { text: "支援", value: 45, group: "経営" },
  { text: "準備", value: 40, group: "職務" },
];

const sentimentTrend = [
  { week: 1, pos: 30, neg: 20, neu: 50 },
  { week: 2, pos: 35, neg: 25, neu: 40 },
  { week: 3, pos: 45, neg: 15, neu: 40 },
  { week: 4, pos: 55, neg: 10, neu: 35 },
  { week: 5, pos: 60, neg: 5,  neu: 35 },
];

// 重回帰分析モック
const regressionCoefs = [
  { variable: "Intercept (切片)", coef: 1.25, pValue: 0.001, sig: "***" },
  { variable: "事前の自己効力感 (LPS)", coef: 0.42, pValue: 0.003, sig: "**" },
  { variable: "BigFive外向性", coef: 0.15, pValue: 0.045, sig: "*" },
  { variable: "BigFive誠実性", coef: 0.28, pValue: 0.012, sig: "*" },
  { variable: "実習形態 (集中=1)", coef: 0.11, pValue: 0.320, sig: "ns" },
];

export default function AdvancedAnalyticsPage() {
  const [tab, setTab] = useState(0);
  const { data: cohorts = [], isLoading } = useQuery({ queryKey: ["cohorts"], queryFn: async () => {
      const res = await fetch("/api/data/cohorts", { headers: { "X-User-Role": localStorage.getItem("role") || "researcher" } });
      const data = await res.json() as any;
      return data.cohorts || [];
    } });
  const [bfTrait, setBfTrait] = useState("conscientiousness");

  if (isLoading) return <LinearProgress />;

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <ScienceIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={700}>高度分析（研究者向け）</Typography>
          <Typography variant="body2" color="text.secondary">
            多変量解析・自然言語処理・因果推論モデリング
          </Typography>
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
        <Tab label="多変量解析 (回帰/ANOVA)" />
        <Tab label="自然言語処理 (NLP)" />
        <Tab label="構造方程式モデリング (SEM)" />
        <Tab label="欠損値分析 (MCAR)" />
        <Tab label="性格特性 (BigFive)" />
      </Tabs>

      {/* ━━ 多変量解析 ━━ */}
      <TabPanel value={tab} index={0}>
        <Grid container spacing={3}>
          <Grid size={{xs: 12, md: 6}}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  重回帰分析（従属変数：最終総合スコア）
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  実習前の特性（LPS、BigFive等）が最終スコアに与える影響のOLS推定。
                  R² = 0.482, Adj. R² = 0.465, F-statistic = 15.4 (p &lt; .001)
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "grey.100" }}>
                        <TableCell>独立変数</TableCell>
                        <TableCell align="right">推定係数 (β)</TableCell>
                        <TableCell align="right">p値</TableCell>
                        <TableCell align="center">有意性</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {regressionCoefs.map((row) => (
                        <TableRow key={row.variable} hover>
                          <TableCell>{row.variable}</TableCell>
                          <TableCell align="right">{row.coef.toFixed(3)}</TableCell>
                          <TableCell align="right">{row.pValue.toFixed(3)}</TableCell>
                          <TableCell align="center">{row.sig}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box mt={1} display="flex" gap={1}>
                  <Typography variant="caption">*** p&lt;.001, ** p&lt;.01, * p&lt;.05, ns=not sig</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{xs: 12, md: 6}}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  二元配置分散分析 (Two-way ANOVA)
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  要因: 「学校種別」×「実習形態」 → 従属変数: 成長量(Δ)
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "grey.100" }}>
                        <TableCell>要因</TableCell>
                        <TableCell align="right">自由度 (df)</TableCell>
                        <TableCell align="right">F値</TableCell>
                        <TableCell align="right">p値</TableCell>
                        <TableCell align="right">偏η²</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow hover>
                        <TableCell>学校種別</TableCell>
                        <TableCell align="right">3</TableCell>
                        <TableCell align="right">2.45</TableCell>
                        <TableCell align="right">0.064</TableCell>
                        <TableCell align="right">0.032</TableCell>
                      </TableRow>
                      <TableRow hover>
                        <TableCell>実習形態</TableCell>
                        <TableCell align="right">1</TableCell>
                        <TableCell align="right">0.82</TableCell>
                        <TableCell align="right">0.366</TableCell>
                        <TableCell align="right">0.011</TableCell>
                      </TableRow>
                      <TableRow hover>
                        <TableCell>交互作用 (種別×形態)</TableCell>
                        <TableCell align="right">3</TableCell>
                        <TableCell align="right">1.15</TableCell>
                        <TableCell align="right">0.331</TableCell>
                        <TableCell align="right">0.015</TableCell>
                      </TableRow>
                      <TableRow hover>
                        <TableCell>残差 (Residuals)</TableCell>
                        <TableCell align="right">142</TableCell>
                        <TableCell colSpan={3}></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ━━ NLP ━━ */}
      <TabPanel value={tab} index={1}>
        <Grid container spacing={3}>
          <Grid size={{xs: 12, md: 6}}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  日誌テキスト 感情分析トレンド (VADER/BERT)
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sentimentTrend} stackOffset="expand">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" label={{ value: "週", position: "insideBottom", offset: -5 }} />
                    <YAxis tickFormatter={(v) => `${v * 100}%`} />
                    <ReTooltip formatter={(v: number) => `${v}%`} />
                    <Legend />
                    <Bar dataKey="pos" stackId="1" fill="#4caf50" name="ポジティブ" />
                    <Bar dataKey="neu" stackId="1" fill="#9e9e9e" name="ニュートラル" />
                    <Bar dataKey="neg" stackId="1" fill="#f44336" name="ネガティブ" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{xs: 12, md: 6}}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  頻出トピック抽出 (TF-IDF Top Words)
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topicData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="text" />
                    <ReTooltip />
                    <Bar dataKey="value" fill="#1976d2" name="出現回数" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ━━ SEM ━━ */}
      <TabPanel value={tab} index={2}>
        <Card variant="outlined">
          <CardContent>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography variant="subtitle1" fontWeight={700}>
                パス解析・構造方程式モデリング (Mplus/lavaan 連携近似)
              </Typography>
              <Chip label="適合度: CFI=0.965, RMSEA=0.042" color="success" size="small" />
            </Box>
            <Box p={3} bgcolor="grey.50" borderRadius={2} textAlign="center" border="1px dashed #ccc">
              <Typography variant="body2" color="text.secondary" mb={2}>
                ※ 簡易的なパス図の表現です。実データは CSV エクスポートから R (lavaan) に投入して検証してください。
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="primary">
                BigFive(誠実性) <span style={{color:"#000"}}>-- 0.42** --&gt;</span> LPS(自己効力感) <span style={{color:"#000"}}>-- 0.55*** --&gt;</span> 最終スコア
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="primary" mt={1}>
                実習形態(分散) <span style={{color:"#000"}}>-- -0.15ns --&gt;</span> 成長量(Δ) <span style={{color:"#000"}}>&lt;-- 0.61*** --</span> 最終スコア
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ━━ 欠損値分析 ━━ */}
      <TabPanel value={tab} index={3}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              欠損値分析 (Little's MCAR Test & 多重代入)
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              縦断データにおける週別の欠損率とパターン分析。
              LittleのMCAR検定結果: χ²(15) = 18.4, p = 0.242 (MCARが棄却されない → 欠損は完全にランダムとみなせる)
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{xs: 12, sm: 4}}>
                <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#fff3e0", border: "1px solid #ffe0b2" }}>
                  <Typography variant="h4" color="warning.main" fontWeight="bold">4.2%</Typography>
                  <Typography variant="caption">全体欠損率</Typography>
                </Paper>
              </Grid>
              <Grid size={{xs: 12, sm: 4}}>
                <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#e3f2fd", border: "1px solid #bbdefb" }}>
                  <Typography variant="h4" color="primary.main" fontWeight="bold">Listwise</Typography>
                  <Typography variant="caption">現在の処理方式</Typography>
                </Paper>
              </Grid>
              <Grid size={{xs: 12, sm: 4}}>
                <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#e8f5e9", border: "1px solid #c8e6c9" }}>
                  <Typography variant="h4" color="success.main" fontWeight="bold">FCS/MICE</Typography>
                  <Typography variant="caption">推奨される代入法</Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ━━ 性格特性 (BigFive) ━━ */}
      <TabPanel value={tab} index={4}>
        <Grid container spacing={3}>
          <Grid size={{xs: 12, md: 6}}>
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
                  const scatterData = cohorts.map((p: any) => ({
                    x: (p.big_five as any)[bfTrait] || 0,
                    y: p.growth_delta || 0,
                    name: p.name
                  }));
                  // 相関係数の簡易計算
                  const n = scatterData.length || 1;
                  const sumX = scatterData.reduce((s: any, d: any) => s + d.x, 0);
                  const sumY = scatterData.reduce((s: any, d: any) => s + d.y, 0);
                  const meanX = sumX / n;
                  const meanY = sumY / n;
                  let num = 0, denX = 0, denY = 0;
                  scatterData.forEach((d: any) => {
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
                          label={`相関係数 r = ${r.toFixed(2)}`} 
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

          <Grid size={{xs: 12, md: 6}}>
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

}
