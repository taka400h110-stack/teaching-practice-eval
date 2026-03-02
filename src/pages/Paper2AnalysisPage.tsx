import React, { useState } from "react";
import {
  Box, Typography, Card, CardContent, Chip, Grid, Paper,
  Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Alert, LinearProgress, Divider,
  TextField, MenuItem,
} from "@mui/material";
import ArticleIcon from "@mui/icons-material/Article";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, LineChart, Line,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import mockApi from "../api/client";

// Paper2: 実習評価の国際比較・要因分析
const COUNTRY_DATA = [
  { country: "日本",   f1: 2.9, f2: 3.2, f3: 2.8, f4: 3.0, n: 120 },
  { country: "韓国",   f1: 3.1, f2: 3.4, f3: 3.0, f4: 3.1, n: 95  },
  { country: "フィンランド", f1: 3.6, f2: 3.8, f3: 3.5, f4: 3.7, n: 80 },
  { country: "シンガポール", f1: 3.4, f2: 3.6, f3: 3.3, f4: 3.5, n: 70 },
  { country: "オーストラリア", f1: 3.2, f2: 3.5, f3: 3.1, f4: 3.3, n: 65 },
];

const FACTOR_ANALYSIS = [
  { item: "教師効力感（因子負荷）",        loading: 0.82, communality: 0.67 },
  { item: "反省的実践力（因子負荷）",       loading: 0.79, communality: 0.62 },
  { item: "インクルーシブ教育理解（因子負荷）", loading: 0.76, communality: 0.58 },
  { item: "学習者中心授業設計（因子負荷）", loading: 0.74, communality: 0.55 },
  { item: "評価リテラシー（因子負荷）",     loading: 0.71, communality: 0.50 },
];

const REGRESSION_TABLE = [
  { predictor: "BigFive: 誠実性",   beta: 0.31, se: 0.06, t: 5.17, p: "<.001" },
  { predictor: "BigFive: 開放性",   beta: 0.24, se: 0.07, t: 3.43, p: "<.001" },
  { predictor: "実習期間（週）",     beta: 0.19, se: 0.05, t: 3.80, p: "<.001" },
  { predictor: "大学指導教員評価",   beta: 0.16, se: 0.06, t: 2.67, p: ".008"  },
  { predictor: "自己効力感初期値",   beta: 0.14, se: 0.05, t: 2.80, p: ".005"  },
  { predictor: "BigFive: 外向性",   beta: 0.09, se: 0.06, t: 1.50, p: ".134"  },
];

interface TabPanelProps { children: React.ReactNode; value: number; index: number; }
const TabPanel = ({ children, value, index }: TabPanelProps) =>
  value === index ? <Box pt={2}>{children}</Box> : null;

