import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Card, CardContent, Chip, Typography, IconButton, Tooltip,
} from "@mui/material";
import AddIcon         from "@mui/icons-material/Add";
import EditIcon        from "@mui/icons-material/Edit";
import VisibilityIcon  from "@mui/icons-material/Visibility";
import AssessmentIcon  from "@mui/icons-material/Assessment";
import DeleteIcon      from "@mui/icons-material/Delete";
import MenuBookIcon    from "@mui/icons-material/MenuBook";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import mockApi from "../api/client";
import type { JournalEntry } from "../types";

const STATUS_CONFIG = {
  draft:     { label: "下書き",   color: "default"  as const },
  submitted: { label: "提出済み", color: "primary"  as const },
  evaluated: { label: "評価済み", color: "success"  as const },
};

export default function JournalListPage() {
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();

  const { data: journals = [], isLoading } = useQuery({
    queryKey: ["journals"],
    queryFn:  () => mockApi.getJournals(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mockApi.deleteJournal(id),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["journals"] }); },
  });

  if (isLoading) return <Box p={3}><Typography>読み込み中...</Typography></Box>;

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h5" fontWeight="bold">実習日誌一覧</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/journals/new")}>
          新規作成
        </Button>
      </Box>

      {journals.length === 0 && (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 6 }}>
            <MenuBookIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
            <Typography color="text.secondary">日誌がまだありません。「新規作成」から記録を始めましょう。</Typography>
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
                  <Typography variant="body1" fontWeight="bold" noWrap>{j.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(j.entry_date).toLocaleDateString("ja-JP")} ・ Week {j.week_number}
                  </Typography>
                </Box>
                <Chip label={cfg.label} color={cfg.color} size="small" />
                <Tooltip title="詳細">
                  <IconButton size="small" onClick={() => navigate(`/journals/${j.id}`)}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {j.status !== "evaluated" && (
                  <Tooltip title="編集">
                    <IconButton size="small" onClick={() => navigate(`/journals/${j.id}/edit`)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {j.status === "evaluated" && (
                  <Tooltip title="AI評価結果">
                    <IconButton size="small" color="primary" onClick={() => navigate(`/evaluations/${j.id}`)}>
                      <AssessmentIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="削除">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => { if (confirm("削除しますか？")) deleteMutation.mutate(j.id); }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
