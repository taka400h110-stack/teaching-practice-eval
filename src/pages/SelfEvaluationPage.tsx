import React from "react";
import { Box, Card, CardContent, Typography, LinearProgress } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import mockApi from "../api/client";

export default function SelfEvaluationPage() {
  const { data: evals = [] } = useQuery({ queryKey: ["self-evals"], queryFn: () => mockApi.getSelfEvaluations() });
  const latest = evals[evals.length - 1];

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>自己評価</Typography>
      {latest && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>Week {latest.week} 自己評価スコア</Typography>
            {(["factor1","factor2","factor3","factor4"] as const).map((f, i) => (
              <Box key={f} mb={2}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2">因子{i+1}</Typography>
                  <Typography variant="body2" fontWeight="bold">{latest[f].toFixed(1)} / 5.0</Typography>
                </Box>
                <LinearProgress variant="determinate" value={(latest[f] / 5) * 100} sx={{ height: 8, borderRadius: 4 }} />
              </Box>
            ))}
            <Typography variant="h5" color="primary" fontWeight="bold" mt={2}>総合: {latest.total.toFixed(2)}</Typography>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" mb={2}>週別推移</Typography>
          {evals.map((e) => (
            <Box key={e.id} sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
              <Typography variant="body2" sx={{ minWidth: 60 }}>Week {e.week}</Typography>
              <LinearProgress variant="determinate" value={(e.total / 5) * 100} sx={{ flex: 1, height: 6, borderRadius: 3 }} />
              <Typography variant="body2" sx={{ minWidth: 40 }}>{e.total.toFixed(2)}</Typography>
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
}
