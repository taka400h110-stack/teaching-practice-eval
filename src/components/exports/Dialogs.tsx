import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, Button, 
  TextField, FormControl, InputLabel, Select, MenuItem, Typography
} from '@mui/material';
import { ExportRequest } from '../../hooks/useExports';

export const ApproveDialog: React.FC<{
  open: boolean;
  request: ExportRequest | null;
  onClose: () => void;
  onConfirm: (payload: any) => void;
}> = ({ open, request, onClose, onConfirm }) => {
  const [level, setLevel] = useState('pseudonymized');
  const [maxCount, setMaxCount] = useState(1);
  const [expiryHours, setExpiryHours] = useState(24);

  useEffect(() => {
    if (request) {
      setLevel(request.requested_anonymization_level);
      setMaxCount(request.request_type === 'raw_access' ? 1 : 5);
      setExpiryHours(request.request_type === 'raw_access' ? 24 : 168);
    }
  }, [request]);

  const handleSubmit = () => {
    onConfirm({
      approved_anonymization_level: level,
      max_download_count: maxCount,
      expires_in_hours: expiryHours
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Approve Export Request</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Approving request {request?.id.substring(0,8)}... for {request?.requester_user_id}.
        </Typography>
        
        <FormControl fullWidth>
          <InputLabel>Approved Anonymization Level</InputLabel>
          <Select value={level} label="Approved Anonymization Level" onChange={(e) => setLevel(e.target.value)}>
            <MenuItem value="aggregated">Aggregated</MenuItem>
            <MenuItem value="pseudonymized">Pseudonymized</MenuItem>
            <MenuItem value="raw">Raw (High Risk)</MenuItem>
          </Select>
        </FormControl>

        <TextField 
          label="Max Download Count" 
          type="number"
          value={maxCount}
          onChange={(e) => setMaxCount(parseInt(e.target.value) || 1)}
          inputProps={{ min: 1, max: 100 }}
          fullWidth
        />

        <TextField 
          label="Expiry Time (Hours)" 
          type="number"
          value={expiryHours}
          onChange={(e) => setExpiryHours(parseInt(e.target.value) || 24)}
          inputProps={{ min: 1, max: 720 }}
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="success">Approve</Button>
      </DialogActions>
    </Dialog>
  );
};

export const RejectDialog: React.FC<{
  open: boolean;
  request: ExportRequest | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}> = ({ open, request, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const handleSubmit = () => {
    onConfirm(reason);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Reject Export Request</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <TextField 
          label="Rejection Reason" 
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          fullWidth
          multiline
          rows={3}
          placeholder="Please provide a reason for rejecting this request"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="error" disabled={!reason.trim()}>
          Reject
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const RevokeDialog: React.FC<{
  open: boolean;
  request: ExportRequest | null;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ open, request, onClose, onConfirm }) => {
  const handleSubmit = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Revoke Export Request</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to revoke request {request?.id.substring(0,8)}...? 
          This will prevent any further downloads and invalidate existing tokens.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="secondary">
          Revoke
        </Button>
      </DialogActions>
    </Dialog>
  );
};
