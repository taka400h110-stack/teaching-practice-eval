/**
 * エクスポートメニュー (10 形式 / 4 グループ)
 *
 * Phase 7-5: 4 グループに分けた構造化 UI + t_test の多重比較補正セレクタ
 *
 * グループ:
 *   1. 取り込み一覧データ
 *        summary_csv          : 取り込み一覧の基本メタ情報 19 列
 *        detail_csv           : 質的分析向け詳細 (時限ブロック展開 + 抽出原文)
 *        json                 : 質的分析向けネスト構造
 *   2. 量的分析用データ
 *        analysis_csv         : 量的分析向け統合 (日誌 + AI/人間評価 + SCAT)
 *   3. 統計レポート (論文 Results / Methods 用)
 *        descriptive_stats_md : APA 記述統計テーブル (Phase 6-3)
 *        correlation_csv      : Pearson 相関行列 (Phase 6-3)
 *        t_test_md            : t 検定結果 (Phase 6-3 / 7-3 / 7-4)
 *                                 → ListItem 内に correction セレクタ (Phase 7-5)
 *        methods_md           : 論文 Methods 自動生成 (Phase 6-3)
 *   4. データ辞書 (論文 Appendix 用)
 *        codebook_md          : Markdown 列定義
 *        codebook_json        : 機械可読
 */
import { useState } from "react";
import {
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import TableChartIcon from "@mui/icons-material/TableChart";
import DataObjectIcon from "@mui/icons-material/DataObject";
import AssessmentIcon from "@mui/icons-material/Assessment";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import CodeIcon from "@mui/icons-material/Code";
import FunctionsIcon from "@mui/icons-material/Functions";
import LinkIcon from "@mui/icons-material/Link";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ArticleIcon from "@mui/icons-material/Article";

export type ExportFormat =
  | "summary_csv"
  | "detail_csv"
  | "json"
  | "analysis_csv"
  | "codebook_md"
  | "codebook_json"
  | "descriptive_stats_md"
  | "correlation_csv"
  | "t_test_md"
  | "methods_md";

/** Phase 7-4 で stats.ts に追加した補正方式 (UI 側でも同じ string union を保持) */
export type CorrectionMethod = "none" | "bonferroni" | "holm" | "fdr_bh";

/** Phase 7-5: フォーマット固有の追加オプション (将来拡張のため union 形式) */
export interface ExportOptions {
  /** t_test_md でのみ使用 */
  correction?: CorrectionMethod;
}

export interface ExportMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  /** Phase 7-5: 第2引数 options を追加 (後方互換のため optional) */
  onExport: (format: ExportFormat, options?: ExportOptions) => void;
}

/** correction の選択肢 (ToggleButtonGroup 用) */
const CORRECTION_OPTIONS: Array<{ value: CorrectionMethod; label: string; tooltip: string }> = [
  { value: "none",       label: "なし",   tooltip: "補正なし (生の p 値のみ)" },
  { value: "bonferroni", label: "Bonf.",  tooltip: "Bonferroni: p × m (最も保守的, FWER 制御)" },
  { value: "holm",       label: "Holm",   tooltip: "Holm step-down: Bonferroni より検出力が高い, FWER 制御" },
  { value: "fdr_bh",     label: "BH",     tooltip: "Benjamini-Hochberg: FDR 制御, 最も検出力が高い" },
];

