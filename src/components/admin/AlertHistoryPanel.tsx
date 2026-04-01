
import React, { useState } from 'react';
import { 
  Box, Card, CardContent, Typography, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, Drawer, Button, 
  IconButton, Select, MenuItem, FormControl, InputLabel, TextField, 
  Stack, ToggleButtonGroup, ToggleButton, OutlinedInput
} from '@mui/material';
import Refresh from '@mui/icons-material/Refresh';
import Download from '@mui/icons-material/Download';
import Close from '@mui/icons-material/Close';
import { useCleanupAlertHistory } from '../../hooks/useCleanupAlertHistory';
import { AlertHistoryRow, AlertHistoryQuery } from '../../types/adminAlerts';

export const AlertHistoryPanel: React.FC = () => {
  const [query, setQuery] = useState<AlertHistoryQuery>({
    range: "30d",
    sort: "createdAt:desc",
    limit: 50,
  });

  const { data, isLoading, error, refetch } = useCleanupAlertHistory(query);
  const [selectedRow, setSelectedRow] = useState<AlertHistoryRow | null>(null);

  const handleQueryChange = (key: keyof AlertHistoryQuery, value: any) => {
    setQuery(prev => ({ ...prev, [key]: value, cursor: undefined }));
  };

  const handleExportCSV = () => {
    if (!data?.items) return;
    const headers = ["ID", "Time", "Event Type", "Severity", "Channel", "Outcome", "Fingerprint", "Reason", "Error Count"];
    const rows = data.items.map(r => [
      r.id, 
      r.createdAt, 
      r.eventType, 
      r.severity || "", 
      r.channel || "", 
      r.outcome, 
      r.fingerprint, 
      r.reason || "", 
      r.errorCount || ""
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'alert_history.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">クリーンアップアラート履歴</Typography>
          <Stack direction="row" spacing={1}>
            <Button startIcon={<Refresh />} onClick={() => refetch()} size="small" variant="outlined">
              Refresh
            </Button>
            <Button startIcon={<Download />} onClick={handleExportCSV} size="small" variant="outlined">
              Export CSV
            </Button>
          </Stack>
        </Box>

        {/* Basic Filters */}
        <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center" flexWrap="wrap" useFlexGap>
          <ToggleButtonGroup
            value={query.range}
            exclusive
            onChange={(_, val) => val && handleQueryChange('range', val)}
            size="small"
          >
            <ToggleButton value="7d">7 Days</ToggleButton>
            <ToggleButton value="30d">30 Days</ToggleButton>
            <ToggleButton value="90d">90 Days</ToggleButton>
          </ToggleButtonGroup>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Event Type</InputLabel>
            <Select
              value={query.eventTypes || ""}
              label="Event Type"
              onChange={(e) => handleQueryChange('eventTypes', e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="notify_sent">Notify Sent</MenuItem>
              <MenuItem value="notify_suppressed">Suppressed</MenuItem>
              <MenuItem value="dismissed">Dismissed</MenuItem>
              <MenuItem value="alert_generated">Generated</MenuItem>
              <MenuItem value="acknowledged">Acknowledged</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Severity</InputLabel>
            <Select
              value={query.severities || ""}
              label="Severity"
              onChange={(e) => handleQueryChange('severities', e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="warning">Warning</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </Select>
          </FormControl>
          
          <OutlinedInput 
            size="small" 
            placeholder="Search Reason..." 
            value={query.reasonQuery || ""}
            onChange={(e) => handleQueryChange('reasonQuery', e.target.value)}
            sx={{ width: 200 }}
          />

          {Object.keys(query).filter(k => query[k as keyof AlertHistoryQuery] && !['range', 'sort', 'limit'].includes(k)).length > 0 && (
            <Button size="small" onClick={() => setQuery({ range: "30d", sort: "createdAt:desc", limit: 50 })}>
              Clear Filters
            </Button>
          )}
        </Stack>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Event Type</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Outcome</TableCell>
                <TableCell>Fingerprint / Reason</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} align="center">Loading...</TableCell></TableRow>
              ) : error ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ color: 'error.main' }}>Error loading data</TableCell></TableRow>
              ) : !data || !Array.isArray(data.items) || data.items.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">No records found</TableCell></TableRow>
              ) : (
                data.items.map((row) => (
                  <TableRow key={row.id || Math.random()} hover>
                    <TableCell>{row.createdAt ? new Date(row.createdAt).toLocaleString() : ''}</TableCell>
                    <TableCell>
                      <Chip size="small" label={row.eventType} color={
                        row.eventType === 'notify_sent' ? 'primary' :
                        row.eventType === 'dismissed' || row.eventType === 'acknowledged' ? 'success' :
                        row.eventType === 'notify_suppressed' ? 'default' : 'secondary'
                      } />
                    </TableCell>
                    <TableCell>{row.severity}</TableCell>
                    <TableCell>
                      <Chip size="small" label={row.outcome} color={row.outcome === 'success' ? 'success' : row.outcome === 'failed' ? 'error' : 'default'} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" display="block" color="textSecondary">{row.fingerprint}</Typography>
                      {row.reason}
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => setSelectedRow(row)}>Details</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Drawer anchor="right" open={Boolean(selectedRow)} onClose={() => setSelectedRow(null)}>
          <Box sx={{ width: 400, p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Event Details</Typography>
              <IconButton onClick={() => setSelectedRow(null)}><Close /></IconButton>
            </Box>
            {selectedRow && (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">ID</Typography>
                  <Typography variant="body2">{selectedRow.id}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Time</Typography>
                  <Typography variant="body2">{new Date(selectedRow.createdAt).toLocaleString()}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Event Type</Typography>
                  <Chip size="small" label={selectedRow.eventType} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Fingerprint</Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{selectedRow.fingerprint}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Outcome</Typography>
                  <Typography variant="body2">{selectedRow.outcome}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Severity / Channel</Typography>
                  <Typography variant="body2">{selectedRow.severity || 'N/A'} / {selectedRow.channel || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Reason</Typography>
                  <Typography variant="body2">{selectedRow.reason || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Actor User ID</Typography>
                  <Typography variant="body2">{selectedRow.actorUserId || 'N/A'}</Typography>
                </Box>
                {selectedRow.changeSummaryJson && (
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">Change Summary</Typography>
                    <Box component="pre" sx={{ bgcolor: 'grey.100', p: 1, borderRadius: 1, overflowX: 'auto', fontSize: '0.75rem' }}>
                      {JSON.stringify(JSON.parse(selectedRow.changeSummaryJson), null, 2)}
                    </Box>
                  </Box>
                )}
              </Stack>
            )}
          </Box>
        </Drawer>
      </CardContent>
    </Card>
  );
};
