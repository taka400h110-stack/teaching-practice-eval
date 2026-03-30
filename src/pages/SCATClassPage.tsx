import React from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Card, CardContent, Grid, Button } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import { useNavigate } from 'react-router-dom';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

export const SCATClassPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['scat-class'],
    queryFn: async () => {
      const res = await apiFetch('/api/data/scat/class');
      if (!res.ok) throw new Error('Failed to fetch class SCAT data');
      return res.json();
    }
  });

  if (isLoading) return <Box p={3}><Typography>読み込み中...</Typography></Box>;
  if (error || !data?.success) return <Box p={3}><Typography color="error">データの取得に失敗しました</Typography></Box>;

  const { spTable = [], sortedElements = [], transmissionCoefficients = [] } = data;

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={3} display="flex" alignItems="center" gap={1}>
        <AutoAwesomeIcon color="primary" />
        クラス全体分析（SCAT / SP表 / ISM）
      </Typography>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>S-P表（生徒 × 学習要素）</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                ※ 行：要素獲得数の多い生徒順 / 列：獲得生徒数の多い要素順
              </Typography>
              
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell><strong>学生</strong></TableCell>
                      <TableCell align="center"><strong>獲得数</strong></TableCell>
                      {sortedElements.map((el: any) => (
                        <TableCell key={el.element_code} align="center" title={el.label}>
                          <Typography variant="caption" fontWeight="bold">
                            {el.element_code}
                          </Typography>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {spTable.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={sortedElements.length + 2} align="center">
                          データがありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      spTable.map((row: any) => (
                        <TableRow key={row.studentId}>
                          <TableCell>
                            <Button 
                              variant="text" 
                              size="small" 
                              onClick={() => navigate(`/scat/students/${row.studentId}`)}
                            >
                              {row.studentName || row.studentId}
                            </Button>
                          </TableCell>
                          <TableCell align="center">{row.masteredCount}</TableCell>
                          {sortedElements.map((el: any) => {
                            const isMastered = row.elements?.includes(el.element_code);
                            return (
                              <TableCell key={el.element_code} align="center">
                                {isMastered ? (
                                  <Chip label="1" size="small" color="primary" sx={{ width: 24, height: 24, '.MuiChip-label': { px: 1 } }} />
                                ) : (
                                  <Chip label="0" size="small" variant="outlined" sx={{ width: 24, height: 24, '.MuiChip-label': { px: 1 }, color: 'text.disabled', borderColor: 'grey.300' }} />
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))
                    )}
                    {/* 合計行 */}
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell colSpan={2} align="right"><strong>要素別獲得数</strong></TableCell>
                      {sortedElements.map((el: any) => (
                        <TableCell key={el.element_code} align="center">
                          <strong>{el.count}</strong>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>伝達係数・構造型一覧</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell>学生</TableCell>
                      <TableCell align="right">伝達係数</TableCell>
                      <TableCell align="center">構造型</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transmissionCoefficients.length === 0 ? (
                       <TableRow>
                         <TableCell colSpan={3} align="center">データがありません</TableCell>
                       </TableRow>
                    ) : (
                      transmissionCoefficients.map((tc: any) => (
                        <TableRow key={tc.studentId}>
                          <TableCell>{tc.studentName || tc.studentId}</TableCell>
                          <TableCell align="right">{(tc.coefficient ?? 0).toFixed(2)}</TableCell>
                          <TableCell align="center">
                            <Chip size="small" label={tc.type || 'N/A'} color="secondary" variant="outlined" />
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

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>クラス版 ISM構造図</Typography>
              <Box p={4} bgcolor="grey.100" borderRadius={1} textAlign="center">
                <Typography color="text.secondary">※ ここにグラフライブラリ（mermaid等）を用いたISM構造図を描画します。</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Box>
  );
};
