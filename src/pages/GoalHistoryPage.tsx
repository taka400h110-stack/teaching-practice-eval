import React from "react";
import { Box, Card, CardContent, Chip, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { useQuery } from "@tanstack/react-query";
import mockApi from "../api/client";

export default function GoalHistoryPage() {
  const { data: goals = [] } = useQuery({ queryKey: ["goals"], queryFn: () => mockApi.getGoalHistory() });

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>目標履歴</Typography>
      {goals.map((g) => (
        <Card key={g.id} sx={{ mb: 2, borderLeft: `4px solid ${g.achieved ? "#388E3C" : "#9E9E9E"}` }}>
          <CardContent sx={{ p: "12px 16px !important" }}>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              {g.achieved
                ? <CheckCircleIcon color="success" fontSize="small" />
                : <RadioButtonUncheckedIcon sx={{ color: "text.disabled" }} fontSize="small" />
              }
              <Typography variant="body1" sx={{ flex: 1 }}>{g.goal_text}</Typography>
              <Chip label={`Week ${g.week}`} size="small" variant="outlined" />
              {g.is_smart && <Chip label="SMART" size="small" color="primary" />}
              {g.achieved && <Chip label="達成" size="small" color="success" />}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {new Date(g.created_at).toLocaleDateString("ja-JP")}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
