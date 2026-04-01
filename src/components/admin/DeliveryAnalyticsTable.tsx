import React from 'react';
import { Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { EmailDeliveryStatusChip } from './EmailDeliveryStatusChip';

export const DeliveryAnalyticsTable = ({ failures }: { failures: any[] }) => {
  const safeFailures = Array.isArray(failures) ? failures : [];

  return (
    <Card variant="outlined" sx={{ mt: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>直近の配信失敗</Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Fingerprint</TableCell>
                <TableCell>Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {safeFailures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">No recent failures found</TableCell>
                </TableRow>
              ) : (
                safeFailures.map((f) => (
                  <TableRow key={f.id || Math.random()}>
                    <TableCell>{f.lastEventAt ? new Date(f.lastEventAt).toLocaleString() : ''}</TableCell>
                    <TableCell>{f.provider}</TableCell>
                    <TableCell><EmailDeliveryStatusChip status={f.deliveryStatus} /></TableCell>
                    <TableCell>{f.fingerprint?.substring(0, 8)}...</TableCell>
                    <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {f.reason}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};
