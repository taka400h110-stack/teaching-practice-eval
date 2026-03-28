import React, { useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Tabs, Tab } from '@mui/material';
import { 
  useExportRequests, useApproveExportRequest, useRejectExportRequest, useRevokeExportRequest 
} from '../hooks/useExports';
import { ExportRequestTable } from '../components/exports/ExportRequestTable';
import { ExportRequestDetailDrawer } from '../components/exports/ExportRequestDetailDrawer';
import { ApproveDialog, RejectDialog, RevokeDialog } from '../components/exports/Dialogs';
import { ExportRequest } from '../hooks/useExports';

export default function AdminExportsPage() {
  const { data: requests, isLoading, error } = useExportRequests();
  const approveReq = useApproveExportRequest();
  const rejectReq = useRejectExportRequest();
  const revokeReq = useRevokeExportRequest();

  const [tab, setTab] = useState(0);
  const [selectedReq, setSelectedReq] = useState<ExportRequest | null>(null);
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [actionError, setActionError] = useState('');

  const filteredRequests = (requests || []).filter(req => {
    if (tab === 0) return true; // All
    if (tab === 1) return req.status === 'pending';
    if (tab === 2) return req.status === 'approved' || req.status === 'generated' || req.status === 'completed';
    if (tab === 3) return req.status === 'rejected';
    if (tab === 4) return req.status === 'revoked' || req.status === 'expired';
    if (tab === 5) return req.request_type === 'raw_access';
    return true;
  });

  const handleActionError = (err: any) => {
    setActionError(err.message || 'Action failed');
  };

  const handleApprove = async (payload: any) => {
    setActionError('');
    if (selectedReq) {
      try {
        await approveReq.mutateAsync({ id: selectedReq.id, payload });
      } catch (err: any) {
        handleActionError(err);
      }
    }
  };

  const handleReject = async (reason: string) => {
    setActionError('');
    if (selectedReq) {
      try {
        await rejectReq.mutateAsync({ id: selectedReq.id, reason });
      } catch (err: any) {
        handleActionError(err);
      }
    }
  };

  const handleRevoke = async () => {
    setActionError('');
    if (selectedReq) {
      try {
        await revokeReq.mutateAsync(selectedReq.id);
      } catch (err: any) {
        handleActionError(err);
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Export Requests Administration</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }} variant="scrollable" scrollButtons="auto">
        <Tab label="All" />
        <Tab label="Pending" />
        <Tab label="Approved/Generated" />
        <Tab label="Rejected" />
        <Tab label="Revoked/Expired" />
        <Tab label="Raw Access Only" />
      </Tabs>

      {actionError && <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert>}

      {isLoading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">Failed to load export requests</Alert>
      ) : (
        <ExportRequestTable 
          requests={filteredRequests} 
          isAdmin={true}
          onView={(req) => { setSelectedReq(req); setDrawerOpen(true); }}
          onApprove={(req) => { setSelectedReq(req); setApproveOpen(true); }}
          onReject={(req) => { setSelectedReq(req); setRejectOpen(true); }}
          onRevoke={(req) => { setSelectedReq(req); setRevokeOpen(true); }}
        />
      )}

      <ExportRequestDetailDrawer 
        open={drawerOpen} 
        request={selectedReq} 
        onClose={() => setDrawerOpen(false)} 
      />

      <ApproveDialog 
        open={approveOpen} 
        request={selectedReq} 
        onClose={() => setApproveOpen(false)} 
        onConfirm={handleApprove}
      />

      <RejectDialog 
        open={rejectOpen} 
        request={selectedReq} 
        onClose={() => setRejectOpen(false)} 
        onConfirm={handleReject}
      />

      <RevokeDialog 
        open={revokeOpen} 
        request={selectedReq} 
        onClose={() => setRevokeOpen(false)} 
        onConfirm={handleRevoke}
      />
    </Box>
  );
}
