import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Card, CardContent, Chip, Typography, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Avatar, LinearProgress, Tabs, Tab,
} from "@mui/material";
import SearchIcon     from "@mui/icons-material/Search";
import MenuBookIcon   from "@mui/icons-material/MenuBook";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { useQuery }   from "@tanstack/react-query";
import apiClient from "../api/client";
import { RUBRIC_FACTORS } from "../constants/rubric";
import { LoadingView, ErrorView } from "../components/StateViews";

export default function TeacherDashboardPage() {
  const navigate = useNavigate();
  const [tab, setTab]       = useState(0);
  const [search, setSearch] = useState("");

  const { data: profilesData, isLoading: loadingProfiles, isError: profilesError, refetch: refetchProfiles } = useQuery({
    queryKey: ["cohort"],
    queryFn:  () => apiClient.getCohortProfiles(),
  });
  const profiles = Array.isArray(profilesData) ? profilesData : [];

  const filtered = profiles.filter((p) =>
    p.name.includes(search) || p.school_name.includes(search)
  );

  const pending = profiles.filter((p) => p.weekly_scores.length < p.weeks);
  const avgTotal = profiles.length
    ? (profiles.reduce((s, p) => s + p.final_total, 0) / profiles.length).toFixed(2)
    : "—";

  if (loadingProfiles) return <LoadingView label="担当学生データを読み込み中…" />;
  if (profilesError) return <ErrorView message="担当学生データの読み込みに失敗しました。" onRetry={() => void refetchProfiles()} />;

  return (
    <Box data-testid="teacher-dashboard-root" sx={{ maxWidth: "100vw", overflowX: "hidden" }}>
      <Typography variant="h5" component="h1" fontWeight="bold" mb={3}>教員ダッシュボード</Typography>

      {/* サマリ */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {[
          { label: "担当学生数",   value: profiles.length,     color: "primary.main" },
          { label: "平均総合スコア", value: avgTotal,           color: "success.main" },
          { label: "未完了日誌あり", value: pending.length,    color: "warning.main" },
          { label: "評価待ち",      value: Math.floor(profiles.length * 0.3), color: "error.main" },
        ].map((s) => (
          <Card key={s.label} sx={{ flex: "1 1 140px" }}>
            <CardContent sx={{ p: "16px !important" }}>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              <Typography variant="h4" fontWeight="bold" color={s.color}>{s.value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
        <Tab label="学生一覧" />
        <Tab label="成長サマリ" />
      </Tabs>

      {/* 学生一覧 */}
      {tab === 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <SearchIcon color="action" />
              <TextField size="small" placeholder="氏名・学校名で検索" value={search}
                onChange={(e) => setSearch(e.target.value)} sx={{ width: 260 }} />
              <Chip label={`${filtered.length}名`} size="small" color="primary" sx={{ ml: "auto" }} />
            </Box>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell>氏名</TableCell>
                    <TableCell>学年</TableCell>
                    <TableCell>学校種</TableCell>
                    <TableCell>実習形態</TableCell>
                    <TableCell align="center">総合スコア</TableCell>
                    <TableCell align="center">成長Δ</TableCell>
                    <TableCell align="center">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.slice(0, 20).map((p) => (
                    <TableRow
                      key={p.id}
                      hover
                      onClick={() => navigate(`/journals?student_id=${encodeURIComponent(p.id)}`)}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: p.gender === "male" ? "primary.main" : "secondary.main" }}>
                            {p.name[0]}
                          </Avatar>
                          {p.name}
                        </Box>
                      </TableCell>
                      <TableCell>{p.grade}年</TableCell>
                      <TableCell>
                        <Chip label={{ elementary:"小", middle:"中", high:"高", special:"特支" }[p.school_type as "elementary" | "middle" | "high" | "special"]} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip label={p.internship_type === "intensive" ? "集中" : "分散"} size="small" color={p.internship_type === "intensive" ? "primary" : "default"} variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        <Box>
                          <Typography variant="body2" fontWeight="bold">{p.final_total.toFixed(2)}</Typography>
                          <LinearProgress variant="determinate" value={(p.final_total / 5) * 100}
                            aria-label={`総合スコア ${p.final_total.toFixed(2)} / 5.0`}
                            sx={{ height: 4, borderRadius: 2 }}
                            color={p.final_total >= 4 ? "success" : p.final_total >= 3 ? "primary" : "warning"} />
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={`+${p.growth_delta.toFixed(2)}`} size="small"
                          color={p.growth_delta >= 1 ? "success" : p.growth_delta >= 0.5 ? "primary" : "default"} />
                      </TableCell>
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <Box display="flex" gap={0.5} justifyContent="center">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<MenuBookIcon />}
                            onClick={() => navigate(`/journals?student_id=${encodeURIComponent(p.id)}`)}
                          >
                            日誌
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="secondary"
                            startIcon={<TrendingUpIcon />}
                            onClick={() => navigate(`/teacher-statistics?student_id=${encodeURIComponent(p.id)}`)}
                          >
                            成長
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* 成長サマリ */}
      {tab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>因子別平均スコア（全学生）</Typography>
            {RUBRIC_FACTORS.map((f, i) => `因子${f.roman} ${f.label}`).map((label, i) => {
              const avg = profiles.length
                ? (profiles.reduce((s, p) => s + ((p as any)[`final_factor${i + 1}`] ?? 0), 0) / profiles.length)
                : 0;
              return (
                <Box key={label} mb={2}>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">{label}</Typography>
                    <Typography variant="body2" fontWeight="bold">{avg.toFixed(2)} / 5.0</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={(avg / 5) * 100} aria-label={`${label} 平均 ${avg.toFixed(2)} / 5.0`} sx={{ height: 10, borderRadius: 5 }} />
                </Box>
              );
            })}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
