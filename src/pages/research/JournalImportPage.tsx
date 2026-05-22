/**
 * 研究者用：過去の実習日誌取り込みページ
 *
 * 機能:
 *   - ドラッグ&ドロップ または ファイル選択で複数アップロード
 *   - Word (.doc/.docx) / PDF / 画像 (JPG/PNG/WEBP/HEIC) 対応
 *   - toMarkdown でテキスト抽出 → GPT-4 で日誌スキーマに構造化
 *   - 抽出結果を編集 + 学生紐付け → 一括コミット
 */
import React, { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tooltip,
  Divider,
  Snackbar,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DescriptionIcon from "@mui/icons-material/Description";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import RefreshIcon from "@mui/icons-material/Refresh";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
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

interface Student {
  id: string;
  name: string;
  email?: string;
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

const BLOCK_LABELS: Array<{ key: string; label: string }> = [
  { key: "block_morning", label: "朝の会" },
  { key: "block_p1", label: "1時限" },
  { key: "block_p2", label: "2時限" },
  { key: "block_p3", label: "3時限" },
  { key: "block_p4", label: "4時限" },
  { key: "block_lunch", label: "給食・昼" },
  { key: "block_p5", label: "5時限" },
  { key: "block_p6", label: "6時限" },
  { key: "block_cleaning", label: "清掃" },
  { key: "block_closing", label: "帰りの会" },
  { key: "block_after", label: "放課後" },
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

export default function JournalImportPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<ImportItem | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "info" | "warning" | "error" }>({
    open: false,
    message: "",
    severity: "info",
  });

  // 一覧
  const listQ = useQuery<{ success: boolean; items: ImportItem[] }>({
    queryKey: ["journal-imports"],
    queryFn: () =>
      apiFetch("/api/data/journal-imports").then((r) => r.json()),
    refetchInterval: (q: any) => {
      const data = q?.state?.data as { items?: ImportItem[] } | undefined;
      const items = data?.items || [];
      // 処理中のものがあれば 2 秒ごとにポーリング
      const hasPending = items.some((it: ImportItem) =>
        ["extracting", "structuring", "committing"].includes(it.status),
      );
      return hasPending ? 2000 : 15000;
    },
  });

  // 学生一覧
  const studentsQ = useQuery<{ success: boolean; data?: Student[]; results?: Student[] }>({
    queryKey: ["students-for-import"],
    queryFn: () => apiFetch("/api/data/students").then((r) => r.json()),
  });
  const students: Student[] =
    studentsQ.data?.data ||
    studentsQ.data?.results ||
    (Array.isArray((studentsQ.data as any)?.items)
      ? (studentsQ.data as any).items
      : []) ||
    [];

  // 構造化
  const structureMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/data/journal-imports/${id}/structure`, { method: "POST" }).then(
        (r) => r.json(),
      ),
    onSuccess: (data: any) => {
      if (data?.success) {
        setSnackbar({ open: true, message: "GPT-4 で構造化しました", severity: "success" });
      } else {
        setSnackbar({
          open: true,
          message: `構造化失敗: ${data?.message || ""}`,
          severity: "error",
        });
      }
      qc.invalidateQueries({ queryKey: ["journal-imports"] });
    },
  });

  // パッチ
  const patchMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      apiFetch(`/api/data/journal-imports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal-imports"] });
    },
  });

  // コミット
  const commitMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/data/journal-imports/${id}/commit`, { method: "POST" }).then(
        (r) => r.json(),
      ),
    onSuccess: (data: any) => {
      if (data?.success) {
        setSnackbar({
          open: true,
          message: data.was_update
            ? "既存日誌を上書きしました"
            : "journal_entries に確定しました",
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: `コミット失敗: ${data?.message || ""}`,
          severity: "error",
        });
      }
      qc.invalidateQueries({ queryKey: ["journal-imports"] });
    },
  });

  // 削除
  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/data/journal-imports/${id}`, { method: "DELETE" }).then(
        (r) => r.json(),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal-imports"] });
    },
  });

  const items = listQ.data?.items || [];
  const readyToCommit = items.filter(
    (it) =>
      it.status === "structured" && it.student_id && it.entry_date && it.structured_json,
  );

  // ────────────────────────────────────────────────────────────
  // アップロード
  // ────────────────────────────────────────────────────────────
  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setUploadingCount(files.length);
      setUploadErrors([]);
      const errors: string[] = [];

      for (const file of files) {
        try {
          const fd = new FormData();
          fd.append("file", file);
          const r = await apiFetch("/api/data/journal-imports/upload", {
            method: "POST",
            body: fd,
          });
          const json: any = await r.json();
          if (!r.ok || !json?.success) {
            errors.push(`${file.name}: ${json?.message || r.statusText}`);
          }
        } catch (e: any) {
          errors.push(`${file.name}: ${e?.message || e}`);
        }
        qc.invalidateQueries({ queryKey: ["journal-imports"] });
      }
      setUploadingCount(0);
      setUploadErrors(errors);
      if (errors.length === 0) {
        setSnackbar({
          open: true,
          message: `${files.length} ファイルをアップロードしました`,
          severity: "success",
        });
      }
    },
    [qc],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    void uploadFiles(files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) void uploadFiles(files);
  };

  // ────────────────────────────────────────────────────────────
  // 一括操作
  // ────────────────────────────────────────────────────────────
  const handleStructureAll = async () => {
    const targets = items.filter((it) => it.status === "extracted");
    if (targets.length === 0) {
      setSnackbar({ open: true, message: "構造化対象がありません", severity: "info" });
      return;
    }
    for (const it of targets) {
      await structureMut.mutateAsync(it.id);
    }
  };

  const handleCommitAll = async () => {
    if (readyToCommit.length === 0) {
      setSnackbar({
        open: true,
        message: "コミット可能な項目がありません (学生・日付の指定が必要)",
        severity: "warning",
      });
      return;
    }
    for (const it of readyToCommit) {
      await commitMut.mutateAsync(it.id);
    }
  };

  // ────────────────────────────────────────────────────────────
  // 描画
  // ────────────────────────────────────────────────────────────
  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        戻る
      </Button>

      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            過去日誌の取り込み
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Word (.doc / .docx) / PDF / 画像 から実習日誌をデータ化します
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="一覧を更新">
            <IconButton onClick={() => listQ.refetch()} disabled={listQ.isFetching}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* 説明 */}
      <Alert severity="info" sx={{ mb: 2 }}>
        対応形式: <strong>PDF / Word (.docx 推奨, .doc も試行) / 画像 (JPG/PNG/WEBP/HEIC)</strong>。
        Cloudflare Workers AI の <code>toMarkdown</code> でテキスト抽出 →
        GPT-4 で <strong>日付・週・時限ブロック・省察</strong> に自動構造化します。
        構造化結果を確認・編集後、学生を指定して <strong>journal_entries</strong> に確定してください。
      </Alert>

      {/* アップロード領域 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Paper
            variant="outlined"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            sx={{
              p: 4,
              textAlign: "center",
              borderStyle: "dashed",
              borderColor: dragOver ? "primary.main" : "divider",
              bgcolor: dragOver ? "primary.50" : "background.paper",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <CloudUploadIcon sx={{ fontSize: 56, color: "primary.main", mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              ファイルをドラッグ&ドロップ
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              または クリックして選択 (複数選択可)
            </Typography>
            <Button variant="contained" startIcon={<CloudUploadIcon />}>
              ファイルを選択
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              最大 20MB / 1 ファイル
            </Typography>
          </Paper>

          {uploadingCount > 0 && (
            <Box mt={2}>
              <Typography variant="body2" gutterBottom>
                アップロード中… ({uploadingCount} 件)
              </Typography>
              <LinearProgress />
            </Box>
          )}
          {uploadErrors.length > 0 && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setUploadErrors([])}>
              <Typography variant="subtitle2">アップロードに失敗:</Typography>
              {uploadErrors.map((e, i) => (
                <Typography key={i} variant="body2">
                  • {e}
                </Typography>
              ))}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 一括操作 */}
      {items.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                合計 {items.length} 件
              </Typography>
              <Button
                size="small"
                startIcon={<AutoFixHighIcon />}
                onClick={handleStructureAll}
                disabled={
                  structureMut.isPending ||
                  items.filter((it) => it.status === "extracted").length === 0
                }
              >
                未構造化を一括構造化 (
                {items.filter((it) => it.status === "extracted").length})
              </Button>
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={handleCommitAll}
                disabled={commitMut.isPending || readyToCommit.length === 0}
              >
                ready を一括コミット ({readyToCommit.length})
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* 一覧テーブル */}
      <Card>
        <CardContent>
          {listQ.isLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : items.length === 0 ? (
            <Alert severity="info">まだ取り込みはありません。上のエリアからファイルをアップロードしてください。</Alert>
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ファイル</TableCell>
                    <TableCell>サイズ</TableCell>
                    <TableCell>抽出元</TableCell>
                    <TableCell>状態</TableCell>
                    <TableCell>学生</TableCell>
                    <TableCell>日付</TableCell>
                    <TableCell>週</TableCell>
                    <TableCell>文字数</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <DescriptionIcon fontSize="small" color="action" />
                          <Tooltip title={it.filename}>
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: 180,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {it.filename}
                            </Typography>
                          </Tooltip>
                        </Stack>
                        {it.error_message && (
                          <Tooltip title={it.error_message}>
                            <Chip
                              size="small"
                              color="error"
                              icon={<ErrorOutlineIcon />}
                              label="エラー詳細"
                              sx={{ mt: 0.5 }}
                            />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>{humanFileSize(it.file_size)}</TableCell>
                      <TableCell>
                        {it.extract_source ? (
                          <Chip
                            size="small"
                            label={it.extract_source}
                            variant="outlined"
                          />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={STATUS_COLORS[it.status] || "default"}
                          label={STATUS_LABELS[it.status] || it.status}
                          icon={
                            ["extracting", "structuring", "committing"].includes(it.status) ? (
                              <HourglassEmptyIcon sx={{ fontSize: 14 }} />
                            ) : undefined
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {it.student_name || (
                          <Typography variant="caption" color="text.secondary">
                            未指定
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{it.entry_date || "—"}</TableCell>
                      <TableCell>{it.week_number ?? "—"}</TableCell>
                      <TableCell>{it.word_count ?? "—"}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          {it.status === "extracted" && (
                            <Tooltip title="GPT-4 で構造化">
                              <IconButton
                                size="small"
                                onClick={() => structureMut.mutate(it.id)}
                                disabled={structureMut.isPending}
                              >
                                <AutoFixHighIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {["structured", "extracted", "failed"].includes(it.status) && (
                            <Tooltip title="編集">
                              <IconButton
                                size="small"
                                onClick={() => setEditingItem(it)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {it.status === "structured" && (
                            <Tooltip
                              title={
                                !it.student_id
                                  ? "学生を指定してください"
                                  : !it.entry_date
                                    ? "日付を指定してください"
                                    : "journal_entries にコミット"
                              }
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => commitMut.mutate(it.id)}
                                  disabled={
                                    !it.student_id ||
                                    !it.entry_date ||
                                    commitMut.isPending
                                  }
                                >
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                          {it.status === "committed" && it.journal_id && (
                            <Tooltip title="日誌を開く">
                              <IconButton
                                size="small"
                                onClick={() => navigate(`/journals/${it.journal_id}`)}
                              >
                                <CheckCircleIcon fontSize="small" color="success" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="削除 (取り込み記録のみ)">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                if (confirm(`取り込み記録 "${it.filename}" を削除しますか?`)) {
                                  deleteMut.mutate(it.id);
                                }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 編集ダイアログ */}
      {editingItem && (
        <EditDialog
          item={editingItem}
          students={students}
          onClose={() => setEditingItem(null)}
          onSave={async (patch) => {
            await patchMut.mutateAsync({ id: editingItem.id, body: patch });
            setEditingItem(null);
            setSnackbar({ open: true, message: "保存しました", severity: "success" });
          }}
          onRestructure={async () => {
            await structureMut.mutateAsync(editingItem.id);
            // 構造化後の最新値を読み込む
            const r = await apiFetch(`/api/data/journal-imports/${editingItem.id}`);
            const j: any = await r.json();
            if (j?.item) setEditingItem(j.item);
          }}
          isSaving={patchMut.isPending}
          isRestructuring={structureMut.isPending}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
}

// ──────────────────────────────────────────────────────────────────
// 編集ダイアログ
// ──────────────────────────────────────────────────────────────────
function EditDialog({
  item,
  students,
  onClose,
  onSave,
  onRestructure,
  isSaving,
  isRestructuring,
}: {
  item: ImportItem;
  students: Student[];
  onClose: () => void;
  onSave: (patch: any) => Promise<void>;
  onRestructure: () => Promise<void>;
  isSaving: boolean;
  isRestructuring: boolean;
}) {
  const initialStructured: StructuredJournal = item.structured_json
    ? safeJson(item.structured_json) || emptyStructured()
    : emptyStructured();

  const [studentId, setStudentId] = useState<string>(item.student_id || "");
  const [entryDate, setEntryDate] = useState<string>(item.entry_date || initialStructured.entry_date || "");
  const [weekNumber, setWeekNumber] = useState<string>(
    item.week_number != null ? String(item.week_number) : initialStructured.week_number != null ? String(initialStructured.week_number) : "",
  );
  const [structured, setStructured] = useState<StructuredJournal>(initialStructured);
  const [showRawText, setShowRawText] = useState(false);

  const updateBlock = (key: string, value: string) => {
    setStructured((s) => ({
      ...s,
      blocks: { ...s.blocks, [key]: value },
    }));
  };

  const handleSave = async () => {
    const patch: any = {
      student_id: studentId || null,
      entry_date: entryDate || null,
      week_number: weekNumber === "" ? null : Number(weekNumber),
      structured: {
        ...structured,
        entry_date: entryDate || null,
        week_number: weekNumber === "" ? null : Number(weekNumber),
      },
    };
    await onSave(patch);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6">取り込み内容の編集</Typography>
            <Typography variant="caption" color="text.secondary">
              {item.filename}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              startIcon={isRestructuring ? <CircularProgress size={14} /> : <AutoFixHighIcon />}
              onClick={onRestructure}
              disabled={isRestructuring || !item.raw_text}
            >
              GPT-4 で再構造化
            </Button>
            <Button size="small" onClick={() => setShowRawText((s) => !s)}>
              {showRawText ? "抽出原文を隠す" : "抽出原文を表示"}
            </Button>
          </Stack>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {item.error_message && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {item.error_message}
          </Alert>
        )}

        {structured.notes && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>GPT-4 抽出メモ:</strong> {structured.notes}
            {structured.confidence != null && (
              <span style={{ marginLeft: 8 }}>(信頼度 {Math.round(structured.confidence * 100)}%)</span>
            )}
          </Alert>
        )}

        {showRawText && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              抽出原文 (toMarkdown / Vision)
            </Typography>
            <Box
              sx={{
                whiteSpace: "pre-wrap",
                fontFamily: "monospace",
                fontSize: 12,
                maxHeight: 240,
                overflowY: "auto",
              }}
            >
              {item.raw_text || "(空)"}
            </Box>
          </Paper>
        )}

        <Stack spacing={2}>
          {/* メタ情報 */}
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <TextField
              select
              label="学生 (必須)"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              size="small"
              sx={{ minWidth: 240 }}
              required
            >
              <MenuItem value="">— 選択してください —</MenuItem>
              {students.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} ({s.id})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="date"
              label="日付 (必須)"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              type="number"
              label="週番号"
              value={weekNumber}
              onChange={(e) => setWeekNumber(e.target.value)}
              size="small"
              sx={{ width: 120 }}
            />
            <TextField
              label="タイトル"
              value={structured.title || ""}
              onChange={(e) => setStructured({ ...structured, title: e.target.value })}
              size="small"
              sx={{ flex: 1, minWidth: 200 }}
            />
          </Stack>

          <Divider>時限ブロック</Divider>

          {BLOCK_LABELS.map(({ key, label }) => (
            <TextField
              key={key}
              label={label}
              value={structured.blocks?.[key] || ""}
              onChange={(e) => updateBlock(key, e.target.value)}
              multiline
              minRows={1}
              maxRows={4}
              size="small"
              fullWidth
            />
          ))}

          <Divider>省察・振り返り</Divider>

          <TextField
            label="省察・振り返り"
            value={structured.reflection || ""}
            onChange={(e) => setStructured({ ...structured, reflection: e.target.value })}
            multiline
            minRows={3}
            maxRows={10}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={16} /> : undefined}
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function safeJson<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function emptyStructured(): StructuredJournal {
  return {
    entry_date: null,
    week_number: null,
    title: null,
    blocks: {},
    reflection: null,
    confidence: 0.5,
    notes: null,
  };
}
