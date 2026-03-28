import React from 'react';
import {  
  Drawer, Box, Typography, IconButton, Divider, Paper
 } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { ExportRequest } from '../../hooks/useExports';
import { ExportStatusBadge, AnonymizationBadge } from './ExportStatusBadge';

interface Props {
  request: ExportRequest | null;
  open: boolean;
  onClose: () => void;
}

export const ExportRequestDetailDrawer: React.FC<Props> = ({ request, open, onClose }) => {
  if (!request) return null;

  const renderField = (label: string, value: any) => (
    <Box>
      <Typography variant="caption" color="textSecondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
        {value || '-'}
      </Typography>
    </Box>
  );

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 500 } } }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Export Request Details</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      
      <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', gap: 1, alignItems: 'center' }}>
          <ExportStatusBadge status={request.status} />
          <AnonymizationBadge level={request.requested_anonymization_level} type={request.request_type} />
        </Box>

        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>Request Metadata</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            {renderField('Request ID', request.id)}
            {renderField('Created At', new Date(request.created_at).toLocaleString())}
            {renderField('Requester', `${request.requester_user_id} (${request.requester_role})`)}
            {renderField('Dataset Type', request.dataset_type)}
            {renderField('Scope Level', request.scope_level)}
            {request.student_id && renderField('Student ID', request.student_id)}
            {request.course_id && renderField('Course ID', request.course_id)}
            {request.cohort_id && renderField('Cohort ID', request.cohort_id)}
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>Purpose & Justification</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            {renderField('Purpose', request.purpose)}
            {renderField('Justification', request.justification)}
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>Approval & Export Info</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            {renderField('Approved At', request.approved_at ? new Date(request.approved_at).toLocaleString() : '-')}
            {renderField('Approved Anonymization', request.approved_anonymization_level)}
            {renderField('Rejection Reason', request.rejection_reason)}
            {renderField('Row Count', request.export_row_count)}
            {renderField('File Size (Bytes)', request.export_file_size_bytes)}
            {renderField('Downloads', `${request.current_download_count} / ${request.max_download_count}`)}
            {renderField('Last Downloaded', request.last_downloaded_at ? new Date(request.last_downloaded_at).toLocaleString() : '-')}
          </Box>
        </Paper>
      </Box>
    </Drawer>
  );
};
