import React, { useState } from "react";
import { Box, Typography, Tabs, Tab } from "@mui/material";
import { ExternalAnalysisJobPanel } from "../components/ExternalAnalysisJobPanel";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AdvancedAnalyticsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Advanced Analytics
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="SEM / CFA" />
          <Tab label="Missing Data (MICE)" />
          <Tab label="G-Methods (Causal)" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <ExternalAnalysisJobPanel 
          jobType="SEM_CFA" 
          title="Structural Equation Modeling / Confirmatory Factor Analysis"
          description="Export the dataset to perform SEM or CFA externally. This will generate a dataset containing all relevant evaluation factors and variables, along with a data dictionary. Perform the analysis in R (lavaan) or Mplus, and then import the fit indices and factor loadings back into this platform."
          datasetType="evaluations_wide"
        />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <ExternalAnalysisJobPanel 
          jobType="MICE" 
          title="Multiple Imputation by Chained Equations (MICE)"
          description="Missing data imputation requires intensive iterative processes. Create a job here to extract the dataset with missing flags. Use an external tool (e.g., mice package in R) to generate imputed datasets, and then upload the pooled estimates or completed datasets back here."
          datasetType="evaluations_with_missing"
        />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <ExternalAnalysisJobPanel 
          jobType="G_METHODS" 
          title="G-Methods / Causal Inference"
          description="Advanced causal inference methods (like IPTW, Marginal Structural Models) are not computed natively. Export the longitudinal cohort data (long format) for external causal analysis, and import the treatment effect estimates and weighting summaries once complete."
          datasetType="longitudinal_long"
        />
      </TabPanel>
    </Box>
  );
};

export default AdvancedAnalyticsPage;
