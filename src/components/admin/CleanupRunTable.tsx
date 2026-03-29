import React from 'react';
import { Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';
import { CleanupRunRow } from '../../types/adminMetrics';

type Props = {
  runs: CleanupRunRow[];
};

export const CleanupRunTable: React.FC<Props> = ({ runs }) => {
  const safeRuns = Array.isArray(runs) ? runs : [];

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Recent Cleanup Runs
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Cron</TableCell>
                <TableCell>Outcome</TableCell>
                <TableCell align="right">Tokens</TableCell>
                <TableCell align="right">Objects</TableCell>
                <TableCell align="right">Orphans</TableCell>
                <TableCell align="right">Errors</TableCell>
                <TableCell>Dry Run</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {safeRuns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">No recent runs</TableCell>
                </TableRow>
              )}
              {safeRuns.map((row) => (
                <TableRow key={row.id || Math.random()}>
                  <TableCell>{row.createdAt ? new Date(row.createdAt).toLocaleString() : ''}</TableCell>
                  <TableCell>{row.cron || 'manual'}</TableCell>
                  <TableCell>
                    {row.outcome === 'success' && <Chip label="Success" color="success" size="small" />}
                    {row.outcome === 'partial' && <Chip label="Partial" color="warning" size="small" />}
                    {row.outcome === 'failed' && <Chip label="Failed" color="error" size="small" />}
                    {row.outcome === 'warning' && <Chip label="Warning" color="warning" size="small" />}
                  </TableCell>
                  <TableCell align="right">{row.deletedTokens}</TableCell>
                  <TableCell align="right">{row.deletedObjects}</TableCell>
                  <TableCell align="right">{row.deletedOrphans}</TableCell>
                  <TableCell align="right" sx={{ color: row.errors > 0 ? 'error.main' : 'inherit' }}>
                    {row.errors}
                  </TableCell>
                  <TableCell>
                    {row.dryRun ? <Chip label="Dry Run" size="small" color="default" /> : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};