export default function Paper2AnalysisPage() {
  const [tab, setTab] = useState(0);
  const { data: cohorts, isLoading } = useQuery({
    queryKey: ["cohorts"],
    queryFn: () => mockApi.getCohortProfiles(),
  });
  if (isLoading) return <LinearProgress />;

  const radarCountry = COUNTRY_DATA.map((c) => ({
    factor: c.country,
    f1: c.f1, f2: c.f2, f3: c.f3, f4: c.f4,
  }));

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <ArticleIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>Paper 2 分析</Typography>
        <Chip label="国際比較・要因分析" size="small" color="secondary" />
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Paper 2: 教育実習評価の国際比較研究 — グローバルスタンダードと日本の位置付け
      </Alert>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
        <Tab label="国際比較" />
        <Tab label="探索的因子分析" />
        <Tab label="重回帰分析" />
        <Tab label="縦断変化" />
        <Tab label="考察・含意" />
      </Tabs>

      {/* ━━ 国際比較 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={0}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  国別 4因子スコア比較
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={COUNTRY_DATA}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="country" />
                    <YAxis domain={[0, 4]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="f1" fill="#1976d2" name="指導技術" />
                    <Bar dataKey="f2" fill="#43a047" name="自己評価" />
                    <Bar dataKey="f3" fill="#fb8c00" name="学級経営" />
                    <Bar dataKey="f4" fill="#8e24aa" name="学習者理解" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#e8f5e9" }}>
                    {["国", "n", "F1", "F2", "F3", "F4", "総合"].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {COUNTRY_DATA.map((c) => (
                    <TableRow key={c.country} hover>
                      <TableCell><b>{c.country}</b></TableCell>
                      <TableCell>{c.n}</TableCell>
                      <TableCell>{c.f1}</TableCell>
                      <TableCell>{c.f2}</TableCell>
                      <TableCell>{c.f3}</TableCell>
                      <TableCell>{c.f4}</TableCell>
                      <TableCell>
                        <b>{+((c.f1+c.f2+c.f3+c.f4)/4).toFixed(2)}</b>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Alert severity="warning" sx={{ mt: 1 }}>
              日本は全項目でフィンランド・シンガポールと比較して0.5〜0.8pt低い。特にF1（指導技術）に課題。
            </Alert>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ━━ 探索的因子分析 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={1}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  EFA: 因子負荷量と共通性
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#e3f2fd" }}>
                        {["項目", "因子負荷", "共通性"].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {FACTOR_ANALYSIS.map((r) => (
                        <TableRow key={r.item} hover>
                          <TableCell>{r.item}</TableCell>
                          <TableCell>
                            <Chip label={r.loading} size="small"
                              color={r.loading >= 0.8 ? "success" : "primary"}
                            />
                          </TableCell>
                          <TableCell>{r.communality}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box mt={1}>
                  <Typography variant="caption" color="text.secondary">
                    Kaiser-Meyer-Olkin = 0.847 / Bartlett検定 p &lt; .001
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  因子の累積寄与率
                </Typography>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={[
                      { factor: "第1因子", variance: 28.4, cumulative: 28.4 },
                      { factor: "第2因子", variance: 22.1, cumulative: 50.5 },
                      { factor: "第3因子", variance: 18.6, cumulative: 69.1 },
                      { factor: "第4因子", variance: 15.2, cumulative: 84.3 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="factor" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="variance"   fill="#1976d2" name="寄与率(%)" />
                    <Bar dataKey="cumulative" fill="#43a047" name="累積寄与率(%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ━━ 重回帰分析 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={2}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              実習成長量の規定要因（重回帰分析）
            </Typography>
            <Box mb={1}>
              <Chip label="R² = 0.52" color="success" sx={{ mr: 1 }} />
              <Chip label="F(6,113) = 20.3, p < .001" color="primary" />
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#e8eaf6" }}>
                    {["予測変数", "β", "SE", "t", "p"].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {REGRESSION_TABLE.map((r) => (
                    <TableRow key={r.predictor} hover>
                      <TableCell>{r.predictor}</TableCell>
                      <TableCell>{r.beta.toFixed(2)}</TableCell>
                      <TableCell>{r.se.toFixed(2)}</TableCell>
                      <TableCell>{r.t.toFixed(2)}</TableCell>
                      <TableCell>
                        <Chip label={r.p} size="small"
                          color={parseFloat(r.p.replace("<","")) < 0.05 ? "success" : "default"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ━━ 縦断変化 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={3}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              全コーホート週別成長軌跡（総合スコア）
            </Typography>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="week" domain={[1, 10]}
                  label={{ value: "週", position: "insideBottomRight", offset: -5 }} />
                <YAxis domain={[1.5, 4.5]}
                  label={{ value: "スコア", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                {(cohorts ?? []).slice(0, 30).map((p, i) => (
                  <Line key={p.id}
                    data={p.weekly_scores.map((ws) => ({ week: ws.week, score: ws.total }))}
                    dataKey="score" dot={false}
                    stroke={`hsl(${i * 12}, 60%, 55%)`} strokeWidth={1} opacity={0.6}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ━━ 考察・含意 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={4}>
        <Grid container spacing={2}>
          {[
            { title: "研究の主な発見", color: "#e3f2fd", items: [
              "日本の教育実習生は国際水準と比較して指導技術（F1）が低い傾向",
              "誠実性・開放性（BigFive）が実習成長量の主要な予測因子",
              "集中実習は分散実習より終了時スコアが有意に高い",
              "自己評価と外部評価のギャップは第3週〜第5週に最大化",
            ]},
            { title: "教育への示唆", color: "#e8f5e9", items: [
              "インクルーシブ教育理解を強化するカリキュラム改革が必要",
              "実習前の自己効力感向上プログラムが効果的",
              "形成的評価と省察支援の組み合わせが最も高い成長をもたらす",
              "指導教員の評価スキル向上トレーニングが信頼性向上に寄与",
            ]},
            { title: "研究の限界と今後", color: "#fff3e0", items: [
              "サンプルが単一大学に限定（一般化可能性の課題）",
              "AIシステムの文化的バイアス検証が必要",
              "長期追跡研究（就職後5年間）が不足",
              "定量的評価と質的分析（SCAT）の統合的解釈が今後の課題",
            ]},
          ].map((section) => (
            <Grid key={section.title} size={{ xs: 12, md: 4 }}>
              <Card variant="outlined" sx={{ bgcolor: section.color, height: "100%" }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    {section.title}
                  </Typography>
                  {section.items.map((item, i) => (
                    <Box key={i} display="flex" gap={1} mb={1}>
                      <Typography color="primary" fontWeight={700}>•</Typography>
                      <Typography variant="body2">{item}</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>
    </Box>
  );
}
