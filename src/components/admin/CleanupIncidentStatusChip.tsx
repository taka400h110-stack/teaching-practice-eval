import React from 'react';
import Chip from '@mui/material/Chip';

interface Props {
  status?: string;
  provider?: string;
}

export const CleanupIncidentStatusChip: React.FC<Props> = ({ status, provider }) => {
  if (!status) return null;
  
  let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'default';
  
  if (status === 'resolved') color = 'success';
  else if (status === 'triggered') color = 'error';

  return (
    <Chip
      size="small"
      color={color}
      label={`Incident: ${provider || 'Unknown'} (${status})`}
      variant="outlined"
    />
  );
};
