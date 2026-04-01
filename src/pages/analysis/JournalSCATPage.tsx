import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Card, CardContent, CircularProgress, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';

export default function JournalSCATPage() {
  const { journalId } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['scat', journalId],
    queryFn: () => apiClient.get(`/api/data/scat/journals/${journalId}`)
  });

  if (isLoading) return <Box p={3}><CircularProgress /></Box>;
  if (error) return <Box p={3}><Alert severity="error">{(error as Error).message}</Alert></Box>;

  const { analysis, segments } = data || {};

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        戻る
      </Button>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Typography variant="h5" fontWeight="bold">
          SCAT分析結果
        </Typography>
        {analysis?.analysis_status === 'completed' && <Chip label="完了" color="success" size="small" />}
        {analysis?.analysis_status === 'processing' && <Chip label="実行中" color="warning" size="small" />}
        {analysis?.analysis_status === 'failed' && <Chip label="失敗" color="error" size="small" />}
      </Box>

      {!analysis ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" mb={2}>日誌ID: {journalId}</Typography>
            <Alert severity="info">
              データがありません（未分析）
            </Alert>
          </CardContent>
        </Card>
      ) : (
        <Box display="flex" flexDirection="column" gap={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>ストーリーライン</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{analysis.storyline || 'なし'}</Typography>
              <Box mt={2}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>理論的記述</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{analysis.theoretical_description || 'なし'}</Typography>
              </Box>
            </CardContent>
          </Card>

          <Typography variant="h6" fontWeight="bold">セグメント一覧</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>抽出テキスト (Raw Text)</TableCell>
                  <TableCell>Step 1 (着目語)</TableCell>
                  <TableCell>Step 2 (言い換え)</TableCell>
                  <TableCell>Step 3 (概念)</TableCell>
                  <TableCell>Step 4 (テーマ)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {segments && segments.length > 0 ? segments.map((seg: any, idx: number) => (
                  <TableRow key={seg.id || idx}>
                    <TableCell>{seg.segment_order}</TableCell>
                    <TableCell>{seg.raw_text}</TableCell>
                    <TableCell>{seg.step1_focus_words}</TableCell>
                    <TableCell>{seg.step2_outside_words}</TableCell>
                    <TableCell>{seg.step3_explanatory_words}</TableCell>
                    <TableCell>{seg.step4_theme_construct}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">セグメントデータがありません</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
}
