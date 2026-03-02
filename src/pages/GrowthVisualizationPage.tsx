import React from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import mockApi from "../api/client";

const FACTOR_COLORS = ["#1976D2", "#388E3C", "#F57C00", "#7B1FA2"];

export default function GrowthVisualizationPage() {
  const { data: growth } = useQuery({ queryKey: ["growth"], queryFn: () => mockApi.getGrowthData() });

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>成長グラフ</Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" mb={2}>週別因子スコア推移</Typography>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={growth?.weekly_scores ?? []} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" label={{ value: "週", position: "insideBottom", offset: -5 }} />
              <YAxis domain={[1, 5]} label={{ value: "スコア", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Legend />
              {["factor1","factor2","factor3","factor4"].map((f, i) => (
                <Line key={f} type="monotone" dataKey={f} stroke={FACTOR_COLORS[i]} strokeWidth={2} dot={{ r: 4 }} name={`因子${i+1}`} />
              ))}
              <Line type="monotone" dataKey="total" stroke="#333" strokeWidth={2.5} strokeDasharray="5 5" name="総合" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
