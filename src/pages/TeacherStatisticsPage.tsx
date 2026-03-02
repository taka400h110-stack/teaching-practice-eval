import React, { useState } from "react";
import {
  Box, Typography, Card, CardContent, Chip, Grid, Paper,
  Tabs, Tab, LinearProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Avatar, Alert,
} from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import mockApi from "../api/client";

interface TabPanelProps { children: React.ReactNode; value: number; index: number; }
const TabPanel = ({ children, value, index }: TabPanelProps) =>
  value === index ? <Box pt={2}>{children}</Box> : null;

// 担当学生別評価スコアのモック（指導教員視点）
const SUPERVISED_STUDENTS = [
  { name: "田中 一郎", school: "東小学校", weeks: 10, f1: 3.2, f2: 3.5, f3: 3.1, f4: 3.3, growth: 1.1, comment: "授業設計力が向上。特支の理解がやや弱い。" },
  { name: "佐藤 花子", school: "西中学校", weeks: 8,  f1: 2.9, f2: 3.2, f3: 2.8, f4: 3.0, growth: 0.8, comment: "省察の深みが増してきた。継続観察中。" },
  { name: "鈴木 次郎", school: "南高校",   weeks: 10, f1: 3.5, f2: 3.7, f3: 3.4, f4: 3.6, growth: 1.3, comment: "全因子で顕著な成長。優秀な実習生。" },
];

// 週別評価データ（モック）
const weeklyEvalData = Array.from({ length: 8 }, (_, i) => ({
  week: i + 1,
  tanaka: +(2.1 + i * 0.15).toFixed(2),
  sato:   +(2.0 + i * 0.12).toFixed(2),
  suzuki: +(2.3 + i * 0.18).toFixed(2),
}));

// 評価コメント履歴
const COMMENT_HISTORY = [
  { week: 3, student: "田中 一郎", comment: "発問の後に十分な待ち時間を設けるとよい。",          type: "改善" },
  { week: 4, student: "佐藤 花子", comment: "クラス全体への配慮とグループ活動の場作りが上手。",   type: "強み" },
  { week: 5, student: "鈴木 次郎", comment: "特別支援の児童への個別声かけが自然にできている。",   type: "強み" },
  { week: 6, student: "田中 一郎", comment: "目標の板書を忘れずに。学習の見通しを持たせること。", type: "改善" },
  { week: 7, student: "佐藤 花子", comment: "日誌の省察が具体的になってきた。継続してほしい。",   type: "改善" },
];

