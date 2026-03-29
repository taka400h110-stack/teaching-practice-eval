import React, { useState } from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, Button, Box, IconButton, Tooltip 
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import BlockIcon from '@mui/icons-material/Block';

import { ExportRequest } from '../../hooks/useExports';
import { ExportStatusBadge, AnonymizationBadge } from './ExportStatusBadge';

interface ExportRequestTableProps {
  requests: ExportRequest[];
  isAdmin: boolean;
  onView: (req: ExportRequest) => void;
  onApprove?: (req: ExportRequest) => void;
  onReject?: (req: ExportRequest) => void;
  onRevoke?: (req: ExportRequest) => void;
  onGenerate?: (req: ExportRequest) => void;
  onDownload?: (req: ExportRequest) => void;
}

export const ExportRequestTable: React.FC<ExportRequestTableProps> = ({ 
  requests, isAdmin, onView, onApprove, onReject, onRevoke, onGenerate, onDownload 
}) => {
  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
            <TableCell>ID</TableCell>
            {isAdmin && <TableCell>Requester</TableCell>}
            <TableCell>Dataset</TableCell>
            <TableCell>Anonymization</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Downloads</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {requests.map((req) => (
            <TableRow key={req.id} sx={{ backgroundColor: req.request_type === 'raw_access' ? '#fff5f5' : 'inherit' }}>
              <TableCell>{req.id.substring(0, 8)}...</TableCell>
              {isAdmin && <TableCell>{req.requester_user_id}</TableCell>}
              <TableCell>{req.dataset_type}</TableCell>
              <TableCell>
                <AnonymizationBadge level={req.requested_anonymization_level} type={req.request_type} />
              </TableCell>
              <TableCell>
                <ExportStatusBadge status={req.status} />
              </TableCell>
              <TableCell>
                {req.status === 'completed' || req.status === 'generated' ? (
                  req.current_download_count >= req.max_download_count ? (
                    <span style={{color: 'red', fontSize: '0.8rem'}}>Limit reached ({req.current_download_count}/{req.max_download_count})</span>
                  ) : (
                    <span>{req.current_download_count} / {req.max_download_count}</span>
                  )
                ) : '-'}
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="View Details">
                    <IconButton size="small" onClick={() => onView(req)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  
                  {isAdmin && req.status === 'pending' && onApprove && (
                    <Tooltip title="Approve">
                      <IconButton size="small" color="success" onClick={() => onApprove(req)}>
                        <CheckCircleIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {isAdmin && req.status === 'pending' && onReject && (
                    <Tooltip title="Reject">
                      <IconButton size="small" color="error" onClick={() => onReject(req)}>
                        <CancelIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {isAdmin && (req.status === 'approved' || req.status === 'generated' || req.status === 'completed') && onRevoke && (
                    <Tooltip title="Revoke">
                      <IconButton size="small" color="secondary" onClick={() => onRevoke(req)}>
                        <BlockIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  
                  {req.status === 'approved' && onGenerate && (
                    <Tooltip title="Generate Export">
                      <IconButton size="small" color="primary" onClick={() => onGenerate(req)}>
                        <PlayArrowIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {(req.status === 'completed' || req.status === 'generated') && 
                   req.current_download_count < req.max_download_count && onDownload && (
                    <Tooltip title="Download">
                      <IconButton size="small" color="primary" onClick={() => onDownload(req)}>
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
          {requests.length === 0 && (
            <TableRow>
              <TableCell colSpan={isAdmin ? 7 : 6} align="center">
                No export requests found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
