import React, { useState, useMemo } from "react";
import {
  Box, Typography, Card, CardContent, Chip, Grid,
  TextField, MenuItem, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Avatar,
  Tabs, Tab, LinearProgress, Tooltip, IconButton,
} from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import FilterListIcon from "@mui/icons-material/FilterList";
import DownloadIcon from "@mui/icons-material/Download";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartTooltip, Legend,
  ScatterChart, Scatter,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import type { StudentProfile } from "../types";
import { apiFetch } from "../api/client";

const SCHOOL_TYPE_LABELS: Record<string, string> = {
  elementary: "小学校", middle: "中学校", high: "高校", special: "特別支援",
};
const INTERNSHIP_LABELS: Record<string, string> = {
  intensive: "集中実習", distributed: "分散実習",
};

function ScoreBar({ value, max = 4 }: { value: number; max?: number }) {
  const pct = (value / max) * 100;
  const color = pct >= 75 ? "#2e7d32" : pct >= 50 ? "#1565c0" : "#e65100";
  return (
    <Box display="flex" alignItems="center" gap={1}>
      <LinearProgress variant="determinate" value={pct}
        sx={{ flexGrow: 1, height: 8, borderRadius: 4, "& .MuiLinearProgress-bar": { bgcolor: color } }}
      />
      <Typography variant="caption" width={32} textAlign="right">{value}</Typography>
    </Box>
  );
}

interface TabPanelProps { children: React.ReactNode; value: number; index: number; }
const TabPanel = ({ children, value, index }: TabPanelProps) =>
  value === index ? <Box pt={2}>{children}</Box> : null;

