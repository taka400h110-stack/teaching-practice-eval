import React, { useState } from 'react';
import { Box, Typography, Paper, Select, MenuItem, FormControl, InputLabel, Button } from '@mui/material';
import Download from '@mui/icons-material/Download';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import { LoadingView } from '../components/StateViews';

export const SCATNetworkAnalysisPage: React.FC = () => {
  const [filterPeriod, setFilterPeriod] = useState('all');

  type ScatNetworkNode = { id: string; name: string; val: number };
  type ScatNetworkLink = { source: string; target: string; val: number };
  type ScatNetworkGraph = { nodes: ScatNetworkNode[]; links: ScatNetworkLink[] };

  const { data, isLoading } = useQuery<ScatNetworkGraph>({
    queryKey: ['scatNetwork', filterPeriod],
    queryFn: async () => {
      const res = await apiFetch('/api/data/scat/network');
      return (await res.json()) as ScatNetworkGraph;
    }
  });

  const graphData: ScatNetworkGraph = data?.nodes?.length ? data : {
    nodes: [
      { id: '1', name: '生徒指導', val: 20 },
      { id: '2', name: '授業準備', val: 15 },
      { id: '3', name: '時間管理', val: 10 },
      { id: '4', name: '振り返り', val: 12 },
      { id: '5', name: '教材研究', val: 18 }
    ],
    links: [
      { source: '1', target: '4', val: 2 },
      { source: '2', target: '5', val: 5 },
      { source: '2', target: '3', val: 1 },
      { source: '4', target: '2', val: 3 },
      { source: '5', target: '1', val: 2 }
    ]
  };

  // ノードを円周上に配置する位置マップ（id -> {x, y, 半径}）
  // 旧実装はノードIDが '1'〜'5' 前提のハードコードだったが、
  // 実データのIDは日本語のテーマ名なので動的レイアウトに変更。
  const posMap = React.useMemo(() => {
    const m = new Map<string, { x: number; y: number; r: number }>();
    const nodes = graphData.nodes;
    const n = nodes.length;
    const cx = 400, cy = 300;
    const layoutR = Math.min(240, 110 + n * 10);
    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / Math.max(n, 1) - Math.PI / 2;
      const r = Math.min(Math.max((Number(node.val) || 1) * 1.6, 18), 42);
      m.set(node.id, {
        x: cx + layoutR * Math.cos(angle),
        y: cy + layoutR * Math.sin(angle),
        r,
      });
    });
    return m;
  }, [graphData]);

  const handleExportCSV = () => {
    const csvContent = "Source,Target,Weight\n" + 
      graphData.links.map((l: any) => `${l.source.id || l.source},${l.target.id || l.target},${l.val}`).join("\n");
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'scat_network.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ p: 3, height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" gutterBottom>SCAT概念ネットワーク (Concept Network)</Typography>
      <Typography variant="body1" paragraph>
        Step4「テーマ・構成概念」の共起関係をネットワーク図で可視化します。
      </Typography>

      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>対象期間 (Period)</InputLabel>
          <Select
            value={filterPeriod}
            label="対象期間 (Period)"
            onChange={(e) => setFilterPeriod(e.target.value)}
          >
            <MenuItem value="all">全期間 (All time)</MenuItem>
            <MenuItem value="week1">第1週 (Week 1)</MenuItem>
            <MenuItem value="week2">第2週 (Week 2)</MenuItem>
            <MenuItem value="week3">第3週 (Week 3)</MenuItem>
          </Select>
        </FormControl>
        
        <Button 
          variant="outlined" 
          startIcon={<Download />}
          onClick={handleExportCSV}
        >
          CSVエクスポート
        </Button>
      </Box>

      <Paper sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
        {isLoading ? (
          <LoadingView label="概念ネットワークを読み込み中…" minHeight="100%" />
        ) : graphData.nodes.length === 0 ? (
          <Typography color="text.secondary">表示できる概念ノードがありません。</Typography>
        ) : (

          <Box sx={{ width: '100%', height: '100%', position: 'relative' }} data-testid="network-canvas">
            <svg width="100%" height="100%" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
              <defs>
                <marker
                  id="scat-arrow"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                </marker>
              </defs>

              {/* Edges */}
              {graphData.links.map((link: any, i: number) => {
                const sourceId = link.source?.id ?? link.source;
                const targetId = link.target?.id ?? link.target;
                const src = posMap.get(sourceId);
                const tgt = posMap.get(targetId);
                if (!src || !tgt) return null;

                // ノード半径ぶんだけ端点を内側に寄せて矢印が円に重ならないようにする
                const dx = tgt.x - src.x;
                const dy = tgt.y - src.y;
                const dist = Math.hypot(dx, dy) || 1;
                const ux = dx / dist;
                const uy = dy / dist;
                const x1 = src.x + ux * src.r;
                const y1 = src.y + uy * src.r;
                const x2 = tgt.x - ux * (tgt.r + 8);
                const y2 = tgt.y - uy * (tgt.r + 8);
                const strokeWidth = Math.min(Math.max(Number(link.val) || 1, 1), 6);

                return (
                  <line
                    key={`link-${i}`}
                    x1={x1} y1={y1}
                    x2={x2} y2={y2}
                    stroke="#94a3b8"
                    strokeWidth={strokeWidth}
                    opacity={0.7}
                    markerEnd="url(#scat-arrow)"
                  />
                );
              })}

              {/* Nodes */}
              {graphData.nodes.map((node: any) => {
                const pos = posMap.get(node.id);
                if (!pos) return null;
                const labelOffset = pos.r + 14;
                // ラベルは円の外側（中心に対して放射方向）に配置して重なりを避ける
                const below = pos.y >= 300;
                return (
                  <g key={`node-${node.id}`} transform={`translate(${pos.x}, ${pos.y})`}>
                    <circle r={pos.r} fill="#1976d2" opacity={0.85} />
                    <text
                      textAnchor="middle"
                      dy=".3em"
                      fill="white"
                      fontSize={11}
                      fontWeight="bold"
                    >
                      {Number(node.val) || ''}
                    </text>
                    <text
                      textAnchor="middle"
                      y={below ? labelOffset : -labelOffset}
                      dy={below ? '.7em' : '0'}
                      fill="#334155"
                      fontSize={12}
                      fontWeight={600}
                    >
                      {node.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </Box>

        )}
      </Paper>
    </Box>
  );
};

export default SCATNetworkAnalysisPage;
