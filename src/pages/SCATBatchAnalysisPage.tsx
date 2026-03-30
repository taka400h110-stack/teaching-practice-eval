import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import PlayArrow from '@mui/icons-material/PlayArrow';
import Refresh from '@mui/icons-material/Refresh';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

export const SCATBatchAnalysisPage: React.FC = () => {
  const [selectedJournals, setSelectedJournals] = useState<string[]>([]);
  
  // Mock data for now since we don't have the full journal fetching in place
  const mockJournals = [
    { id: '1', title: '第1回 教育実習日誌', student: '山田 太郎', date: '2023-05-10', status: 'unprocessed' },
    { id: '2', title: '第2回 教育実習日誌', student: '山田 太郎', date: '2023-05-17', status: 'processed' },
    { id: '3', title: '第1回 教育実習日誌', student: '佐藤 花子', date: '2023-05-10', status: 'error' },
  ];

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedJournals(mockJournals.map(j => j.id));
    } else {
      setSelectedJournals([]);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedJournals(prev => 
      prev.includes(id) ? prev.filter(j => j !== id) : [...prev, id]
    );
  };

  const batchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/api/external-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          job_type: 'scat-batch',
          dataset_type: 'scat_analysis',
          parameters: { journal_ids: selectedJournals }
        })
      });
      if (!res.ok) throw new Error("Batch analysis request failed");
      return res.json();
    },
    onSuccess: () => {
      alert('バッチ分析ジョブを開始しました');
      setSelectedJournals([]);
    },
    onError: (err) => {
      alert('エラーが発生しました: ' + String(err));
    }
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>SCAT一括分析 (SCAT Batch Analysis)</Typography>
      <Typography variant="body1" paragraph>
        複数の実習日誌に対してSCAT分析を一括で実行します。
      </Typography>

      {batchMutation.isPending && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>処理中... ジョブをキューに追加しています</Typography>
          <LinearProgress />
        </Box>
      )}

      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<PlayArrow />}
          disabled={selectedJournals.length === 0 || batchMutation.isPending}
          onClick={() => batchMutation.mutate()}
        >
          選択した日誌を分析 ({selectedJournals.length}件)
        </Button>
        <Button variant="outlined" startIcon={<Refresh />}>
          更新
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox 
                  checked={selectedJournals.length === mockJournals.length && mockJournals.length > 0}
                  indeterminate={selectedJournals.length > 0 && selectedJournals.length < mockJournals.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>日付</TableCell>
              <TableCell>学生</TableCell>
              <TableCell>タイトル</TableCell>
              <TableCell>ステータス</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mockJournals.map((journal) => (
              <TableRow key={journal.id} hover onClick={() => handleSelect(journal.id)} sx={{ cursor: 'pointer' }}>
                <TableCell padding="checkbox">
                  <Checkbox checked={selectedJournals.includes(journal.id)} />
                </TableCell>
                <TableCell>{journal.date}</TableCell>
                <TableCell>{journal.student}</TableCell>
                <TableCell>{journal.title}</TableCell>
                <TableCell>
                  {journal.status === 'processed' && <Chip label="分析済" color="success" size="small" />}
                  {journal.status === 'unprocessed' && <Chip label="未分析" color="default" size="small" />}
                  {journal.status === 'error' && <Chip label="エラー" color="error" size="small" />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default SCATBatchAnalysisPage;
