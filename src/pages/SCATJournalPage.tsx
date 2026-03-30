import React from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Card, CardContent, Grid, Button, Divider } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import { useParams, useNavigate } from 'react-router-dom';
import DescriptionIcon from '@mui/icons-material/Description';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

export const SCATJournalPage: React.FC = () => {
  const { journalId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['scat-journal', journalId],
    queryFn: async () => {
      const res = await apiFetch(`/api/data/scat/journals/${journalId}`);
      if (!res.ok) throw new Error('Failed to fetch journal SCAT data');
      return res.json();
    }
  });

  const runScatMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/data/scat/journals/${journalId}/run`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to run SCAT');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scat-journal', journalId] });
      alert("SCAT分析を再実行しました");
    }
  });

  if (isLoading) return <Box p={3}><Typography>読み込み中...</Typography></Box>;
  if (error || !data?.success) return <Box p={3}><Typography color="error">データの取得に失敗しました</Typography></Box>;

  const { journal = null, segments = [], concepts = [], elements = [], newElements = [] } = data;

  return (
    <Box p={3}>
      <Button variant="outlined" onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        ← 戻る
      </Button>
      
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold" display="flex" alignItems="center" gap={1}>
          <DescriptionIcon color="primary" />
          日誌単票 SCAT分析
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<PlayArrowIcon />}
          onClick={() => runScatMutation.mutate()}
          disabled={runScatMutation.isPending}
        >
          {runScatMutation.isPending ? '実行中...' : 'SCAT再実行'}
        </Button>
      </Box>

      {journal && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold">日誌情報</Typography>
            <Typography variant="body2" color="text.secondary">学生ID: {journal.student_id}</Typography>
            <Typography variant="body2" color="text.secondary">第{journal.week_number}回 ({new Date(journal.entry_date).toLocaleDateString()})</Typography>
            <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {journal.content || "本文なし"}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>SCAT 抽出結果</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell>No.</TableCell>
                      <TableCell>セグメント</TableCell>
                      <TableCell>着目語句</TableCell>
                      <TableCell>言い換え</TableCell>
                      <TableCell>概念</TableCell>
                      <TableCell>テーマ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {segments.length === 0 ? (
                       <TableRow>
                         <TableCell colSpan={6} align="center">SCAT未実行またはデータがありません</TableCell>
                       </TableRow>
                    ) : (
                      segments.map((seg: any, idx: number) => {
                        const concept = concepts.find((c: any) => c.segment_id === seg.id) || {};
                        return (
                          <TableRow key={seg.id}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell sx={{ minWidth: 150 }}>{seg.segment_text}</TableCell>
                            <TableCell>{concept.code1}</TableCell>
                            <TableCell>{concept.code2}</TableCell>
                            <TableCell><strong>{concept.code3}</strong></TableCell>
                            <TableCell>{concept.code4}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>該当週で確認された学習要素</Typography>
              {elements.length === 0 ? (
                <Typography variant="body2" color="text.secondary">確認された要素はありません</Typography>
              ) : (
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {elements.map((el: any) => (
                    <Chip key={el.element_code} label={el.element_code} color="primary" />
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2} color="secondary">
                🎉 新規獲得した学習要素
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                このジャーナルで初めて「1」となった要素
              </Typography>
              {newElements.length === 0 ? (
                <Typography variant="body2" color="text.secondary">新規獲得要素はありません</Typography>
              ) : (
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {newElements.map((el: any) => (
                    <Chip key={el.element_code} label={el.element_code} color="secondary" />
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
