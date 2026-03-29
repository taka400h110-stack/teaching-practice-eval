import React from 'react';
import { Chip, ChipProps, Typography } from '@mui/material';
import { ExportRequestStatus } from '../../hooks/useExports';

export const ExportStatusBadge: React.FC<{ status: ExportRequestStatus }> = ({ status }) => {
  let color: ChipProps['color'] = 'default';
  let label = status.toUpperCase();

  switch (status) {
    case 'pending':
      color = 'warning';
      break;
    case 'approved':
      color = 'primary';
      break;
    case 'generated':
    case 'completed':
      color = 'success';
      break;
    case 'rejected':
      color = 'error';
      break;
    case 'expired':
      color = 'default';
      break;
    case 'revoked':
      color = 'secondary';
      break;
  }

  return (
    <Chip size="small" label={label} color={color} sx={{ fontWeight: 'bold' }} />
  );
};

export const AnonymizationBadge: React.FC<{ level: string, type?: string }> = ({ level, type }) => {
  if (level === 'raw' || type === 'raw_access') {
    return (
      <Chip size="small" label="RAW / HIGH RISK" color="error" sx={{ fontWeight: 'bold', backgroundColor: '#d32f2f', color: '#fff' }} />
    );
  }
  return (
    <Chip size="small" label={level.toUpperCase()} variant="outlined" />
  );
};
