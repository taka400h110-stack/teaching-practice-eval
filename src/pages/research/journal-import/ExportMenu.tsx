/**
 * エクスポートメニュー (10 形式)
 *
 * 全形式とその用途:
 *   - summary_csv          : 取り込み一覧の基本メタ情報 19 列
 *   - detail_csv           : 質的分析向け詳細 (時限ブロック展開 + 抽出原文)
 *   - json                 : 質的分析向けネスト構造
 *   - analysis_csv         : 量的分析向け統合 (日誌 + AI/人間評価 + SCAT)
 *   - codebook_md          : 論文 Appendix 用データ辞書 (Markdown)
 *   - codebook_json        : 機械可読データ辞書 (JSON)
 *   - descriptive_stats_md : APA 記述統計テーブル (Phase 6-3)
 *   - correlation_csv      : Pearson 相関行列 (Phase 6-3)
 *   - t_test_md            : t 検定結果 (Phase 6-3)
 *   - methods_md           : 論文 Methods 自動生成 (Phase 6-3)
 */
import { Divider, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
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

export interface ExportMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onExport: (format: ExportFormat) => void;
}

export function ExportMenu({ anchorEl, onClose, onExport }: ExportMenuProps) {
  const handle = (format: ExportFormat) => {
    onExport(format);
  };

  return (
    <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={onClose}>
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
      <MenuItem onClick={() => handle("t_test_md")}>
        <ListItemIcon>
          <CompareArrowsIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary="t 検定結果 (Markdown)"
          secondary="週前半 vs 後半 (Welch) + AI vs 人間 (Paired)"
        />
      </MenuItem>
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

/**
 * エクスポート用のフェッチ + ダウンロード処理 (コンテナ側で呼ぶ)
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
