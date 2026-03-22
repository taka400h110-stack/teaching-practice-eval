import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Card, CardContent, Chip, Grid, Typography, LinearProgress,
  Avatar, Divider, List, ListItem, ListItemText, ListItemAvatar, IconButton,
  Paper,
} from "@mui/material";
import MenuBookIcon    from "@mui/icons-material/MenuBook";
import BarChartIcon    from "@mui/icons-material/BarChart";
import ChatIcon        from "@mui/icons-material/Chat";
import TrendingUpIcon  from "@mui/icons-material/TrendingUp";
import AddIcon         from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon     from "@mui/icons-material/Pending";
import EditIcon        from "@mui/icons-material/Edit";
import VisibilityIcon  from "@mui/icons-material/Visibility";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import AutoGraphIcon   from "@mui/icons-material/AutoGraph";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import SchoolIcon      from "@mui/icons-material/School";
import { useQuery }    from "@tanstack/react-query";
import apiClient from "../api/client";
import type { JournalEntry, WeeklyScore } from "../types";

const FACTOR_LABELS = ["児童生徒への指導力", "自己評価力", "学級経営力", "職務を理解して行動する力"];
const FACTOR_COLORS = ["#1976d2", "#388e3c", "#f57c00", "#7b1fa2"];

function ScoreBar({ value, max = 5, color }: { value: number; max?: number; color: string }) {
  return (
    <LinearProgress
      variant="determinate"
      value={(value / max) * 100}
      sx={{
        height: 8, borderRadius: 4,
        bgcolor: "grey.200",
        "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 4 },
      }}
    />
  );
}

