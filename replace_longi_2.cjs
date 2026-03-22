const fs = require('fs');
const path = '/home/user/webapp/src/pages/LongitudinalAnalysisPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove mock generator declarations
content = content.replace(/\/\/ LCGA クラス（3クラス分類、論文 3\.5\.3）\nconst LCGA_CLASSES = \[\s*\{[\s\S]*?\];/g, '');
content = content.replace(/\/\/ ────────────────────────────────────────────────────────────────\n\/\/ モック縦断統計生成\n\/\/ ────────────────────────────────────────────────────────────────\nfunction genWeeklyStats\([\s\S]*?}\s*}\n\nfunction genLCGATrajectories\([\s\S]*?}\s*}/g, '');
content = content.replace(/const LGCM_RESULT = \{[\s\S]*?\n\};/g, 'const LGCM_RESULT = { intercept_mean: 0, intercept_variance: 0, slope_mean: 0, slope_variance: 0, intercept_slope_cov: 0, cfi: 0, rmsea: 0, srmr: 0, chi2: 0, chi2_df: 0, chi2_p: 0, growth_pattern: "" };');

// 2. Replace the old states and logic
const searchOldLogic = `  const weeks = 10;
  const weeklyStats = genWeeklyStats(weeks);
  const lcgaTrajectories = genLCGATrajectories(weeks);
  const lgcmPlotData = Array.from({ length: weeks }, (_, i) => ({ week: i + 1, predicted: +(LGCM_RESULT.intercept_mean + LGCM_RESULT.slope_mean * i).toFixed(2), observed: weeklyStats[i]?.total_mean }));
  const lcgaPlotData = Array.from({ length: weeks }, (_, i) => { const row: any = { week: i + 1 }; lcgaTrajectories.forEach(cls => { row[cls.id] = cls.trajectory[i].score; }); return row; });
  const overlayPlotData = Array.from({ length: weeks }, (_, i) => { const row: any = { week: i + 1 }; (cohorts ?? []).slice(0, 10).forEach((p, idx) => { const ws = p.weekly_scores.find((w: any) => w.week === i + 1); if(ws) row[\`user_\${idx}\`] = ws.total; }); return row; });`;

const newLogic = `  const [lgcmResult, setLgcmResult] = useState<any>(LGCM_RESULT);
  const [lcgaResult, setLcgaResult] = useState<any>(null);
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
  const [lgcmPlotData, setLgcmPlotData] = useState<any[]>([]);
  const [lcgaPlotData, setLcgaPlotData] = useState<any[]>([]);
  const [overlayPlotData, setOverlayPlotData] = useState<any[]>([]);

  useEffect(() => {
    if (!cohorts || cohorts.length === 0) return;
    const maxWeek = Math.max(...cohorts.flatMap((c: any) => c.weekly_scores.map((ws: any) => ws.week)), 10);
    
    const overlay = Array.from({ length: maxWeek }, (_, i) => { 
      const row: any = { week: i + 1 }; 
      cohorts.slice(0, 10).forEach((p: any, idx: number) => { 
        const ws = p.weekly_scores.find((w: any) => w.week === i + 1); 
        if(ws) row[\`user_\${idx}\`] = ws.total; 
      }); 
      return row; 
    });
    setOverlayPlotData(overlay);

    const stats = Array.from({ length: maxWeek }, (_, i) => {
      const week = i + 1;
      const weekScores = cohorts.map((c: any) => c.weekly_scores.find((ws: any) => ws.week === week)).filter(Boolean);
      const mean = (k: string) => weekScores.length ? weekScores.reduce((a: number, b: any) => a + (b[k]||0), 0) / weekScores.length : 0;
      const sd = (k: string, m: number) => weekScores.length ? Math.sqrt(weekScores.reduce((a: number, b: any) => a + Math.pow((b[k]||0) - m, 2), 0) / weekScores.length) : 0;
      return {
        week,
        f1_mean: +(mean('factor1').toFixed(2)), f1_sd: +(sd('factor1', mean('factor1')).toFixed(2)),
        f2_mean: +(mean('factor2').toFixed(2)), f2_sd: +(sd('factor2', mean('factor2')).toFixed(2)),
        f3_mean: +(mean('factor3').toFixed(2)), f3_sd: +(sd('factor3', mean('factor3')).toFixed(2)),
        f4_mean: +(mean('factor4').toFixed(2)), f4_sd: +(sd('factor4', mean('factor4')).toFixed(2)),
        total_mean: +(mean('total').toFixed(2)), total_sd: +(sd('total', mean('total')).toFixed(2)),
      };
    });
    setWeeklyStats(stats);
  }, [cohorts]);`;

