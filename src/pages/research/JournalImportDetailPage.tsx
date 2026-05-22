/**
 * 過去日誌取り込み 詳細ページ
 *
 * URL: /research/journal-import/:id
 *
 * 機能:
 *   - 構造化済みデータを「実習日誌風」に閲覧 (時限ブロック + 省察)
 *   - 抽出原文 (toMarkdown / Vision) の表示
 *   - メタ情報 (アップロード元、状態、ファイル種別など)
 *   - 編集ダイアログへ / 一覧へ / 確定済み日誌へ の導線
 */
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  Grid,
  IconButton,
  Tooltip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import DescriptionIcon from "@mui/icons-material/Description";
import PersonIcon from "@mui/icons-material/Person";
import EventIcon from "@mui/icons-material/Event";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../api/client";

interface ImportItem {
  id: string;
  uploaded_by: string;
  student_id: string | null;
  student_name?: string | null;
  filename: string;
  mime_type: string;
  file_size: number | null;
  status: string;
  extract_source: string | null;
  raw_text: string | null;
  structured_json: string | null;
  journal_id: string | null;
  entry_date: string | null;
  week_number: number | null;
  word_count: number | null;
  token_count: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface StructuredJournal {
  entry_date: string | null;
  week_number: number | null;
  title: string | null;
  blocks: Record<string, string | undefined>;
  reflection: string | null;
  confidence: number;
  notes: string | null;
}

const BLOCK_LABELS: Array<{ key: string; label: string; emoji: string }> = [
  { key: "block_morning", label: "朝の会", emoji: "🌅" },
  { key: "block_p1", label: "1時限", emoji: "1️⃣" },
  { key: "block_p2", label: "2時限", emoji: "2️⃣" },
  { key: "block_p3", label: "3時限", emoji: "3️⃣" },
  { key: "block_p4", label: "4時限", emoji: "4️⃣" },
  { key: "block_lunch", label: "給食・昼", emoji: "🍱" },
  { key: "block_p5", label: "5時限", emoji: "5️⃣" },
  { key: "block_p6", label: "6時限", emoji: "6️⃣" },
  { key: "block_cleaning", label: "清掃", emoji: "🧹" },
  { key: "block_closing", label: "帰りの会", emoji: "👋" },
  { key: "block_after", label: "放課後", emoji: "🌙" },
];

const STATUS_COLORS: Record<string, "default" | "info" | "warning" | "success" | "error"> = {
  uploaded: "default",
  extracting: "info",
  extracted: "info",
  structuring: "info",
  structured: "warning",
  committing: "info",
  committed: "success",
  failed: "error",
};

const STATUS_LABELS: Record<string, string> = {
  uploaded: "アップロード済",
  extracting: "抽出中…",
  extracted: "抽出完了",
  structuring: "構造化中…",
  structured: "編集待ち",
  committing: "コミット中…",
  committed: "✓ 確定済",
  failed: "✗ 失敗",
};

function humanFileSize(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function safeJson<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export default function JournalImportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showRaw, setShowRaw] = useState(false);

  const detailQ = useQuery<{ success: boolean; item?: ImportItem; error?: string }>({
    queryKey: ["journal-import-detail", id],
    queryFn: () =>
      apiFetch(`/api/data/journal-imports/${id}`).then((r) => r.json()),
    enabled: !!id,
    refetchInterval: (q: any) => {
      const item = (q?.state?.data as any)?.item as ImportItem | undefined;
      if (!item) return false;
      const pending = ["extracting", "structuring", "committing"].includes(item.status);
      return pending ? 2000 : false;
    },
  });

  const structureMut = useMutation({
    mutationFn: () =>
      apiFetch(`/api/data/journal-imports/${id}/structure`, { method: "POST" }).then(
        (r) => r.json(),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal-import-detail", id] });
      qc.invalidateQueries({ queryKey: ["journal-imports"] });
    },
  });

  const commitMut = useMutation({
    mutationFn: () =>
      apiFetch(`/api/data/journal-imports/${id}/commit`, { method: "POST" }).then(
        (r) => r.json(),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal-import-detail", id] });
      qc.invalidateQueries({ queryKey: ["journal-imports"] });
    },
  });