export default function CohortsManagementPage() {
  const [tab, setTab] = useState(0);
  const [filterSchool, setFilterSchool] = useState("all");
  const [filterInternship, setFilterInternship] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["cohorts"],
    queryFn: async () => {
      const res = await apiFetch("/api/data/cohorts", { headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}`, 'Content-Type': 'application/json' } });
      const data = await res.json() as any;
      return data.cohorts || [];
    },
  });

  const filtered = useMemo(() =>
    profiles.filter((p: any) =>
      (filterSchool === "all" || p.school_type === filterSchool) &&
      (filterInternship === "all" || p.internship_type === filterInternship) &&
      (search === "" || p.name.includes(search) || p.school_name.includes(search))
    ), [profiles, filterSchool, filterInternship, search]);

  // 集計
  const stats = useMemo(() => {
    if (!filtered.length) return null;
    const avg = (key: keyof StudentProfile) =>
      +(filtered.reduce((s: any, p: any) => s + (p[key] as number), 0) / filtered.length).toFixed(2);
    return {
      n: filtered.length,
      avgTotal: avg("final_total"),
      avgGrowth: avg("growth_delta"),
      avgGap: avg("self_eval_gap"),
      avgLps: avg("lps"),
      f1: avg("final_factor1"),
      f2: avg("final_factor2"),
      f3: avg("final_factor3"),
      f4: avg("final_factor4"),
    };
  }, [filtered]);

  // 学校種別グループ集計
  const schoolGroups = useMemo(() => {
    const map: Record<string, { n: number; total: number }> = {};
    profiles.forEach((p: any) => {
      if (!map[p.school_type]) map[p.school_type] = { n: 0, total: 0 };
      map[p.school_type].n++;
      map[p.school_type].total += p.final_total;
    });
    return Object.entries(map).map(([type, v]) => ({
      type: SCHOOL_TYPE_LABELS[type] ?? type,
      avg: +(v.total / v.n).toFixed(2),
      n: v.n,
    }));
  }, [profiles]);

  const radarData = stats ? [
    { factor: "指導技術(F1)", value: stats.f1 },
    { factor: "自己評価(F2)", value: stats.f2 },
    { factor: "学級経営(F3)", value: stats.f3 },
    { factor: "学習者理解(F4)", value: stats.f4 },
  ] : [];

  if (isLoading) return <LinearProgress />;

  return (
    <Box>
      {/* ヘッダー */}
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <GroupsIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>コーホート管理</Typography>
        <Chip label={`${profiles.length}名`} size="small" color="primary" />
      </Box>

      {/* フィルター */}
      <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <FilterListIcon color="action" />
          <TextField label="氏名・学校検索" size="small" value={search}
            onChange={(e) => setSearch(e.target.value)} sx={{ width: 200 }} />
          <TextField select label="学校種" size="small" value={filterSchool}
            onChange={(e) => setFilterSchool(e.target.value)} sx={{ width: 130 }}>
            <MenuItem value="all">全て</MenuItem>
            {Object.entries(SCHOOL_TYPE_LABELS).map(([v, l]) =>
              <MenuItem key={v} value={v}>{l}</MenuItem>)}
          </TextField>
          <TextField select label="実習形態" size="small" value={filterInternship}
            onChange={(e) => setFilterInternship(e.target.value)} sx={{ width: 140 }}>
            <MenuItem value="all">全て</MenuItem>
            {Object.entries(INTERNSHIP_LABELS).map(([v, l]) =>
              <MenuItem key={v} value={v}>{l}</MenuItem>)}
          </TextField>
          <Chip label={`絞り込み: ${filtered.length}名`} size="small" />
          <Box ml="auto">
            <Tooltip title="CSV出力（モック）">
              <IconButton size="small"><DownloadIcon /></IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
        <Tab label="一覧・詳細" />
        <Tab label="グループ比較" />
        <Tab label="分布・散布図" />
        <Tab label="BigFive分析" />
      </Tabs>

      {/* ━━ 一覧タブ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={0}>
        <Grid container spacing={2}>
          {/* 集計カード */}
          {stats && (
            <Grid size={{ xs: 12 }}>
              <Grid container spacing={2}>
                {[
                  { label: "対象学生数", value: stats.n, unit: "名" },
                  { label: "平均最終スコア", value: stats.avgTotal, unit: "/4.0" },
                  { label: "平均成長量", value: stats.avgGrowth, unit: "pt" },
                  { label: "自己評価ギャップ", value: stats.avgGap, unit: "pt" },
                  { label: "平均LPS", value: stats.avgLps, unit: "" },
                ].map((s) => (
                  <Grid key={s.label} size={{ xs: 6, sm: 4, md: 2.4 }}>
                    <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#f3f7fb" }}>
                      <Typography variant="h5" fontWeight={700} color="primary">{s.value}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          )}

          {/* テーブル */}
          <Grid size={{ xs: 12, md: selectedStudent ? 7 : 12 }}>
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#e3f2fd" }}>
                    {["氏名", "学校", "形態", "F1", "F2", "F3", "F4", "総合", "成長量"].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((p: any) => (
                    <TableRow key={p.id} hover selected={selectedStudent?.id === p.id}
                      onClick={() => setSelectedStudent(p)} sx={{ cursor: "pointer" }}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: 11, bgcolor: p.gender === "male" ? "#1565c0" : "#c62828" }}>
                            {p.name[0]}
                          </Avatar>
                          <Typography variant="body2">{p.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell><Typography variant="caption">{SCHOOL_TYPE_LABELS[p.school_type]}</Typography></TableCell>
                      <TableCell><Chip label={INTERNSHIP_LABELS[p.internship_type]} size="small" variant="outlined" /></TableCell>
                      <TableCell>{p.final_factor1}</TableCell>
                      <TableCell>{p.final_factor2}</TableCell>
                      <TableCell>{p.final_factor3}</TableCell>
                      <TableCell>{p.final_factor4}</TableCell>
                      <TableCell><b>{p.final_total}</b></TableCell>
                      <TableCell>
                        <Chip label={`+${p.growth_delta}`} size="small"
                          color={p.growth_delta >= 0.8 ? "success" : p.growth_delta >= 0.5 ? "primary" : "default"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          {/* 詳細パネル */}
          {selectedStudent && (
            <Grid size={{ xs: 12, md: 5 }}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Avatar sx={{ bgcolor: selectedStudent.gender === "male" ? "#1565c0" : "#c62828" }}>
                      {selectedStudent.name[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>{selectedStudent.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {selectedStudent.school_name} / 指導: {selectedStudent.supervisor}
                      </Typography>
                    </Box>
                  </Box>
                  {[
                    { label: "因子I（指導技術）", value: selectedStudent.final_factor1 },
                    { label: "因子II（自己評価）", value: selectedStudent.final_factor2 },
                    { label: "因子III（学級経営）", value: selectedStudent.final_factor3 },
                    { label: "因子IV（学習者理解）", value: selectedStudent.final_factor4 },
                  ].map((f) => (
                    <Box key={f.label} mb={1}>
                      <Typography variant="caption">{f.label}</Typography>
                      <ScoreBar value={f.value} />
                    </Box>
                  ))}
                  <Box mt={2}>
                    <ResponsiveContainer width="100%" height={200}>
                      <RadarChart data={[
                        { factor: "F1", value: selectedStudent.final_factor1 },
                        { factor: "F2", value: selectedStudent.final_factor2 },
                        { factor: "F3", value: selectedStudent.final_factor3 },
                        { factor: "F4", value: selectedStudent.final_factor4 },
                      ]}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="factor" />
                        <Radar dataKey="value" stroke="#1976d2" fill="#1976d2" fillOpacity={0.4} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </TabPanel>

      {/* ━━ グループ比較タブ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={1}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  学校種別 平均スコア
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={schoolGroups}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis domain={[0, 4]} />
                    <RechartTooltip />
                    <Bar dataKey="avg" fill="#1976d2" name="平均スコア" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  因子別プロファイル（全体平均）
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="factor" tick={{ fontSize: 11 }} />
                    <Radar dataKey="value" stroke="#1976d2" fill="#1976d2" fillOpacity={0.4} name="平均" />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ━━ 分布・散布図タブ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={2}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  成長量 vs 最終スコア
                </Typography>
                <ResponsiveContainer width="100%" height={320}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="x" name="成長量" label={{ value: "成長量(Δ)", position: "insideBottom", offset: -5 }} />
                    <YAxis dataKey="y" name="最終スコア" label={{ value: "最終スコア", angle: -90, position: "insideLeft" }} />
                    <RechartTooltip cursor={{ strokeDasharray: "3 3" }}
                      formatter={(val, name) => [val, name === "x" ? "成長量" : "最終スコア"]}
                    />
                    <Scatter
                      name="学生"
                      data={filtered.map((p: any) => ({
                        x: p.growth_delta, y: p.final_total,
                        name: p.name,
                      }))}
                      fill="#1976d2" opacity={0.7}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  自己評価ギャップ分布
                </Typography>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={(() => {
                      const bins = [0, 0.1, 0.2, 0.3, 0.4, 0.5];
                      return bins.map((bin, i) => ({
                        range: `${bin.toFixed(1)}–${(bins[i + 1] ?? 0.6).toFixed(1)}`,
                        count: filtered.filter((p: any) =>
                          p.self_eval_gap >= bin && p.self_eval_gap < (bins[i + 1] ?? 99)).length,
                      }));
                    })()}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <RechartTooltip />
                    <Bar dataKey="count" fill="#43a047" name="人数" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ━━ BigFive タブ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={3}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  BigFive 平均プロファイル
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={(() => {
                    const keys = ["extraversion", "agreeableness", "conscientiousness", "neuroticism", "openness"] as const;
                    const labels = ["外向性", "協調性", "誠実性", "神経症傾向", "開放性"];
                    return keys.map((k, i) => ({
                      factor: labels[i],
                      value: +(profiles.reduce((s: any, p: any) => s + p.big_five[k], 0) / (profiles.length || 1)).toFixed(2),
                    }));
                  })()}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="factor" tick={{ fontSize: 12 }} />
                    <Radar dataKey="value" stroke="#7b1fa2" fill="#7b1fa2" fillOpacity={0.35} name="BigFive平均" />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  外向性 vs 最終スコア（相関）
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="x" name="外向性"
                      label={{ value: "外向性スコア", position: "insideBottom", offset: -5 }} />
                    <YAxis dataKey="y" name="最終スコア"
                      label={{ value: "最終スコア", angle: -90, position: "insideLeft" }} />
                    <RechartTooltip />
                    <Scatter
                      data={filtered.map((p: any) => ({ x: p.big_five.extraversion, y: p.final_total }))}
                      fill="#7b1fa2" opacity={0.7}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
}
