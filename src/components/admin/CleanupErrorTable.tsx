import React from 'react';
import { Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { CleanupErrorRow } from '../../types/adminMetrics';

type Props = {
  errors: CleanupErrorRow[];
};

export const CleanupErrorTable: React.FC<Props> = ({ errors }) => {
  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom color="error">
          Recent Cleanup Errors
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Resource Type</TableCell>
                <TableCell>Resource ID</TableCell>
                <TableCell>Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {errors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">No recent errors</TableCell>
                </TableRow>
              )}
              {errors.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{row.action}</TableCell>
                  <TableCell>{row.resourceType || '-'}</TableCell>
                  <TableCell>{row.resourceId || '-'}</TableCell>
                  <TableCell sx={{ color: 'error.main', wordBreak: 'break-word', maxWidth: 300 }}>
                    {row.reason || '-'}
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
