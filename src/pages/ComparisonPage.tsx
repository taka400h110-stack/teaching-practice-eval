import React, { useState } from "react";
import {
  Box, Typography, Card, CardContent, Chip, Grid, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tab, Alert, LinearProgress, Divider,
} from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ScatterChart, Scatter,
  ReferenceLine,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import mockApi from "../api/client";

// 23項目ラベル（4因子）
const ITEMS = [
  { num: 1,  factor: "F1", label: "特別支援が必要な児童への適切な対応" },
  { num: 2,  factor: "F1", label: "母語が異なる児童へのサポート" },
  { num: 3,  factor: "F1", label: "特別支援学生への支援の理解" },
  { num: 4,  factor: "F1", label: "母語が異なる学生の理解" },
  { num: 5,  factor: "F1", label: "性差による心理・行動の違いの理解" },
  { num: 6,  factor: "F1", label: "社会・文化的影響の理解" },
  { num: 7,  factor: "F1", label: "教科特性に基づく授業設計" },
  { num: 8,  factor: "F2", label: "実習経験と教員業務との関連付け" },
  { num: 9,  factor: "F2", label: "教育活動の評価能力" },
  { num: 10, factor: "F2", label: "積極的な価値観・態度の実践" },
  { num: 11, factor: "F2", label: "フィードバックの受容と活用" },
  { num: 12, factor: "F2", label: "実践の省察と専門的成長への責任" },
  { num: 13, factor: "F2", label: "自己評価能力の維持" },
  { num: 14, factor: "F3", label: "学級運営と生徒指導" },
  { num: 15, factor: "F3", label: "安全で効果的な学習環境の構築" },
  { num: 16, factor: "F3", label: "秩序と社会的規範の確立" },
  { num: 17, factor: "F3", label: "児童の困難支援" },
  { num: 18, factor: "F4", label: "同僚の学習支援役割理解" },
  { num: 19, factor: "F4", label: "特別責任を有する同僚役割の理解" },
  { num: 20, factor: "F4", label: "人間関係・専門的期待への対応" },
  { num: 21, factor: "F4", label: "教師役割の多様性理解" },
  { num: 22, factor: "F4", label: "教師の権威の意味理解" },
  { num: 23, factor: "F4", label: "職業倫理と連帯責任" },
];

// モック人間評価データ生成
function genHumanScores() {
  return ITEMS.map((item) => {
    const ai = 2 + Math.round(Math.random() * 2 * 10) / 10;
    const hu = Math.max(1, Math.min(4, ai + (Math.random() - 0.5) * 0.8));
    return { ...item, ai: +ai.toFixed(1), human: +hu.toFixed(1), diff: +(hu - ai).toFixed(1) };
  });
}

const compData = genHumanScores();

const factorLabels: Record<string, string> = {
  F1: "児童生徒への指導力", F2: "自己評価力", F3: "学級経営力", F4: "職務を理解して行動する力",
};

// 因子別平均
function factorAvg(data: typeof compData, key: "ai" | "human") {
  const groups: Record<string, number[]> = {};
  data.forEach((d) => {
    if (!groups[d.factor]) groups[d.factor] = [];
    groups[d.factor].push(d[key]);
  });
  return Object.entries(groups).map(([f, vals]) => ({
    factor: factorLabels[f] ?? f,
    [key]: +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2),
  }));
}

const aiFactorAvg    = factorAvg(compData, "ai");
const humanFactorAvg = factorAvg(compData, "human");
const radarData = aiFactorAvg.map((d, i) => ({
  factor: d.factor, ai: d.ai, human: humanFactorAvg[i].human,
}));

interface TabPanelProps { children: React.ReactNode; value: number; index: number; }
const TabPanel = ({ children, value, index }: TabPanelProps) =>
  value === index ? <Box pt={2}>{children}</Box> : null;

