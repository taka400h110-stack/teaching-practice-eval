import React from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { CleanupFailureAlertResponseWithAck } from '../../types/adminAlerts';
import { CleanupAlertCommentsList } from './CleanupAlertCommentsList';
import { CleanupAlertEscalationTimeline } from './CleanupAlertEscalationTimeline';
import { CleanupAlertAssigneeSelect } from './CleanupAlertAssigneeSelect';
import { EmailDeliveryStatusChip } from './EmailDeliveryStatusChip';
import { CleanupIncidentStatusChip } from './CleanupIncidentStatusChip';

interface Props {
  open: boolean;
  onClose: () => void;
  alert: CleanupFailureAlertResponseWithAck | null;
}

export const CleanupAlertDetailDrawer: React.FC<Props> = ({ open, onClose, alert }) => {
  if (!alert) return null;

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 500 }, p: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Alert Details</Typography>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>Status</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <EmailDeliveryStatusChip status="delivered" />
          <CleanupIncidentStatusChip status="triggered" provider="generic" />
        </Box>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>Assignee</Typography>
        <CleanupAlertAssigneeSelect fingerprint={alert.fingerprint} currentAssigneeId={alert.acknowledgment?.assigneeUserId || null} />
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>Escalation Timeline</Typography>
        <CleanupAlertEscalationTimeline fingerprint={alert.fingerprint} />
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>Comments</Typography>
        <CleanupAlertCommentsList fingerprint={alert.fingerprint} />
      </Box>

    </Drawer>
  );
};
