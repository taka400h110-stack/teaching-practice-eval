import React, { useState } from 'react';
import { Box, Typography, ToggleButton, ToggleButtonGroup, CircularProgress, Grid } from '@mui/material';
import { useDeliveryAnalytics } from '../../hooks/useDeliveryAnalytics';
import { AnalyticsRange } from '../../types/adminAnalytics';
import { DeliveryKpiCards } from './DeliveryKpiCards';
import { DeliveryProviderFailureChart } from './DeliveryProviderFailureChart';
import { DeliveryOutcomeTrendChart } from './DeliveryOutcomeTrendChart';
import { CleanupEscalationFunnelChart } from './CleanupEscalationFunnelChart';
import { DeliveryAnalyticsTable } from './DeliveryAnalyticsTable';

export const DeliveryAnalyticsPanel = () => {
  const [range, setRange] = useState<AnalyticsRange>('7d');
  const { data, isLoading, error } = useDeliveryAnalytics(range);

  const handleChange = (e: React.MouseEvent<HTMLElement>, newRange: AnalyticsRange | null) => {
    if (newRange) setRange(newRange);
  };

  if (error) {
    return <Typography color="error">Failed to load analytics data.</Typography>;
  }

  return (
    <Box sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Alert Delivery & Escalation Analytics</Typography>
        <ToggleButtonGroup
          value={range}
          exclusive
          onChange={handleChange}
          size="small"
        >
          <ToggleButton value="7d">7 Days</ToggleButton>
          <ToggleButton value="30d">30 Days</ToggleButton>
          <ToggleButton value="90d">90 Days</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {isLoading || !data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <DeliveryKpiCards summary={data.summary} />
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <DeliveryProviderFailureChart data={data.providerBreakdown} />
            </Grid>
            <Grid item xs={12} md={4}>
              <DeliveryOutcomeTrendChart data={data.dailySeries} />
            </Grid>
            <Grid item xs={12} md={4}>
              <CleanupEscalationFunnelChart data={data.escalationFunnel} />
            </Grid>
          </Grid>
          <DeliveryAnalyticsTable failures={data.recentFailures} />
        </>
      )}
    </Box>
  );
};
