import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Card, CardContent, Chip, Grid, Typography, LinearProgress,
} from "@mui/material";
import MenuBookIcon    from "@mui/icons-material/MenuBook";
import BarChartIcon    from "@mui/icons-material/BarChart";
import ChatIcon        from "@mui/icons-material/Chat";
import TrendingUpIcon  from "@mui/icons-material/TrendingUp";
import AddIcon         from "@mui/icons-material/Add";
import { useQuery }    from "@tanstack/react-query";
import mockApi from "../api/client";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: journals = [] } = useQuery({
    queryKey: ["journals"],
    queryFn:  () => mockApi.getJournals(),
  });
  const { data: growth } = useQuery({
    queryKey: ["growth"],
    queryFn:  () => mockApi.getGrowthData(),
  });

  const submitted  = journals.filter((j) => j.status === "submitted").length;
  const evaluated  = journals.filter((j) => j.status === "evaluated").length;
  const latest     = growth?.weekly_scores.slice(-1)[0];

  const stats = [
    { label: "日誌記録数",   value: journals.length, color: "primary.main",   icon: <MenuBookIcon /> },
    { label: "評価済み",     value: evaluated,        color: "success.main",   icon: <BarChartIcon /> },
    { label: "提出済み",     value: submitted,        color: "warning.main",   icon: <TrendingUpIcon /> },
    { label: "今週の総合スコア", value: latest ? latest.total.toFixed(2) : "—", color: "secondary.main", icon: <ChatIcon /> },
  ];

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h5" fontWeight="bold">ダッシュボード</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/journals/new")}>
          新規日誌
        </Button>
      </Box>

      {/* サマリカード */}
      <Grid container spacing={2} mb={3}>
        {stats.map((s) => (
          <Grid key={s.label} size={{ xs: 6, sm: 3 }}>
            <Card>
              <CardContent sx={{ p: "16px !important" }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Box sx={{ color: s.color }}>{s.icon}</Box>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold" color={s.color}>{s.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 最新週の因子スコア */}
      {latest && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>
              最新週（Week {latest.week}）の因子スコア
            </Typography>
            {(["factor1","factor2","factor3","factor4"] as const).map((f, i) => (
              <Box key={f} mb={1.5}>
                <Box display="flex" justifyContent="space-between" mb={0.3}>
                  <Typography variant="body2">因子{i+1}</Typography>
                  <Typography variant="body2" fontWeight="bold">{latest[f].toFixed(2)} / 5.0</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(latest[f] / 5) * 100}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 最近の日誌 */}
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="subtitle1" fontWeight="bold">最近の日誌</Typography>
            <Button size="small" onClick={() => navigate("/journals")}>すべて見る</Button>
          </Box>
          {journals.slice(0, 5).map((j) => (
            <Box
              key={j.id}
              sx={{ display: "flex", alignItems: "center", gap: 1, p: 1, borderRadius: 1, cursor: "pointer", "&:hover": { bgcolor: "grey.50" } }}
              onClick={() => navigate(`/journals/${j.id}`)}
            >
              <MenuBookIcon sx={{ color: "text.secondary", fontSize: 18 }} />
              <Typography variant="body2" sx={{ flex: 1 }}>{j.title}</Typography>
              <Chip
                label={j.status === "evaluated" ? "評価済み" : j.status === "submitted" ? "提出済み" : "下書き"}
                size="small"
                color={j.status === "evaluated" ? "success" : j.status === "submitted" ? "primary" : "default"}
              />
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
}
