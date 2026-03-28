import React, { useState } from 'react';
import { Box, TextField, Button, Typography } from '@mui/material';
import { useCleanupAlertAssignee } from '../../hooks/useCleanupAlertAssignee';

export const CleanupAlertAssigneeSelect = ({ 
  fingerprint, 
  currentAssignee 
}: { 
  fingerprint: string;
  currentAssignee: string | null;
}) => {
  const [assignee, setAssignee] = useState(currentAssignee || '');
  const [isEditing, setIsEditing] = useState(false);
  const { assign } = useCleanupAlertAssignee(fingerprint);

  const handleSave = async () => {
    await assign.mutateAsync(assignee.trim() || null);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Assignee: <strong>{currentAssignee || 'Unassigned'}</strong>
        </Typography>
        <Button size="small" onClick={() => setIsEditing(true)}>Change</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <TextField 
        size="small" 
        placeholder="User ID..." 
        value={assignee}
        onChange={(e) => setAssignee(e.target.value)}
      />
      <Button size="small" variant="contained" onClick={handleSave} disabled={assign.isPending}>Save</Button>
      <Button size="small" onClick={() => { setAssignee(currentAssignee || ''); setIsEditing(false); }}>Cancel</Button>
    </Box>
  );
};
