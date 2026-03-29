import React from 'react';
import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';
import { useCleanupAlertEscalations } from '../../hooks/useCleanupAlertEscalations';

export const CleanupAlertEscalationTimeline = ({ fingerprint }: { fingerprint: string }) => {
  const { data: escalations, isLoading } = useCleanupAlertEscalations(fingerprint);

  if (isLoading) return <Typography variant="body2">Loading escalations...</Typography>;
  if (!escalations || escalations.length === 0) return <Typography variant="body2" color="text.secondary">No escalations triggered.</Typography>;

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>Escalation History</Typography>
      <List dense>
        {escalations.map((esc: any) => (
          <ListItem key={esc.id} divider>
            <ListItemText
              primary={`Level ${esc.level} - ${esc.status}`}
              secondary={
                <>
                  Triggered: {new Date(esc.triggered_at).toLocaleString()}<br/>
                  Reason: {esc.note}
                  {esc.resolved_at && <><br/>Resolved: {new Date(esc.resolved_at).toLocaleString()}</>}
                </>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};
