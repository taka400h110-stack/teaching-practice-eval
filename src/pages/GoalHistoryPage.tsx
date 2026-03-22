/**
 * GoalHistoryPage.tsx
 * SMART目標管理・履歴ページ
 */
import React, { useState } from "react";
import {
  Box, Button, Card, CardContent, Chip, Divider, Grid, Paper,
  TextField, Typography, Snackbar, Alert, LinearProgress, Switch,
  FormControlLabel, IconButton, Tooltip,
} from "@mui/material";
import TrackChangesIcon  from "@mui/icons-material/TrackChanges";
import AddCircleIcon     from "@mui/icons-material/AddCircle";
import CheckCircleIcon   from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import HelpOutlineIcon   from "@mui/icons-material/HelpOutline";
import StarIcon          from "@mui/icons-material/Star";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../api/client";
import type { GoalEntry } from "../types";
import { RUBRIC_ITEMS } from "../constants/rubric";

const SMART_CRITERIA = [
  { key: "S", label: "Specific（具体的）",   desc: "具体的で明確か？" },
  { key: "M", label: "Measurable（計測可能）", desc: "達成を確認できるか？" },
  { key: "A", label: "Achievable（達成可能）", desc: "現実的に達成できるか？" },
  { key: "R", label: "Relevant（関連性）",    desc: "実習目標と関連しているか？" },
  { key: "T", label: "Time-bound（期限）",    desc: "期限や時間枠があるか？" },
];

