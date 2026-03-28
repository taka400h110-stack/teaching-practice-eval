
import React, { useState, useEffect } from 'react';
import { Alert, AlertTitle, Button, Box, Typography, Collapse, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, Stack } from '@mui/material';
import { CleanupFailureAlertResponseWithAck } from '../../types/adminAlerts';
import { useDismissedAlerts } from '../../hooks/useDismissedAlerts';
import { dismissCleanupFailureAlert, acknowledgeCleanupFailureAlert } from '../../api/client';
import { CleanupAlertAssigneeSelect } from './CleanupAlertAssigneeSelect';
import { CleanupAlertEscalationTimeline } from './CleanupAlertEscalationTimeline';
import { CleanupAlertEscalationBadge } from './CleanupAlertEscalationBadge';
import { CleanupAlertCommentsList } from './CleanupAlertCommentsList';
import { useCleanupAlertEscalations } from '../../hooks/useCleanupAlertEscalations';
import { useQueryClient } from '@tanstack/react-query';

export type CleanupFailureAlertBannerProps = {
  alert: CleanupFailureAlertResponseWithAck;
  adminUserId: string;
};

export const CleanupFailureAlertBanner: React.FC<CleanupFailureAlertBannerProps> = ({ alert, adminUserId }) => {
  const { getDismissedFingerprint, dismissFingerprint } = useDismissedAlerts(adminUserId);
  const [open, setOpen] = useState(false);
  
  const [ackDialogOpen, setAckDialogOpen] = useState(false);
  const [ackNote, setAckNote] = useState("");
  const [ackTargetStatus, setAckTargetStatus] = useState<"acknowledged" | "investigating" | "resolved" | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const queryClient = useQueryClient();
  const { data: escalations } = useCleanupAlertEscalations(alert.fingerprint);
  const latestEscalation = escalations && escalations.length > 0 ? escalations[0] : null;

  useEffect(() => {
    if (alert.hasAlert && alert.fingerprint) {
      if (!alert.dismissed) {
        const localDismissed = getDismissedFingerprint();
        if (localDismissed !== alert.fingerprint) {
          setOpen(true);
        } else {
          setOpen(false);
        }
      } else {
        setOpen(false);
      }
    } else {
      setOpen(false);
    }
  }, [alert.hasAlert, alert.fingerprint, alert.dismissed, getDismissedFingerprint]);

  if (!alert.hasAlert || alert.severity === 'none') {
    return null;
  }

  const handleDismiss = async () => {
    if (alert.fingerprint) {
      dismissFingerprint(alert.fingerprint);
      setOpen(false);
      try {
        await dismissCleanupFailureAlert(alert.fingerprint);
        queryClient.invalidateQueries({ queryKey: ["admin", "cleanupFailureAlert"] });
      } catch (e) {
        console.error("Failed to dismiss alert on server", e);
      }
    }
  };

  const handleOpenAck = (status: "acknowledged" | "investigating" | "resolved") => {
    setAckTargetStatus(status);
    setAckNote(alert.acknowledgment?.note || "");
    setAckDialogOpen(true);
  };

  const handleSubmitAck = async () => {
    if (alert.fingerprint && ackTargetStatus) {
      try {
        await acknowledgeCleanupFailureAlert(alert.fingerprint, ackTargetStatus, ackNote);
        queryClient.invalidateQueries({ queryKey: ["admin", "cleanupFailureAlert"] });
      } catch (e) {
        console.error("Failed to acknowledge alert", e);
      }
    }
    setAckDialogOpen(false);
  };

  const formattedDate = alert.lastErrorAt ? new Date(alert.lastErrorAt).toLocaleString() : 'N/A';
  const topReason = alert.topReasons?.[0]?.reason ?? 'unknown';

  const getStatusColor = (status: string | null) => {
    switch(status) {
      case 'acknowledged': return 'primary';
      case 'investigating': return 'warning';
      case 'resolved': return 'success';
      default: return 'default';
    }
  };

  return (
    <Collapse in={open}>
      <Box sx={{ mb: 3 }}>
        <Alert 
          severity={alert.severity === 'critical' ? 'error' : 'warning'}
          action={
            <Button color="inherit" size="small" onClick={handleDismiss}>
              Dismiss
            </Button>
          }
        >
          <AlertTitle>
            <Stack direction="row" spacing={2} alignItems="center">
              {latestEscalation && (
                <CleanupAlertEscalationBadge level={latestEscalation.level} status={latestEscalation.status} />
              )}
              <span>Cleanup failures detected in the last {alert.rangeHours} hours</span>
              {alert.acknowledgment?.exists && alert.acknowledgment.status && (
                <Chip 
                  label={alert.acknowledgment.status} 
                  color={getStatusColor(alert.acknowledgment.status) as any}
                  size="small" 
                />
              )}
            </Stack>
          </AlertTitle>
          <Typography variant="body2" gutterBottom>
            直近{alert.rangeHours}時間で cleanup 処理に <strong>{alert.errorCount}</strong> 件のエラーが記録されています。
            最後の失敗は {formattedDate} です。
          </Typography>
          <Typography variant="body2" gutterBottom>
            主な原因: <strong>{topReason}</strong>
          </Typography>
          {alert.latestRunOutcome === 'failed' && (
            <Typography variant="body2" color="error.main" fontWeight="bold">
              最新の cleanup run が失敗しました。
            </Typography>
          )}

          {alert.acknowledgment?.exists && (
            <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
              <Typography variant="caption" display="block">
                Acknowledged by {alert.acknowledgment.acknowledgedByUserId} at {new Date(alert.acknowledgment.acknowledgedAt!).toLocaleString()}
              </Typography>
              {alert.acknowledgment.note && (
                <Typography variant="caption" display="block">
                  Note: {alert.acknowledgment.note}
                </Typography>
              )}
            </Box>
          )}

          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button size="small" variant="outlined" color="inherit" href={alert.detailUrl}>
              詳細を見る
            </Button>
            <Button size="small" variant="outlined" color="inherit" onClick={() => setShowDetails(!showDetails)}>
              {showDetails ? 'Hide Details' : 'Show History & Comments'}
            </Button>
            <Button size="small" variant="contained" color="primary" onClick={() => handleOpenAck("acknowledged")}>
              Ack
            </Button>
            <Button size="small" variant="contained" color="warning" onClick={() => handleOpenAck("investigating")}>
              Investigate
            </Button>
            <Button size="small" variant="contained" color="success" onClick={() => handleOpenAck("resolved")}>
              Resolve
            </Button>
          </Stack>
        </Alert>

        <Dialog open={ackDialogOpen} onClose={() => setAckDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Acknowledge Alert ({ackTargetStatus})</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Note (optional)"
              type="text"
              fullWidth
              multiline
              rows={3}
              value={ackNote}
              onChange={(e) => setAckNote(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAckDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitAck} variant="contained" color={getStatusColor(ackTargetStatus) as any}>
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Collapse>
  );
};
