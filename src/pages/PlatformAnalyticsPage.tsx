import React, { useState } from "react";
import { Box, Typography, Card, CardContent, Grid, Button, Tab, Tabs, Chip, Divider, CircularProgress } from "@mui/material";
import { useQuery, useMutation } from "@tanstack/react-query";
import Science from "@mui/icons-material/Science";
import Security from "@mui/icons-material/Security";
import Timeline from "@mui/icons-material/Timeline";
import FormatListNumbered from "@mui/icons-material/FormatListNumbered";

function TabPanel(props: any) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function PlatformAnalyticsPage() {
  const [tabIndex, setTabIndex] = useState(0);

  // Fetch L1-L4 Pipeline
  const { data: pipelineData, isLoading: pipeLoading } = useQuery({
    queryKey: ["analytics-pipeline"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/pipeline");
      return res.json();
    }
  });

  // Fetch Fairness & Validity
  const { data: fairnessData, isLoading: fairLoading } = useQuery({
    queryKey: ["analytics-fairness"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/fairness");
      return res.json();
    }
  });

  // G-Methods mutation
  const gMethodMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/analytics/g-methods", { method: "POST" });
      return res.json();
    }
  });

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ display: "flex", alignItems: "center" }}>
        <Science sx={{ mr: 1 }} />
        データプラットフォーム分析 (Analytics Platform)
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        L1-L4データ層の統合、G-Methodsによる因果推論(IPTW/MSM)、妥当性・公平性監査(Fairness Audit)を行います。
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mt: 3 }}>
        <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)}>
          <Tab icon={<FormatListNumbered />} label="データパイプライン (L1-L4)" iconPosition="start" />
          <Tab icon={<Timeline />} label="因果推論 (G-Methods)" iconPosition="start" />
          <Tab icon={<Security />} label="公平性・妥当性監査" iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab 1: Pipeline */}
      <TabPanel value={tabIndex} index={0}>
        {pipeLoading ? <CircularProgress /> : (
          <Grid container spacing={3}>
            {pipelineData && Object.entries(pipelineData.layers).map(([layer, info]: any) => (
              <Grid item xs={12} sm={6} md={3} key={layer}>
                <Card sx={{ height: "100%", borderTop: "4px solid #1976d2" }}>
                  <CardContent>
                    <Typography variant="h6" color="primary">{layer}</Typography>
                    <Typography variant="subtitle1">{info.name}</Typography>
                    <Typography variant="h4" sx={{ my: 2 }}>{info.count.toLocaleString()}</Typography>
                    <Chip size="small" color="success" label="欠損値補完済 (Missing-Flag)" />
                  </CardContent>
                </Card>
              </Grid>
            ))}
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Run ID: {pipelineData?.run_id} | Timestamp: {pipelineData?.timestamp}
              </Typography>
            </Grid>
          </Grid>
        )}
      </TabPanel>

      {/* Tab 2: G-Methods */}
      <TabPanel value={tabIndex} index={1}>
        <Box mb={3}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => gMethodMutation.mutate()}
            disabled={gMethodMutation.isPending}
            startIcon={<Timeline />}
          >
            {gMethodMutation.isPending ? "計算中..." : "IPTW/MSM モデル実行"}
          </Button>
        </Box>

        {gMethodMutation.data && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>G-Methods 実行結果: {gMethodMutation.data.method}</Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">トリートメント (介入)</Typography>
                  <Typography variant="body1" paragraph>{gMethodMutation.data.treatment}</Typography>
                  
                  <Typography variant="subtitle2" color="text.secondary">アウトカム (結果)</Typography>
                  <Typography variant="body1" paragraph>{gMethodMutation.data.outcome}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
                    <Typography variant="subtitle2">因果効果の推定値 (ATE)</Typography>
                    <Typography variant="h5" color="primary" gutterBottom>
                      +{gMethodMutation.data.results.iptw_estimate} 
                      <Typography component="span" variant="body2" sx={{ ml: 1 }}>
                        (Naive: +{gMethodMutation.data.results.naive_estimate})
                      </Typography>
                    </Typography>
                    <Typography variant="body2">
                      95% CI: [{gMethodMutation.data.results.confidence_interval.join(", ")}]
                    </Typography>
                    <Typography variant="body2" color={gMethodMutation.data.results.p_value < 0.05 ? "success.main" : "text.secondary"}>
                      p-value: {gMethodMutation.data.results.p_value}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary" display="block">
                Run ID: {gMethodMutation.data.run_id} | {gMethodMutation.data.reproducibility_log}
              </Typography>
            </CardContent>
          </Card>
        )}
      </TabPanel>

      {/* Tab 3: Fairness & Validity */}
      <TabPanel value={tabIndex} index={2}>
        {fairLoading ? <CircularProgress /> : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>測定の妥当性 (Validity Checks)</Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">RD-Chat × RD-Journal 収束妥当性</Typography>
                    <Typography variant="body1">相関: r = {fairnessData?.convergence.correlation} <Chip size="small" color="primary" label={fairnessData?.convergence.status} sx={{ ml: 1 }}/></Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2">縦断的測定不変性 (Longitudinal Invariance)</Typography>
                    <Typography variant="body1">
                      RMSEA: {fairnessData?.longitudinal_invariance.rmsea} / CFI: {fairnessData?.longitudinal_invariance.cfi}
                    </Typography>
                    <Chip size="small" color="success" label={fairnessData?.longitudinal_invariance.status} sx={{ mt: 1 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>公平性監査 (Fairness Audits)</Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">学校種別 (School Type) バイアス</Typography>
                    <Typography variant="body2">p-value: {fairnessData?.fairness.school_type_bias.p_value}</Typography>
                    <Chip size="small" color="success" variant="outlined" label={fairnessData?.fairness.school_type_bias.status} sx={{ mt: 0.5 }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2">性別 (Gender) バイアス</Typography>
                    <Typography variant="body2">p-value: {fairnessData?.fairness.gender_bias.p_value}</Typography>
                    <Chip size="small" color="success" variant="outlined" label={fairnessData?.fairness.gender_bias.status} sx={{ mt: 0.5 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Run ID: {fairnessData?.run_id} | Timestamp: {fairnessData?.timestamp}
              </Typography>
            </Grid>
          </Grid>
        )}
      </TabPanel>
    </Box>
  );
}
