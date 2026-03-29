import React from 'react';
import { Chip } from '@mui/material';

export const CleanupAlertEscalationBadge = ({ level, status }: { level: number, status: string }) => {
  let color: any = 'default';
  let variant: any = 'outlined';
  
  if (status === 'active') {
    if (level === 1) color = 'warning';
    if (level === 2) { color = 'error'; variant = 'outlined'; }
    if (level >= 3) { color = 'error'; variant = 'filled'; }
  }

  return <Chip size="small" label={`L${level} Escalation (${status})`} color={color} variant={variant} />;
};
