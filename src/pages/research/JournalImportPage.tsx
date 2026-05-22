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
  Menu,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Divider,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  Pagination,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DescriptionIcon from "@mui/icons-material/Description";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import RefreshIcon from "@mui/icons-material/Refresh";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PersonIcon from "@mui/icons-material/Person";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ViewListIcon from "@mui/icons-material/ViewList";
import SearchIcon from "@mui/icons-material/Search";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import DownloadIcon from "@mui/icons-material/Download";
import FolderZipIcon from "@mui/icons-material/FolderZip";
import TableChartIcon from "@mui/icons-material/TableChart";
import DataObjectIcon from "@mui/icons-material/DataObject";
import AssessmentIcon from "@mui/icons-material/Assessment";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { unzip } from "fflate";
import { apiFetch, getToken } from "../../api/client";

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

const UPLOAD_CONCURRENCY = 3;
const ITEMS_PER_PAGE = 200;

function humanFileSize(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * 並列度を制限してファイルを順次アップロード
 */
async function uploadWithConcurrency(
  files: File[],
  concurrency: number,
  uploadFn: (file: File) => Promise<{ ok: boolean; error?: string }>,
  onProgress: (done: number, total: number, errors: string[]) => void,
) {
  const total = files.length;
  let done = 0;
  const errors: string[] = [];
  const queue = [...files];

  async function worker() {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;
      const r = await uploadFn(file);
      done += 1;
      if (!r.ok && r.error) errors.push(`${file.name}: ${r.error}`);
      onProgress(done, total, [...errors]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
  await Promise.all(workers);
  return errors;
}

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

  // エクスポート (4 種類)
  type ExportFormat = "summary_csv" | "detail_csv" | "json" | "analysis_csv";
  const handleExport = async (format: ExportFormat) => {
    const params = new URLSearchParams();
    if (searchQ.trim()) params.set("q", searchQ.trim());
    if (filterStatus) params.set("status", filterStatus);
    if (filterFromDate) params.set("from", filterFromDate);
    if (filterToDate) params.set("to", filterToDate);

    let endpoint = "/api/data/journal-imports/export.csv";
    let fallbackName = "journal-imports";
    let ext = "csv";
    if (format === "detail_csv") {
      endpoint = "/api/data/journal-imports/export.detail.csv";
      fallbackName = "journal-imports-detail";
    } else if (format === "json") {
      endpoint = "/api/data/journal-imports/export.json";
      fallbackName = "journal-imports";
      ext = "json";
    } else if (format === "analysis_csv") {
      endpoint = "/api/data/journal-imports/export.analysis.csv";
      fallbackName = "journal-analysis";
      // analysis では q / status は使わない
      params.delete("q");
      params.delete("status");
    }
    const url = `${endpoint}${params.toString() ? "?" + params.toString() : ""}`;

    setExportMenuAnchor(null);
    try {
      const token = getToken();
      const r = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) {
        setSnackbar({
          open: true,
          message: `エクスポート失敗: ${r.status}`,
          severity: "error",
        });
        return;
      }
      const blob = await r.blob();
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      a.href = dlUrl;
      a.download = `${fallbackName}-${ts}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(dlUrl);
      setSnackbar({
        open: true,
        message: `${a.download} をダウンロードしました`,
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

  // Menu 状態
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);

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

      {/* エクスポートメニュー */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={!!exportMenuAnchor}
        onClose={() => setExportMenuAnchor(null)}
      >
        <MenuItem onClick={() => handleExport("summary_csv")}>
          <ListItemIcon>
            <TableChartIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="サマリー CSV"
            secondary="基本メタ情報 19 列 (取り込み一覧)"
          />
        </MenuItem>
        <MenuItem onClick={() => handleExport("detail_csv")}>
          <ListItemIcon>
            <TableChartIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="詳細 CSV (質的分析向け)"
            secondary="時限ブロック 11 列 + 省察 + 抽出原文"
          />
        </MenuItem>
        <MenuItem onClick={() => handleExport("json")}>
          <ListItemIcon>
            <DataObjectIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="JSON (NVivo / pandas 向け)"
            secondary="ネスト構造で全フィールド"
          />
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleExport("analysis_csv")}>
          <ListItemIcon>
            <AssessmentIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="統合分析 CSV (量的分析向け)"
            secondary="日誌 + AI評価 + 人間評価 + SCAT概念数"
          />
        </MenuItem>
      </Menu>

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
// 学生ごとグルーピング表示
// ──────────────────────────────────────────────────────────────────
function GroupedView(props: {
  groups: Array<{
    studentId: string | null;
    studentName: string;
    items: ImportItem[];
    stats: { total: number; committed: number; structured: number; failed: number; pending: number };
  }>;
  onView: (it: ImportItem) => void;
  onEdit: (it: ImportItem) => void;
  onDetail: (it: ImportItem) => void;
  onStructure: (id: string) => void;
  onCommit: (id: string) => void;
  onStructureGroup: (items: ImportItem[]) => void;
  onCommitGroup: (items: ImportItem[]) => void;
  onDelete: (it: ImportItem) => void;
  onOpenJournal: (jid: string) => void;
  structurePending: boolean;
  commitPending: boolean;
}) {
  const { groups, onStructureGroup, onCommitGroup, structurePending, commitPending } = props;
  return (
    <Stack spacing={1.5}>
      {groups.map((g) => {
        const extractedCount = g.items.filter((it) => it.status === "extracted").length;
        const readyCount = g.items.filter(
          (it) =>
            it.status === "structured" &&
            it.student_id &&
            it.entry_date &&
            it.structured_json,
        ).length;
        return (
          <Accordion key={g.studentId || "__unassigned__"} defaultExpanded={groups.length <= 5}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{ width: "100%" }}
                flexWrap="wrap"
                useFlexGap
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: g.studentId ? "primary.main" : "grey.400",
                  }}
                >
                  {g.studentId ? <PersonIcon fontSize="small" /> : <HelpOutlineIcon fontSize="small" />}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {g.studentName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {g.items.length} 件の取り込み
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {g.stats.committed > 0 && (
                    <Chip
                      size="small"
                      color="success"
                      label={`確定 ${g.stats.committed}`}
                    />
                  )}
                  {g.stats.structured > 0 && (
                    <Chip size="small" color="warning" label={`編集待 ${g.stats.structured}`} />
                  )}
                  {g.stats.pending > 0 && (
                    <Chip size="small" color="info" label={`処理中 ${g.stats.pending}`} />
                  )}
                  {g.stats.failed > 0 && (
                    <Chip size="small" color="error" label={`失敗 ${g.stats.failed}`} />
                  )}
                </Stack>
                {/* 学生グループ別の一括操作 */}
                <Stack
                  direction="row"
                  spacing={0.5}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                >
                  {extractedCount > 0 && (
                    <Tooltip title={`未構造化 ${extractedCount} 件を GPT-4 で構造化`}>
                      <span>
                        <Button
                          size="small"
                          startIcon={<AutoFixHighIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onStructureGroup(g.items);
                          }}
                          disabled={structurePending}
                        >
                          一括構造化 ({extractedCount})
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                  {readyCount > 0 && (
                    <Tooltip title={`確定可能な ${readyCount} 件を journal_entries にコミット`}>
                      <span>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircleIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onCommitGroup(g.items);
                          }}
                          disabled={commitPending}
                        >
                          一括コミット ({readyCount})
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                </Stack>
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <WeekSubGroups items={g.items} {...props} />
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Stack>
  );
}

// ──────────────────────────────────────────────────────────────────
// 学生グループ内で「週」ごとにサブグルーピング
// ──────────────────────────────────────────────────────────────────
function WeekSubGroups(props: {
  items: ImportItem[];
  onView: (it: ImportItem) => void;
  onEdit: (it: ImportItem) => void;
  onDetail: (it: ImportItem) => void;
  onStructure: (id: string) => void;
  onCommit: (id: string) => void;
  onStructureGroup?: (items: ImportItem[]) => void;
  onCommitGroup?: (items: ImportItem[]) => void;
  onDelete: (it: ImportItem) => void;
  onOpenJournal: (jid: string) => void;
  structurePending: boolean;
  commitPending: boolean;
}) {
  const { items } = props;
  const weeks = useMemo(() => {
    const map = new Map<string, ImportItem[]>();
    for (const it of items) {
      const key = it.week_number != null ? `第${it.week_number}週` : "週未設定";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map.entries());
  }, [items]);

  return (
    <Box>
      {weeks.map(([weekKey, weekItems]) => (
        <Box key={weekKey}>
          <Box
            sx={{
              px: 2,
              py: 0.75,
              bgcolor: "grey.100",
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="body2" fontWeight="bold" color="text.secondary">
              {weekKey} ({weekItems.length})
            </Typography>
          </Box>
          <ItemTable items={weekItems} {...props} />
        </Box>
      ))}
    </Box>
  );
}

// ──────────────────────────────────────────────────────────────────
// フラットビュー
// ──────────────────────────────────────────────────────────────────
function FlatView(props: {
  items: ImportItem[];
  onView: (it: ImportItem) => void;
  onEdit: (it: ImportItem) => void;
  onDetail: (it: ImportItem) => void;
  onStructure: (id: string) => void;
  onCommit: (id: string) => void;
  onStructureGroup?: (items: ImportItem[]) => void;
  onCommitGroup?: (items: ImportItem[]) => void;
  onDelete: (it: ImportItem) => void;
  onOpenJournal: (jid: string) => void;
  structurePending: boolean;
  commitPending: boolean;
}) {
  return (
    <Card>
      <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
        <ItemTable {...props} showStudent />
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────
// 行テーブル (共通)
// ──────────────────────────────────────────────────────────────────
function ItemTable(props: {
  items: ImportItem[];
  showStudent?: boolean;
  onView: (it: ImportItem) => void;
  onEdit: (it: ImportItem) => void;
  onDetail: (it: ImportItem) => void;
  onStructure: (id: string) => void;
  onCommit: (id: string) => void;
  onStructureGroup?: (items: ImportItem[]) => void;
  onCommitGroup?: (items: ImportItem[]) => void;
  onDelete: (it: ImportItem) => void;
  onOpenJournal: (jid: string) => void;
  structurePending: boolean;
  commitPending: boolean;
}) {
  const {
    items,
    showStudent,
    onView,
    onEdit,
    onDetail,
    onStructure,
    onCommit,
    onDelete,
    onOpenJournal,
    structurePending,
    commitPending,
  } = props;

  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ファイル</TableCell>
            {showStudent && <TableCell>学生</TableCell>}
            <TableCell>日付</TableCell>
            <TableCell>週</TableCell>
            <TableCell>状態</TableCell>
            <TableCell>抽出元</TableCell>
            <TableCell>サイズ</TableCell>
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
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                      }}
                      onClick={() => onDetail(it)}
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
              {showStudent && (
                <TableCell>
                  {it.student_name || (
                    <Typography variant="caption" color="text.secondary">
                      未指定
                    </Typography>
                  )}
                </TableCell>
              )}
              <TableCell>{it.entry_date || "—"}</TableCell>
              <TableCell>{it.week_number != null ? `第${it.week_number}週` : "—"}</TableCell>
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
                {it.extract_source ? (
                  <Chip size="small" label={it.extract_source} variant="outlined" />
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>{humanFileSize(it.file_size)}</TableCell>
              <TableCell>{it.word_count ?? "—"}</TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  <Tooltip title="詳細ページを開く">
                    <IconButton size="small" onClick={() => onDetail(it)}>
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="閲覧 (読み取り専用)">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => onView(it)}
                        disabled={!it.structured_json && !it.raw_text}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {it.status === "extracted" && (
                    <Tooltip title="GPT-4 で構造化">
                      <IconButton
                        size="small"
                        onClick={() => onStructure(it.id)}
                        disabled={structurePending}
                      >
                        <AutoFixHighIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {["structured", "extracted", "failed"].includes(it.status) && (
                    <Tooltip title="編集">
                      <IconButton size="small" onClick={() => onEdit(it)}>
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
                          onClick={() => onCommit(it.id)}
                          disabled={!it.student_id || !it.entry_date || commitPending}
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  {it.status === "committed" && it.journal_id && (
                    <Tooltip title="日誌を開く">
                      <IconButton size="small" onClick={() => onOpenJournal(it.journal_id!)}>
                        <CheckCircleIcon fontSize="small" color="success" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="削除 (取り込み記録のみ)">
                    <IconButton size="small" color="error" onClick={() => onDelete(it)}>
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
  );
}

// ──────────────────────────────────────────────────────────────────
// 編集/閲覧ダイアログ (viewOnly フラグで切替)
// ──────────────────────────────────────────────────────────────────
function EditDialog({
  item,
  students,
  viewOnly,
  onClose,
  onSave,
  onRestructure,
  isSaving,
  isRestructuring,
}: {
  item: ImportItem;
  students: Student[];
  viewOnly: boolean;
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
  const [showRawText, setShowRawText] = useState(viewOnly);

  const readOnly = viewOnly;

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
            <Typography variant="h6">
              {viewOnly ? "取り込み内容の閲覧" : "取り込み内容の編集"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {item.filename}
            </Typography>
          </Box>
          {!viewOnly && (
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
          )}
          {viewOnly && (
            <Button size="small" onClick={() => setShowRawText((s) => !s)}>
              {showRawText ? "抽出原文を隠す" : "抽出原文を表示"}
            </Button>
          )}
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
              disabled={readOnly}
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
              disabled={readOnly}
            />
            <TextField
              type="number"
              label="週番号"
              value={weekNumber}
              onChange={(e) => setWeekNumber(e.target.value)}
              size="small"
              sx={{ width: 120 }}
              disabled={readOnly}
            />
            <TextField
              label="タイトル"
              value={structured.title || ""}
              onChange={(e) => setStructured({ ...structured, title: e.target.value })}
              size="small"
              sx={{ flex: 1, minWidth: 200 }}
              disabled={readOnly}
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
              disabled={readOnly}
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
            disabled={readOnly}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{viewOnly ? "閉じる" : "キャンセル"}</Button>
        {!viewOnly && (
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSaving}
            startIcon={isSaving ? <CircularProgress size={16} /> : undefined}
          >
            保存
          </Button>
        )}
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
