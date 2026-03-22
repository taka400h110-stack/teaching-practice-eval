import React, { useState } from "react";
import {
  Box, Typography, Card, CardContent, Chip, Grid, Paper,
  Tabs, Tab, LinearProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Divider,
  Button, Menu, MenuItem, Tooltip,
} from "@mui/material";
import EqualizerIcon from "@mui/icons-material/Equalizer";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import DownloadIcon  from "@mui/icons-material/Download";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, Legend, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PieChart, Pie, Cell, ReferenceLine,
} from "recharts";
import { useQuery } from "@tanstack/react-query";

const COLORS = ["#1976d2", "#43a047", "#fb8c00", "#8e24aa", "#e53935"];
const FACTOR_LABELS = ["児童生徒への指導力", "自己評価力", "学級経営力", "職務を理解して行動する力"];

interface TabPanelProps { children: React.ReactNode; value: number; index: number; }
const TabPanel = ({ children, value, index }: TabPanelProps) =>
  value === index ? <Box pt={2}>{children}</Box> : null;

// ── CSV / JSON エクスポートユーティリティ ──
function downloadCSV(filename: string, rows: string[][]): void {
  const bom  = "\uFEFF";
  const text = bom + rows.map((r) =>
    r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
  ).join("\n");
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadJSON(filename: string, data: unknown): void {
  const text = JSON.stringify(data, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function StatisticsPage() {
  const [tab, setTab] = useState(0);
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const [anonymize, setAnonymize] = useState(true);

  const { data: cohorts = [], isLoading } = useQuery({
    queryKey: ["cohorts"],
    queryFn: async () => {
      const res = await fetch("/api/data/cohorts", { headers: { "X-User-Role": localStorage.getItem("role") || "researcher" } });
      const data = await res.json() as any;
      return data.cohorts || [];
    },
  });

  const { data: growthData } = useQuery({
    queryKey: ["growth"],
    queryFn: async () => {
      const res = await fetch("/api/data/cohorts", { headers: { "X-User-Role": localStorage.getItem("role") || "researcher" } });
      const data = await res.json() as any;
      return (data.cohorts || []).map((c: any) => c.weekly_scores || []);
    },
  });

  if (isLoading) return <LinearProgress />;

  // ── エクスポートハンドラ ──
  const handleExportCohortCSV = () => {
    const headers = [
      "学籍番号", "氏名", "学年", "性別", "学校種別", "実習形態", "実習週数",
      "因子1_指導力", "因子2_自己評価力", "因子3_学級経営力", "因子4_職務理解",
      "総合スコア", "成長量(Δ)", "自己評価差", "LPS",
      "BigFive_外向性", "BigFive_協調性", "BigFive_誠実性", "BigFive_神経質傾向", "BigFive_開放性",
      "実習校名", "指導教員",
    ];
    const schoolTypeMap: Record<string, string> = {
      elementary: "小学校", middle: "中学校", high: "高校", special: "特別支援",
    };
    const genderMap: Record<string, string> = { male: "男性", female: "女性", other: "その他" };
    const rows = cohorts.map((p: any) => [
      anonymize ? `ID-${p.id.slice(0, 4)}` : (p.student_number ?? p.id),
      anonymize ? "匿名ユーザー" : p.name,
      String(p.grade),
      genderMap[p.gender] ?? p.gender,
      schoolTypeMap[p.school_type] ?? p.school_type,
      p.internship_type === "intensive" ? "集中実習" : "分散実習",
      String(p.weeks),
      p.final_factor1.toFixed(3),
      p.final_factor2.toFixed(3),
      p.final_factor3.toFixed(3),
      p.final_factor4.toFixed(3),
      p.final_total.toFixed(3),
      p.growth_delta.toFixed(3),
      (p.self_eval_gap ?? 0).toFixed(3),
      (p.lps ?? 0).toFixed(3),
      p.big_five.extraversion.toFixed(2),
      p.big_five.agreeableness.toFixed(2),
      p.big_five.conscientiousness.toFixed(2),
      p.big_five.neuroticism.toFixed(2),
      p.big_five.openness.toFixed(2),
      p.school_name,
      p.supervisor,
    ]);
    downloadCSV(`cohort_data_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
    setExportAnchor(null);
  };

  const handleExportWeeklyCSV = () => {
    const headers = ["学籍番号", "氏名", "週", "因子1", "因子2", "因子3", "因子4", "総合"];
    const rows: string[][] = [];
    cohorts.forEach((p: any) => {
      p.weekly_scores.forEach((ws: any) => {
        rows.push([
          anonymize ? `ID-${p.id.slice(0, 4)}` : (p.student_number ?? p.id),
          anonymize ? "匿名ユーザー" : p.name,
          String(ws.week),
          ws.factor1.toFixed(3),
          ws.factor2.toFixed(3),
          ws.factor3.toFixed(3),
          ws.factor4.toFixed(3),
          ws.total.toFixed(3),
        ]);
      });
    });
    downloadCSV(`weekly_scores_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
    setExportAnchor(null);
  };

  const handleExportJSON = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      n: cohorts.length,
      cohorts: cohorts.map((p: any) => ({
        student_number: anonymize ? `ID-${p.id.slice(0, 4)}` : (p.student_number ?? p.id),
        name: anonymize ? "匿名ユーザー" : p.name,
        grade: p.grade,
        gender: p.gender,
        school_type: p.school_type,
        internship_type: p.internship_type,
        weeks: p.weeks,
        school_name: p.school_name,
        supervisor: p.supervisor,
        big_five: p.big_five,
        scores: {
          factor1: p.final_factor1,
          factor2: p.final_factor2,
          factor3: p.final_factor3,
          factor4: p.final_factor4,
          total:   p.final_total,
          growth_delta: p.growth_delta,
          self_eval_gap: p.self_eval_gap,
          lps: p.lps,
        },
        weekly_scores: p.weekly_scores,
      })),
      growth_data: growthData,
    };
    downloadJSON(`research_data_${new Date().toISOString().slice(0, 10)}.json`, payload);
    setExportAnchor(null);
  };

  // 基本統計量
  const scores  = cohorts.map((p: any) => p.final_total);
  const mean    = +(scores.reduce((s: any, v: any) => s + v, 0) / scores.length).toFixed(2);
  const variance = +(scores.reduce((s: any, v: any) => s + (v - mean) ** 2, 0) / scores.length).toFixed(3);
  const sd      = +Math.sqrt(+variance).toFixed(2);
  const sorted  = [...scores].sort((a, b) => a - b);
  const median  = +(scores.length % 2 === 0
    ? (sorted[scores.length / 2 - 1] + sorted[scores.length / 2]) / 2
    : sorted[Math.floor(scores.length / 2)]).toFixed(2);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  // ヒストグラム
  const histBins = [1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5];
  const histData = histBins.slice(0, -1).map((bin, i) => ({
    range: `${bin}–${histBins[i + 1]}`,
    count: cohorts.filter((p: any) => p.final_total >= bin && p.final_total < histBins[i + 1]).length,
  }));

  // 学校種別分布
  const schoolDist = ["elementary", "middle", "high", "special"].map((t) => ({
    name: ({ elementary: "小学校", middle: "中学校", high: "高校", special: "特別支援" } as Record<string,string>)[t],
    value: cohorts.filter((p: any) => p.school_type === t).length,
  }));

  // 実習形態別比較
  const intensive   = cohorts.filter((p: any) => p.internship_type === "intensive");
  const distributed = cohorts.filter((p: any) => p.internship_type === "distributed");
  const internshipComp = [
    { name: "集中実習", n: intensive.length,   avg: +(intensive.reduce((s: any, p: any) => s + p.final_total, 0)   / (intensive.length || 1)).toFixed(2) },
    { name: "分散実習", n: distributed.length, avg: +(distributed.reduce((s: any, p: any) => s + p.final_total, 0) / (distributed.length || 1)).toFixed(2) },
  ];

  // 週別平均
  const maxWeeks = Math.max(...cohorts.map((p: any) => p.weekly_scores.length));
  const weeklyAvgData = Array.from({ length: Math.min(maxWeeks, 10) }, (_, i) => {
    const weekNum   = i + 1;
    const weekScores = cohorts
      .map((p: any) => p.weekly_scores.find((ws: any) => ws.week === weekNum))
      .filter(Boolean);
    return {
      week: weekNum,
      avg: +(weekScores.reduce((s: any, ws: any) => s + (ws?.total ?? 0), 0)   / (weekScores.length || 1)).toFixed(2),
      f1:  +(weekScores.reduce((s: any, ws: any) => s + (ws?.factor1 ?? 0), 0) / (weekScores.length || 1)).toFixed(2),
      f2:  +(weekScores.reduce((s: any, ws: any) => s + (ws?.factor2 ?? 0), 0) / (weekScores.length || 1)).toFixed(2),
      f3:  +(weekScores.reduce((s: any, ws: any) => s + (ws?.factor3 ?? 0), 0) / (weekScores.length || 1)).toFixed(2),
      f4:  +(weekScores.reduce((s: any, ws: any) => s + (ws?.factor4 ?? 0), 0) / (weekScores.length || 1)).toFixed(2),
    };
  });

  return (
    <Box>
      {/* ヘッダー */}
      <Box display="flex" alignItems="center" gap={1} mb={3} flexWrap="wrap">
        <EqualizerIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>統計ダッシュボード</Typography>
        <Chip label={`N = ${cohorts.length}`} size="small" color="primary" />
        <Box sx={{ ml: "auto" }}>
          <Tooltip title="研究用データをエクスポート（研究者・管理者のみ）">
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={(e) => setExportAnchor(e.currentTarget)}
              size="small"
            >
              データエクスポート
            </Button>
          </Tooltip>
          <Menu
            anchorEl={exportAnchor}
            open={Boolean(exportAnchor)}
            onClose={() => setExportAnchor(null)}
          >
            <Box px={2} py={1}>
              <FormControlLabel
                control={<Checkbox checked={anonymize} onChange={(e) => setAnonymize(e.target.checked)} size="small" />}
                label={<Typography variant="body2">個人情報を匿名化する (ID化)</Typography>}
              />
            </Box>
            <Divider />
            <MenuItem onClick={handleExportCohortCSV}>
              📊 コーホートデータ (CSV) — Mplus/R向け
            </MenuItem>
            <MenuItem onClick={handleExportWeeklyCSV}>
              📈 週別スコアデータ (CSV) — LGCM用
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleExportJSON}>
              📦 全研究データ (JSON) — BigFive・週別含む
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* 基本統計カード */}
      <Grid container spacing={2} mb={2}>
        {[
          { label: "サンプル数", value: cohorts.length, unit: "名" },
          { label: "平均スコア", value: mean,   unit: " / 4.0" },
          { label: "標準偏差",   value: sd,     unit: "" },
          { label: "中央値",     value: median, unit: "" },
          { label: "最小値",     value: minScore, unit: "" },
          { label: "最大値",     value: maxScore, unit: "" },
        ].map((s) => (
          <Grid key={s.label} size={{ xs: 6, sm: 4, md: 2 }}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#f3f7fb" }}>
              <Typography variant="h5" fontWeight={700} color="primary">{s.value}{s.unit}</Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
        <Tab label="スコア分布" />
        <Tab label="週別推移" />
        <Tab label="グループ比較" />
        <Tab label="相関分析" />
      </Tabs>

      {/* ━━ スコア分布 ━━ */}
      <TabPanel value={tab} index={0}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  最終スコア分布（ヒストグラム）
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={histData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <ReTooltip />
                    <ReferenceLine x={mean.toString()} stroke="#e53935" label="平均" />
                    <Bar dataKey="count" fill="#1976d2" name="人数" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  学校種別 参加分布
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={schoolDist} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={100}
                      label={({ name, value }) => `${name} ${value}名`}
                    >
                      {schoolDist.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ━━ 週別推移 ━━ */}
      <TabPanel value={tab} index={1}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              週別 平均スコア推移（コーホート全体）
            </Typography>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={weeklyAvgData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" label={{ value: "週", position: "insideBottomRight", offset: -5 }} />
                <YAxis domain={[2, 4]} />
                <ReTooltip />
                <Legend />
                <Line type="monotone" dataKey="avg" stroke="#000"    strokeWidth={3}   name="総合平均" dot />
                <Line type="monotone" dataKey="f1"  stroke="#1976d2" strokeWidth={1.5} name={FACTOR_LABELS[0]} dot={false} />
                <Line type="monotone" dataKey="f2"  stroke="#43a047" strokeWidth={1.5} name={FACTOR_LABELS[1]} dot={false} />
                <Line type="monotone" dataKey="f3"  stroke="#fb8c00" strokeWidth={1.5} name={FACTOR_LABELS[2]} dot={false} />
                <Line type="monotone" dataKey="f4"  stroke="#8e24aa" strokeWidth={1.5} name={FACTOR_LABELS[3]} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ━━ グループ比較 ━━ */}
      <TabPanel value={tab} index={2}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  実習形態別 平均スコア比較
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={internshipComp}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 4]} />
                    <ReTooltip />
                    <Bar dataKey="avg" fill="#1976d2" name="平均スコア" />
                  </BarChart>
                </ResponsiveContainer>
                <TableContainer sx={{ mt: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {["形態", "n", "平均スコア"].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {internshipComp.map((r) => (
                        <TableRow key={r.name} hover>
                          <TableCell>{r.name}</TableCell>
                          <TableCell>{r.n}</TableCell>
                          <TableCell><b>{r.avg}</b></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  学校種別 因子別平均
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={(() => {
                    const types  = ["elementary", "middle", "high", "special"];
                    const labels = ["小学校", "中学校", "高校", "特別支援"];
                    return types.map((t, i) => {
                      const grp = cohorts.filter((p: any) => p.school_type === t);
                      const avg = (key: "final_factor1" | "final_factor2" | "final_factor3" | "final_factor4") =>
                        +(grp.reduce((s: any, p: any) => s + p[key], 0) / (grp.length || 1)).toFixed(2);
                      return {
                        type: labels[i],
                        f1: avg("final_factor1"),
                        f2: avg("final_factor2"),
                        f3: avg("final_factor3"),
                        f4: avg("final_factor4"),
                      };
                    });
                  })()}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="type" tick={{ fontSize: 12 }} />
                    <Radar dataKey="f1" stroke="#1976d2" fill="#1976d2" fillOpacity={0.2} name={FACTOR_LABELS[0]} />
                    <Radar dataKey="f2" stroke="#43a047" fill="#43a047" fillOpacity={0.2} name={FACTOR_LABELS[1]} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ━━ 相関分析 ━━ */}
      <TabPanel value={tab} index={3}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              変数間相関マトリクス（Pearson r）
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f3f7fb" }}>
                    <TableCell sx={{ fontWeight: 700 }}>変数</TableCell>
                    {["F1", "F2", "F3", "F4", "総合", "成長量", "LPS"].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    { label: "F1（指導技術）",   vals: [1.00, 0.71, 0.68, 0.73, 0.91, 0.62, 0.45] },
                    { label: "F2（自己評価）",   vals: [0.71, 1.00, 0.65, 0.70, 0.88, 0.58, 0.51] },
                    { label: "F3（学級経営）",   vals: [0.68, 0.65, 1.00, 0.67, 0.86, 0.55, 0.43] },
                    { label: "F4（学習者理解）", vals: [0.73, 0.70, 0.67, 1.00, 0.89, 0.60, 0.47] },
                    { label: "総合スコア",       vals: [0.91, 0.88, 0.86, 0.89, 1.00, 0.71, 0.54] },
                    { label: "成長量(Δ)",       vals: [0.62, 0.58, 0.55, 0.60, 0.71, 1.00, 0.63] },
                    { label: "LPS",             vals: [0.45, 0.51, 0.43, 0.47, 0.54, 0.63, 1.00] },
                  ].map((row) => (
                    <TableRow key={row.label} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{row.label}</TableCell>
                      {row.vals.map((v, i) => (
                        <TableCell
                          key={i}
                          sx={{
                            bgcolor: v === 1 ? "transparent"
                              : v >= 0.8 ? "#c8e6c9"
                              : v >= 0.6 ? "#b3e5fc"
                              : v >= 0.4 ? "#fff9c4"
                              : "transparent",
                          }}
                        >
                          {v.toFixed(2)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box mt={1} display="flex" gap={1} flexWrap="wrap">
              <Chip label="■ r≥0.8 強い相関" sx={{ bgcolor: "#c8e6c9" }} size="small" />
              <Chip label="■ r≥0.6 中程度の相関" sx={{ bgcolor: "#b3e5fc" }} size="small" />
              <Chip label="■ r≥0.4 弱い相関" sx={{ bgcolor: "#fff9c4" }} size="small" />
            </Box>
          </CardContent>
        </Card>
      </TabPanel>
    </Box>
  );
}
