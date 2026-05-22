import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  Chip,
  Stack,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Tooltip,
  Divider,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../api/client";

interface SpResponse {
  scope: string;
  students: Array<{ id: string; name: string }>;
  problems: Array<{ id: string; label: string }>;
  matrix: number[][];
  studentScores: number[];
  problemScores: number[];
  studentCaution: number[];
  problemCaution: number[];
  sourceHash: string;
  computed_at: string | null;
}

interface AnalysisStateResponse {
  scope: string;
  state: {
    sp_dirty: number;
    sp_computed_at: string | null;
    scat_network_hash: string | null;
  };
}

export default function JournalSPTablePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const stateQ = useQuery<AnalysisStateResponse>({
    queryKey: ["analysis", "state"],
    queryFn: () => apiFetch("/api/data/analysis/state").then((r) => r.json()),
    refetchInterval: 30000,
  });

  const spQ = useQuery<SpResponse>({
    queryKey: ["analysis", "sp", "current"],
    queryFn: () => apiFetch("/api/data/analysis/sp-tables/current").then((r) => r.json()),
  });

  const recompute = useMutation({
    mutationFn: () =>
      apiFetch("/api/data/analysis/recompute", { method: "POST" }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analysis"] });
    },
  });

  const dirty = stateQ.data?.state?.sp_dirty === 1;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        戻る
      </Button>

      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5" fontWeight="bold">
          S-P 表分析
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {dirty && <Chip color="warning" size="small" label="⚠ 再計算待ち" />}
          {!dirty && <Chip color="success" size="small" label="✓ 最新" />}
          <Button
            startIcon={recompute.isPending ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={() => recompute.mutate()}
            disabled={recompute.isPending}
            variant="outlined"
            size="small"
          >
            今すぐ再計算
          </Button>
        </Stack>
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        列 = ISM 学習要素（テーマ）、行 = 学生。各学生の振り返り（日誌）に該当テーマが現れていれば 1、現れていなければ 0。
        右端の C* (注意係数) が高い学生は学習パターンが不安定、下端の C* が高い問題は学習要素として注意を要する可能性があります。
      </Alert>

      {spQ.isLoading && (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      )}

      {spQ.isError && (
        <Alert severity="error">
          読み込みに失敗しました: {String((spQ.error as any)?.message || "")}
        </Alert>
      )}

      {spQ.data && (
        <>
          <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" useFlexGap>
            <SummaryCard label="学生数 (n)" value={spQ.data.students.length} />
            <SummaryCard label="問題数 (m)" value={spQ.data.problems.length} />
            <SummaryCard
              label="1 セル合計"
              value={spQ.data.matrix.reduce(
                (s, row) => s + row.reduce((a, b) => a + b, 0),
                0,
              )}
            />
            <SummaryCard
              label="平均通過率"
              value={
                spQ.data.students.length === 0
                  ? "—"
                  : (
                      spQ.data.studentScores.reduce((a, b) => a + b, 0) /
                      spQ.data.students.length
                    ).toFixed(3)
              }
              highlight
            />
          </Stack>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                S-P 表 (Student × Problem)
              </Typography>

              {spQ.data.students.length === 0 || spQ.data.problems.length === 0 ? (
                <Alert severity="info">
                  学生または ISM 問題（テーマ）がまだありません。SCAT 分析を進めるとここに反映されます。
                </Alert>
              ) : (
                <Box sx={{ overflowX: "auto" }}>
                  <SPTable data={spQ.data} />
                </Box>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                注意係数 C* の解釈
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2">
                  ・<strong>0.00 〜 0.50</strong>: 安定した学習パターン
                </Typography>
                <Typography variant="body2">
                  ・<strong>0.50 〜 0.75</strong>: 注意 / 個別フォロー候補
                </Typography>
                <Typography variant="body2">
                  ・<strong>0.75 以上</strong>: 要注意 / 学習過程に乱れがある可能性
                </Typography>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <CautionSummary data={spQ.data} />
            </CardContent>
          </Card>

          <Typography variant="caption" color="text.secondary">
            最終計算: {spQ.data.computed_at || "—"} / sourceHash:{" "}
            {spQ.data.sourceHash?.slice(0, 16) || "—"}…
          </Typography>
        </>
      )}
    </Box>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <Card
      variant="outlined"
      sx={{ minWidth: 140, borderColor: highlight ? "primary.main" : undefined }}
    >
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography
          variant="h5"
          fontWeight={700}
          color={highlight ? "primary.main" : "text.primary"}
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function cautionColor(c: number): "success" | "warning" | "error" | "default" {
  if (c >= 0.75) return "error";
  if (c >= 0.5) return "warning";
  if (c >= 0.25) return "default";
  return "success";
}

function SPTable({ data }: { data: SpResponse }) {
  const { students, problems, matrix, studentScores, problemScores, studentCaution, problemCaution } =
    data;

  return (
    <Table
      size="small"
      sx={{
        "& td, & th": {
          p: 0.5,
          fontSize: 11,
          textAlign: "center",
          minWidth: 36,
          borderColor: "divider",
        },
      }}
    >
      <TableHead>
        <TableRow>
          <TableCell sx={{ position: "sticky", left: 0, bgcolor: "background.paper", zIndex: 2 }} />
          {problems.map((p) => (
            <TableCell key={p.id} sx={{ fontWeight: 600 }}>
              <Tooltip title={p.label || p.id}>
                <span>{(p.label || p.id).length > 6 ? (p.label || p.id).slice(0, 6) + "…" : p.label || p.id}</span>
              </Tooltip>
            </TableCell>
          ))}
          <TableCell sx={{ fontWeight: 700, bgcolor: "grey.100" }}>S_i</TableCell>
          <TableCell sx={{ fontWeight: 700, bgcolor: "grey.100" }}>C*_i</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {students.map((s, i) => (
          <TableRow key={s.id}>
            <TableCell
              sx={{
                position: "sticky",
                left: 0,
                bgcolor: "background.paper",
                zIndex: 1,
                fontWeight: 600,
                textAlign: "right !important",
                whiteSpace: "nowrap",
              }}
            >
              <Tooltip title={s.id}>
                <span>{s.name.length > 10 ? s.name.slice(0, 10) + "…" : s.name}</span>
              </Tooltip>
            </TableCell>
            {problems.map((p, j) => (
              <TableCell
                key={p.id}
                sx={{
                  bgcolor: matrix[i][j] ? "primary.light" : "transparent",
                  color: matrix[i][j] ? "primary.contrastText" : "text.disabled",
                  fontWeight: matrix[i][j] ? 700 : 400,
                }}
              >
                {matrix[i][j]}
              </TableCell>
            ))}
            <TableCell sx={{ fontWeight: 600, bgcolor: "grey.50" }}>
              {studentScores[i]?.toFixed(2) ?? "—"}
            </TableCell>
            <TableCell sx={{ bgcolor: "grey.50" }}>
              <Chip
                size="small"
                color={cautionColor(studentCaution[i] ?? 0)}
                label={(studentCaution[i] ?? 0).toFixed(2)}
                sx={{ fontSize: 10, height: 18 }}
              />
            </TableCell>
          </TableRow>
        ))}
        <TableRow sx={{ bgcolor: "grey.100" }}>
          <TableCell sx={{ fontWeight: 700, textAlign: "right !important" }}>P_j</TableCell>
          {problems.map((p, j) => (
            <TableCell key={p.id} sx={{ fontWeight: 600 }}>
              {problemScores[j]?.toFixed(2) ?? "—"}
            </TableCell>
          ))}
          <TableCell />
          <TableCell />
        </TableRow>
        <TableRow sx={{ bgcolor: "grey.100" }}>
          <TableCell sx={{ fontWeight: 700, textAlign: "right !important" }}>C*_j</TableCell>
          {problems.map((p, j) => (
            <TableCell key={p.id}>
              <Chip
                size="small"
                color={cautionColor(problemCaution[j] ?? 0)}
                label={(problemCaution[j] ?? 0).toFixed(2)}
                sx={{ fontSize: 10, height: 18 }}
              />
            </TableCell>
          ))}
          <TableCell />
          <TableCell />
        </TableRow>
      </TableBody>
    </Table>
  );
}

function CautionSummary({ data }: { data: SpResponse }) {
  const studentWarnings = data.students
    .map((s, i) => ({ name: s.name, caution: data.studentCaution[i] ?? 0 }))
    .filter((x) => x.caution >= 0.5)
    .sort((a, b) => b.caution - a.caution)
    .slice(0, 5);

  const problemWarnings = data.problems
    .map((p, j) => ({ label: p.label || p.id, caution: data.problemCaution[j] ?? 0 }))
    .filter((x) => x.caution >= 0.5)
    .sort((a, b) => b.caution - a.caution)
    .slice(0, 5);

  if (studentWarnings.length === 0 && problemWarnings.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        現在のデータでは C* ≥ 0.5 となる学生・問題はありません。
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      {studentWarnings.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            注意係数の高い学生 (上位 {studentWarnings.length})
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {studentWarnings.map((x, i) => (
              <Chip
                key={i}
                color={cautionColor(x.caution)}
                size="small"
                label={`${x.name}: ${x.caution.toFixed(2)}`}
              />
            ))}
          </Stack>
        </Box>
      )}
      {problemWarnings.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            注意係数の高い問題 (上位 {problemWarnings.length})
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {problemWarnings.map((x, i) => (
              <Chip
                key={i}
                color={cautionColor(x.caution)}
                size="small"
                label={`${x.label}: ${x.caution.toFixed(2)}`}
              />
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
