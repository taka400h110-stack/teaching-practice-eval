/**
 * GrowthVisualizationPage.tsx
 * 成長グラフ - SVGによる折れ線グラフ、因子別スコア推移
 */
import React, { useState } from "react";
import {
  Box, Card, CardContent, Chip, Grid, Typography, LinearProgress,
  ToggleButton, ToggleButtonGroup, Paper, Avatar, Divider,
} from "@mui/material";
import TrendingUpIcon  from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import { useQuery } from "@tanstack/react-query";
import mockApi from "../api/client";
import type { WeeklyScore } from "../types";

const FACTOR_LABELS = ["授業設計・実施", "学習支援・指導", "学級経営", "省察・成長"];
const FACTOR_COLORS = ["#1976d2", "#388e3c", "#f57c00", "#7b1fa2"];
const FACTOR_KEYS   = ["factor1", "factor2", "factor3", "factor4"] as const;

// SVGライングラフコンポーネント
function LineChart({
  data,
  width = 600,
  height = 240,
  showFactors,
}: {
  data: WeeklyScore[];
  width?: number;
  height?: number;
  showFactors: boolean;
}) {
  if (data.length < 2) return <Typography color="text.secondary">データ不足</Typography>;

  const paddingL = 40, paddingR = 20, paddingT = 16, paddingB = 28;
  const chartW = width - paddingL - paddingR;
  const chartH = height - paddingT - paddingB;
  const minV = 1, maxV = 5;

  const xPos = (i: number) => paddingL + (i / (data.length - 1)) * chartW;
  const yPos = (v: number) => paddingT + (1 - (v - minV) / (maxV - minV)) * chartH;

  const makePath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"}${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`).join(" ");

  const lines = showFactors
    ? FACTOR_KEYS.map((fk, i) => ({ key: fk, color: FACTOR_COLORS[i], vals: data.map((d) => d[fk]) }))
    : [{ key: "total", color: "#1565C0", vals: data.map((d) => d.total) }];

  const gridYs = [1, 2, 3, 4, 5];

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      {/* グリッド横線 */}
      {gridYs.map((v) => (
        <g key={v}>
          <line x1={paddingL} y1={yPos(v)} x2={paddingL + chartW} y2={yPos(v)} stroke="#e0e0e0" strokeWidth={1} strokeDasharray={v === 3 ? "4,2" : undefined} />
          <text x={paddingL - 4} y={yPos(v)} textAnchor="end" dominantBaseline="central" fontSize={10} fill="#9e9e9e">{v}</text>
        </g>
      ))}
      {/* X軸ラベル */}
      {data.map((d, i) => (
        <text key={i} x={xPos(i)} y={height - 6} textAnchor="middle" fontSize={10} fill="#9e9e9e">W{d.week}</text>
      ))}
      {/* 折れ線 */}
      {lines.map((l) => (
        <g key={l.key}>
          <path d={makePath(l.vals)} fill="none" stroke={l.color} strokeWidth={2.5} strokeLinejoin="round" />
          {l.vals.map((v, i) => (
            <circle key={i} cx={xPos(i)} cy={yPos(v)} r={4} fill={l.color} stroke="white" strokeWidth={1.5} />
          ))}
        </g>
      ))}
    </svg>
  );
}

function TrendIcon({ delta }: { delta: number }) {
  if (delta > 0.05) return <TrendingUpIcon sx={{ color: "success.main", fontSize: 18 }} />;
  if (delta < -0.05) return <TrendingDownIcon sx={{ color: "error.main", fontSize: 18 }} />;
  return <TrendingFlatIcon sx={{ color: "text.secondary", fontSize: 18 }} />;
}

