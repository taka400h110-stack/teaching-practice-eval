import React, { useState } from 'react';
import { Box, TextField, Button } from '@mui/material';
import { useCleanupAlertComments } from '../../hooks/useCleanupAlertComments';

export const CleanupAlertCommentComposer = ({ fingerprint }: { fingerprint: string }) => {
  const [comment, setComment] = useState('');
  const { addComment } = useCleanupAlertComments(fingerprint);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    await addComment.mutateAsync(comment);
    setComment('');
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, display: 'flex', gap: 1 }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Add a note or comment..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        multiline
        maxRows={4}
      />
      <Button 
        type="submit" 
        variant="contained" 
        disabled={!comment.trim() || addComment.isPending}
      >
        Send
      </Button>
    </Box>
  );
};
