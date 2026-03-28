import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts';
import { CleanupDailyPoint } from '../../types/adminMetrics';

type Props = {
  data: CleanupDailyPoint[];
};

export const CleanupTrendChart: React.FC<Props> = ({ data }) => {
  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Cleanup Trends
        </Typography>
        <Box sx={{ width: '100%', height: 350 }}>
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
              <YAxis yAxisId="right" orientation="right" stroke="#ff7300" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="deletedTokens" stackId="a" fill="#8884d8" name="Tokens Deleted" />
              <Bar yAxisId="left" dataKey="deletedObjects" stackId="a" fill="#82ca9d" name="Objects Deleted" />
              <Bar yAxisId="left" dataKey="deletedOrphans" stackId="a" fill="#ffc658" name="Orphans Deleted" />
              <Line yAxisId="right" type="monotone" dataKey="executions" stroke="#ff7300" name="Executions" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="errors" stroke="#d32f2f" name="Errors" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};
