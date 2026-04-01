import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Card, CardContent, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function JournalSPTablePage() {
  const { journalId } = useParams();
  const navigate = useNavigate();

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        戻る
      </Button>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        SP表分析結果
      </Typography>
      <Card>
        <CardContent>
          <Typography color="text.secondary">日誌ID: {journalId}</Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            データがありません（未実行）
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
}