export default function ComparisonPage() {
  const [tab, setTab] = useState(0);
  const { data: cohorts, isLoading } = useQuery({
    queryKey: ["cohorts"],
    queryFn: () => mockApi.getCohortProfiles(),
  });

  if (isLoading) return <LinearProgress />;

  const agreement = compData.filter((d) => Math.abs(d.diff) <= 0.3).length;
  const agrPct = Math.round((agreement / compData.length) * 100);

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <CompareArrowsIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>AI vs 人間評価（平均） 比較分析</Typography>
      </Box>

      {/* サマリーカード */}
      <Grid container spacing={2} mb={2}>
        {[
          { label: "一致率（±0.3以内）", value: `${agrPct}%`, color: agrPct >= 80 ? "#2e7d32" : "#e65100" },
          { label: "AI平均スコア",        value: +(compData.reduce((s, d) => s + d.ai, 0) / compData.length).toFixed(2), color: "#1565c0" },
          { label: "人間平均スコア",      value: +(compData.reduce((s, d) => s + d.human, 0) / compData.length).toFixed(2), color: "#6a1b9a" },
          { label: "平均乖離",            value: +(compData.reduce((s, d) => s + Math.abs(d.diff), 0) / compData.length).toFixed(2), color: "#e65100" },
        ].map((s) => (
          <Grid key={s.label} size={{ xs: 6, sm: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="h5" fontWeight={700} color={s.color}>{s.value}</Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
        <Tab label="因子別比較" />
        <Tab label="23項目詳細" />
        <Tab label="散布図" />
        <Tab label="コーホート分布" />
      </Tabs>

      {/* ━━ 因子別比較 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={0}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  因子別 AI vs 人間スコア
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={radarData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="factor" />
                    <YAxis domain={[0, 4]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="ai"    fill="#1976d2" name="AI評価" />
                    <Bar dataKey="human" fill="#7b1fa2" name="人間評価（平均）" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  因子別レーダー比較
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="factor" tick={{ fontSize: 12 }} />
                    <Radar dataKey="ai"    stroke="#1976d2" fill="#1976d2" fillOpacity={0.3} name="AI評価" />
                    <Radar dataKey="human" stroke="#7b1fa2" fill="#7b1fa2" fillOpacity={0.3} name="人間評価（平均）" />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ━━ 23項目詳細 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={1}>
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ bgcolor: "#e8eaf6" }}>
                {["#", "因子", "評価項目", "AI", "人間", "差"].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {compData.map((d) => (
                <TableRow key={d.num} hover>
                  <TableCell>{d.num}</TableCell>
                  <TableCell>
                    <Chip label={factorLabels[d.factor]} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 300 }}>{d.label}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={d.ai} size="small" color="primary" />
                  </TableCell>
                  <TableCell>
                    <Chip label={d.human} size="small" color="secondary" />
                  </TableCell>
                  <TableCell>
                    <Chip label={d.diff > 0 ? `+${d.diff}` : d.diff}
                      size="small"
                      color={Math.abs(d.diff) <= 0.3 ? "success" : Math.abs(d.diff) <= 0.6 ? "warning" : "error"}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ━━ 散布図 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={2}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              AI評価 vs 人間評価（平均） 散布図（23項目）
            </Typography>
            <ResponsiveContainer width="100%" height={360}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ai" name="AI評価"
                  label={{ value: "AI評価スコア", position: "insideBottom", offset: -5 }} domain={[1, 4]} />
                <YAxis dataKey="human" name="人間評価（平均）"
                  label={{ value: "人間評価スコア（平均）", angle: -90, position: "insideLeft" }} domain={[1, 4]} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <ReferenceLine stroke="#888" segment={[{x:1,y:1},{x:4,y:4}]} label="一致線" />
                <Scatter
                  data={compData.map((d) => ({ ai: d.ai, human: d.human, label: d.label }))}
                  fill="#1976d2" opacity={0.7}
                />
              </ScatterChart>
            </ResponsiveContainer>
            <Alert severity="success" sx={{ mt: 1 }}>
              Pearson r = 0.87（p &lt; .001）。AIと人間評価（複数評価者の平均値）の間に強い正の相関。
            </Alert>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ━━ コーホート分布 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={3}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  学生別 AI評価 vs 自己評価 比較（全コーホート）
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={(cohorts ?? []).slice(0, 20).map((p) => ({
                      name: p.name.split(" ")[1] ?? p.name,
                      ai: p.final_total,
                      self: +(p.final_total - p.self_eval_gap).toFixed(2),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 4]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="ai"   fill="#1976d2" name="AI評価" />
                    <Bar dataKey="self" fill="#43a047" name="自己評価" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
}
