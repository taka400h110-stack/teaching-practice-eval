/**
 * 研究者用：過去の実習日誌取り込みページ
 *
 * 機能:
 *   - ドラッグ&ドロップ または ファイル選択で複数アップロード (並列度 3)
 *   - Word (.doc/.docx) / PDF / 画像 (JPG/PNG/WEBP/HEIC) 対応
 *   - toMarkdown でテキスト抽出 → GPT-4 で日誌スキーマに構造化
 *   - 学生ごと → 週順 にグルーピングして表示
 *   - 抽出結果を編集 / 閲覧 + 学生紐付け → 一括コミット
 *   - 詳細ページ (/research/journal-import/:id) への遷移
 */
import React, { useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  IconButton,
  Stack,
  Alert,
  LinearProgress,
  Paper,
  TextField,
  MenuItem,
  Tooltip,
  Snackbar,
  Pagination,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import RefreshIcon from "@mui/icons-material/Refresh";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ViewListIcon from "@mui/icons-material/ViewList";
import SearchIcon from "@mui/icons-material/Search";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import DownloadIcon from "@mui/icons-material/Download";
import FolderZipIcon from "@mui/icons-material/FolderZip";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { unzip } from "fflate";
import { apiFetch, getToken } from "../../api/client";

// 分割済みサブコンポーネント / 型 / ユーティリティ
import {
  type ImportItem,
  type Student,
  STATUS_LABELS,
  UPLOAD_CONCURRENCY,
  ITEMS_PER_PAGE,
} from "./journal-import/types";
import { uploadWithConcurrency } from "./journal-import/utils";
import { GroupedView, FlatView } from "./journal-import/GroupedView";
import { EditDialog } from "./journal-import/EditDialog";
import {
  ExportMenu,
  fetchExport,
  type ExportFormat,
  type ExportOptions,
} from "./journal-import/ExportMenu";

export default function JournalImportPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState(false);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadDone, setUploadDone] = useState(0);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<ImportItem | null>(null);
  const [viewingItem, setViewingItem] = useState<ImportItem | null>(null);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");

  // 検索/絞り込みフィルタ (クライアント側)
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterFromDate, setFilterFromDate] = useState<string>("");
  const [filterToDate, setFilterToDate] = useState<string>("");

  // ZIP 展開中フラグ
  const [unzipping, setUnzipping] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "info" | "warning" | "error" }>({
    open: false,
    message: "",
    severity: "info",
  });

  // 一覧
  const listQ = useQuery<{
    success: boolean;
    items: ImportItem[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ["journal-imports", page],
    queryFn: () => {
      const offset = (page - 1) * ITEMS_PER_PAGE;
      return apiFetch(
        `/api/data/journal-imports?limit=${ITEMS_PER_PAGE}&offset=${offset}`,
      ).then((r) => r.json());
    },
    refetchInterval: (q: any) => {
      const data = q?.state?.data as { items?: ImportItem[] } | undefined;
      const items = data?.items || [];
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

  const rawItems = listQ.data?.items || [];
  const totalCount = listQ.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  // クライアント側フィルタ適用
  const items = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return rawItems.filter((it) => {
      if (q) {
        const hay = `${it.filename} ${it.student_name || ""} ${it.entry_date || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterStatus && it.status !== filterStatus) return false;
      if (filterFromDate && it.entry_date && it.entry_date < filterFromDate) return false;
      if (filterFromDate && !it.entry_date) return false;
      if (filterToDate && it.entry_date && it.entry_date > filterToDate) return false;
      if (filterToDate && !it.entry_date) return false;
      return true;
    });
  }, [rawItems, searchQ, filterStatus, filterFromDate, filterToDate]);

  const filterActive =
    !!searchQ.trim() || !!filterStatus || !!filterFromDate || !!filterToDate;

  const readyToCommit = items.filter(
    (it) =>
      it.status === "structured" && it.student_id && it.entry_date && it.structured_json,
  );

  // ────────────────────────────────────────────────────────────
  // 学生ごとにまとめる (グルーピング)
  // ────────────────────────────────────────────────────────────
  const groupedByStudent = useMemo(() => {
    const groups = new Map<
      string,
      {
        studentId: string | null;
        studentName: string;
        items: ImportItem[];
        stats: { total: number; committed: number; structured: number; failed: number; pending: number };
      }
    >();
    for (const it of items) {
      const key = it.student_id || "__unassigned__";
      if (!groups.has(key)) {
        groups.set(key, {
          studentId: it.student_id,
          studentName: it.student_name || (it.student_id ? `(ID: ${it.student_id})` : "未指定"),
          items: [],
          stats: { total: 0, committed: 0, structured: 0, failed: 0, pending: 0 },
        });
      }
      const g = groups.get(key)!;
      g.items.push(it);
      g.stats.total += 1;
      if (it.status === "committed") g.stats.committed += 1;
      else if (it.status === "structured") g.stats.structured += 1;
      else if (it.status === "failed") g.stats.failed += 1;
      else g.stats.pending += 1;
    }
    // 各グループ内を 週 → 日付 でソート
    for (const g of groups.values()) {
      g.items.sort((a, b) => {
        const wa = a.week_number ?? 9999;
        const wb = b.week_number ?? 9999;
        if (wa !== wb) return wa - wb;
        const da = a.entry_date || "9999-12-31";
        const db = b.entry_date || "9999-12-31";
        return da.localeCompare(db);
      });
    }
    // 未指定を末尾に
    return Array.from(groups.values()).sort((a, b) => {
      if (a.studentId === null) return 1;
      if (b.studentId === null) return -1;
      return a.studentName.localeCompare(b.studentName);
    });
  }, [items]);

  // ────────────────────────────────────────────────────────────
  // ZIP 展開 → 各ファイルを uploadFiles に流す
  // ────────────────────────────────────────────────────────────
  const expandZipFiles = useCallback(
    async (zipFile: File): Promise<File[]> => {
      const buf = new Uint8Array(await zipFile.arrayBuffer());
      return new Promise((resolve, reject) => {
        unzip(buf, (err, files) => {
          if (err) return reject(err);
          const out: File[] = [];
          const SUPPORTED_EXT = [
            ".pdf",
            ".doc",
            ".docx",
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
            ".heic",
            ".heif",
          ];
          for (const [path, data] of Object.entries(files)) {
            if (path.endsWith("/")) continue; // ディレクトリ
            if (path.startsWith("__MACOSX/") || path.includes("/.")) continue;
            const lower = path.toLowerCase();
            if (!SUPPORTED_EXT.some((e) => lower.endsWith(e))) continue;
            const name = path.split("/").pop() || path;
            out.push(new File([data], name));
          }
          resolve(out);
        });
      });
    },
    [],
  );

  // ────────────────────────────────────────────────────────────
  // アップロード
  // ────────────────────────────────────────────────────────────
  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setUploadTotal(files.length);
      setUploadDone(0);
      setUploadErrors([]);

      const errors = await uploadWithConcurrency(
        files,
        UPLOAD_CONCURRENCY,
        async (file) => {
          try {
            const fd = new FormData();
            fd.append("file", file);
            const r = await apiFetch("/api/data/journal-imports/upload", {
              method: "POST",
              body: fd,
            });
            const json: any = await r.json();
            if (!r.ok || !json?.success) {
              return { ok: false, error: json?.message || r.statusText };
            }
            return { ok: true };
          } catch (e: any) {
            return { ok: false, error: e?.message || String(e) };
          } finally {
            qc.invalidateQueries({ queryKey: ["journal-imports"] });
          }
        },
        (done, _total, errs) => {
          setUploadDone(done);
          setUploadErrors(errs);
        },
      );

      setUploadTotal(0);
      setUploadDone(0);
      if (errors.length === 0) {
        setSnackbar({
          open: true,
          message: `${files.length} ファイルをアップロードしました`,
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: `${files.length - errors.length}/${files.length} 件成功 (${errors.length} 件失敗)`,
          severity: errors.length === files.length ? "error" : "warning",
        });
      }
    },
    [qc],
  );

  // ZIP を含む可能性のあるファイル群を処理
  const handleIncomingFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const zips = files.filter((f) => /\.zip$/i.test(f.name));
      const others = files.filter((f) => !/\.zip$/i.test(f.name));
      const expanded: File[] = [...others];

      if (zips.length > 0) {
        setUnzipping(true);
        try {
          for (const zip of zips) {
            try {
              const inner = await expandZipFiles(zip);
              expanded.push(...inner);
              setSnackbar({
                open: true,
                message: `${zip.name}: ${inner.length} ファイルを展開`,
                severity: "info",
              });
            } catch (e: any) {
              setSnackbar({
                open: true,
                message: `${zip.name}: ZIP 展開失敗 (${e?.message || e})`,
                severity: "error",
              });
            }
          }
        } finally {
          setUnzipping(false);
        }
      }
      if (expanded.length > 0) await uploadFiles(expanded);
    },
    [expandZipFiles, uploadFiles],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    void handleIncomingFiles(files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) void handleIncomingFiles(files);
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

  // 学生グループ単位の一括操作
  const handleStructureGroup = async (groupItems: ImportItem[]) => {
    const targets = groupItems.filter((it) => it.status === "extracted");
    if (targets.length === 0) {
      setSnackbar({ open: true, message: "構造化対象がありません", severity: "info" });
      return;
    }
    for (const it of targets) await structureMut.mutateAsync(it.id);
    setSnackbar({
      open: true,
      message: `${targets.length} 件を構造化しました`,
      severity: "success",
    });
  };

  const handleCommitGroup = async (groupItems: ImportItem[]) => {
    const targets = groupItems.filter(
      (it) =>
        it.status === "structured" &&
        it.student_id &&
        it.entry_date &&
        it.structured_json,
    );
    if (targets.length === 0) {
      setSnackbar({
        open: true,
        message: "コミット可能な項目がありません (学生・日付の指定が必要)",
        severity: "warning",
      });
      return;
    }
    for (const it of targets) await commitMut.mutateAsync(it.id);
    setSnackbar({
      open: true,
      message: `${targets.length} 件を確定しました`,
      severity: "success",
    });
  };

  // Menu 状態
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);

  // エクスポート (10 種類) - 実装は ./journal-import/ExportMenu.tsx の fetchExport へ委譲
  // Phase 7-5: options (t_test の correction など) を受けて URL に反映
  const handleExport = async (format: ExportFormat, options?: ExportOptions) => {
    setExportMenuAnchor(null);
    try {
      const filename = await fetchExport(
        format,
        { searchQ, filterStatus, filterFromDate, filterToDate },
        getToken,
        options,
      );
      setSnackbar({
        open: true,
        message: `${filename} をダウンロードしました`,
        severity: "success",
      });
    } catch (e: any) {
      setSnackbar({
        open: true,
        message: `エクスポート失敗: ${e?.message || e}`,
        severity: "error",
      });
    }
  };

  const clearFilters = () => {
    setSearchQ("");
    setFilterStatus("");
    setFilterFromDate("");
    setFilterToDate("");
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
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Tooltip title={filterOpen ? "検索を閉じる" : "検索/絞り込み"}>
            <IconButton
              onClick={() => setFilterOpen((v) => !v)}
              color={filterActive ? "primary" : "default"}
            >
              {filterActive ? <FilterAltIcon /> : <FilterAltOffIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="エクスポート (CSV / JSON / 分析用)">
            <span>
              <IconButton
                onClick={(e) => setExportMenuAnchor(e.currentTarget)}
                disabled={totalCount === 0}
              >
                <DownloadIcon />
              </IconButton>
            </span>
          </Tooltip>
          <ToggleButtonGroup
            size="small"
            value={viewMode}
            exclusive
            onChange={(_, v) => v && setViewMode(v)}
          >
            <ToggleButton value="grouped">
              <Tooltip title="学生ごとにまとめる">
                <ViewModuleIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="flat">
              <Tooltip title="フラット表示">
                <ViewListIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          <Tooltip title="一覧を更新">
            <IconButton onClick={() => listQ.refetch()} disabled={listQ.isFetching}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* 説明 */}
      <Alert severity="info" sx={{ mb: 2 }}>
        対応形式: <strong>PDF / Word (.docx 推奨, .doc も試行) / 画像 (JPG/PNG/WEBP/HEIC) / ZIP</strong>。
        Cloudflare Workers AI の <code>toMarkdown</code> でテキスト抽出 →
        GPT-4 で <strong>日付・週・時限ブロック・省察</strong> に自動構造化します。
        <strong>同時 {UPLOAD_CONCURRENCY} 並列</strong>、最大 {ITEMS_PER_PAGE} 件/ページで表示します。
        ZIP はクライアントで解凍し中の対応ファイルを順次アップロードします。
      </Alert>

      {/* 検索/絞り込み */}
      {filterOpen && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <TextField
                size="small"
                placeholder="ファイル名 / 学生名 / 日付で検索"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <SearchIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
                  ),
                }}
                sx={{ minWidth: 280, flex: 1 }}
              />
              <TextField
                select
                size="small"
                label="状態"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="">すべて</MenuItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                type="date"
                size="small"
                label="日付 (開始)"
                value={filterFromDate}
                onChange={(e) => setFilterFromDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160 }}
              />
              <TextField
                type="date"
                size="small"
                label="日付 (終了)"
                value={filterToDate}
                onChange={(e) => setFilterToDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160 }}
              />
              {filterActive && (
                <Button size="small" onClick={clearFilters}>
                  クリア
                </Button>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {filterActive
                  ? `${items.length} / ${rawItems.length} 件 (ページ内)`
                  : `${rawItems.length} 件表示中`}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}

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
              または クリックして選択 (複数選択可・数百件まで対応・ZIP もOK)
            </Typography>
            <Stack direction="row" spacing={1} justifyContent="center">
              <Button variant="contained" startIcon={<CloudUploadIcon />}>
                ファイルを選択
              </Button>
              <Button
                variant="outlined"
                startIcon={<FolderZipIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  // ZIP のみピッカー
                  const inp = document.createElement("input");
                  inp.type = "file";
                  inp.accept = ".zip,application/zip,application/x-zip-compressed";
                  inp.multiple = true;
                  inp.onchange = () => {
                    const fs = inp.files ? Array.from(inp.files) : [];
                    if (fs.length > 0) void handleIncomingFiles(fs);
                  };
                  inp.click();
                }}
              >
                ZIP を選択
              </Button>
            </Stack>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.heic,.heif,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip,application/x-zip-compressed,image/*"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              最大 20MB / 1 ファイル · ZIP 内の対応ファイルを自動展開
            </Typography>
          </Paper>

          {unzipping && (
            <Box mt={2}>
              <Typography variant="body2" gutterBottom>
                ZIP を展開中…
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {uploadTotal > 0 && (
            <Box mt={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="body2">
                  アップロード中… <strong>{uploadDone}</strong> / {uploadTotal} 件 (並列 {UPLOAD_CONCURRENCY})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {Math.round((uploadDone / uploadTotal) * 100)}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={(uploadDone / uploadTotal) * 100}
              />
            </Box>
          )}
          {uploadErrors.length > 0 && uploadTotal === 0 && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setUploadErrors([])}>
              <Typography variant="subtitle2">{uploadErrors.length} 件のアップロードに失敗:</Typography>
              <Box sx={{ maxHeight: 160, overflowY: "auto", mt: 0.5 }}>
                {uploadErrors.map((e, i) => (
                  <Typography key={i} variant="caption" display="block">
                    • {e}
                  </Typography>
                ))}
              </Box>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 一括操作 */}
      {rawItems.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                {filterActive
                  ? `絞込 ${items.length} 件 / ページ ${rawItems.length} 件 / 全 ${totalCount} 件`
                  : `ページ表示 ${rawItems.length} 件 / 全 ${totalCount} 件`}
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
              <Box sx={{ flex: 1 }} />
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadIcon />}
                endIcon={<KeyboardArrowDownIcon />}
                onClick={(e) => setExportMenuAnchor(e.currentTarget)}
              >
                エクスポート
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* 一覧 */}
      {listQ.isLoading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : rawItems.length === 0 ? (
        <Alert severity="info">まだ取り込みはありません。上のエリアからファイルをアップロードしてください。</Alert>
      ) : items.length === 0 ? (
        <Alert severity="warning">
          フィルタ条件に一致するファイルがありません。
          <Button size="small" onClick={clearFilters} sx={{ ml: 1 }}>
            クリア
          </Button>
        </Alert>
      ) : viewMode === "grouped" ? (
        <GroupedView
          groups={groupedByStudent}
          onView={(it) => setViewingItem(it)}
          onEdit={(it) => setEditingItem(it)}
          onDetail={(it) => navigate(`/research/journal-import/${it.id}`)}
          onStructure={(id) => structureMut.mutate(id)}
          onCommit={(id) => commitMut.mutate(id)}
          onStructureGroup={handleStructureGroup}
          onCommitGroup={handleCommitGroup}
          onDelete={(it) => {
            if (confirm(`取り込み記録 "${it.filename}" を削除しますか?`)) {
              deleteMut.mutate(it.id);
            }
          }}
          onOpenJournal={(jid) => navigate(`/journals/${jid}`)}
          structurePending={structureMut.isPending}
          commitPending={commitMut.isPending}
        />
      ) : (
        <FlatView
          items={items}
          onView={(it) => setViewingItem(it)}
          onEdit={(it) => setEditingItem(it)}
          onDetail={(it) => navigate(`/research/journal-import/${it.id}`)}
          onStructure={(id) => structureMut.mutate(id)}
          onCommit={(id) => commitMut.mutate(id)}
          onDelete={(it) => {
            if (confirm(`取り込み記録 "${it.filename}" を削除しますか?`)) {
              deleteMut.mutate(it.id);
            }
          }}
          onOpenJournal={(jid) => navigate(`/journals/${jid}`)}
          structurePending={structureMut.isPending}
          commitPending={commitMut.isPending}
        />
      )}

      {/* ページング */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* 編集ダイアログ */}
      {editingItem && (
        <EditDialog
          item={editingItem}
          students={students}
          viewOnly={false}
          onClose={() => setEditingItem(null)}
          onSave={async (patch) => {
            await patchMut.mutateAsync({ id: editingItem.id, body: patch });
            setEditingItem(null);
            setSnackbar({ open: true, message: "保存しました", severity: "success" });
          }}
          onRestructure={async () => {
            await structureMut.mutateAsync(editingItem.id);
            const r = await apiFetch(`/api/data/journal-imports/${editingItem.id}`);
            const j: any = await r.json();
            if (j?.item) setEditingItem(j.item);
          }}
          isSaving={patchMut.isPending}
          isRestructuring={structureMut.isPending}
        />
      )}

      {/* 閲覧ダイアログ */}
      {viewingItem && (
        <EditDialog
          item={viewingItem}
          students={students}
          viewOnly
          onClose={() => setViewingItem(null)}
          onSave={async () => {}}
          onRestructure={async () => {}}
          isSaving={false}
          isRestructuring={false}
        />
      )}

      {/* エクスポートメニュー (./journal-import/ExportMenu.tsx) */}
      <ExportMenu
        anchorEl={exportMenuAnchor}
        onClose={() => setExportMenuAnchor(null)}
        onExport={handleExport}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
}
