/**
 * 研究者用：アンケート CSV 取り込みページ
 *
 * 機能:
 *   - Google フォーム等から出力した CSV をアップロード
 *   - 文字コード (UTF-8 / Shift_JIS) と 時点 (実習前/後) を選択
 *   - プレビュー（DB 書込みなし）で検証結果・ヘッダ対応・失敗行を確認
 *   - 取込確定（重複ポリシー: 既定拒否 / 明示上書き）
 *   - 取込履歴の一覧と、事前事後の突合分析結果を表示
 *
 * 設計方針:
 *   - 氏名・学籍番号は扱わない。研究ID のみで pre/post を対応付ける。
 *   - Google フォームの本アンケートを CSV 経由で安全に取り込むための画面。
 */
import React, { useState, useCallback, useRef } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Stack,
  Alert,
  AlertTitle,
  LinearProgress,
  Paper,
  MenuItem,
  TextField,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Tab,
  Tabs,
  Snackbar,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HistoryIcon from "@mui/icons-material/History";
import InsightsIcon from "@mui/icons-material/Insights";
import DescriptionIcon from "@mui/icons-material/Description";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../api/client";

// ────────────────────────────────────────────────────────────────
// 型
// ────────────────────────────────────────────────────────────────
type Encoding = "auto" | "utf-8" | "shift_jis";
type PhaseOpt = "auto" | "pre" | "post";
type DupPolicy = "reject" | "overwrite";

interface PreviewRow {
  row_index: number;
  research_id: string | null;
  phase: string | null;
  ok: boolean;
  errors: { code: string; message: string }[];
  response_count: number;
}
interface PreviewResult {
  success: boolean;
  encoding: string;
  filename: string;
  default_phase: string | null;
  duplicate_policy: string;
  headers: string[];
  mapping: Record<string, string>;
  unmatched_columns: string[];
  column_errors: { code: string; message: string }[];
  summary: { total: number; success: number; failed: number };
  rows: PreviewRow[];
}
interface CommitResult {
  success: boolean;
  batch_id: string;
  summary: { total: number; success: number; failed: number; skipped: number };
  unmatched_columns: string[];
  row_results: { row_index: number; status: string; errors: any[] }[];
}
interface BatchRow {
  id: string;
  filename: string;
  encoding: string;
  phase: string;
  duplicate_policy: string;
  total_rows: number;
  success_rows: number;
  failed_rows: number;
  skipped_rows: number;
  status: string;
  imported_by: string;
  imported_role: string;
  created_at: string;
}
interface AnalysisScale {
  pre: number | null;
  post: number | null;
}
interface AnalysisPaired {
  research_id: string;
  scales: Record<string, AnalysisScale>;
}
interface AnalysisResult {
  success: boolean;
  scales: { key: string; label: string }[];
  respondent_count: number;
  paired_count: number;
  paired: AnalysisPaired[];
}

// ────────────────────────────────────────────────────────────────
// フォーム送信ヘルパ
// ────────────────────────────────────────────────────────────────
function buildFormData(
  file: File,
  encoding: Encoding,
  phase: PhaseOpt,
  dup: DupPolicy,
): FormData {
  const fd = new FormData();
  fd.append("file", file);
  if (encoding !== "auto") fd.append("encoding", encoding);
  if (phase !== "auto") fd.append("phase", phase);
  fd.append("duplicate_policy", dup);
  return fd;
}

const STATUS_COLOR: Record<string, "success" | "error" | "warning" | "default"> = {
  success: "success",
  failed: "error",
  skipped: "warning",
  committed: "success",
  processing: "default",
};

