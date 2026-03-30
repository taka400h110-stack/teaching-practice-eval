import React, { useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Select, MenuItem, FormControl, InputLabel, Button } from '@mui/material';
import Download from '@mui/icons-material/Download';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

export const SCATNetworkAnalysisPage: React.FC = () => {
  const [filterPeriod, setFilterPeriod] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['scatNetwork', filterPeriod],
    queryFn: async () => {
      const res = await apiFetch('/api/data/scat/network'); return res.json() as any;
    }
  });

  const graphData = data?.nodes?.length > 0 ? data : {
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

  const handleExportCSV = () => {
    const csvContent = "Source,Target,Weight\n" + 
      (graphData?.links || []).map((l: any) => `${l.source.id || l.source},${l.target.id || l.target},${l.val}`).join("\n");
    
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
          <CircularProgress />
        ) : (
          <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} data-testid="network-canvas">
             <Typography color="textSecondary">Network Visualization Area (Canvas Placeholder)</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default SCATNetworkAnalysisPage;