export function ExportMenu({ anchorEl, onClose, onExport }: ExportMenuProps) {
  // Phase 7-5: t_test の多重比較補正方式 (Menu を開いている間だけ保持)
  const [correction, setCorrection] = useState<CorrectionMethod>("none");

  const handle = (format: ExportFormat) => {
    if (format === "t_test_md") {
      onExport(format, { correction });
    } else {
      onExport(format);
    }
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={!!anchorEl}
      onClose={onClose}
      // Phase 7-5: グループの ListSubheader を整列させるため max width / dense を調整
      slotProps={{
        paper: {
          sx: { minWidth: 360, maxWidth: 480 },
        },
      }}
    >
      {/* ─── グループ 1: 取り込み一覧データ ─── */}
      <ListSubheader
        component="div"
        disableSticky
        sx={{ fontWeight: 700, fontSize: "0.75rem", color: "text.secondary", lineHeight: 1.8 }}
      >
        取り込み一覧データ
      </ListSubheader>
      <MenuItem onClick={() => handle("summary_csv")}>
        <ListItemIcon>
          <TableChartIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="サマリー CSV" secondary="基本メタ情報 19 列 (取り込み一覧)" />
      </MenuItem>
      <MenuItem onClick={() => handle("detail_csv")}>
        <ListItemIcon>
          <TableChartIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary="詳細 CSV (質的分析向け)"
          secondary="時限ブロック 11 列 + 省察 + 抽出原文"
        />
      </MenuItem>
      <MenuItem onClick={() => handle("json")}>
        <ListItemIcon>
          <DataObjectIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary="JSON (NVivo / pandas 向け)"
          secondary="ネスト構造で全フィールド"
        />
      </MenuItem>

      <Divider />

      {/* ─── グループ 2: 量的分析用データ ─── */}
      <ListSubheader
        component="div"
        disableSticky
        sx={{ fontWeight: 700, fontSize: "0.75rem", color: "text.secondary", lineHeight: 1.8 }}
      >
        量的分析用データ
      </ListSubheader>
      <MenuItem onClick={() => handle("analysis_csv")}>
        <ListItemIcon>
          <AssessmentIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary="統合分析 CSV (量的分析向け)"
          secondary="日誌 + AI評価 + 人間評価 + SCAT概念数 50 列"
        />
      </MenuItem>

      <Divider />

      {/* ─── グループ 3: 統計レポート (論文 Results 用) ─── */}
      <ListSubheader
        component="div"
        disableSticky
        sx={{ fontWeight: 700, fontSize: "0.75rem", color: "text.secondary", lineHeight: 1.8 }}
      >
        統計レポート (論文 Results / Methods 用)
      </ListSubheader>
      <MenuItem onClick={() => handle("descriptive_stats_md")}>
        <ListItemIcon>
          <FunctionsIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary="記述統計表 (APA / Markdown)"
          secondary="M, SD, Mdn, Min, Max, 歪度, 尖度 / 論文 Results 用"
        />
      </MenuItem>
      <MenuItem onClick={() => handle("correlation_csv")}>
        <ListItemIcon>
          <LinkIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary="相関行列 CSV (Pearson)"
          secondary="AI × 人間 × SCAT 14 変数 / r, p, 95% CI"
        />
      </MenuItem>

      {/* t_test_md は補正セレクタを内包する MenuItem として、クリックでダウンロード */}
      <MenuItem onClick={() => handle("t_test_md")}>
        <ListItemIcon>
          <CompareArrowsIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary="t 検定結果 (Markdown)"
          secondary={`週前半 vs 後半 (Welch) + AI vs 人間 (Paired)${
            correction !== "none" ? ` / 補正: ${labelOf(correction)}` : ""
          }`}
        />
      </MenuItem>

      {/* Phase 7-5: 多重比較補正セレクタ (t_test_md 専用) */}
      <Box
        sx={{ px: 2, pb: 1, pt: 0.5 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80 }}>
            多重比較補正:
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={correction}
            onChange={(_, v) => {
              if (v !== null) setCorrection(v as CorrectionMethod);
            }}
            aria-label="多重比較補正方式"
          >
            {CORRECTION_OPTIONS.map((opt) => (
              <Tooltip key={opt.value} title={opt.tooltip} placement="bottom">
                <ToggleButton
                  value={opt.value}
                  sx={{ fontSize: "0.7rem", py: 0.25, px: 1 }}
                  aria-label={opt.tooltip}
                >
                  {opt.label}
                </ToggleButton>
              </Tooltip>
            ))}
          </ToggleButtonGroup>
        </Stack>
      </Box>

      <MenuItem onClick={() => handle("methods_md")}>
        <ListItemIcon>
          <ArticleIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary="論文 Methods 自動生成 (Markdown)"
          secondary="Participants / Statistical Analysis / Tools / References"
        />
      </MenuItem>

      <Divider />

      {/* ─── グループ 4: データ辞書 (Appendix 用) ─── */}
      <ListSubheader
        component="div"
        disableSticky
        sx={{ fontWeight: 700, fontSize: "0.75rem", color: "text.secondary", lineHeight: 1.8 }}
      >
        データ辞書 (論文 Appendix 用)
      </ListSubheader>
      <MenuItem onClick={() => handle("codebook_md")}>
        <ListItemIcon>
          <MenuBookIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary="データ辞書 (Markdown)"
          secondary="列定義・型・由来テーブル / 論文 Appendix 用"
        />
      </MenuItem>
      <MenuItem onClick={() => handle("codebook_json")}>
        <ListItemIcon>
          <CodeIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary="データ辞書 (JSON)"
          secondary="機械可読 / プログラムから列定義を参照"
        />
      </MenuItem>
    </Menu>
  );
}

