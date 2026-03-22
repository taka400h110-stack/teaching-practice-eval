import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { ExternalAnalysisJobPanel } from '../components/ExternalAnalysisJobPanel';

const InternationalComparisonPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        International Comparison
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body1">
          Strict international comparison involves complex multi-group confirmatory factor analysis (MGCFA) and measurement invariance testing across different cohorts and languages. Due to the high computational requirements and modeling complexity, this must be performed as an External Analysis Job.
        </Typography>
      </Paper>

      <ExternalAnalysisJobPanel 
        jobType="INTL_COMP" 
        title="International Comparison Analysis"
        description="Generate a dataset encompassing cohorts from multiple countries (if available). The exported dataset includes language/country flags and item-level evaluation scores. Please perform measurement invariance testing externally, and return the findings and effect sizes."
        datasetType="multi_country_evaluations"
      />
    </Box>
  );
};

export default InternationalComparisonPage;
