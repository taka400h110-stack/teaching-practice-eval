import React, { useState } from 'react';
import { Box, Typography, Button, CircularProgress, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { 
  useExportRequests, useGenerateExport, useIssueDownloadToken 
} from '../hooks/useExports';
import { ExportRequestTable } from '../components/exports/ExportRequestTable';
import { ExportRequestForm } from '../components/exports/ExportRequestForm';
import { ExportRequestDetailDrawer } from '../components/exports/ExportRequestDetailDrawer';
import { ExportRequest } from '../hooks/useExports';

export default function ExportsPage() {
  const { data: requests, isLoading, error } = useExportRequests();
  const generateExport = useGenerateExport();
  const issueToken = useIssueDownloadToken();
  
  const [showForm, setShowForm] = useState(false);
  const [selectedReq, setSelectedReq] = useState<ExportRequest | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionError, setActionError] = useState('');

  const handleView = (req: ExportRequest) => {
    setSelectedReq(req);
    setDrawerOpen(true);
  };

  const handleGenerate = async (req: ExportRequest) => {
    setActionError('');
    try {
      await generateExport.mutateAsync(req.id);
    } catch (err: any) {
      setActionError(err.message || 'Failed to generate export');
    }
  };

  const handleDownload = async (req: ExportRequest) => {
    setActionError('');
    try {
      const { token } = await issueToken.mutateAsync(req.id) as any;
      if (token) {
        // Create an iframe or link to trigger download
        const a = document.createElement('a');
        a.href = `/api/data/exports/download/${token}`;
        a.download = `export-${req.id}.json`; // Or whatever
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to download export');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Data Exports</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'New Export'}
        </Button>
      </Box>

      {actionError && <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert>}
      
      {showForm && (
        <ExportRequestForm onSuccess={() => setShowForm(false)} />
      )}

      {isLoading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">Failed to load export requests</Alert>
      ) : (
        <ExportRequestTable 
          requests={requests || []} 
          isAdmin={false}
          onView={handleView}
          onGenerate={handleGenerate}
          onDownload={handleDownload}
        />
      )}

      <ExportRequestDetailDrawer 
        open={drawerOpen} 
        request={selectedReq} 
        onClose={() => setDrawerOpen(false)} 
      />
    </Box>
  );
}