/** 補正方式の短いラベル (MenuItem の secondary 表示用) */
function labelOf(method: CorrectionMethod): string {
  switch (method) {
    case "bonferroni": return "Bonferroni";
    case "holm":       return "Holm";
    case "fdr_bh":     return "BH-FDR";
    case "none":
    default:           return "なし";
  }
}

/**
 * エクスポート用のフェッチ + ダウンロード処理 (コンテナ側で呼ぶ)
 *
 * Phase 7-5: optional な options 引数を追加 (t_test の correction など)
 *
 * 戻り値: 成功時はダウンロードしたファイル名、失敗時は throw
 */
export async function fetchExport(
  format: ExportFormat,
  filters: {
    searchQ: string;
    filterStatus: string;
    filterFromDate: string;
    filterToDate: string;
  },
  getToken: () => string | null,
  options?: ExportOptions,
): Promise<string> {
  const params = new URLSearchParams();
  if (filters.searchQ.trim()) params.set("q", filters.searchQ.trim());
  if (filters.filterStatus) params.set("status", filters.filterStatus);
  if (filters.filterFromDate) params.set("from", filters.filterFromDate);
  if (filters.filterToDate) params.set("to", filters.filterToDate);

  let endpoint = "/api/data/journal-imports/export.csv";
  let fallbackName = "journal-imports";
  let ext = "csv";

  switch (format) {
    case "detail_csv":
      endpoint = "/api/data/journal-imports/export.detail.csv";
      fallbackName = "journal-imports-detail";
      break;
    case "json":
      endpoint = "/api/data/journal-imports/export.json";
      ext = "json";
      break;
    case "analysis_csv":
      endpoint = "/api/data/journal-imports/export.analysis.csv";
      fallbackName = "journal-analysis";
      // analysis では q / status は使わない
      params.delete("q");
      params.delete("status");
      break;
    case "codebook_md":
      endpoint = "/api/data/journal-imports/export.codebook.md";
      fallbackName = "journal-imports-codebook";
      ext = "md";
      // codebook はフィルタ非依存
      ["q", "status", "from", "to"].forEach((k) => params.delete(k));
      break;
    case "codebook_json":
      endpoint = "/api/data/journal-imports/export.codebook.json";
      fallbackName = "journal-imports-codebook";
      ext = "json";
      ["q", "status", "from", "to"].forEach((k) => params.delete(k));
      break;
    case "descriptive_stats_md":
      endpoint = "/api/data/journal-imports/export.descriptive_stats.md";
      fallbackName = "journal-descriptive-stats";
      ext = "md";
      params.delete("q");
      params.delete("status");
      break;
    case "correlation_csv":
      endpoint = "/api/data/journal-imports/export.correlation.csv";
      fallbackName = "journal-correlation";
      ext = "csv";
      params.delete("q");
      params.delete("status");
      break;
    case "t_test_md":
      endpoint = "/api/data/journal-imports/export.t_test.md";
      fallbackName = "journal-t-test";
      ext = "md";
      params.delete("q");
      params.delete("status");
      // Phase 7-5: 多重比較補正を ?correction=... として付与 (none のときは付けない)
      if (options?.correction && options.correction !== "none") {
        params.set("correction", options.correction);
        fallbackName = `journal-t-test-${options.correction}`;
      }
      break;
    case "methods_md":
      endpoint = "/api/data/journal-imports/export.methods_section.md";
      fallbackName = "journal-methods-section";
      ext = "md";
      params.delete("q");
      params.delete("status");
      break;
    case "summary_csv":
    default:
      // default values 既設定
      break;
  }

  const url = `${endpoint}${params.toString() ? "?" + params.toString() : ""}`;
  const token = getToken();
  const r = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!r.ok) {
    throw new Error(`HTTP ${r.status}`);
  }
  const blob = await r.blob();
  const dlUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const filename = `${fallbackName}-${ts}.${ext}`;
  a.href = dlUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(dlUrl);
  return filename;
}