function GoalCard({ goal, onToggle }: { goal: GoalEntry; onToggle?: () => void }) {
  const date = new Date(goal.created_at).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2, mb: 1.5,
        borderLeft: "4px solid",
        borderColor: goal.achieved ? "success.main" : "warning.main",
        bgcolor: goal.achieved ? "#f1f8e9" : "#fff8e1",
        cursor: onToggle ? "pointer" : "default",
        "&:hover": onToggle ? { boxShadow: 2 } : {},
      }}
      onClick={onToggle}
    >
      <Box display="flex" alignItems="flex-start" gap={1.5}>
        {goal.achieved
          ? <CheckCircleIcon sx={{ color: "success.main", mt: 0.3, flexShrink: 0 }} />
          : <RadioButtonUncheckedIcon sx={{ color: "warning.main", mt: 0.3, flexShrink: 0 }} />}
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" fontWeight={600} lineHeight={1.6}>{goal.goal_text}</Typography>
          <Box display="flex" gap={0.8} mt={0.8} flexWrap="wrap">
            <Chip label={`Week ${goal.week}`} size="small" variant="outlined" sx={{ fontSize: 10 }} />
            {goal.is_smart && <Chip label="SMART" size="small" color="primary" icon={<StarIcon sx={{ fontSize: "12px !important" }} />} sx={{ fontSize: 10 }} />}
            <Chip
              label={goal.achieved ? "達成済み" : "進行中"}
              size="small"
              color={goal.achieved ? "success" : "warning"}
              sx={{ fontSize: 10 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>{date}</Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

export default function GoalHistoryPage() {
    const [newGoal, setNewGoal]   = useState("");
  const [focusItemIds, setFocusItemIds] = useState<number[]>([]);
  const [isSmart, setIsSmart]   = useState(false);
  const [weekNum, setWeekNum]   = useState(1);
  const [snack, setSnack]       = useState(false);
  const [showSmartHelp, setShowSmartHelp] = useState(false);

  const { data: goals = [] } = useQuery({
    queryKey: ["goals"],
    queryFn:  () => apiClient.getGoalHistory(),
  });

  const achieved    = goals.filter((g) => g.achieved).length;
  const smartGoals  = goals.filter((g) => g.is_smart).length;
  const achieveRate = goals.length > 0 ? Math.round((achieved / goals.length) * 100) : 0;

  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async () => {
      const g = await apiClient.createGoal({ week: weekNum, goal_text: newGoal.trim(), is_smart: isSmart });
      const user = JSON.parse(localStorage.getItem("user_info") || "{}");
      if (focusItemIds.length > 0 && user.id) {
        const updates = focusItemIds.map(fid => ({
          userId: user.id,
          week_number: weekNum,
          goal_id: g.id,
          focus_item_id: fid
        }));
        await apiClient.saveRq3bOutcomes({ userId: user.id, updates });
      }
      return g;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["goals"] });
      setSnack(true);
      setNewGoal("");
      setFocusItemIds([]);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (goal: GoalEntry) => apiClient.updateGoal(goal.id, { achieved: !goal.achieved }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["goals"] }); },
  });

  const handleAdd = () => {
    if (!newGoal.trim()) return;
    addMutation.mutate();
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        <TrackChangesIcon sx={{ verticalAlign: "middle", mr: 0.5 }} />
        SMART目標管理
      </Typography>

      <Grid container spacing={2}>
        {/* サマリ */}
        <Grid size={{ xs: 12 }}>
          <Grid container spacing={2} mb={1}>
            {[
              { label: "登録目標数",     value: goals.length,    color: "#1976d2", bg: "#e3f2fd" },
              { label: "達成済み",       value: achieved,         color: "#388e3c", bg: "#e8f5e9" },
              { label: "SMART目標",      value: smartGoals,       color: "#f57c00", bg: "#fff3e0" },
              { label: "達成率",         value: `${achieveRate}%`, color: "#7b1fa2", bg: "#f3e5f5" },
            ].map((s) => (
              <Grid key={s.label} size={{ xs: 6, sm: 3 }}>
                <Card sx={{ bgcolor: s.bg }}>
                  <CardContent sx={{ p: "14px !important" }}>
                    <Typography variant="h4" fontWeight="bold" color={s.color}>{s.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                    {s.label === "達成率" && (
                      <LinearProgress
                        variant="determinate"
                        value={achieveRate}
                        sx={{ mt: 0.5, height: 6, borderRadius: 3,
                          "& .MuiLinearProgress-bar": { bgcolor: s.color } }}
                      />
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* 新規目標追加 */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                <AddCircleIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="bold">新しい目標を設定</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              <TextField
                label={`Week ${weekNum} の目標`}
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                multiline minRows={3}
                fullWidth size="small"
                sx={{ mb: 1.5 }}
                placeholder="例: 授業の冒頭5分で学習目標を板書し、全員が確認できるようにする"
              />
              <TextField
                label="実習週"
                type="number"
                value={weekNum}
                onChange={(e) => setWeekNum(Math.max(1, Number(e.target.value)))}
                size="small"
                sx={{ width: 100, mb: 1.5 }}
                slotProps={{ input: { inputProps: { min: 1, max: 15 } } }}
              />
              <Box>
                <FormControlLabel
                  control={<Switch checked={isSmart} onChange={(e) => setIsSmart(e.target.checked)} size="small" />}
                  label={<Typography variant="body2">SMART目標として設定</Typography>}
                />
                <Tooltip title="SMARTとは？" placement="right">
                  <IconButton size="small" onClick={() => setShowSmartHelp((v) => !v)}>
                    <HelpOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              {showSmartHelp && (
                <Paper variant="outlined" sx={{ p: 1.5, mt: 1, bgcolor: "#fffde7" }}>
                  <Typography variant="caption" fontWeight="bold" color="warning.main" display="block" mb={0.8}>
                    SMARTの基準
                  </Typography>
                  {SMART_CRITERIA.map((c) => (
                    <Box key={c.key} display="flex" gap={1} mb={0.4}>
                      <Chip label={c.key} size="small" color="warning" sx={{ fontSize: 10, minWidth: 22, height: 18 }} />
                      <Typography variant="caption"><b>{c.label}</b>: {c.desc}</Typography>
                    </Box>
                  ))}
                </Paper>
              )}

              <Button
                variant="contained"
                fullWidth
                onClick={handleAdd}
                disabled={!newGoal.trim()}
                sx={{ mt: 2 }}
                startIcon={<AddCircleIcon />}
              >
                目標を追加する
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* 目標一覧 */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                <Typography variant="subtitle1" fontWeight="bold">目標一覧</Typography>
                <Box display="flex" gap={0.5}>
                  <Chip label="全て" size="small" color="default" clickable />
                  <Chip label="未達成" size="small" color="warning" variant="outlined" clickable />
                  <Chip label="達成済" size="small" color="success" variant="outlined" clickable />
                </Box>
              </Box>
              {goals.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <TrackChangesIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
                  <Typography color="text.secondary">目標がまだありません</Typography>
                </Box>
              ) : (
                goals.map((g: GoalEntry) => <GoalCard key={g.id} goal={g} onToggle={() => toggleMutation.mutate(g)} />)
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* SMART基準チェック */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" mb={1.5}>SMART目標チェックリスト</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                設定した目標が以下の基準を満たしているか確認してください。
              </Typography>
              <Grid container spacing={1.5}>
                {SMART_CRITERIA.map((c) => (
                  <Grid key={c.key} size={{ xs: 12, sm: "auto" }} sx={{ flex: "1 1 180px" }}>
                    <Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <Chip label={c.key} color="primary" size="small" sx={{ fontWeight: "bold", minWidth: 24 }} />
                        <Typography variant="body2" fontWeight="bold">{c.label.split("（")[0]}</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">{c.desc}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar open={snack} autoHideDuration={3000} onClose={() => setSnack(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="success" onClose={() => setSnack(false)}>目標を追加しました</Alert>
      </Snackbar>
    </Box>
  );
}
