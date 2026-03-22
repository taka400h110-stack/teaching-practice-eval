const fs = require('fs');

let page = fs.readFileSync('/home/user/webapp/src/pages/PlatformAnalyticsPage.tsx', 'utf8');

const newGMethodRender = `        {gMethodMutation.data && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>G-Methods 実行結果: {gMethodMutation.data.method}</Typography>
              {gMethodMutation.data.status === "not_available" ? (
                <Box sx={{ p: 2, bgcolor: "#fff3e0", borderRadius: 1 }}>
                  <Typography variant="body1" color="warning.dark">
                    {gMethodMutation.data.message}
                  </Typography>
                  <Button variant="outlined" sx={{ mt: 2 }}>外部分析用データ(CSV)をエクスポート</Button>
                </Box>
              ) : (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {/* old UI */}
                </Grid>
              )}
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary" display="block">
                Run ID: {gMethodMutation.data.run_id}
              </Typography>
            </CardContent>
          </Card>
        )}`;

// replace the part from {gMethodMutation.data && ( to </TabPanel> for tab 1
page = page.replace(/\{gMethodMutation\.data && \([\s\S]*?\}\)\n      <\/TabPanel>/, newGMethodRender + '\n      </TabPanel>');


const newFairnessRender = `        {fairLoading ? <CircularProgress /> : (
          <Grid container spacing={3}>
            {fairnessData?.status === "not_available" ? (
              <Grid size={{ xs: 12 }}>
                <Card sx={{ bgcolor: "#fff3e0" }}>
                  <CardContent>
                    <Typography variant="body1" color="warning.dark">
                      {fairnessData.message}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ) : (
              // old UI mapping goes here if needed
              <Grid size={{ xs: 12 }}>
                <Typography>データが見つかりません</Typography>
              </Grid>
            )}
            <Grid size={{ xs: 12 }}>
              <Typography variant="caption" color="text.secondary">
                Run ID: {fairnessData?.run_id} | Timestamp: {fairnessData?.timestamp}
              </Typography>
            </Grid>
          </Grid>
        )}`;

page = page.replace(/\{fairLoading \? <CircularProgress \/> : \([\s\S]*?\}\)\n      <\/TabPanel>/, newFairnessRender + '\n      </TabPanel>');

fs.writeFileSync('/home/user/webapp/src/pages/PlatformAnalyticsPage.tsx', page);
console.log('Updated PlatformAnalyticsPage');

