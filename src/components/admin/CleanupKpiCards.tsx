import React from 'react';
import { Grid, Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { CleanupMetricsSummary } from '../../types/adminMetrics';

type Props = {
  summary: CleanupMetricsSummary;
};

export const CleanupKpiCards: React.FC<Props> = ({ summary }) => {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              実行回数
            </Typography>
            <Typography variant="h4">{summary.executions}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Deleted Total
            </Typography>
            <Typography variant="h4">{summary.deletedTotal}</Typography>
            <Typography variant="caption" color="textSecondary">
              トークン: {summary.deletedTokens} / オブジェクト: {summary.deletedObjects}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              エラー数
            </Typography>
            <Typography variant="h4" color={summary.errors > 0 ? "error" : "inherit"}>
              {summary.errors}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Last Run
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              {summary.lastRunAt ? new Date(summary.lastRunAt).toLocaleString() : 'N/A'}
            </Typography>
            {summary.lastRunOutcome === 'success' && <Chip label="Success" color="success" size="small" />}
            {summary.lastRunOutcome === 'partial' && <Chip label="Partial" color="warning" size="small" />}
            {summary.lastRunOutcome === 'failed' && <Chip label="Failed" color="error" size="small" />}
            {summary.lastRunOutcome === 'unknown' && <Chip label="Unknown" size="small" />}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
