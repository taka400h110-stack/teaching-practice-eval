import React from 'react';
import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';
import { useCleanupAlertComments } from '../../hooks/useCleanupAlertComments';
import { CleanupAlertCommentComposer } from './CleanupAlertCommentComposer';

export const CleanupAlertCommentsList = ({ fingerprint }: { fingerprint: string }) => {
  const { data: comments, isLoading } = useCleanupAlertComments(fingerprint);

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom>Comments & Notes</Typography>
      
      {isLoading ? (
        <Typography variant="body2">Loading comments...</Typography>
      ) : (!Array.isArray(comments) || comments.length === 0) ? (
        <Typography variant="body2" color="text.secondary">No comments yet.</Typography>
      ) : (
        <List dense>
          {comments.map((c: any) => (
            <ListItem key={c.id} alignItems="flex-start" divider>
              <ListItemText
                primary={c.comment_text}
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    By {c.user_id} on {new Date(c.created_at).toLocaleString()}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      <CleanupAlertCommentComposer fingerprint={fingerprint} />
    </Box>
  );
};
