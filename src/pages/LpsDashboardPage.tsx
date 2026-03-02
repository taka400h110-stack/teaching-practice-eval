/**
 * LpsDashboardPage.tsx
 * Learning Progress Score (LPS) ダッシュボード
 */
import React from "react";
import {
  Box, Card, CardContent, Chip, Grid, LinearProgress, Paper, Typography, Divider,
} from "@mui/material";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useQuery } from "@tanstack/react-query";
import mockApi from "../api/client";
import type { LpsWeek } from "../types";

function GaugeChart({ value, max = 1, color = "#1976d2", label }: { value: number; max?: number; color?: string; label: string }) {
  const pct = Math.min(value / max, 1);
  const r   = 44, cx = 54, cy = 54;
  const circumference = 2 * Math.PI * r;
  const dashArray = circumference * 0.75;
  const dashOffset = dashArray * (1 - pct);
  const startAngle = 135;

  return (
    <Box textAlign="center">
      <svg width={108} height={80} style={{ display: "block", margin: "0 auto" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e0e0e0" strokeWidth={10}
          strokeDasharray={`${dashArray} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(${startAngle} ${cx} ${cy})`}
        />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dashArray * pct} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(${startAngle} ${cx} ${cy})`}
        />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={18} fontWeight="bold" fill={color}>
          {(value * 100).toFixed(0)}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize={10} fill="#9e9e9e">/ 100</text>
      </svg>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
    </Box>
  );
}

function SparkLine({ values, color = "#1976d2", height = 36, width = 120 }: { values: number[]; color?: string; height?: number; width?: number }) {
  if (values.length < 2) return null;
  const minV = Math.min(...values), maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const xStep = width / (values.length - 1);
  const yPos  = (v: number) => height - ((v - minV) / range) * (height - 4) - 2;
  const path  = values.map((v, i) => `${i === 0 ? "M" : "L"}${(i * xStep).toFixed(1)},${yPos(v).toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} />
      <circle cx={((values.length - 1) * xStep)} cy={yPos(values[values.length - 1])} r={3} fill={color} />
    </svg>
  );
}

export default function LpsDashboardPage() {
  const { data: lpsData = [], isLoading } = useQuery({
    queryKey: ["lps"],
    queryFn:  () => mockApi.getLpsData(),
  });
  const { data: aiGrowth } = useQuery({
    queryKey: ["growth"],
    queryFn:  () => mockApi.getGrowthData(),
  });

  if (isLoading) return <Box pt={8} textAlign="center"><Typography>読み込み中...</Typography></Box>;
  if (!lpsData.length) return <Box p={3}><Typography color="text.secondary">データなし</Typography></Box>;

  const latest: LpsWeek = lpsData[lpsData.length - 1];
  const first:  LpsWeek = lpsData[0];
  const aiLatest = aiGrowth?.weekly_scores.slice(-1)[0];

  const lpsValues     = lpsData.map((d) => d.lps);
  const selfValues    = lpsData.map((d) => d.self_eval);
  const aiValues      = lpsData.map((d) => d.ai_eval);
  const growthValues  = lpsData.map((d) => d.growth_rate);

  const lpsGrowth = +(latest.lps - first.lps).toFixed(3);

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <ShowChartIcon color="primary" />
        <Typography variant="h5" fontWeight="bold">LPS ダッシュボード</Typography>
        <Chip label="Learning Progress Score" size="small" color="primary" variant="outlined" />
      </Box>

      {/* LPS計算式説明 */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: "#e3f2fd", borderColor: "#90caf9" }}>
        <Box display="flex" alignItems="flex-start" gap={1}>
          <InfoOutlinedIcon sx={{ color: "primary.main", mt: 0.2, flexShrink: 0 }} />
          <Box>
            <Typography variant="subtitle2" fontWeight="bold" color="primary">LPS計算式</Typography>
            <Typography variant="body2" color="text.secondary" mt={0.3}>
              LPS = 0.4 × (AI評価スコア成長率) + 0.3 × (自己評価との乖離改善) + 0.3 × (目標達成率)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ※ LPSは0〜1のスコアで、実習生の学習進歩を総合的に表す指標です
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* ゲージカード */}
      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card sx={{ bgcolor: "#e3f2fd" }}>
            <CardContent sx={{ p: "12px !important", textAlign: "center" }}>
              <GaugeChart value={latest.lps} color="#1976d2" label="現在のLPS" />
              <Chip
                label={`${lpsGrowth >= 0 ? "▲" : "▼"} ${Math.abs(lpsGrowth * 100).toFixed(1)}%`}
                size="small"
                color={lpsGrowth >= 0 ? "success" : "error"}
                variant="outlined"
                sx={{ mt: 0.5 }}
              />
            </CardContent>
          </Card>
        </Grid>
        {[
          { label: "自己評価（最新）",  value: latest.self_eval / 5, max: 1, color: "#388e3c",  display: latest.self_eval.toFixed(2) },
          { label: "AI評価（最新）",    value: latest.ai_eval / 5,   max: 1, color: "#f57c00",  display: latest.ai_eval.toFixed(2) },
          { label: "成長率",            value: latest.growth_rate,   max: 0.15, color: "#7b1fa2", display: `${(latest.growth_rate * 100).toFixed(1)}%` },
        ].map((g) => (
          <Grid key={g.label} size={{ xs: 6, sm: 3 }}>
            <Card>
              <CardContent sx={{ p: "12px !important", textAlign: "center" }}>
                <Typography variant="h4" fontWeight="bold" color={g.color} gutterBottom>{g.display}</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{g.label}</Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min((g.value / g.max) * 100, 100)}
                  sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: "grey.200",
                    "& .MuiLinearProgress-bar": { bgcolor: g.color } }}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* トレンドグラフ */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: "LPS推移",     values: lpsValues,    color: "#1976d2" },
          { label: "自己評価推移", values: selfValues,   color: "#388e3c" },
          { label: "AI評価推移",  values: aiValues,     color: "#f57c00" },
          { label: "成長率推移",  values: growthValues, color: "#7b1fa2" },
        ].map((s) => (
          <Grid key={s.label} size={{ xs: 6, sm: 3 }}>
            <Paper variant="outlined" sx={{ p: 1.5, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>{s.label}</Typography>
              <SparkLine values={s.values} color={s.color} width={110} />
              <Box display="flex" justifyContent="space-between" mt={0.5}>
                <Typography variant="caption" color="text.secondary">{s.values[0].toFixed(2)}</Typography>
                <Typography variant="caption" fontWeight="bold" color={s.color}>{s.values[s.values.length - 1].toFixed(2)}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* 週別詳細テーブル */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" mb={1.5}>週別LPS詳細</Typography>
          <Box sx={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e0e0e0", background: "#f5f5f5" }}>
                  <th style={{ textAlign: "left", padding: "8px 10px" }}>Week</th>
                  <th style={{ textAlign: "center", padding: "8px 10px", color: "#1976d2" }}>LPS</th>
                  <th style={{ textAlign: "center", padding: "8px 10px", color: "#388e3c" }}>自己評価</th>
                  <th style={{ textAlign: "center", padding: "8px 10px", color: "#f57c00" }}>AI評価</th>
                  <th style={{ textAlign: "center", padding: "8px 10px", color: "#7b1fa2" }}>乖離</th>
                  <th style={{ textAlign: "center", padding: "8px 10px", color: "#666" }}>成長率</th>
                </tr>
              </thead>
              <tbody>
                {lpsData.map((row: LpsWeek, idx) => {
                  const gap    = +(row.self_eval - row.ai_eval).toFixed(2);
                  const isLast = idx === lpsData.length - 1;
                  return (
                    <tr key={row.week} style={{ borderBottom: "1px solid #f0f0f0", background: isLast ? "#e3f2fd" : idx % 2 === 0 ? "#fafafa" : "#fff" }}>
                      <td style={{ padding: "7px 10px", fontWeight: isLast ? "bold" : "normal" }}>
                        Week {row.week} {isLast && <Chip label="最新" size="small" sx={{ ml: 0.5, fontSize: 9, height: 16 }} color="primary" />}
                      </td>
                      <td style={{ textAlign: "center", padding: "7px 10px", fontWeight: "bold", color: "#1976d2" }}>{row.lps.toFixed(3)}</td>
                      <td style={{ textAlign: "center", padding: "7px 10px", color: "#388e3c" }}>{row.self_eval.toFixed(2)}</td>
                      <td style={{ textAlign: "center", padding: "7px 10px", color: "#f57c00" }}>{row.ai_eval.toFixed(2)}</td>
                      <td style={{ textAlign: "center", padding: "7px 10px", color: gap > 0 ? "#d32f2f" : "#388e3c" }}>
                        {gap > 0 ? "+" : ""}{gap}
                      </td>
                      <td style={{ textAlign: "center", padding: "7px 10px", color: "#7b1fa2" }}>{(row.growth_rate * 100).toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
