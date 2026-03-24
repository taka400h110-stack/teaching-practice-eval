// @ts-nocheck

/**
 * GrowthVisualizationPage.tsx
 * 成長グラフ - recharts による折れ線グラフ、因子別スコア推移
 */
import React, { useState } from "react";
import {
  Box, CircularProgress, Alert, Card, CardContent, Chip, Grid, Typography, LinearProgress,
  ToggleButton, ToggleButtonGroup, Paper, Avatar, Divider, Tabs, Tab,
} from "@mui/material";
import TrendingUpIcon   from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  AreaChart, Area, BarChart, Bar, RadarChart,
  Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../api/client";
import type { WeeklyScore } from "../types";

const FACTOR_LABELS = ["児童生徒への指導力", "自己評価力", "学級経営力", "職務を理解して行動する力"];
const FACTOR_COLORS = ["#1976d2", "#388e3c", "#f57c00", "#7b1fa2"];
const FACTOR_KEYS   = ["factor1", "factor2", "factor3", "factor4"] as const;

interface TabPanelProps { children: React.ReactNode; value: number; index: number; }
const TabPanel = ({ children, value, index }: TabPanelProps) =>
  value === index ? <Box pt={2}>{children}</Box> : null;

function TrendIcon({ fDelta }: { fDelta: number }) {
  return <TrendingFlatIcon sx={{ color: "text.secondary", fontSize: 18 }} />;
}

