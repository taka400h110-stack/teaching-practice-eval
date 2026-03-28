import React, { useState } from 'react';
import { 
  Box, Button, TextField, FormControl, InputLabel, Select, MenuItem, 
  Typography, Alert, Paper 
} from '@mui/material';
import { useCreateExportRequest } from '../../hooks/useExports';
import apiClient from '../../api/client';

export const ExportRequestForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const user = apiClient.getCurrentUser();
  const createReq = useCreateExportRequest();
  const [datasetType, setDatasetType] = useState('journals');
  const [scopeLevel, setScopeLevel] = useState('all');
  const [targetId, setTargetId] = useState('');
  const [anonymization, setAnonymization] = useState('pseudonymized');
  const [purpose, setPurpose] = useState('');
  const [justification, setJustification] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const canSelectRaw = user?.role === 'admin' || user?.role === 'researcher';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await createReq.mutateAsync({
        dataset_type: datasetType,
        scope_level: scopeLevel,
        student_id: scopeLevel === 'student' ? targetId : undefined,
        course_id: scopeLevel === 'course' ? targetId : undefined,
        cohort_id: scopeLevel === 'cohort' ? targetId : undefined,
        requested_anonymization_level: anonymization as any,
        purpose,
        justification,
        request_type: anonymization === 'raw' ? 'raw_access' : 'export'
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit request');
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>Request New Export</Typography>
      {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormControl fullWidth>
          <InputLabel>Dataset Type</InputLabel>
          <Select value={datasetType} label="Dataset Type" onChange={(e) => setDatasetType(e.target.value)}>
            <MenuItem value="journals">Journals</MenuItem>
            <MenuItem value="evaluations">Evaluations</MenuItem>
            <MenuItem value="students">Students</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Scope Level</InputLabel>
          <Select value={scopeLevel} label="Scope Level" onChange={(e) => setScopeLevel(e.target.value)}>
            <MenuItem value="all">All Available</MenuItem>
            <MenuItem value="course">Specific Course</MenuItem>
            <MenuItem value="cohort">Specific Cohort</MenuItem>
            <MenuItem value="student">Specific Student</MenuItem>
          </Select>
        </FormControl>

        {scopeLevel !== 'all' && (
          <TextField 
            label="Target ID (Course/Cohort/Student ID)" 
            value={targetId} 
            onChange={(e) => setTargetId(e.target.value)}
            required
            fullWidth
          />
        )}

        <FormControl fullWidth>
          <InputLabel>Anonymization Level</InputLabel>
          <Select 
            value={anonymization} 
            label="Anonymization Level" 
            onChange={(e) => setAnonymization(e.target.value)}
          >
            <MenuItem value="aggregated">Aggregated</MenuItem>
            <MenuItem value="pseudonymized">Pseudonymized</MenuItem>
            {canSelectRaw && <MenuItem value="raw">Raw (Requires strong justification)</MenuItem>}
          </Select>
        </FormControl>

        {anonymization === 'raw' && (
          <Alert severity="warning">
            Raw access exposes PII. You must provide a valid justification for approval.
          </Alert>
        )}

        <TextField 
          label="Purpose of Export" 
          value={purpose} 
          onChange={(e) => setPurpose(e.target.value)}
          required
          fullWidth
        />

        <TextField 
          label="Justification (if requiring extra access)" 
          value={justification} 
          onChange={(e) => setJustification(e.target.value)}
          required={anonymization === 'raw'}
          fullWidth
          multiline
          rows={3}
        />

        <Button 
          type="submit" 
          variant="contained" 
          color="primary" 
          disabled={createReq.isPending}
        >
          {createReq.isPending ? 'Submitting...' : 'Submit Request'}
        </Button>
      </Box>
    </Paper>
  );
};