export default function GrowthVisualizationPage() {
  const [view, setView] = useState<"total" | "factors">("total");

  const { data: growth, isLoading } = useQuery({
    queryKey: ["growth"],
    queryFn:  () => mockApi.getGrowthData(),
  });
  const { data: selfEvals = [] } = useQuery({
    queryKey: ["selfEvals"],
    queryFn:  () => mockApi.getSelfEvaluations(),
  });

  if (isLoading) return <Box display="flex" justifyContent="center" pt={8}><Typography>読み込み中...</Typography></Box>;
  if (!growth) return null;

  const scores    = growth.weekly_scores;
  const latest    = scores[scores.length - 1];
  const first     = scores[0];
  const prev      = scores.length >= 2 ? scores[scores.length - 2] : null;
  const totalDelta = latest.total - first.total;
  const weekDelta  = prev ? latest.total - prev.total : 0;

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight="bold">
          <TrendingUpIcon sx={{ verticalAlign: "middle", mr: 0.5 }} />
          成長グラフ
        </Typography>
        <ToggleButtonGroup
          value={view} exclusive
          onChange={(_, v) => v && setView(v)}
          size="small"
        >
          <ToggleButton value="total">総合スコア</ToggleButton>
          <ToggleButton value="factors">因子別</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* サマリカード */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: "現在の総合スコア",  value: latest.total.toFixed(2),   color: "#1565C0", bg: "#e3f2fd", delta: weekDelta,  sub: `前週比 ${weekDelta >= 0 ? "+" : ""}${weekDelta.toFixed(2)}` },
          { label: "実習開始からの成長", value: `+${totalDelta.toFixed(2)}`, color: "#388e3c", bg: "#e8f5e9", delta: totalDelta, sub: `${first.total.toFixed(2)} → ${latest.total.toFixed(2)}` },
          { label: "記録週数",          value: `${scores.length}週`,        color: "#f57c00", bg: "#fff3e0", delta: 0,          sub: `Week ${first.week} ～ Week ${latest.week}` },
          { label: "最高スコア週",      value: `W${scores.reduce((a, b) => a.total >= b.total ? a : b).week}`, color: "#7b1fa2", bg: "#f3e5f5", delta: 0, sub: `${Math.max(...scores.map((s) => s.total)).toFixed(2)} / 5.0` },
        ].map((c) => (
          <Grid key={c.label} size={{ xs: 6, sm: 3 }}>
            <Card sx={{ bgcolor: c.bg }}>
              <CardContent sx={{ p: "14px !important" }}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <TrendIcon delta={c.delta} />
                  <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold" color={c.color}>{c.value}</Typography>
                <Typography variant="caption" color="text.secondary">{c.sub}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* グラフ */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" mb={2}>
            {view === "total" ? "総合スコア推移" : "因子別スコア推移"}
          </Typography>
          <Box sx={{ overflowX: "auto" }}>
            <LineChart data={scores} showFactors={view === "factors"} />
          </Box>
          {view === "factors" && (
            <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
              {FACTOR_LABELS.map((l, i) => (
                <Chip key={l} label={l} size="small" sx={{ bgcolor: FACTOR_COLORS[i], color: "white", fontSize: 11 }} />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 因子別詳細 */}
      <Grid container spacing={2} mb={3}>
        {FACTOR_KEYS.map((fk, i) => {
          const fDelta = latest[fk] - first[fk];
          const selfLatest = selfEvals[selfEvals.length - 1];
          const selfScore = selfLatest ? selfLatest[fk] : null;
          const gap = selfScore !== null ? +(latest[fk] - selfScore).toFixed(2) : null;
          return (
            <Grid key={fk} size={{ xs: 12, sm: 6 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: FACTOR_COLORS[i], fontSize: 12 }}>{i + 1}</Avatar>
                    <Typography variant="subtitle2" fontWeight="bold" color={FACTOR_COLORS[i]}>{FACTOR_LABELS[i]}</Typography>
                    <Box ml="auto">
                      <TrendIcon delta={fDelta} />
                    </Box>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="h5" fontWeight="bold" color={FACTOR_COLORS[i]}>{latest[fk].toFixed(2)}</Typography>
                    <Chip label={`+${fDelta.toFixed(2)}`} size="small" color={fDelta > 0 ? "success" : "default"} variant="outlined" />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(latest[fk] / 5) * 100}
                    sx={{ height: 8, borderRadius: 4, bgcolor: "grey.200",
                      "& .MuiLinearProgress-bar": { bgcolor: FACTOR_COLORS[i] } }}
                  />
                  {gap !== null && (
                    <Box mt={1}>
                      <Divider sx={{ my: 0.8 }} />
                      <Typography variant="caption" color="text.secondary">
                        自己評価との差: <b style={{ color: gap > 0 ? "#388e3c" : "#d32f2f" }}>
                          {gap > 0 ? "+" : ""}{gap}
                        </b>（AI評価が{gap > 0 ? "高い" : gap < 0 ? "低い" : "同じ"}）
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

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
    </Box>
  );
}
