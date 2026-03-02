import React from "react";
import { Box, Card, CardContent, Typography, Chip } from "@mui/material";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import mockApi from "../api/client";

export default function LpsDashboardPage() {
  const { data: lps = [] } = useQuery({ queryKey: ["lps"], queryFn: () => mockApi.getLpsData() });
  const latest = lps[lps.length - 1];

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>LPSダッシュボード</Typography>
      {latest && (
        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          {[
            { label: "最新LPS",   value: latest.lps.toFixed(2) },
            { label: "AI評価",    value: latest.ai_eval.toFixed(1) },
            { label: "自己評価",  value: latest.self_eval.toFixed(1) },
            { label: "成長率",    value: latest.growth_rate.toFixed(2) },
          ].map((s) => (
            <Card key={s.label} sx={{ flex: "1 1 150px" }}>
              <CardContent sx={{ p: "16px !important" }}>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                <Typography variant="h4" fontWeight="bold" color="primary">{s.value}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" mb={2}>LPS・AI評価・自己評価の推移</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lps} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="lps"       stroke="#1976D2" name="LPS"    strokeWidth={2} />
              <Line type="monotone" dataKey="ai_eval"   stroke="#388E3C" name="AI評価"  strokeWidth={2} />
              <Line type="monotone" dataKey="self_eval" stroke="#F57C00" name="自己評価" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