export default function TeacherStatisticsPage() {
  const [tab, setTab] = useState(0);

  const { data: cohorts, isLoading } = useQuery({
    queryKey: ["cohorts"],
    queryFn: () => mockApi.getCohortProfiles(),
  });

  if (isLoading) return <LinearProgress />;

  // 担当学生の因子別レーダーデータ
  const radarData = [
    { factor: "指導技術(F1)" },
    { factor: "自己評価(F2)" },
    { factor: "学級経営(F3)" },
    { factor: "学習者理解(F4)" },
  ].map((d, i) => ({
    factor: d.factor,
    田中: [3.2, 3.5, 3.1, 3.3][i],
    佐藤: [2.9, 3.2, 2.8, 3.0][i],
    鈴木: [3.5, 3.7, 3.4, 3.6][i],
  }));

  // コーホート全体での担当学生の位置
  const allTotals = (cohorts ?? []).map((p) => p.final_total).sort((a, b) => a - b);
  const percentileRank = (score: number) => {
    const rank = allTotals.filter((s) => s <= score).length;
    return Math.round((rank / allTotals.length) * 100);
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <SchoolIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>指導教員ダッシュボード</Typography>
        <Chip label={`担当: ${SUPERVISED_STUDENTS.length}名`} size="small" color="primary" />
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
        <Tab label="担当学生一覧" />
        <Tab label="成長軌跡比較" />
        <Tab label="コメント記録" />
        <Tab label="コーホート内位置" />
      </Tabs>

      {/* ━━ 担当学生一覧 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={0}>
        <Grid container spacing={3}>
          {SUPERVISED_STUDENTS.map((s) => {
            const total = +((s.f1 + s.f2 + s.f3 + s.f4) / 4).toFixed(2);
            return (
              <Grid key={s.name} size={{ xs: 12, md: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <Avatar sx={{ bgcolor: "#1565c0" }}>{s.name[0]}</Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={700}>{s.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.school} / {s.weeks}週間</Typography>
                      </Box>
                    </Box>

                    {[
                      { label: "指導技術(F1)", value: s.f1, color: "#1976d2" },
                      { label: "自己評価(F2)", value: s.f2, color: "#43a047" },
                      { label: "学級経営(F3)", value: s.f3, color: "#fb8c00" },
                      { label: "学習者理解(F4)", value: s.f4, color: "#8e24aa" },
                    ].map((f) => (
                      <Box key={f.label} mb={0.5}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="caption">{f.label}</Typography>
                          <Typography variant="caption" fontWeight={700}>{f.value}/4.0</Typography>
                        </Box>
                        <Box sx={{ height: 6, bgcolor: "#e0e0e0", borderRadius: 3 }}>
                          <Box sx={{ height: "100%", width: `${(f.value / 4) * 100}%`, bgcolor: f.color, borderRadius: 3 }} />
                        </Box>
                      </Box>
                    ))}

                    <Box display="flex" justifyContent="space-between" mt={1.5}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">総合スコア</Typography>
                        <Typography variant="h6" fontWeight={700} color="primary">{total}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">成長量</Typography>
                        <Typography variant="h6" fontWeight={700} color="success.main">+{s.growth}</Typography>
                      </Box>
                    </Box>

                    <Paper sx={{ p: 1, mt: 1, bgcolor: "#f9f9f9" }}>
                      <Typography variant="caption" color="text.secondary">指導コメント</Typography>
                      <Typography variant="body2" fontSize={12}>{s.comment}</Typography>
                    </Paper>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}

          {/* 全員レーダー比較 */}
          <Grid size={{ xs: 12 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  担当学生 因子別比較レーダー
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="factor" tick={{ fontSize: 12 }} />
                    <Radar dataKey="田中" stroke="#1976d2" fill="#1976d2" fillOpacity={0.25} name="田中 一郎" />
                    <Radar dataKey="佐藤" stroke="#43a047" fill="#43a047" fillOpacity={0.25} name="佐藤 花子" />
                    <Radar dataKey="鈴木" stroke="#fb8c00" fill="#fb8c00" fillOpacity={0.25} name="鈴木 次郎" />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ━━ 成長軌跡比較 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={1}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              担当学生 週別成長比較
            </Typography>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={weeklyEvalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" label={{ value: "週", position: "insideBottomRight", offset: -5 }} />
                <YAxis domain={[1.5, 4.5]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="tanaka" stroke="#1976d2" strokeWidth={2} dot name="田中 一郎" />
                <Line type="monotone" dataKey="sato"   stroke="#43a047" strokeWidth={2} dot name="佐藤 花子" />
                <Line type="monotone" dataKey="suzuki" stroke="#fb8c00" strokeWidth={2} dot name="鈴木 次郎" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ━━ コメント記録 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={2}>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#e8f5e9" }}>
                {["週", "学生", "コメント", "種別"].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {COMMENT_HISTORY.map((c, i) => (
                <TableRow key={i} hover>
                  <TableCell>第{c.week}週</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: 11, bgcolor: "#1565c0" }}>
                        {c.student[0]}
                      </Avatar>
                      {c.student}
                    </Box>
                  </TableCell>
                  <TableCell>{c.comment}</TableCell>
                  <TableCell>
                    <Chip label={c.type} size="small"
                      color={c.type === "強み" ? "success" : "warning"}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ━━ コーホート内位置 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={3}>
        <Grid container spacing={3}>
          {SUPERVISED_STUDENTS.map((s) => {
            const total = +((s.f1 + s.f2 + s.f3 + s.f4) / 4).toFixed(2);
            const pct = percentileRank(total);
            return (
              <Grid key={s.name} size={{ xs: 12, sm: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>{s.name}</Typography>
                    <Box textAlign="center" my={2}>
                      <Typography variant="h3" fontWeight={700} color="primary">{pct}%</Typography>
                      <Typography color="text.secondary">コーホート内パーセンタイル</Typography>
                    </Box>
                    <Alert severity={pct >= 75 ? "success" : pct >= 50 ? "info" : "warning"}>
                      {pct >= 75 ? "上位25%に位置します" : pct >= 50 ? "平均より上です" : "継続的な支援が推奨されます"}
                    </Alert>
                    <Box mt={1} display="flex" justifyContent="space-between">
                      <Typography variant="caption">総合スコア</Typography>
                      <Typography variant="body2" fontWeight={700}>{total}/4.0</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="caption">コーホート平均</Typography>
                      <Typography variant="body2">
                        {(allTotals.reduce((s,v)=>s+v,0)/allTotals.length).toFixed(2)}/4.0
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </TabPanel>
    </Box>
  );
}
