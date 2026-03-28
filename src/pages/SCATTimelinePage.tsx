import React, { useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Button } from '@mui/material';
import Download from '@mui/icons-material/Download';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

export const SCATTimelinePage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['scatTimeline'],
    queryFn: async () => {
      return apiFetch('/api/data/scat/network/timeline');
    }
  });

  // Mock timeline data if API returns empty
  const timelineData = data?.timeline?.length > 0 ? data.timeline : [
    { week: 'Week 1', '生徒指導': 10, '授業準備': 5, '時間管理': 20, '振り返り': 5, '教材研究': 8 },
    { week: 'Week 2', '生徒指導': 15, '授業準備': 10, '時間管理': 15, '振り返り': 12, '教材研究': 15 },
    { week: 'Week 3', '生徒指導': 18, '授業準備': 20, '時間管理': 10, '振り返り': 18, '教材研究': 22 },
    { week: 'Week 4', '生徒指導': 20, '授業準備': 25, '時間管理': 5, '振り返り': 25, '教材研究': 28 },
  ];

  const handleExportCSV = () => {
    if (!timelineData || timelineData.length === 0) return;
    
    const headers = Object.keys(timelineData[0]).join(',');
    const rows = timelineData.map((row: any) => Object.values(row).join(','));
    const csvContent = [headers, ...rows].join('\n');
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'scat_timeline.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ p: 3, height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" gutterBottom>SCATテーマ時系列推移 (Theme Timeline)</Typography>
      <Typography variant="body1" paragraph>
        実習期間中における各テーマ・構成概念の出現頻度の推移を可視化します。
      </Typography>

      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button 
          variant="outlined" 
          startIcon={<Download />}
          onClick={handleExportCSV}
        >
          CSVエクスポート
        </Button>
      </Box>

      <Paper sx={{ flexGrow: 1, p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {isLoading ? (
          <CircularProgress />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={timelineData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="生徒指導" stroke="#8884d8" activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="授業準備" stroke="#82ca9d" />
              <Line type="monotone" dataKey="時間管理" stroke="#ffc658" />
              <Line type="monotone" dataKey="振り返り" stroke="#ff7300" />
              <Line type="monotone" dataKey="教材研究" stroke="#e81e63" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Paper>
    </Box>
  );
};

export default SCATTimelinePage;
