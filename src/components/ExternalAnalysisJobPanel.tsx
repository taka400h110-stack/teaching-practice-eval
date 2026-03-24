import React, { useState } from 'react';
import { Box, Typography, Button, Paper, Alert, CircularProgress, Chip } from '@mui/material';
import { apiFetch } from '../api/client';

export const ExternalAnalysisJobPanel = ({ jobType, title, description, datasetType }: { jobType: string, title: string, description: string, datasetType: string }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const handleCreateJob = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/external-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_type: jobType,
          dataset_type: datasetType,
          parameters: {}
        })
      });
      const data = (await res.json()) as any;
      if (data.success) {
        setJobId(data.job_id);
        setMessage(`Job Created Successfully. ID: ${data.job_id}`);
      } else {
        setMessage(`Failed: ${data.error}`);
      }
    } catch (e: any) {
      setMessage(`Error: ${e.message}`);
    }
    setLoading(false);
  };

  const handleDownloadDataset = () => {
    if (!jobId) return;
    // Mock download action
    window.open(`/api/external-jobs/${jobId}/download`, '_blank');
  };

  const handleImportMockResult = async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/external-jobs/${jobId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          result_summary: { note: 'This is a mocked result summary uploaded from external analysis.' }
        })
      });
      if ((res as any).success) {
        setMessage('Mock result imported successfully.');
      }
    } catch (e: any) {
      setMessage(`Import Error: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <Paper sx={{ p: 3, my: 2 }}>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      <Chip label={`External Analysis (${jobType})`} color="warning" size="small" sx={{ mb: 2 }} />
      <Typography variant="body2" sx={{ mb: 2 }}>
        {description}
      </Typography>
      
      {message && <Alert severity="info" sx={{ mb: 2 }}>{message}</Alert>}
      
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" color="primary" onClick={handleCreateJob} disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Create Analysis Job'}
        </Button>
        
        {jobId && (
          <>
            <Button variant="outlined" color="secondary" onClick={handleDownloadDataset}>
              Download Dataset & Dictionary
            </Button>
            <Button variant="outlined" color="success" onClick={handleImportMockResult} disabled={loading}>
              Import Result (Mock)
            </Button>
          </>
        )}
      </Box>

      <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Note: This system acts as an integration platform. The actual high-load computation (e.g., Mplus, R, Python) must be executed externally using the downloaded dataset. Once finished, upload the results back here.
        </Typography>
      </Box>
    </Paper>
  );
};
