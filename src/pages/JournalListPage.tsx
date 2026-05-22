import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box, Button, Card, CardContent, Chip, Typography, IconButton, Tooltip,
} from "@mui/material";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import ClearIcon     from "@mui/icons-material/Clear";
import AddIcon         from "@mui/icons-material/Add";
import EditIcon        from "@mui/icons-material/Edit";
import VisibilityIcon  from "@mui/icons-material/Visibility";
import AssessmentIcon  from "@mui/icons-material/Assessment";
import DeleteIcon      from "@mui/icons-material/Delete";
import MenuBookIcon    from "@mui/icons-material/MenuBook";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../api/client";
import type { JournalEntry } from "../types";

const STATUS_CONFIG = {
  draft:     { label: "下書き",   color: "default"  as const },
  submitted: { label: "提出済み", color: "primary"  as const },
  evaluated: { label: "評価済み", color: "success"  as const },
};

export default function JournalListPage() {
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterStudentId = searchParams.get("student_id") || undefined;

  const { data: journals = [], isLoading } = useQuery({
    queryKey: ["journals", filterStudentId || "all"],
    queryFn:  () => apiClient.getJournals(filterStudentId),
  });

  // フィルタが効いている時の学生名（先頭エントリから取得）
  const filterStudentName = filterStudentId
    ? (journals[0] as any)?.student_name
    : undefined;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteJournal(id),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["journals"] }); },
  });

  const currentUser = apiClient.getCurrentUser() as { role: string } | null;
  const userRole = currentUser?.role ?? "student";
  const isStudent = userRole === "student";

  if (isLoading) return <Box p={3}><Typography>読み込み中...</Typography></Box>;

  return (
    <Box data-testid="journal-list-root">
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h5" fontWeight="bold">実習日誌一覧</Typography>
        {isStudent && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/journals/new")}>
            新規作成
          </Button>
        )}
      </Box>

      {/* 学生フィルタ表示 (教員ダッシュボード等から飛んできた場合) */}
      {filterStudentId && (
        <Card sx={{ mb: 2, bgcolor: "info.50", borderLeft: "4px solid", borderLeftColor: "info.main" }}>
          <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Box display="flex" alignItems="center" gap={1}>
              <FilterAltIcon color="info" />
              <Typography variant="body2">
                絞り込み中: <strong>{filterStudentName || filterStudentId}</strong> の日誌
              </Typography>
              <Chip
                label={`${journals.length}件`}
                size="small"
                color="info"
              />
              <Box sx={{ ml: "auto" }}>
                <Button
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={() => setSearchParams({})}
                >
                  全件表示に戻す
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {journals.length === 0 && (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 6 }}>
            <MenuBookIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
            <Typography color="text.secondary">
              {isStudent ? "日誌がまだありません。「新規作成」から記録を始めましょう。" : "提出された日誌がまだありません。"}
            </Typography>
          </CardContent>
        </Card>
      )}

      {journals.map((j: JournalEntry) => {
        const cfg = STATUS_CONFIG[j.status];
        return (
          <Card key={j.id} sx={{ mb: 1.5, "&:hover": { boxShadow: 3 }, transition: "box-shadow 0.2s" }}>
            <CardContent sx={{ p: "12px 16px !important" }}>
              <Box display="flex" alignItems="center" gap={1}>
                <MenuBookIcon sx={{ color: "text.secondary", flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body1" fontWeight="bold" noWrap>
                    {!isStudent && (j as any).student_name && (
                      <Chip
                        label={(j as any).student_name}
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ mr: 1 }}
                      />
                    )}
                    {j.title || "（無題）"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(j.entry_date).toLocaleDateString("ja-JP")} ・ Week {j.week_number}
                    {!isStudent && (j as any).student_id && ` ・ ${(j as any).student_id}`}
                  </Typography>
                </Box>
                <Chip label={cfg.label} color={cfg.color} size="small" />
                <Tooltip title="詳細を見る">
                  <IconButton size="small" color="primary" onClick={() => navigate(`/journals/${j.id}`)}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {isStudent && j.status !== "evaluated" && (
                  <Tooltip title="編集">
                    <IconButton size="small" onClick={() => navigate(`/journals/${j.id}/edit`)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {j.status === "evaluated" && (
                  <Tooltip title="AI評価結果・コメント">
                    <IconButton size="small" color="success" onClick={() => navigate(`/journals/${j.id}`)}>
                      <AssessmentIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {isStudent && (
                <Tooltip title="削除">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => { if (confirm("削除しますか？")) deleteMutation.mutate(j.id); }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
