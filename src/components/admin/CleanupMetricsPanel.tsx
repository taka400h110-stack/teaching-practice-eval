import React, { useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Button, ButtonGroup } from '@mui/material';
import { useCleanupMetrics } from '../../hooks/useCleanupMetrics';
import { CleanupKpiCards } from './CleanupKpiCards';
import { CleanupTrendChart } from './CleanupTrendChart';
import { CleanupRunTable } from './CleanupRunTable';
import { CleanupErrorTable } from './CleanupErrorTable';

export const CleanupMetricsPanel: React.FC = () => {
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const { data, isLoading, error, refetch } = useCleanupMetrics(range);

  if (isLoading) {
    return (
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={() => refetch()}>
            Retry
          </Button>
        }>
          Failed to load cleanup metrics.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2">
          Cleanup Metrics
        </Typography>
        <ButtonGroup size="small">
          <Button 
            variant={range === '7d' ? 'contained' : 'outlined'} 
            onClick={() => setRange('7d')}
          >
            7 Days
          </Button>
          <Button 
            variant={range === '30d' ? 'contained' : 'outlined'} 
            onClick={() => setRange('30d')}
          >
            30 Days
          </Button>
        </ButtonGroup>
      </Box>

      {data.summary.executions === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No cleanup executions found in the selected period.
        </Alert>
      ) : null}

      <CleanupKpiCards summary={data.summary} />
      <CleanupTrendChart data={data.dailySeries} />
      <CleanupRunTable runs={data.recentRuns} />
      <CleanupErrorTable errors={data.recentErrors} />
    </Box>
  );
};
