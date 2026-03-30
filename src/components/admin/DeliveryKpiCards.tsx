import React from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';

export const DeliveryKpiCards = ({ summary }: { summary: any }) => {
  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography color="text.secondary" variant="caption">Total Notifications</Typography>
            <Typography variant="h5">{summary?.totalNotifications || 0}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography color="text.secondary" variant="caption">Success Rate</Typography>
            <Typography variant="h5" color={summary?.successRate > 90 ? 'success.main' : 'warning.main'}>
              {summary?.successRate?.toFixed(1) || 0}%
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography color="text.secondary" variant="caption">Bounce Rate</Typography>
            <Typography variant="h5" color={summary?.bounceRate > 5 ? 'error.main' : 'text.primary'}>
              {summary?.bounceRate?.toFixed(1) || 0}%
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography color="text.secondary" variant="caption">Resend / SendGrid Fail Rate</Typography>
            <Box display="flex" gap={1}>
              <Typography variant="h6">{summary?.providerFailureRate?.resend?.toFixed(1) || 0}%</Typography>
              <Typography variant="h6">/</Typography>
              <Typography variant="h6">{summary?.providerFailureRate?.sendgrid?.toFixed(1) || 0}%</Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography color="text.secondary" variant="caption">Escalation L3 Reach Rate</Typography>
            <Typography variant="h5" color={summary?.escalationReachRate?.l3 > 0 ? 'error.main' : 'text.primary'}>
              {summary?.escalationReachRate?.l3?.toFixed(1) || 0}%
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
