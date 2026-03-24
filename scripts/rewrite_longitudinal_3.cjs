const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/LongitudinalAnalysisPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// fix TS errors with any leftover any or implicit conversions
// overlay assignment: row[`user_${idx}`] = ws.total; 
content = content.replace('const row: any = { week: i + 1 };', 'const row: OverlayPlotData = { week: i + 1 };');

// myScores type fix
content = content.replace('const myScores = (growthData?.weekly_scores ?? []).map((ws) => ({', 'const myScores = (growthData?.[0] ?? []).map((ws) => ({');

// UI render for LGCM Tab
const lgcmOld = `{/* ━━ LGCM結果 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={3}>
        <Grid container spacing={3}>
          {!lgcmDone && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="info">
                「LGCM実行」ボタンを押すと、/api/stats/lgcm エンドポイント経由で計算します。
                未接続の場合は論文掲載値を表示します。
              </Alert>
            </Grid>
          )}

          {/* LGCMパラメータ表（論文 Table 3-5相当） */}`;

const lgcmNew = `{/* ━━ LGCM結果 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={3}>
        <Grid container spacing={3}>
          {lgcmStatus === 'no_data' && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="warning">データ不足のため LGCM を実行できません</Alert>
            </Grid>
          )}
          {lgcmStatus === 'not_run' && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="info">
                「LGCM実行」ボタンを押すと、/api/stats/lgcm エンドポイント経由で計算します。
              </Alert>
            </Grid>
          )}
          {lgcmStatus === 'sample' && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="warning">
                <strong>サンプル表示（実分析結果ではありません）</strong>
                <br />API実行に失敗したため、論文掲載値をサンプルとして表示しています。
              </Alert>
            </Grid>
          )}

          {(lgcmStatus === 'completed' || lgcmStatus === 'sample') && lgcmResult && (
            <>
          {/* LGCMパラメータ表（論文 Table 3-5相当） */}`;

content = content.replace(lgcmOld, lgcmNew);

// UI render for LCGA Tab
const lcgaOld = `{/* ━━ LCGA（クラス分類） ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={4}>
        <Grid container spacing={3}>
          {/* クラスサマリー */}
          <Grid size={{ xs: 12 }}>
            <Grid container spacing={2}>
              {(lcgaResult?.classes?.map((c: any) => ({ id: String(c.class_id), label: \`Class \${c.class_id} (\${Math.round(c.proportion*100)}%)\`, color: c.class_id === 1 ? '#2e7d32' : c.class_id === 2 ? '#1565c0' : '#e65100', pct: Math.round(c.proportion*100), desc: \`軌跡: y = \${c.intercept} \${c.slope>=0?'+':''} \${c.slope}x\`, initScore: c.intercept, finalScore: +(c.intercept + c.slope * 10).toFixed(2), slope: c.slope })) || []).map((cls) => (`;

const lcgaNew = `{/* ━━ LCGA（クラス分類） ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={4}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            {lcgaStatus === 'external_required' && !isSampleMode && (
              <Alert severity="info" action={<Button color="inherit" size="small" onClick={() => setIsSampleMode(true)}>サンプル表示を確認</Button>}>
                LCGA は外部分析前提です。<br />
                外部ソフトウェア（Mplus/R等）で算出された結果を取り込むと、ここにクラス軌跡と要約が表示されます。
              </Alert>
            )}
            {isSampleMode && (
              <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => setIsSampleMode(false)}>サンプル表示を閉じる</Button>}>
                <strong>サンプル表示（実分析結果ではありません）</strong><br />
                外部分析結果を取り込むと実データへ置き換わります。
              </Alert>
            )}
          </Grid>
          
          {(lcgaStatus === 'completed' || isSampleMode) && (
            <>
          {/* クラスサマリー */}
          <Grid size={{ xs: 12 }}>
            <Grid container spacing={2}>
              {lcgaTrajectories.map((cls) => (`;

content = content.replace(lcgaOld, lcgaNew);


// Close the LCGA conditional tags
const lcgaCloseOld = `                <Alert severity="info" sx={{ mt: 1 }}>
                  LCGA 3クラスモデル（BIC基準で最適）。高成長群(((({(lcgaResult?.classes?.map((c: any) => ({ pct: Math.round(c.proportion*100) })) || [{pct: 45}, {pct: 35}, {pct: 20}])[2].pct}%)。
                  実装: mplus/lavaan形式CSVエクスポート対応。
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>`;

const lcgaCloseNew = `                <Alert severity="info" sx={{ mt: 1 }}>
                  LCGA 3クラスモデル（BIC基準で最適）。高成長群({lcgaTrajectories[2]?.pct}%)。
                  実装: mplus/lavaan形式CSVエクスポート対応。
                </Alert>
              </CardContent>
            </Card>
          </Grid>
          </>)}
        </Grid>
      </TabPanel>`;

content = content.replace(lcgaCloseOld, lcgaCloseNew);

// Remove the inline LCGA mapped alert (it's hardcoded and causes any issues)
content = content.replace(`注記: 以下のLCGA（潜在クラス成長分析）の結果は、外部ソフトウェア（Mplus/R等）で算出された結果の表示用モックです。本システム内での自動計算は行われていません。`, `このグラフはLCGAの各クラスごとの平均的な成長軌跡を示しています。`);

// Close LGCM conditional tags
const lgcmCloseOld = `                    <Line type="monotone" dataKey="observed" stroke="#43a047" strokeWidth={2}
                      dot={{ r: 5 }} name="観測値（コーホート平均）" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>`;

const lgcmCloseNew = `                    <Line type="monotone" dataKey="observed" stroke="#43a047" strokeWidth={2}
                      dot={{ r: 5 }} name="観測値（コーホート平均）" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          </>)}
        </Grid>
      </TabPanel>`;

content = content.replace(lgcmCloseOld, lgcmCloseNew);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done UI');
