import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const DeliveryProviderFailureChart = ({ data }: { data: any[] }) => {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Provider Status Breakdown</Typography>
        <Box height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="provider" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="delivered" stackId="a" fill="#4caf50" name="Delivered" />
              <Bar dataKey="bounced" stackId="a" fill="#f44336" name="Bounced" />
              <Bar dataKey="dropped" stackId="a" fill="#ff9800" name="Dropped" />
              <Bar dataKey="complained" stackId="a" fill="#9c27b0" name="Complained" />
              <Bar dataKey="sent" stackId="a" fill="#2196f3" name="Sent (Unconfirmed)" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};
