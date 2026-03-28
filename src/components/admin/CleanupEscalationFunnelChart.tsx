import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const CleanupEscalationFunnelChart = ({ data }: { data: any }) => {
  const chartData = [
    { name: 'Total Alerts', value: data?.totalAlerts || 0 },
    { name: 'Reached L1', value: data?.reachedL1 || 0 },
    { name: 'Reached L2', value: data?.reachedL2 || 0 },
    { name: 'Reached L3', value: data?.reachedL3 || 0 }
  ];

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Escalation Funnel</Typography>
        <Box height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="value" fill="#1976d2" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};
