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
  CircularProgress,
  LinearProgress,
  Divider,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../api/client";

interface TransmissionResponse {
  scope: string;
  score: number;
  nodeCount: number;
  edgeCount: number;
  levels: string[][];
  sourceHash: string;
  computed_at: string | null;
}

interface AnalysisStateResponse {
  scope: string;
  state: {
    transmission_dirty: number;
    transmission_computed_at: string | null;
    scat_network_hash: string | null;
  };
}

// 仕様: docs/analysis/transmission_spec.md §4 の解釈ガイドライン
const RANGES: Array<{ min: number; max: number; label: string; description: string; color: "error" | "warning" | "success" | "info" }> = [
  {
    min: 0.0,
    max: 0.1,
    label: "断片的",
    description: "要素が断片的で、構造化されていません。SCAT のテーマが点在しています。",
    color: "error",
  },
  {
    min: 0.1,
    max: 0.3,
    label: "部分的構造",
    description: "部分的に階層関係が見られます。一部のテーマ間に依存関係があります。",
    color: "warning",
  },
  {
    min: 0.3,
    max: 0.6,
    label: "体系的構造",
    description: "体系的な学習構造です。良質な省察に典型的なレンジです。",
    color: "success",
  },
  {
    min: 0.6,
    max: 1.0001,
    label: "強連結 / 鎖構造",
    description: "強い一方向の鎖構造または完全グラフに近い状態です。",
    color: "info",
  },
];

function rangeFor(t: number) {
  return RANGES.find((r) => t >= r.min && t < r.max) ?? RANGES[RANGES.length - 1];
}

export default function JournalTransmissionPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const stateQ = useQuery<AnalysisStateResponse>({
    queryKey: ["analysis", "state"],
    queryFn: () => apiFetch("/api/data/analysis/state").then((r) => r.json()),
    refetchInterval: 30000,
  });

  const tQ = useQuery<TransmissionResponse>({
    queryKey: ["analysis", "transmission", "current"],
    queryFn: () => apiFetch("/api/data/analysis/transmission/current").then((r) => r.json()),
  });

  const recompute = useMutation({
    mutationFn: () =>
      apiFetch("/api/data/analysis/recompute", { method: "POST" }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analysis"] });
    },
  });

  const dirty = stateQ.data?.state?.transmission_dirty === 1;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        戻る
      </Button>

      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5" fontWeight="bold">
          伝達係数 T
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
        伝達係数 <strong>T = (ΣR[i][j] − n) / (n × (n − 1))</strong> は、
        ISM の可到達行列から算出される 0〜1 のスカラー値です。
        高いほど学習要素間に到達関係 (上位 → 下位の依存) が広く張り巡らされていることを示します。
      </Alert>

      {tQ.isLoading && (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      )}

      {tQ.isError && (
        <Alert severity="error">
          読み込みに失敗しました: {String((tQ.error as any)?.message || "")}
        </Alert>
      )}

      {tQ.data && <TransmissionDisplay data={tQ.data} />}
    </Box>
  );
}

function TransmissionDisplay({ data }: { data: TransmissionResponse }) {
  const t = data.score ?? 0;
  const range = rangeFor(t);
  const pct = Math.max(0, Math.min(1, t)) * 100;
  const D_avg =
    data.levels.length > 0 && data.nodeCount > 0
      ? data.levels.reduce((sum, lv, idx) => sum + lv.length * (idx + 1), 0) / data.nodeCount
      : 0;
  const R_avg = data.nodeCount > 1 ? t * (data.nodeCount - 1) : 0;

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack alignItems="center" spacing={1}>
            <Typography variant="caption" color="text.secondary">
              現在の伝達係数
            </Typography>
            <Typography
              variant="h1"
              sx={{
                fontWeight: 800,
                fontSize: { xs: "4rem", md: "6rem" },
                lineHeight: 1,
                color: `${range.color}.main`,
              }}
            >
              {t.toFixed(3)}
            </Typography>
            <Chip color={range.color} label={range.label} sx={{ fontWeight: 700 }} />
          </Stack>

          <Box sx={{ mt: 4, px: 1 }}>
            <LinearProgress
              variant="determinate"
              value={pct}
              color={range.color}
              sx={{ height: 16, borderRadius: 1 }}
            />
            <Stack direction="row" justifyContent="space-between" mt={0.5}>
              <Typography variant="caption" color="text.secondary">0.0</Typography>
              <Typography variant="caption" color="text.secondary">0.3</Typography>
              <Typography variant="caption" color="text.secondary">0.6</Typography>
              <Typography variant="caption" color="text.secondary">1.0</Typography>
            </Stack>
          </Box>

          <Alert severity={range.color === "info" ? "info" : range.color} sx={{ mt: 3 }}>
            <strong>{range.label}</strong>: {range.description}
          </Alert>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            補助指標
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <MetricCard label="ノード数 n" value={data.nodeCount} />
            <MetricCard label="エッジ数" value={data.edgeCount} />
            <MetricCard label="階層数 L" value={data.levels.length} />
            <MetricCard label="平均階層深さ D̄" value={D_avg.toFixed(2)} />
            <MetricCard label="平均到達数 R̄" value={R_avg.toFixed(2)} />
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            解釈ガイドライン
          </Typography>
          <Stack spacing={1}>
            {RANGES.map((r, i) => {
              const isCurrent = r === range;
              return (
                <Box
                  key={i}
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    border: 1,
                    borderColor: isCurrent ? `${r.color}.main` : "divider",
                    bgcolor: isCurrent ? `${r.color}.50` : "transparent",
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Chip
                      size="small"
                      color={r.color}
                      label={`${r.min.toFixed(1)} – ${r.max >= 1 ? "1.0" : r.max.toFixed(1)}`}
                      sx={{ minWidth: 96, fontWeight: 700 }}
                    />
                    <Box flex={1}>
                      <Typography variant="subtitle2">{r.label}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {r.description}
                      </Typography>
                    </Box>
                    {isCurrent && (
                      <Chip size="small" color={r.color} label="現在" variant="filled" />
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Typography variant="caption" color="text.secondary">
            * 解釈レンジは実証データに基づき今後再キャリブレーションされる予定です
            (`docs/analysis/transmission_spec.md` §4)。
          </Typography>
        </CardContent>
      </Card>

      <Typography variant="caption" color="text.secondary">
        最終計算: {data.computed_at || "—"} / sourceHash:{" "}
        {data.sourceHash?.slice(0, 16) || "—"}…
      </Typography>
    </>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card variant="outlined" sx={{ minWidth: 140 }}>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={700}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}
