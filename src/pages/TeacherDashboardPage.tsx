import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Card, CardContent, Chip, Typography, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Avatar, LinearProgress, Tabs, Tab,
} from "@mui/material";
import SearchIcon     from "@mui/icons-material/Search";
import AssessmentIcon from "@mui/icons-material/Assessment";
import { useQuery }   from "@tanstack/react-query";
import apiClient from "../api/client";

export default function TeacherDashboardPage() {
  const navigate = useNavigate();
  const [tab, setTab]       = useState(0);
  const [search, setSearch] = useState("");

  const { data: profiles = [] } = useQuery({
    queryKey: ["cohort"],
    queryFn:  () => apiClient.getCohortProfiles(),
  });

  const filtered = profiles.filter((p) =>
    p.name.includes(search) || p.school_name.includes(search)
  );

  const pending = profiles.filter((p) => p.weekly_scores.length < p.weeks);
  const avgTotal = profiles.length
    ? (profiles.reduce((s, p) => s + p.final_total, 0) / profiles.length).toFixed(2)
    : "—";

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>教員ダッシュボード</Typography>

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

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
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
                    <TableRow key={p.id} hover>
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
                        <Chip label={{ elementary:"小", middle:"中", high:"高", special:"特支" }[p.school_type]} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip label={p.internship_type === "intensive" ? "集中" : "分散"} size="small" color={p.internship_type === "intensive" ? "primary" : "default"} variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        <Box>
                          <Typography variant="body2" fontWeight="bold">{p.final_total.toFixed(2)}</Typography>
                          <LinearProgress variant="determinate" value={(p.final_total / 5) * 100}
                            sx={{ height: 4, borderRadius: 2 }}
                            color={p.final_total >= 4 ? "success" : p.final_total >= 3 ? "primary" : "warning"} />
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={`+${p.growth_delta.toFixed(2)}`} size="small"
                          color={p.growth_delta >= 1 ? "success" : p.growth_delta >= 0.5 ? "primary" : "default"} />
                      </TableCell>
                      <TableCell align="center">
                        <Button size="small" startIcon={<AssessmentIcon />}
                          onClick={() => navigate(`/human-evaluation`)}>評価</Button>
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
            {["因子I 指導実践力","因子II 自己評価力","因子III 学級経営力","因子IV 役割理解"].map((label, i) => {
              const avg = profiles.length
                ? (profiles.reduce((s, p) => s + [p.final_factor1, p.final_factor2, p.final_factor3, p.final_factor4][i], 0) / profiles.length)
                : 0;
              return (
                <Box key={label} mb={2}>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">{label}</Typography>
                    <Typography variant="body2" fontWeight="bold">{avg.toFixed(2)} / 5.0</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={(avg / 5) * 100} sx={{ height: 10, borderRadius: 5 }} />
                </Box>
              );
            })}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
