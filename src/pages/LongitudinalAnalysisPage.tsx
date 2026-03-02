import React, { useState } from "react";
import {
  Box, Typography, Card, CardContent, Chip, Grid, Paper,
  Tabs, Tab, Alert, LinearProgress, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from "@mui/material";
import TimelineIcon from "@mui/icons-material/Timeline";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  AreaChart, Area,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import mockApi from "../api/client";

const FACTOR_COLORS = {
  factor1: "#1976d2", factor2: "#43a047", factor3: "#fb8c00", factor4: "#8e24aa",
};
const FACTOR_LABELS = {
  factor1: "指導技術(F1)", factor2: "自己評価(F2)", factor3: "学級経営(F3)", factor4: "学習者理解(F4)",
};

// モック縦断統計（週別グループ平均 + SD）
function genLongitudinalStats(weeks: number) {
  return Array.from({ length: weeks }, (_, i) => {
    const t = i / (weeks - 1);
    return {
      week: i + 1,
      f1_mean: +(2.2 + t * 1.1).toFixed(2), f1_sd: +(0.3 + t * 0.05).toFixed(2),
      f2_mean: +(2.4 + t * 1.2).toFixed(2), f2_sd: +(0.28 + t * 0.04).toFixed(2),
      f3_mean: +(2.1 + t * 1.0).toFixed(2), f3_sd: +(0.32 + t * 0.05).toFixed(2),
      f4_mean: +(2.3 + t * 1.1).toFixed(2), f4_sd: +(0.3  + t * 0.04).toFixed(2),
      total_mean: +(2.25 + t * 1.1).toFixed(2),
    };
  });
}

const longStats = genLongitudinalStats(10);

interface TabPanelProps { children: React.ReactNode; value: number; index: number; }
const TabPanel = ({ children, value, index }: TabPanelProps) =>
  value === index ? <Box pt={2}>{children}</Box> : null;

export default function LongitudinalAnalysisPage() {
  const [tab, setTab] = useState(0);

  const { data: cohorts, isLoading } = useQuery({
    queryKey: ["cohorts"],
    queryFn: () => mockApi.getCohortProfiles(),
  });

  const { data: growthData } = useQuery({
    queryKey: ["growth"],
    queryFn: () => mockApi.getGrowthData(),
  });

  if (isLoading) return <LinearProgress />;

  const myScores = (growthData?.weekly_scores ?? []).map((ws) => ({
    week: ws.week,
    ...ws,
  }));

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <TimelineIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>縦断分析・成長軌跡</Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
        <Tab label="個人軌跡" />
        <Tab label="コーホート平均" />
        <Tab label="因子別推移" />
        <Tab label="成長量分析" />
      </Tabs>

      {/* ━━ 個人軌跡 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={0}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  自分の成長軌跡（4因子）
                </Typography>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={myScores}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" label={{ value: "週", position: "insideBottomRight", offset: -5 }} />
                    <YAxis domain={[1, 4]} label={{ value: "スコア", angle: -90, position: "insideLeft" }} />
                    <Tooltip />
                    <Legend />
                    {(["factor1","factor2","factor3","factor4"] as const).map((f) => (
                      <Line key={f} type="monotone" dataKey={f}
                        stroke={FACTOR_COLORS[f]} strokeWidth={2}
                        dot={{ r: 4 }} name={FACTOR_LABELS[f]}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* 成長まとめ */}
          <Grid size={{ xs: 12 }}>
            <Grid container spacing={2}>
              {(["factor1","factor2","factor3","factor4"] as const).map((f) => {
                const first = myScores[0]?.[f] ?? 0;
                const last  = myScores[myScores.length - 1]?.[f] ?? 0;
                const delta = +(last - first).toFixed(2);
                return (
                  <Grid key={f} size={{ xs: 6, sm: 3 }}>
                    <Paper sx={{ p: 2, borderLeft: `4px solid ${FACTOR_COLORS[f]}` }}>
                      <Typography variant="caption" color="text.secondary">{FACTOR_LABELS[f]}</Typography>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                        <Typography variant="h6" fontWeight={700}>{last}</Typography>
                        <Chip label={`+${delta}`} size="small"
                          color={delta >= 1.0 ? "success" : delta >= 0.5 ? "primary" : "default"}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        開始: {first} → 最終: {last}
                      </Typography>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ━━ コーホート平均 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={1}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  コーホート全体 週別平均スコア（±1SD）
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={longStats}>
                    <defs>
                      <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#1976d2" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1976d2" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" label={{ value: "週", position: "insideBottomRight", offset: -5 }} />
                    <YAxis domain={[1.5, 4]} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="total_mean" stroke="#1976d2" fill="url(#totalGrad)"
                      strokeWidth={2} name="総合平均" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  コーホート個人軌跡（サンプル）
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="week" domain={[1, 10]} />
                    <YAxis domain={[1.5, 4.5]} />
                    <Tooltip />
                    {(cohorts ?? []).slice(0, 10).map((p, i) => (
                      <Line key={p.id}
                        data={p.weekly_scores.map((ws) => ({ week: ws.week, score: ws.total }))}
                        dataKey="score" dot={false}
                        stroke={`hsl(${i * 36}, 65%, 50%)`} strokeWidth={1} opacity={0.7}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ━━ 因子別推移 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={2}>
        <Grid container spacing={3}>
          {(["factor1","factor2","factor3","factor4"] as const).map((f, idx) => (
            <Grid key={f} size={{ xs: 12, sm: 6 }}>
              <Card variant="outlined" sx={{ borderTop: `3px solid ${FACTOR_COLORS[f]}` }}>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight={700}>{FACTOR_LABELS[f]}</Typography>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={longStats.map((d) => ({
                      week: d.week,
                      mean: (d as any)[`f${idx+1}_mean`],
                      upper: +((d as any)[`f${idx+1}_mean`] + (d as any)[`f${idx+1}_sd`]).toFixed(2),
                      lower: +((d as any)[`f${idx+1}_mean`] - (d as any)[`f${idx+1}_sd`]).toFixed(2),
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis domain={[1.5, 4.5]} />
                      <Tooltip />
                      <Area type="monotone" dataKey="upper" stroke="none" fill={FACTOR_COLORS[f]} fillOpacity={0.15} />
                      <Area type="monotone" dataKey="lower" stroke="none" fill="#fff" fillOpacity={1} />
                      <Line type="monotone" dataKey="mean" stroke={FACTOR_COLORS[f]} strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* ━━ 成長量分析 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={3}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  学生別 実習成長量（Δスコア）上位20名
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={[...( cohorts ?? [])]
                      .sort((a, b) => b.growth_delta - a.growth_delta)
                      .slice(0, 20)
                      .map((p) => ({
                        name: p.name.split(" ")[1] ?? p.name,
                        delta: p.growth_delta,
                        total: p.final_total,
                      }))
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="delta" stroke="#1976d2" name="成長量" strokeWidth={2} dot />
                    <Line type="monotone" dataKey="total" stroke="#43a047" name="最終スコア" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  ペアt検定 結果（開始時 vs 終了時）
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#f3e5f5" }}>
                        {["因子", "開始平均", "終了平均", "Δ", "t値", "p値", "効果量d"].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[
                        { factor: "指導技術(F1)", pre: 2.21, post: 3.35, t: 18.2, p: "<.001", d: 1.23 },
                        { factor: "自己評価(F2)", pre: 2.43, post: 3.61, t: 19.8, p: "<.001", d: 1.34 },
                        { factor: "学級経営(F3)", pre: 2.09, post: 3.12, t: 16.4, p: "<.001", d: 1.11 },
                        { factor: "学習者理解(F4)",pre: 2.31, post: 3.42, t: 17.6, p: "<.001", d: 1.19 },
                      ].map((r) => (
                        <TableRow key={r.factor} hover>
                          <TableCell>{r.factor}</TableCell>
                          <TableCell>{r.pre}</TableCell>
                          <TableCell>{r.post}</TableCell>
                          <TableCell>
                            <Chip label={`+${(r.post - r.pre).toFixed(2)}`} size="small" color="success" />
                          </TableCell>
                          <TableCell>{r.t}</TableCell>
                          <TableCell><Chip label={r.p} size="small" color="success" /></TableCell>
                          <TableCell>{r.d} <Typography variant="caption" color="text.secondary">(大)</Typography></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Alert severity="success" sx={{ mt: 2 }}>
                  全4因子で実習前後に統計的に有意な成長が確認されました（Cohen's d &gt; 1.0）。
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
}
