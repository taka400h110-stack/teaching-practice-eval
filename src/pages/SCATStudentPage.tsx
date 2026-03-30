import React from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Card, CardContent, Grid, Button, Divider } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import { useParams, useNavigate } from 'react-router-dom';
import PersonIcon from '@mui/icons-material/Person';
import TimelineIcon from '@mui/icons-material/Timeline';

export const SCATStudentPage: React.FC = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['scat-student', studentId],
    queryFn: async () => {
      const res = await apiFetch(`/api/data/scat/students/${studentId}/trajectory`);
      if (!res.ok) throw new Error('Failed to fetch student SCAT trajectory');
      return res.json();
    }
  });

  if (isLoading) return <Box p={3}><Typography>読み込み中...</Typography></Box>;
  if (error || !data?.success) return <Box p={3}><Typography color="error">データの取得に失敗しました</Typography></Box>;

  const { journals = [], mastery = [], elements = [] } = data;

  return (
    <Box p={3}>
      <Button variant="outlined" onClick={() => navigate('/scat/class')} sx={{ mb: 2 }}>
        ← クラス全体へ戻る
      </Button>
      
      <Typography variant="h5" fontWeight="bold" mb={3} display="flex" alignItems="center" gap={1}>
        <PersonIcon color="primary" />
        学生別SCAT分析（{studentId}）
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2} display="flex" alignItems="center" gap={1}>
                <TimelineIcon color="action" />
                累積学習要素マスタリ
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell>コード</TableCell>
                      <TableCell>学習要素名</TableCell>
                      <TableCell align="center">状態</TableCell>
                      <TableCell>初出ジャーナル</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {elements.length === 0 ? (
                       <TableRow>
                         <TableCell colSpan={4} align="center">データがありません</TableCell>
                       </TableRow>
                    ) : (
                      elements.map((el: any) => {
                        const m = mastery.find((x: any) => x.element_code === el.element_code);
                        return (
                          <TableRow key={el.element_code}>
                            <TableCell>{el.element_code}</TableCell>
                            <TableCell>{el.label}</TableCell>
                            <TableCell align="center">
                              {m ? (
                                <Chip label="習得済" size="small" color="primary" />
                              ) : (
                                <Chip label="未確認" size="small" variant="outlined" />
                              )}
                            </TableCell>
                            <TableCell>
                              {m ? (
                                <Button size="small" onClick={() => navigate(`/scat/journals/${m.first_journal_id}`)}>
                                  第{m.first_week_number}回
                                </Button>
                              ) : '-'}
                            </TableCell>
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

        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>個別ISM構造図</Typography>
              <Box p={4} bgcolor="grey.100" borderRadius={1} textAlign="center">
                <Typography color="text.secondary">※ ここに当該学生の個別ISM構造図を描画します。</Typography>
              </Box>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>日誌一覧</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell>週</TableCell>
                      <TableCell>提出日</TableCell>
                      <TableCell align="center">詳細</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {journals.length === 0 ? (
                       <TableRow>
                         <TableCell colSpan={3} align="center">データがありません</TableCell>
                       </TableRow>
                    ) : (
                      journals.map((j: any) => (
                        <TableRow key={j.id}>
                          <TableCell>第{j.week_number}回</TableCell>
                          <TableCell>{new Date(j.entry_date).toLocaleDateString()}</TableCell>
                          <TableCell align="center">
                            <Button variant="contained" size="small" onClick={() => navigate(`/scat/journals/${j.id}`)}>
                              SCAT分析
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