export default function GrowthVisualizationPage() {
  const [tab, setTab] = useState(0);
  const [view, setView] = useState<"total" | "factors">("total");

  const { data: growth, isLoading } = useQuery({
    queryKey: ["growth"],
    queryFn:  () => apiClient.getGrowthData(),
  });
  const { data: selfEvals = [] } = useQuery({
    queryKey: ["selfEvals"],
    queryFn:  () => apiClient.getSelfEvaluations(),
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!growth || !growth.weekly_scores || growth.weekly_scores.length === 0) {
    return (
      <Box maxWidth={1000} mx="auto" p={3}>
        <Alert severity="info">成長データがありません。</Alert>
      </Box>
    );
  }

  const scores    = growth.weekly_scores;
  const latest    = scores[scores.length - 1];
  const first     = scores[0];
  const prev      = scores.length >= 2 ? scores[scores.length - 2] : null;
  const totalDelta = latest.total - first.total;
  const weekDelta  = prev ? latest.total - prev.total : 0;

  // recharts 用データ
  const chartData = scores.map((s) => ({
    week: `W${s.week}`,
    総合: +s.total.toFixed(2),
    指導実践: +s.factor1.toFixed(2),
    自己評価: +s.factor2.toFixed(2),
    学級経営: +s.factor3.toFixed(2),
    役割理解: +s.factor4.toFixed(2),
  }));

  // 自己評価 vs AI 評価 比較データ
  const compData = selfEvals.map((se) => {
    const aiWeek = scores.find((s) => s.week === se.week);
    return {
      week: `W${se.week}`,
      自己評価: +se.total.toFixed(2),
      AI評価: aiWeek ? +aiWeek.total.toFixed(2) : null,
    };
  }).filter((d) => d.AI評価 !== null);

  // 週別成長量 (fDelta)
  const fDeltaData = scores.slice(1).map((s, i) => ({
    week: `W${s.week}`,
    成長量: +(s.total - scores[i].total).toFixed(3),
    因子I: +(s.factor1 - scores[i].factor1).toFixed(3),
    因子II: +(s.factor2 - scores[i].factor2).toFixed(3),
    因子III: +(s.factor3 - scores[i].factor3).toFixed(3),
    因子IV: +(s.factor4 - scores[i].factor4).toFixed(3),
  }));

  // レーダーデータ（最終週 vs 初期週）
  const radarData = FACTOR_LABELS.map((label, i) => ({
    factor: label.slice(0, 6),
    初期: +scores[0][FACTOR_KEYS[i]].toFixed(2),
    最終: +scores[scores.length - 1][FACTOR_KEYS[i]].toFixed(2),
  }));

  return (
    <Box>
      {/* ヘッダー */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight="bold">
          <TrendingUpIcon sx={{ verticalAlign: "middle", mr: 0.5 }} />
          成長グラフ
        </Typography>
      </Box>

      {/* サマリカード */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: "現在の総合スコア",  value: latest.total.toFixed(2),     color: "#1565C0", bg: "#e3f2fd", fDelta: weekDelta,   sub: `前週比 ${weekDelta >= 0 ? "+" : ""}${weekDelta.toFixed(2)}` },
          { label: "実習開始からの成長", value: `+${totalDelta.toFixed(2)}`, color: "#388e3c", bg: "#e8f5e9", fDelta: totalDelta,  sub: `${first.total.toFixed(2)} → ${latest.total.toFixed(2)}` },
          { label: "記録週数",          value: `${scores.length}週`,         color: "#f57c00", bg: "#fff3e0", fDelta: 0,           sub: `Week ${first.week} ～ Week ${latest.week}` },
          { label: "最高スコア週",      value: `W${scores.reduce((a, b) => a.total >= b.total ? a : b).week}`, color: "#7b1fa2", bg: "#f3e5f5", fDelta: 0, sub: `${Math.max(...scores.map((s) => s.total)).toFixed(2)} / 5.0` },
        ].map((c) => (
          <Grid key={c.label} size={{ xs: 6, sm: 3 }}>
            <Card sx={{ bgcolor: c.bg }}>
              <CardContent sx={{ p: "14px !important" }}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <TrendIcon fDelta={c.fDelta} />
                  <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold" color={c.color}>{c.value}</Typography>
                <Typography variant="caption" color="text.secondary">{c.sub}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* タブ */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
        <Tab label="成長軌跡" />
        <Tab label="因子別推移" />
        <Tab label="自己評価比較" />
        <Tab label="成長量" />
        <Tab label="レーダー比較" />
      </Tabs>

      {/* ━━ 成長軌跡 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={0}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="subtitle1" fontWeight="bold">総合スコア推移</Typography>
              <ToggleButtonGroup value={view} exclusive onChange={(_, v) => v && setView(v)} size="small">
                <ToggleButton value="total">総合スコア</ToggleButton>
                <ToggleButton value="factors">因子別</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <ResponsiveContainer width="100%" height={300}>
              {view === "total" ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1565C0" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1565C0" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} />
                  <Tooltip />
                  <ReferenceLine y={3} stroke="#e0e0e0" strokeDasharray="6 3" label={{ value: "中央値(3.0)", position: "right", fontSize: 11, fill: "#9e9e9e" }} />
                  <Area type="monotone" dataKey="総合" stroke="#1565C0" fill="url(#totalGrad)" strokeWidth={2.5} dot={{ r: 4 }} />
                </AreaChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="指導実践" stroke="#1976d2" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="自己評価" stroke="#388e3c" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="学級経営" stroke="#f57c00" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="役割理解" stroke="#7b1fa2" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 週別スコア表 */}
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" mb={1.5}>週別スコア詳細</Typography>
            <Box sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
                    <th style={{ textAlign: "left", padding: "6px 8px", color: "#666" }}>Week</th>
                    {FACTOR_LABELS.map((l, i) => (
                      <th key={l} style={{ textAlign: "center", padding: "6px 8px", color: FACTOR_COLORS[i] }}>{l.slice(0, 4)}</th>
                    ))}
                    <th style={{ textAlign: "center", padding: "6px 8px", color: "#1565C0", fontWeight: "bold" }}>総合</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((s, idx) => (
                    <tr key={s.week} style={{ borderBottom: "1px solid #f0f0f0", background: idx % 2 === 0 ? "#fafafa" : "#fff" }}>
                      <td style={{ padding: "6px 8px", fontWeight: idx === scores.length - 1 ? "bold" : "normal" }}>Week {s.week}</td>
                      {FACTOR_KEYS.map((fk, i) => (
                        <td key={fk} style={{ textAlign: "center", padding: "6px 8px", color: FACTOR_COLORS[i] }}>{s[fk].toFixed(2)}</td>
                      ))}
                      <td style={{ textAlign: "center", padding: "6px 8px", fontWeight: "bold", color: "#1565C0" }}>{s.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ━━ 因子別推移 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={1}>
        <Grid container spacing={3}>
          {FACTOR_KEYS.map((fk, i) => {
            const fDelta = latest[fk] - first[fk];
            const factorData = scores.map((s) => ({ week: `W${s.week}`, score: +s[fk].toFixed(2) }));
            return (
              <Grid key={fk} size={{ xs: 12, sm: 6 }}>
                <Card sx={{ borderLeft: `4px solid ${FACTOR_COLORS[i]}` }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: FACTOR_COLORS[i], fontSize: 12 }}>{i + 1}</Avatar>
                      <Typography variant="subtitle2" fontWeight="bold" color={FACTOR_COLORS[i]}>{FACTOR_LABELS[i]}</Typography>
                      <Chip label={`+${fDelta.toFixed(2)}`} size="small" color={fDelta > 0 ? "success" : "default"} sx={{ ml: "auto" }} />
                    </Box>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={factorData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                        <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="score" stroke={FACTOR_COLORS[i]} strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                    <Box display="flex" justifyContent="space-between" mt={1}>
                      <Typography variant="caption" color="text.secondary">初期: {first[fk].toFixed(2)}</Typography>
                      <Typography variant="caption" fontWeight="bold" color={FACTOR_COLORS[i]}>現在: {latest[fk].toFixed(2)}</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(latest[fk] / 5) * 100}
                      sx={{ mt: 0.5, height: 6, borderRadius: 3, bgcolor: "grey.200",
                        "& .MuiLinearProgress-bar": { bgcolor: FACTOR_COLORS[i] } }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </TabPanel>

      {/* ━━ 自己評価比較 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={2}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>AI評価 vs 自己評価 推移</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={compData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="AI評価"  stroke="#1976d2" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="自己評価" stroke="#f57c00" strokeWidth={2.5} dot={{ r: 4 }} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
            <Box mt={2}>
              <Typography variant="subtitle2" fontWeight="bold" mb={1}>週別 AI評価 vs 自己評価</Typography>
              <Box sx={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
                      <th style={{ textAlign: "left", padding: "6px 8px", color: "#666" }}>Week</th>
                      <th style={{ textAlign: "center", padding: "6px 8px", color: "#1976d2" }}>AI評価</th>
                      <th style={{ textAlign: "center", padding: "6px 8px", color: "#f57c00" }}>自己評価</th>
                      <th style={{ textAlign: "center", padding: "6px 8px", color: "#666" }}>差 (自己-AI)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selfEvals.map((se, idx) => {
                      const aiScore = scores.find((s) => s.week === se.week);
                      const diff = aiScore ? +(se.total - aiScore.total).toFixed(2) : null;
                      return (
                        <tr key={se.id} style={{ borderBottom: "1px solid #f0f0f0", background: idx % 2 === 0 ? "#fafafa" : "#fff" }}>
                          <td style={{ padding: "6px 8px" }}>Week {se.week}</td>
                          <td style={{ textAlign: "center", padding: "6px 8px", color: "#1976d2" }}>{aiScore?.total.toFixed(2) ?? "—"}</td>
                          <td style={{ textAlign: "center", padding: "6px 8px", color: "#f57c00" }}>{se.total.toFixed(2)}</td>
                          <td style={{ textAlign: "center", padding: "6px 8px", fontWeight: "bold",
                            color: diff === null ? "#666" : diff > 0 ? "#388e3c" : diff < 0 ? "#d32f2f" : "#666" }}>
                            {diff !== null ? (diff > 0 ? `+${diff}` : diff) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ━━ 成長量 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={3}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>週別成長量（前週比）</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={fDeltaData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <ReferenceLine y={0} stroke="#666" />
                <Bar dataKey="成長量" fill="#1565C0" />
              </BarChart>
            </ResponsiveContainer>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight="bold" mb={2}>因子別成長量</Typography>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={fDeltaData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <ReferenceLine y={0} stroke="#666" />
                <Bar dataKey="因子I"   fill="#1976d2" />
                <Bar dataKey="因子II"  fill="#388e3c" />
                <Bar dataKey="因子III" fill="#f57c00" />
                <Bar dataKey="因子IV"  fill="#7b1fa2" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ━━ レーダー比較 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={4}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" mb={2}>実習初期 vs 最終 レーダー比較</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="factor" tick={{ fontSize: 12 }} />
                    <Radar name="初期" dataKey="初期" stroke="#bdbdbd" fill="#bdbdbd" fillOpacity={0.3} />
                    <Radar name="最終" dataKey="最終" stroke="#1565C0" fill="#1565C0" fillOpacity={0.4} />
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" mb={2}>因子別成長サマリ</Typography>
                {FACTOR_KEYS.map((fk, i) => {
                  const fDelta  = latest[fk] - first[fk];
                  const selfLatest = selfEvals[selfEvals.length - 1];
                  const selfScore  = selfLatest ? selfLatest[fk] : null;
                  const gap = selfScore !== null ? +(latest[fk] - selfScore).toFixed(2) : null;
                  if (fDelta > 0.05) return <TrendingUpIcon sx={{ color: "success.main", fontSize: 18 }} />;
  if (fDelta < -0.05) return <TrendingDownIcon sx={{ color: "error.main", fontSize: 18 }} />;
  if (isLoading) return <LinearProgress />;
  if (!growth) return null;

  return (
                    <Box key={fk} mb={2.5}>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <Avatar sx={{ width: 22, height: 22, bgcolor: FACTOR_COLORS[i], fontSize: 10 }}>{i + 1}</Avatar>
                        <Typography variant="body2" fontWeight="bold" color={FACTOR_COLORS[i]}>{FACTOR_LABELS[i]}</Typography>
                        <Box ml="auto" display="flex" gap={0.5}>
                          <Chip label={`${latest[fk].toFixed(2)}`} size="small" sx={{ bgcolor: FACTOR_COLORS[i], color: "white", fontSize: 10 }} />
                          <Chip label={`+${fDelta.toFixed(2)}`} size="small" color={fDelta > 0 ? "success" : "default"} variant="outlined" sx={{ fontSize: 10 }} />
                        </Box>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(latest[fk] / 5) * 100}
                        sx={{ height: 8, borderRadius: 4, bgcolor: "grey.200",
                          "& .MuiLinearProgress-bar": { bgcolor: FACTOR_COLORS[i] } }}
                      />
                      {gap !== null && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.3, display: "block" }}>
                          自己評価との差: <b style={{ color: gap > 0 ? "#388e3c" : "#d32f2f" }}>
                            {gap > 0 ? "+" : ""}{gap}
                          </b>（AI評価が{gap > 0 ? "高い" : gap < 0 ? "低い" : "同じ"}）
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
}
