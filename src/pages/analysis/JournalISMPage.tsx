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
import { LoadingView, ErrorView } from "../../components/StateViews";

interface IsmResponse {
  scope: string;
  ids: string[];
  labels: string[];
  adjacency: number[][];
  reachability: number[][];
  levels: string[][];
  transmissionScore: number;
  nodeCount: number;
  edgeCount: number;
  sourceHash: string;
  computed_at: string | null;
}

interface AnalysisStateResponse {
  scope: string;
  state: {
    ism_dirty: number;
    ism_computed_at: string | null;
    scat_network_hash: string | null;
  };
}

export default function JournalISMPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const stateQ = useQuery<AnalysisStateResponse>({
    queryKey: ["analysis", "state"],
    queryFn: () => apiFetch("/api/data/analysis/state").then((r) => r.json()),
    refetchInterval: 30000,
  });

  const ismQ = useQuery<IsmResponse>({
    queryKey: ["analysis", "ism", "current"],
    queryFn: () => apiFetch("/api/data/analysis/ism/current").then((r) => r.json()),
  });

  const recompute = useMutation({
    mutationFn: () =>
      apiFetch("/api/data/analysis/recompute", { method: "POST" }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analysis"] });
    },
  });

  const dirty = stateQ.data?.state?.ism_dirty === 1;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        戻る
      </Button>

      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5" fontWeight="bold">
          ISM 構造化分析
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

      {ismQ.isLoading && <LoadingView label="ISM分析を読み込み中…" />}

      {ismQ.isError && (
        <ErrorView message="ISM分析の読み込みに失敗しました。" onRetry={() => void ismQ.refetch()} />
      )}

      {ismQ.data && (
        <>
          <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" useFlexGap>
            <SummaryCard label="ノード数" value={ismQ.data.nodeCount} />
            <SummaryCard label="エッジ数" value={ismQ.data.edgeCount} />
            <SummaryCard label="階層数" value={ismQ.data.levels.length} />
            <SummaryCard label="伝達係数 T" value={ismQ.data.transmissionScore.toFixed(3)} highlight />
          </Stack>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                有向グラフ (ISM 構造モデル)
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Warfield レベルごとに上位（Level 1）から下位へ配置し、隣接行列 A の関係を矢印で表します。
              </Typography>
              {ismQ.data.ids.length === 0 || ismQ.data.levels.length === 0 ? (
                <Alert severity="info" sx={{ mt: 1 }}>
                  表示できる構造がありません。SCAT 分析でテーマを入力してください。
                </Alert>
              ) : (
                <Box sx={{ overflowX: "auto", mt: 1 }}>
                  <IsmDirectedGraph
                    ids={ismQ.data.ids}
                    labels={ismQ.data.labels}
                    adjacency={ismQ.data.adjacency}
                    levels={ismQ.data.levels}
                  />
                </Box>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                階層構造 (Warfield レベル分割)
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Level 1 が最上位 (グラフの上端) で、下位レベルへ向かって依存・派生関係をなす。
              </Typography>
              {ismQ.data.levels.length === 0 ? (
                <Alert severity="info" sx={{ mt: 1 }}>
                  まだ SCAT データが不足しています。SCAT 分析でテーマを入力してください。
                </Alert>
              ) : (
                <Stack spacing={1.5} mt={2}>
                  {ismQ.data.levels.map((level, idx) => (
                    <Box key={idx}>
                      <Typography variant="caption" color="text.secondary">
                        Level {idx + 1} ({level.length} 要素)
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={0.5}>
                        {level.map((nodeId) => (
                          <Chip key={nodeId} label={nodeId} color="primary" variant="outlined" size="small" />
                        ))}
                      </Stack>
                      {idx < ismQ.data!.levels.length - 1 && <Divider sx={{ mt: 1.5 }} />}
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                隣接行列 A (SCAT 共起から派生)
              </Typography>
              {ismQ.data.ids.length === 0 ? (
                <Alert severity="info">ノードがありません。</Alert>
              ) : ismQ.data.ids.length > 30 ? (
                <Alert severity="info">
                  ノード数が多いため行列表示は省略しています ({ismQ.data.ids.length} ノード)
                </Alert>
              ) : (
                <Box sx={{ overflowX: "auto" }}>
                  <MatrixTable ids={ismQ.data.ids} matrix={ismQ.data.adjacency} />
                </Box>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                可到達行列 R (Warshall アルゴリズム)
              </Typography>
              {ismQ.data.ids.length === 0 ? (
                <Alert severity="info">ノードがありません。</Alert>
              ) : ismQ.data.ids.length > 30 ? (
                <Alert severity="info">
                  ノード数が多いため行列表示は省略しています ({ismQ.data.ids.length} ノード)
                </Alert>
              ) : (
                <Box sx={{ overflowX: "auto" }}>
                  <MatrixTable ids={ismQ.data.ids} matrix={ismQ.data.reachability} />
                </Box>
              )}
            </CardContent>
          </Card>

          <Typography variant="caption" color="text.secondary">
            最終計算: {ismQ.data.computed_at || "—"} / sourceHash: {ismQ.data.sourceHash.slice(0, 16)}…
          </Typography>
        </>
      )}
    </Box>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <Card variant="outlined" sx={{ minWidth: 140, borderColor: highlight ? "primary.main" : undefined }}>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={700} color={highlight ? "primary.main" : "text.primary"}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function IsmDirectedGraph({
  ids,
  labels,
  adjacency,
  levels,
}: {
  ids: string[];
  labels: string[];
  adjacency: number[][];
  levels: string[][];
}) {
  // ノードIDごとの表示ラベル
  const labelById = React.useMemo(() => {
    const m = new Map<string, string>();
    ids.forEach((id, i) => m.set(id, labels?.[i] ?? id));
    return m;
  }, [ids, labels]);

  // レイアウト定数
  const levelGapY = 120;
  const nodeW = 120;
  const nodeH = 44;
  const colGapX = 160;
  const marginX = 40;
  const marginY = 40;

  // 各ノードの座標を Warfield レベルに基づき決定（Level 1 = 上端）
  const positions = React.useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    levels.forEach((level, levelIdx) => {
      const count = level.length;
      level.forEach((nodeId, i) => {
        // 各レベルを水平方向に中央寄せで配置
        const x = marginX + nodeW / 2 + i * colGapX;
        const y = marginY + nodeH / 2 + levelIdx * levelGapY;
        m.set(nodeId, { x, y });
      });
    });
    return m;
  }, [levels]);

  const maxCols = Math.max(1, ...levels.map((l) => l.length));
  const width = marginX * 2 + (maxCols - 1) * colGapX + nodeW;
  const height = marginY * 2 + (levels.length - 1) * levelGapY + nodeH;

  // 隣接行列からエッジを抽出（自己ループは除外）
  const edges: { from: string; to: string }[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = 0; j < ids.length; j++) {
      if (i !== j && adjacency[i]?.[j]) {
        edges.push({ from: ids[i], to: ids[j] });
      }
    }
  }

  // 矩形の縁で線分を切り取り、矢印が枠に当たるようにする
  const trimToRect = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    halfW: number,
    halfH: number
  ) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (dx === 0 && dy === 0) return to;
    const scaleX = dx !== 0 ? halfW / Math.abs(dx) : Infinity;
    const scaleY = dy !== 0 ? halfH / Math.abs(dy) : Infinity;
    const t = Math.min(scaleX, scaleY);
    return { x: to.x - dx * t, y: to.y - dy * t };
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ maxWidth: "100%", height: "auto", minWidth: 320 }}
    >
      <defs>
        <marker
          id="ism-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
        </marker>
      </defs>

      {/* エッジ */}
      {edges.map((e, idx) => {
        const from = positions.get(e.from);
        const to = positions.get(e.to);
        if (!from || !to) return null;
        const start = trimToRect(to, from, nodeW / 2, nodeH / 2);
        const end = trimToRect(from, to, nodeW / 2, nodeH / 2);
        return (
          <line
            key={`ism-edge-${idx}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke="#64748b"
            strokeWidth={1.5}
            opacity={0.8}
            markerEnd="url(#ism-arrow)"
          />
        );
      })}

      {/* ノード */}
      {Array.from(positions.entries()).map(([nodeId, pos]) => {
        const label = labelById.get(nodeId) ?? nodeId;
        const display = label.length > 8 ? label.slice(0, 8) + "…" : label;
        return (
          <g key={`ism-node-${nodeId}`} transform={`translate(${pos.x}, ${pos.y})`}>
            <rect
              x={-nodeW / 2}
              y={-nodeH / 2}
              width={nodeW}
              height={nodeH}
              rx={8}
              fill="#1976d2"
              opacity={0.9}
            />
            <title>{label}</title>
            <text textAnchor="middle" dy=".35em" fill="white" fontSize={13} fontWeight={600}>
              {display}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function MatrixTable({ ids, matrix }: { ids: string[]; matrix: number[][] }) {
  return (
    <Table size="small" sx={{ "& td, & th": { p: 0.5, fontSize: 11, textAlign: "center", minWidth: 32 } }}>
      <TableHead>
        <TableRow>
          <TableCell />
          {ids.map((id) => (
            <TableCell key={id}>
              <Tooltip title={id}>
                <span>{id.length > 6 ? id.slice(0, 6) + "…" : id}</span>
              </Tooltip>
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {ids.map((rowId, i) => (
          <TableRow key={rowId}>
            <TableCell sx={{ fontWeight: 600, textAlign: "right !important" }}>
              <Tooltip title={rowId}>
                <span>{rowId.length > 6 ? rowId.slice(0, 6) + "…" : rowId}</span>
              </Tooltip>
            </TableCell>
            {ids.map((colId, j) => (
              <TableCell
                key={colId}
                sx={{
                  bgcolor: matrix[i][j] ? "primary.light" : "transparent",
                  color: matrix[i][j] ? "primary.contrastText" : "text.disabled",
                  fontWeight: matrix[i][j] ? 700 : 400,
                }}
              >
                {matrix[i][j] || ""}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