  if (detailQ.isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  const item = detailQ.data?.item;
  if (!item) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
          戻る
        </Button>
        <Alert severity="error">
          取り込み記録が見つかりません: {detailQ.data?.error || "not_found"}
        </Alert>
      </Box>
    );
  }

  const structured = safeJson<StructuredJournal>(item.structured_json);

  return (
    <Box>
      {/* ヘッダー */}
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/research/journal-import")}
        >
          一覧に戻る
        </Button>
        <Tooltip title="再読み込み">
          <IconButton size="small" onClick={() => detailQ.refetch()}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* タイトル + ステータス */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack
            direction="row"
            alignItems="flex-start"
            justifyContent="space-between"
            flexWrap="wrap"
            useFlexGap
            spacing={2}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                <DescriptionIcon color="action" />
                <Typography variant="h6" sx={{ wordBreak: "break-all" }}>
                  {structured?.title || item.filename}
                </Typography>
                <Chip
                  size="small"
                  color={STATUS_COLORS[item.status] || "default"}
                  label={STATUS_LABELS[item.status] || item.status}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block">
                ファイル名: {item.filename}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                取り込み ID: {item.id}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {item.status === "extracted" && (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={
                    structureMut.isPending ? <CircularProgress size={14} /> : <AutoFixHighIcon />
                  }
                  onClick={() => structureMut.mutate()}
                  disabled={structureMut.isPending}
                >
                  GPT-4 で構造化
                </Button>
              )}
              {item.status === "structured" && (
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={
                    commitMut.isPending ? <CircularProgress size={14} /> : <CheckCircleIcon />
                  }
                  onClick={() => commitMut.mutate()}
                  disabled={!item.student_id || !item.entry_date || commitMut.isPending}
                >
                  日誌に確定
                </Button>
              )}
              {item.status === "committed" && item.journal_id && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<OpenInNewIcon />}
                  onClick={() => navigate(`/journals/${item.journal_id}`)}
                >
                  確定済み日誌を開く
                </Button>
              )}
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() =>
                  navigate("/research/journal-import", {
                    state: { openEditId: item.id },
                  })
                }
              >
                編集
              </Button>
            </Stack>
          </Stack>

          {item.error_message && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="subtitle2">エラー</Typography>
              {item.error_message}
            </Alert>
          )}

          {structured?.notes && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <strong>GPT-4 抽出メモ:</strong> {structured.notes}
              {structured.confidence != null && (
                <span style={{ marginLeft: 8 }}>
                  (信頼度 {Math.round(structured.confidence * 100)}%)
                </span>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* メタ情報グリッド */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            メタ情報
          </Typography>
          <Grid container spacing={2}>
            <MetaCell
              icon={<PersonIcon />}
              label="学生"
              value={
                item.student_name ||
                (item.student_id ? `(ID: ${item.student_id})` : "未指定")
              }
              warn={!item.student_id}
            />
            <MetaCell
              icon={<EventIcon />}
              label="日付"
              value={item.entry_date || "未指定"}
              warn={!item.entry_date}
            />
            <MetaCell
              label="週番号"
              value={item.week_number != null ? `第${item.week_number}週` : "—"}
            />
            <MetaCell label="抽出元" value={item.extract_source || "—"} />
            <MetaCell label="ファイル種別" value={item.mime_type} />
            <MetaCell label="ファイルサイズ" value={humanFileSize(item.file_size)} />
            <MetaCell label="文字数" value={item.word_count != null ? `${item.word_count} 字` : "—"} />
            <MetaCell
              label="トークン数"
              value={item.token_count != null ? `${item.token_count}` : "—"}
            />
            <MetaCell
              label="アップロード日時"
              value={new Date(item.created_at).toLocaleString("ja-JP")}
            />
            <MetaCell
              label="最終更新日時"
              value={new Date(item.updated_at).toLocaleString("ja-JP")}
            />
          </Grid>
        </CardContent>
      </Card>

      {/* 構造化結果 (時限ブロック) */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            日誌内容 (構造化結果)
          </Typography>

          {!structured ? (
            <Alert severity="warning">
              まだ構造化されていません。状態:
              <strong> {STATUS_LABELS[item.status] || item.status}</strong>
              {item.status === "extracted" && (
                <Box mt={1}>
                  上の「GPT-4 で構造化」ボタンを押してください。
                </Box>
              )}
            </Alert>
          ) : (
            <Stack spacing={1.5}>
              {BLOCK_LABELS.map(({ key, label, emoji }) => {
                const text = structured.blocks?.[key];
                if (!text || !text.trim()) return null;
                return (
                  <Paper key={key} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: "bold", display: "block", mb: 0.5 }}
                    >
                      {emoji} {label}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}
                    >
                      {text}
                    </Typography>
                  </Paper>
                );
              })}

              {BLOCK_LABELS.every(
                ({ key }) => !structured.blocks?.[key]?.trim(),
              ) && (
                <Alert severity="info">
                  時限ブロックに入った内容はありません。下の省察または抽出原文をご確認ください。
                </Alert>
              )}

              {structured.reflection && (
                <>
                  <Divider sx={{ my: 1 }}>省察・振り返り</Divider>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: "primary.50" }}>
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}
                    >
                      {structured.reflection}
                    </Typography>
                  </Paper>
                </>
              )}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* 抽出原文 (折りたたみ) */}
      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="subtitle1" fontWeight="bold">
              抽出原文 (toMarkdown / Vision)
            </Typography>
            <Button size="small" onClick={() => setShowRaw((s) => !s)}>
              {showRaw ? "隠す" : "表示する"}
            </Button>
          </Stack>
          {showRaw && (
            <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
              <Box
                sx={{
                  whiteSpace: "pre-wrap",
                  fontFamily: "monospace",
                  fontSize: 12,
                  maxHeight: 480,
                  overflowY: "auto",
                  wordBreak: "break-word",
                }}
              >
                {item.raw_text || "(空)"}
              </Box>
            </Paper>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

function MetaCell({
  icon,
  label,
  value,
  warn,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
      <Box>
        <Stack direction="row" spacing={0.5} alignItems="center" mb={0.25}>
          {icon}
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </Stack>
        <Typography
          variant="body2"
          color={warn ? "warning.main" : "text.primary"}
          fontWeight={warn ? "bold" : "normal"}
          sx={{ wordBreak: "break-all" }}
        >
          {value}
        </Typography>
      </Box>
    </Grid>
  );
}
