import React from 'react';
import { Box, Card, CardContent, Typography, Grid, Chip, Button, Alert } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useOperationalReadiness } from '../../hooks/useOperationalReadiness';

export const ProviderHealthPanel: React.FC = () => {
  const { data, isLoading, error } = useOperationalReadiness();

  if (isLoading) return <Typography>Loading readiness status...</Typography>;
  if (error || !data) return <Alert severity="error">Failed to load readiness status.</Alert>;

  const blockingIssues = Array.isArray(data.readiness?.blockingIssues) ? data.readiness.blockingIssues : [];
  const missingSecrets = Array.isArray(data.secrets?.missing) ? data.secrets.missing : [];
  const providers = Array.isArray(data.providers) ? data.providers : [];

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Operational Readiness & Provider Health</Typography>
          <Box>
            {data.readiness?.ok ? (
              <Chip icon={<CheckCircleIcon />} label="System Ready" color="success" />
            ) : (
              <Chip icon={<WarningIcon />} label="Issues Detected" color="error" />
            )}
          </Box>
        </Box>

        {blockingIssues.length > 0 && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <strong>Blocking Issues:</strong>
            <ul>
              {blockingIssues.map((issue, i) => <li key={i}>{issue}</li>)}
            </ul>
          </Alert>
        )}

        {missingSecrets.length > 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <strong>Missing Required Secrets:</strong> {missingSecrets.join(', ')}
          </Alert>
        )}

        <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>Provider Status</Typography>
        <Grid container spacing={2}>
          {providers.map(provider => (
            <Grid item xs={12} sm={6} md={4} key={provider.name || Math.random()}>
              <Card variant="outlined" sx={{ 
                borderColor: provider.status === 'failing' ? 'error.main' : 
                             provider.status === 'degraded' ? 'warning.main' : 
                             provider.status === 'disabled' ? 'grey.300' : 'success.main',
                bgcolor: provider.status === 'disabled' ? 'action.hover' : 'background.paper'
              }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                      {provider.name}
                    </Typography>
                    <Chip 
                      size="small" 
                      label={provider.status} 
                      color={
                        provider.status === 'healthy' ? 'success' :
                        provider.status === 'failing' ? 'error' :
                        provider.status === 'degraded' ? 'warning' : 'default'
                      }
                    />
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    24h Failures: <strong>{provider.failureCount24h}</strong> ({provider.failureRate24h != null ? (provider.failureRate24h * 100).toFixed(1) : 0}%)
                  </Typography>
                  {provider.lastError && (
                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1, noWrap: true, textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {provider.lastError}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button variant="outlined" size="small" href="/docs/runbooks/cleanup-alert-first-24h.md" target="_blank">
            First 24h Runbook
          </Button>
          <Button variant="outlined" size="small" href="/docs/runbooks/incident-provider-ops.md" target="_blank">
            Provider Runbook
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
