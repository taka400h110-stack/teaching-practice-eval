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

  // 実データ取得: /api/data/journals + /api/data/scat/batch-status で分析状態を結合
  const { data: journalsList = [], refetch } = useQuery<any[]>({
    queryKey: ['scat-batch-journals'],
    queryFn: async () => {
      const [jRes, sRes] = await Promise.all([
        apiFetch('/api/data/journals'),
        apiFetch('/api/data/scat/batch-status'),
      ]);
      const jData: any = await jRes.json().catch(() => ({}));
      const sData: any = await sRes.json().catch(() => ({}));
      const statusMap: Record<string, string> = sData.statusMap || {};
      const journals = jData.journals || [];
      return journals.map((j: any) => ({
        id: j.id,
        title: j.title || `第${j.week_number}週 教育実習日誌`,
        student: j.student_name || j.student_id,
        date: j.entry_date,
        status: statusMap[j.id] || 'unprocessed',
      }));
    },
    refetchInterval: 0,
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedJournals(journalsList.map((j: any) => j.id));
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
      const res = await apiFetch('/api/data/scat/batch-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journal_ids: selectedJournals })
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      alert(`バッチ分析を実行しました: 成功 ${data.created || 0}件 / 既存 ${data.skipped || 0}件`);
      setSelectedJournals([]);
      refetch();
    },
    onError: () => {
      alert('バッチ分析に失敗しました');
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
        <Button variant="outlined" startIcon={<Refresh />} onClick={() => refetch()}>
          更新
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox 
                  checked={selectedJournals.length === journalsList.length && journalsList.length > 0}
                  indeterminate={selectedJournals.length > 0 && selectedJournals.length < journalsList.length}
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
            {journalsList.map((journal: any) => (
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