const statusConfig = {
  draft:     { label: "下書き",   color: "default"  as const, icon: <EditIcon sx={{ fontSize: 14 }} /> },
  submitted: { label: "提出済み", color: "primary"  as const, icon: <PendingIcon sx={{ fontSize: 14 }} /> },
  evaluated: { label: "評価済み", color: "success"  as const, icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = apiClient.getCurrentUser();

  const { data: journals = [] } = useQuery({
    queryKey: ["journals"],
    queryFn:  () => apiClient.getJournals(),
  });
  const { data: growth } = useQuery({
    queryKey: ["growth"],
    queryFn:  () => apiClient.getGrowthData(),
  });
  const { data: goals = [] } = useQuery({
    queryKey: ["goals"],
    queryFn:  () => apiClient.getGoalHistory(),
  });
  const { data: selfEvals = [] } = useQuery({
    queryKey: ["selfEvals"],
    queryFn:  () => apiClient.getSelfEvaluations(),
  });

  const submitted  = journals.filter((j) => j.status === "submitted").length;
  const evaluated  = journals.filter((j) => j.status === "evaluated").length;
  const drafts     = journals.filter((j) => j.status === "draft").length;
  const latest: WeeklyScore | undefined = growth?.weekly_scores.slice(-1)[0];
  const prev: WeeklyScore | undefined   = growth?.weekly_scores.slice(-2)[0];
  const achievedGoals = goals.filter((g) => g.achieved).length;

  const trendDiff = latest && prev ? +(latest.total - prev.total).toFixed(2) : 0;

  const kpiCards = [
    {
      label: "日誌記録数",
      value: journals.length,
      sub: `評価済み ${evaluated} / 提出済み ${submitted}`,
      color: "#1976d2",
      bg: "#e3f2fd",
      icon: <MenuBookIcon sx={{ fontSize: 28 }} />,
      onClick: () => navigate("/journals"),
    },
    {
      label: "総合スコア（最新週）",
      value: latest ? latest.total.toFixed(2) : "—",
      sub: trendDiff > 0 ? `▲ ${trendDiff} 前週比` : trendDiff < 0 ? `▼ ${Math.abs(trendDiff)} 前週比` : "前週と同じ",
      color: "#388e3c",
      bg: "#e8f5e9",
      icon: <AutoGraphIcon sx={{ fontSize: 28 }} />,
      onClick: () => navigate("/growth"),
    },
    {
      label: "SMART目標達成率",
      value: goals.length > 0 ? `${Math.round((achievedGoals / goals.length) * 100)}%` : "—",
      sub: `${achievedGoals} / ${goals.length} 件達成`,
      color: "#f57c00",
      bg: "#fff3e0",
      icon: <TrackChangesIcon sx={{ fontSize: 28 }} />,
      onClick: () => navigate("/goals"),
    },
    {
      label: "自己評価記録数",
      value: selfEvals.length,
      sub: `最終週スコア ${selfEvals.slice(-1)[0]?.total.toFixed(2) ?? "—"}`,
      color: "#7b1fa2",
      bg: "#f3e5f5",
      icon: <EmojiEventsIcon sx={{ fontSize: 28 }} />,
      onClick: () => navigate("/self-evaluation"),
    },
  ];

  return (
    <Box>
      {/* ウェルカム */}
      <Box
        sx={{
          p: 2.5, mb: 3, borderRadius: 3,
          background: "linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)",
          color: "white",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 1,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight="bold">
            おかえりなさい、{user?.name ?? "ユーザー"} さん
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            {new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
          </Typography>
          {/* 実習生：学籍番号・学年・実習情報 */}
          {(user as { student_number?: string } | null)?.student_number && (
            <Typography variant="caption" sx={{ opacity: 0.75, display: "block", mt: 0.5 }}>
              学籍番号: {(user as { student_number?: string }).student_number}
              {(user as { grade?: number }).grade && ` ／ ${(user as { grade?: number }).grade}年生`}
              {(user as { school_type?: string }).school_type &&
                ` ／ ${{ elementary: "小学校", middle: "中学校", high: "高等学校", special: "特別支援学校" }[
                  (user as { school_type?: string }).school_type ?? ""
                ] ?? ""}`
              }
              {(user as { internship_type?: string }).internship_type &&
                ` ／ ${(user as { internship_type?: string }).internship_type === "intensive" ? "集中実習" : "分散実習"}`
              }
              {(user as { weeks?: number }).weeks ? ` ${(user as { weeks?: number }).weeks}週間` : ""}
            </Typography>
          )}
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/journal-workflow")}
          sx={{ bgcolor: "white", color: "primary.main", fontWeight: "bold", "&:hover": { bgcolor: "grey.100" } }}
        >
          今日の日誌を記録
        </Button>
      </Box>

      {/* KPIカード */}
      <Grid container spacing={2} mb={3}>
        {kpiCards.map((k) => (
          <Grid key={k.label} size={{ xs: 6, md: 3 }}>
            <Card
              sx={{ cursor: "pointer", bgcolor: k.bg, "&:hover": { boxShadow: 4 }, transition: "box-shadow 0.2s", height: "100%" }}
              onClick={k.onClick}
            >
              <CardContent sx={{ p: "16px !important" }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                  <Box sx={{ color: k.color }}>{k.icon}</Box>
                  <SchoolIcon sx={{ color: "transparent" }} />
                </Box>
                <Typography variant="h4" fontWeight="bold" color={k.color}>{k.value}</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{k.label}</Typography>
                <Typography variant="caption" color="text.secondary" display="block">{k.sub}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        {/* 因子スコア */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="subtitle1" fontWeight="bold">
                  <BarChartIcon sx={{ verticalAlign: "middle", mr: 0.5, fontSize: 18 }} />
                  最新週の因子スコア {latest ? `（Week ${latest.week}）` : ""}
                </Typography>
                <Button size="small" onClick={() => navigate("/growth")}>詳細</Button>
              </Box>
              {latest ? (
                (["factor1","factor2","factor3","factor4"] as const).map((f, i) => (
                  <Box key={f} mb={1.5}>
                    <Box display="flex" justifyContent="space-between" mb={0.4}>
                      <Typography variant="body2" fontWeight={600}>{FACTOR_LABELS[i]}</Typography>
                      <Typography variant="body2" fontWeight="bold" color={FACTOR_COLORS[i]}>
                        {latest[f].toFixed(2)} / 5.0
                      </Typography>
                    </Box>
                    <ScoreBar value={latest[f]} color={FACTOR_COLORS[i]} />
                  </Box>
                ))
              ) : (
                <Typography color="text.secondary" variant="body2">データなし</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 最近の日誌 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle1" fontWeight="bold">
                  <MenuBookIcon sx={{ verticalAlign: "middle", mr: 0.5, fontSize: 18 }} />
                  最近の日誌
                </Typography>
                <Button size="small" onClick={() => navigate("/journals")}>すべて見る</Button>
              </Box>
              <List dense disablePadding>
                {journals.slice(0, 5).map((j: JournalEntry, idx) => {
                  const cfg = statusConfig[j.status];
                  return (
                    <React.Fragment key={j.id}>
                      {idx > 0 && <Divider />}
                      <ListItem
                        sx={{ py: 0.8, px: 0, cursor: "pointer", "&:hover": { bgcolor: "grey.50" }, borderRadius: 1 }}
                        onClick={() => navigate(`/journal-workflow/${j.id}`)}
                        secondaryAction={
                          <Box display="flex" gap={0.5}>
                            <Chip label={cfg.label} color={cfg.color} size="small" sx={{ fontSize: 10 }} />
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/journal-workflow/${j.id}`); }}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        }
                      >
                        <ListItemAvatar sx={{ minWidth: 36 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: "primary.main", fontSize: 11 }}>
                            W{j.week_number}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight={600} noWrap sx={{ pr: 10 }}>{j.title}</Typography>}
                          secondary={<Typography variant="caption" color="text.secondary">{new Date(j.entry_date).toLocaleDateString("ja-JP")}</Typography>}
                        />
                      </ListItem>
                    </React.Fragment>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* 最近の目標 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle1" fontWeight="bold">
                  <TrackChangesIcon sx={{ verticalAlign: "middle", mr: 0.5, fontSize: 18 }} />
                  SMART目標
                </Typography>
                <Button size="small" onClick={() => navigate("/goals")}>すべて見る</Button>
              </Box>
              {goals.slice(0, 4).map((g) => (
                <Paper key={g.id} variant="outlined" sx={{ p: 1.2, mb: 1, display: "flex", alignItems: "center", gap: 1.5 }}>
                  {g.achieved
                    ? <CheckCircleIcon sx={{ color: "success.main", flexShrink: 0 }} />
                    : <PendingIcon sx={{ color: "warning.main", flexShrink: 0 }} />}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap>{g.goal_text}</Typography>
                    <Typography variant="caption" color="text.secondary">Week {g.week}</Typography>
                  </Box>
                  <Chip
                    label={g.achieved ? "達成" : "未達成"}
                    size="small"
                    color={g.achieved ? "success" : "default"}
                    variant="outlined"
                    sx={{ fontSize: 10, flexShrink: 0 }}
                  />
                </Paper>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* クイックアクション */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" mb={1.5}>
                <ChatIcon sx={{ verticalAlign: "middle", mr: 0.5, fontSize: 18 }} />
                クイックアクション
              </Typography>
              <Grid container spacing={1}>
                {[
                  { label: "実習日誌ワークフロー",  icon: <EditIcon />,       path: "/journal-workflow", color: "#1976d2" },
                  { label: "成長グラフを見る",      icon: <TrendingUpIcon />, path: "/growth",           color: "#f57c00" },
                  { label: "自己評価入力",          icon: <BarChartIcon />,   path: "/self-evaluation",  color: "#388e3c" },
                  { label: "目標履歴（SMART）",     icon: <ChatIcon />,       path: "/goals",            color: "#7b1fa2" },
                ].map((a) => (
                  <Grid key={a.label} size={{ xs: 6 }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={a.icon}
                      onClick={() => navigate(a.path)}
                      sx={{
                        justifyContent: "flex-start", py: 1.2, color: a.color,
                        borderColor: a.color, "&:hover": { bgcolor: a.color, color: "white" },
                        fontSize: 12, fontWeight: 600,
                      }}
                    >
                      {a.label}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
