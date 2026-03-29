import React from 'react';
import { Chip } from '@mui/material';

export const EmailDeliveryStatusChip = ({ status }: { status: string | null }) => {
  if (!status) return null;

  let color: any = 'default';
  if (status === 'sent') color = 'info';
  else if (status === 'delivered') color = 'success';
  else if (status === 'delivery_delayed') color = 'warning';
  else if (['bounced', 'dropped', 'complained'].includes(status)) color = 'error';

  return <Chip size="small" label={status} color={color} />;
};