// ────────────────────────────────────────────────────────────────
export default function SurveyImportPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [encoding, setEncoding] = useState<Encoding>("auto");
  const [phase, setPhase] = useState<PhaseOpt>("auto");
  const [dup, setDup] = useState<DupPolicy>("reject");

  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // 履歴
  const batchesQuery = useQuery<{ success: boolean; batches: BatchRow[] }>({
    queryKey: ["survey-batches"],
    queryFn: async () => {
      const res = await apiFetch("/api/survey/batches");
      if (!res.ok) throw new Error("履歴の取得に失敗しました");
      return res.json();
    },
    enabled: tab === 1,
  });

  // 分析
  const analysisQuery = useQuery<AnalysisResult>({
    queryKey: ["survey-analysis"],
    queryFn: async () => {
      const res = await apiFetch("/api/survey/analysis");
      if (!res.ok) throw new Error("分析結果の取得に失敗しました");
      return res.json();
    },
    enabled: tab === 2,
  });

  const onSelectFile = useCallback((f: File | null) => {
    setFile(f);
    setPreview(null);
    setCommitResult(null);
    setError(null);
  }, []);

  const doPreview = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setCommitResult(null);
    try {
      const res = await apiFetch("/api/survey/preview", {
        method: "POST",
        body: buildFormData(file, encoding, phase, dup),
      });
      const json = (await res.json()) as PreviewResult & {
        message?: string;
        error?: string;
      };
      if (!res.ok || !json.success) {
        setError(json.message || json.error || "プレビューに失敗しました");
        setPreview(null);
      } else {
        setPreview(json);
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }, [file, encoding, phase, dup]);

  const doCommit = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/survey/commit", {
        method: "POST",
        body: buildFormData(file, encoding, phase, dup),
      });
      const json = (await res.json()) as CommitResult & {
        message?: string;
        error?: string;
        column_errors?: { code: string; message: string }[];
      };
      if (!res.ok || !json.success) {
        if (json.column_errors?.length) {
          setError(
            "列の検証に失敗しました: " +
              json.column_errors.map((e) => e.message).join(" / "),
          );
        } else {
          setError(json.message || json.error || "取込に失敗しました");
        }
        setCommitResult(null);
      } else {
        setCommitResult(json);
        setToast(
          `取込完了: 成功 ${json.summary.success} / 失敗 ${json.summary.failed} / スキップ ${json.summary.skipped}`,
        );
        qc.invalidateQueries({ queryKey: ["survey-batches"] });
        qc.invalidateQueries({ queryKey: ["survey-analysis"] });
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }, [file, encoding, phase, dup, qc]);

  const canCommit =
    !!preview &&
    preview.column_errors.length === 0 &&
    preview.summary.success > 0 &&
    !busy;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: "auto" }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        アンケート CSV 取り込み
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Google
        フォームで実施した事前・事後アンケート（批判的思考態度 CTA / 省察的思考 RTQ /
        生成AI活用の批判的吟味 AICT）の回答 CSV を取り込みます。
        氏名・学籍番号は保存せず、<b>研究ID</b> のみで事前事後を対応付けます。
      </Typography>

      <Alert severity="info" icon={<DescriptionIcon />} sx={{ mb: 2 }}>
        <AlertTitle>取り込み手順</AlertTitle>
        ① Google フォームの回答をスプレッドシートから CSV
        でダウンロード → ② 下でファイルを選択し「プレビュー」で内容を確認 → ③
        問題なければ「取込を確定」。
        重複データは既定で<b>拒否</b>されます（意図的に上書きする場合のみ「上書き」を選択）。
      </Alert>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab icon={<CloudUploadIcon />} iconPosition="start" label="取り込み" />
        <Tab icon={<HistoryIcon />} iconPosition="start" label="取込履歴" />
        <Tab icon={<InsightsIcon />} iconPosition="start" label="事前事後分析" />
      </Tabs>

      {/* ─────────────── 取り込みタブ ─────────────── */}
      {tab === 0 && (
        <Stack spacing={2}>
          <Card variant="outlined">
            <CardHeader title="1. ファイルとオプション" />
            <CardContent>
              <Stack spacing={2}>
                <Box>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    hidden
                    onChange={(e) => onSelectFile(e.target.files?.[0] || null)}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    CSV ファイルを選択
                  </Button>
                  {file && (
                    <Chip
                      sx={{ ml: 2 }}
                      label={`${file.name} (${(file.size / 1024).toFixed(1)} KB)`}
                      onDelete={() => onSelectFile(null)}
                    />
                  )}
                </Box>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    select
                    label="文字コード"
                    size="small"
                    value={encoding}
                    onChange={(e) => setEncoding(e.target.value as Encoding)}
                    sx={{ minWidth: 180 }}
                    helperText="通常は自動判定で問題ありません"
                  >
                    <MenuItem value="auto">自動判定</MenuItem>
                    <MenuItem value="utf-8">UTF-8</MenuItem>
                    <MenuItem value="shift_jis">Shift_JIS</MenuItem>
                  </TextField>

                  <TextField
                    select
                    label="時点 (PHASE)"
                    size="small"
                    value={phase}
                    onChange={(e) => setPhase(e.target.value as PhaseOpt)}
                    sx={{ minWidth: 180 }}
                    helperText="CSVに時点列が無い場合に指定"
                  >
                    <MenuItem value="auto">CSVの値を使用</MenuItem>
                    <MenuItem value="pre">実習前 (pre)</MenuItem>
                    <MenuItem value="post">実習後 (post)</MenuItem>
                  </TextField>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      重複データの扱い
                    </Typography>
                    <ToggleButtonGroup
                      exclusive
                      size="small"
                      value={dup}
                      onChange={(_, v) => v && setDup(v)}
                      sx={{ display: "block", mt: 0.5 }}
                    >
                      <ToggleButton value="reject" color="primary">
                        拒否（既定）
                      </ToggleButton>
                      <ToggleButton value="overwrite" color="warning">
                        上書き
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    disabled={!file || busy}
                    onClick={doPreview}
                  >
                    プレビュー
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    disabled={!canCommit}
                    onClick={doCommit}
                  >
                    取込を確定
                  </Button>
                </Stack>
                {busy && <LinearProgress />}
              </Stack>
            </CardContent>
          </Card>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* プレビュー結果 */}
          {preview && (
            <Card variant="outlined">
              <CardHeader
                title="2. プレビュー結果（未取込）"
                subheader={`文字コード: ${preview.encoding} / 対応ヘッダ ${
                  Object.keys(preview.mapping).length
                } 列 / 未対応 ${preview.unmatched_columns.length} 列`}
              />
              <CardContent>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}
                >
                  <Chip label={`総行数 ${preview.summary.total}`} />
                  <Chip
                    color="success"
                    icon={<CheckCircleIcon />}
                    label={`成功見込 ${preview.summary.success}`}
                  />
                  <Chip
                    color={preview.summary.failed ? "error" : "default"}
                    icon={<ErrorOutlineIcon />}
                    label={`失敗 ${preview.summary.failed}`}
                  />
                </Stack>

                {preview.column_errors.length > 0 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <AlertTitle>列の検証エラー（取込できません）</AlertTitle>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {preview.column_errors.map((e, i) => (
                        <li key={i}>{e.message}</li>
                      ))}
                    </ul>
                  </Alert>
                )}

                {preview.unmatched_columns.length > 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <AlertTitle>
                      対応する項目が見つからなかった列（取込対象外）
                    </AlertTitle>
                    {preview.unmatched_columns.join(" , ")}
                  </Alert>
                )}

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>行</TableCell>
                        <TableCell>研究ID</TableCell>
                        <TableCell>時点</TableCell>
                        <TableCell>回答数</TableCell>
                        <TableCell>結果</TableCell>
                        <TableCell>備考</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {preview.rows.map((r) => (
                        <TableRow key={r.row_index}>
                          <TableCell>{r.row_index + 1}</TableCell>
                          <TableCell>{r.research_id || "―"}</TableCell>
                          <TableCell>{r.phase || "―"}</TableCell>
                          <TableCell>{r.response_count}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              color={r.ok ? "success" : "error"}
                              label={r.ok ? "OK" : "エラー"}
                            />
                          </TableCell>
                          <TableCell sx={{ color: "error.main" }}>
                            {r.errors.map((e) => e.message).join(" / ")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {preview.summary.total > preview.rows.length && (
                  <Typography variant="caption" color="text.secondary">
                    ※ 先頭 {preview.rows.length} 行のみ表示
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}

          {/* 取込結果 */}
          {commitResult && (
            <Card variant="outlined">
              <CardHeader
                title="3. 取込結果"
                subheader={`バッチ ID: ${commitResult.batch_id}`}
              />
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                  <Chip label={`総行数 ${commitResult.summary.total}`} />
                  <Chip color="success" label={`成功 ${commitResult.summary.success}`} />
                  <Chip
                    color={commitResult.summary.failed ? "error" : "default"}
                    label={`失敗 ${commitResult.summary.failed}`}
                  />
                  <Chip
                    color={commitResult.summary.skipped ? "warning" : "default"}
                    label={`スキップ ${commitResult.summary.skipped}`}
                  />
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      )}

      {/* ─────────────── 履歴タブ ─────────────── */}
      {tab === 1 && (
        <Card variant="outlined">
          <CardHeader title="取込履歴" />
          <CardContent>
            {batchesQuery.isLoading && <LinearProgress />}
            {batchesQuery.error && (
              <Alert severity="error">{String(batchesQuery.error)}</Alert>
            )}
            {batchesQuery.data && batchesQuery.data.batches.length === 0 && (
              <Typography color="text.secondary">取込履歴はまだありません。</Typography>
            )}
            {batchesQuery.data && batchesQuery.data.batches.length > 0 && (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>日時</TableCell>
                      <TableCell>ファイル名</TableCell>
                      <TableCell>時点</TableCell>
                      <TableCell>重複</TableCell>
                      <TableCell align="right">総</TableCell>
                      <TableCell align="right">成功</TableCell>
                      <TableCell align="right">失敗</TableCell>
                      <TableCell align="right">スキップ</TableCell>
                      <TableCell>状態</TableCell>
                      <TableCell>取込者</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {batchesQuery.data.batches.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>
                          {new Date(b.created_at).toLocaleString("ja-JP")}
                        </TableCell>
                        <TableCell>{b.filename}</TableCell>
                        <TableCell>{b.phase}</TableCell>
                        <TableCell>{b.duplicate_policy}</TableCell>
                        <TableCell align="right">{b.total_rows}</TableCell>
                        <TableCell align="right">{b.success_rows}</TableCell>
                        <TableCell align="right">{b.failed_rows}</TableCell>
                        <TableCell align="right">{b.skipped_rows}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={STATUS_COLOR[b.status] || "default"}
                            label={b.status}
                          />
                        </TableCell>
                        <TableCell>
                          {b.imported_by}
                          <br />
                          <Typography variant="caption" color="text.secondary">
                            {b.imported_role}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─────────────── 分析タブ ─────────────── */}
      {tab === 2 && (
        <Card variant="outlined">
          <CardHeader
            title="事前事後の突合分析"
            subheader="研究ID単位で pre/post 両方が揃った回答者のみ集計（逆転項目は補正済み）"
          />
          <CardContent>
            {analysisQuery.isLoading && <LinearProgress />}
            {analysisQuery.error && (
              <Alert severity="error">{String(analysisQuery.error)}</Alert>
            )}
            {analysisQuery.data && (
              <>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}
                >
                  <Chip label={`回答者 ${analysisQuery.data.respondent_count} 名`} />
                  <Chip
                    color="primary"
                    label={`事前事後突合 ${analysisQuery.data.paired_count} 名`}
                  />
                </Stack>
                {analysisQuery.data.paired.length === 0 ? (
                  <Typography color="text.secondary">
                    事前・事後の両方が揃った回答者がまだいません。
                  </Typography>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>研究ID</TableCell>
                          {analysisQuery.data.scales.map((s) => (
                            <TableCell key={s.key} align="center" colSpan={3}>
                              {s.label}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell />
                          {analysisQuery.data.scales.map((s) => (
                            <React.Fragment key={s.key}>
                              <TableCell align="right">事前</TableCell>
                              <TableCell align="right">事後</TableCell>
                              <TableCell align="right">差</TableCell>
                            </React.Fragment>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analysisQuery.data.paired.map((p) => (
                          <TableRow key={p.research_id}>
                            <TableCell>{p.research_id}</TableCell>
                            {analysisQuery.data!.scales.map((s) => {
                              const sc = p.scales[s.key];
                              const pre = sc?.pre;
                              const post = sc?.post;
                              const diff =
                                pre != null && post != null ? post - pre : null;
                              return (
                                <React.Fragment key={s.key}>
                                  <TableCell align="right">
                                    {pre != null ? pre.toFixed(2) : "―"}
                                  </TableCell>
                                  <TableCell align="right">
                                    {post != null ? post.toFixed(2) : "―"}
                                  </TableCell>
                                  <TableCell
                                    align="right"
                                    sx={{
                                      color:
                                        diff == null
                                          ? "text.disabled"
                                          : diff > 0
                                          ? "success.main"
                                          : diff < 0
                                          ? "error.main"
                                          : "text.secondary",
                                    }}
                                  >
                                    {diff != null
                                      ? (diff > 0 ? "+" : "") + diff.toFixed(2)
                                      : "―"}
                                  </TableCell>
                                </React.Fragment>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.secondary">
                  ※ 各セルは尺度合計項目の平均値（5件法, 逆転項目補正済み）。差 =
                  事後 − 事前。
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        message={toast || ""}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}