content = content.replace(searchOldLogic, newLogic);

// 3. Replace handleLGCM
const searchHandle = /const handleLGCM = useCallback\(async \(\) => \{[\s\S]*?setLgcmDone\(true\);\n  \}, \[cohorts\]\);/;
const newHandle = `const handleLGCM = useCallback(async () => {
    if (!cohorts) return;
    setIsCalcLGCM(true);
    try {
      const maxWeek = Math.max(...cohorts.flatMap((c: any) => c.weekly_scores.map((ws: any) => ws.week)), 10);
      const weeklyMatrix = cohorts.map((p: any) => {
        const arr = new Array(maxWeek).fill(0);
        p.weekly_scores.forEach((ws: any) => { arr[ws.week - 1] = ws.total || 0; });
        for(let i=1; i<maxWeek; i++) if(arr[i] === 0) arr[i] = arr[i-1];
        return arr;
      });

      const respLGCM = await fetch("/api/stats/lgcm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekly_scores: weeklyMatrix, factor: "total" }),
      });
      if (respLGCM.ok) {
        const res = await respLGCM.json();
        setLgcmResult(res);
        setLgcmPlotData(Array.from({ length: maxWeek }, (_, i) => ({ 
          week: i + 1, 
          predicted: +(res.intercept_mean + res.slope_mean * i).toFixed(2), 
          observed: weeklyStats[i]?.total_mean || 0
        })));
      }

      const respLCGA = await fetch("/api/stats/lcga", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekly_scores: weeklyMatrix, max_classes: 3 }),
      });
      if (respLCGA.ok) {
        const res = await respLCGA.json();
        setLcgaResult(res);
        if (res.classes) {
          setLcgaPlotData(Array.from({ length: maxWeek }, (_, i) => { 
            const row: any = { week: i + 1 }; 
            res.classes.forEach((cls: any) => { row[String(cls.class_id)] = +(cls.intercept + cls.slope * i).toFixed(2); }); 
            return row; 
          }));
        }
      }
    } catch (e) {
      console.error(e);
    }
    setIsCalcLGCM(false);
    setLgcmDone(true);
  }, [cohorts, weeklyStats]);`;

content = content.replace(searchHandle, newHandle);

// 4. Update the usage of LCGA_CLASSES to use lcgaResult
content = content.replace(/LCGA_CLASSES/g, `(lcgaResult?.classes?.map((c: any) => ({ id: String(c.class_id), label: \`Class \${c.class_id} (\${Math.round(c.proportion*100)}%)\`, color: c.class_id === 1 ? '#2e7d32' : c.class_id === 2 ? '#1565c0' : '#e65100', pct: Math.round(c.proportion*100), desc: \`軌跡: y = \${c.intercept} \${c.slope>=0?'+':''} \${c.slope}x\`, initScore: c.intercept, finalScore: +(c.intercept + c.slope * 10).toFixed(2), slope: c.slope })) || [])`);

content = content.replace(/\{LGCM_RESULT\./g, '{lgcmResult?.');
content = content.replace(/LGCM_RESULT\./g, 'lgcmResult?.');

content = content.replace(/<Line\s+key=\{cls\.id\}\s+type="monotone"\s+dataKey=\{cls\.id\}/g, '<Line key={cls.id} type="monotone" dataKey={cls.id}');

fs.writeFileSync(path, content);
