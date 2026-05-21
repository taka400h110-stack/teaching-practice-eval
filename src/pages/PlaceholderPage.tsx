import React from "react";
import { Box, Card, CardContent, Typography, Stack } from "@mui/material";
import ConstructionIcon from "@mui/icons-material/Construction";

interface Props {
  title: string;
  description?: string;
}

/**
 * 共通の「準備中」プレースホルダ。
 * /notifications/settings や /settings など、まだ実装されていない機能ページに使用する。
 */
export default function PlaceholderPage({ title, description }: Props) {
  return (
    <Box p={3} maxWidth={720} mx="auto">
      <Typography variant="h5" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Card variant="outlined" sx={{ mt: 2, borderStyle: "dashed" }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <ConstructionIcon color="warning" sx={{ fontSize: 48 }} />
            <Box>
              <Typography variant="h6" gutterBottom>
                準備中
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {description || "この機能は現在開発中です。今後のリリースで実装予定です。"}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
