const fs = require('fs');
const path = '/home/user/webapp/src/pages/LongitudinalAnalysisPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace mock dependencies and generator logic
content = content.replace(/const LCGA_CLASSES = [\s\S]*?];/, '');
content = content.replace(/function genWeeklyStats\([\s\S]*?}\s*\}/, '');
content = content.replace(/function genLCGATrajectories\([\s\S]*?}\s*\}/, '');
content = content.replace(/const LGCM_RESULT = {[\s\S]*?};/, '');
content = content.replace(/function downloadGrowthCSV\([\s\S]*?}\s*\}/, `
function downloadGrowthCSV(weeklyStats: any[]) {
  const headers = ["week", "f1_mean", "f1_sd", "f2_mean", "f2_sd", "f3_mean", "f3_sd", "f4_mean", "f4_sd", "total_mean", "total_sd"];
  const rows = weeklyStats.map((w) => headers.map((h) => w[h] ?? "").join(","));
  const csv = [headers.join(","), ...rows].join("\\n");
  const blob = new Blob(["\\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "longitudinal_growth.csv";
  a.click();
}
`);

// State variables to hold results
const newStates = `
  const [lgcmResult, setLgcmResult] = useState<any>(null);
  const [lcgaResult, setLcgaResult] = useState<any>(null);
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
  const [lgcmPlotData, setLgcmPlotData] = useState<any[]>([]);
  const [lcgaPlotData, setLcgaPlotData] = useState<any[]>([]);
  const [overlayPlotData, setOverlayPlotData] = useState<any[]>([]);

  useEffect(() => {
    if (!cohorts || cohorts.length === 0) return;
    const maxWeek = Math.max(...cohorts.flatMap((c: any) => c.weekly_scores.map((ws: any) => ws.week)));
    if (maxWeek < 1) return;
    
    // Generate overlay data
    const overlay = Array.from({ length: maxWeek }, (_, i) => { 
      const row: any = { week: i + 1 }; 
      cohorts.slice(0, 10).forEach((p: any, idx: number) => { 
        const ws = p.weekly_scores.find((w: any) => w.week === i + 1); 
        if(ws) row[\`user_\${idx}\`] = ws.total; 
      }); 
      return row; 
    });
    setOverlayPlotData(overlay);

    // Compute weekly stats
    const stats = Array.from({ length: maxWeek }, (_, i) => {
      const week = i + 1;
      const weekScores = cohorts.map((c: any) => c.weekly_scores.find((ws: any) => ws.week === week)).filter(Boolean);
      const mean = (k: string) => weekScores.length ? weekScores.reduce((a: number, b: any) => a + b[k], 0) / weekScores.length : 0;
      const sd = (k: string, m: number) => weekScores.length ? Math.sqrt(weekScores.reduce((a: number, b: any) => a + Math.pow(b[k] - m, 2), 0) / weekScores.length) : 0;
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
  }, [cohorts]);
`;

// Replace handleLGCM body and state setups
content = content.replace(/const weeks = 10;[\s\S]*?const handleLGCM = useCallback\(async \(\) => \{[\s\S]*?setLgcmDone\(true\);\n  \}, \[cohorts\]\);/, `${newStates}
  
  const handleLGCM = useCallback(async () => {
    if (!cohorts) return;
    setIsCalcLGCM(true);
    try {
      // fill missing manually for simplicity using LOCF or 0
      const maxWeek = Math.max(...cohorts.flatMap((c: any) => c.weekly_scores.map((ws: any) => ws.week)));
      const weeklyMatrix = cohorts.map((p: any) => {
        const arr = new Array(maxWeek).fill(0);
        p.weekly_scores.forEach((ws: any) => { arr[ws.week - 1] = ws.total; });
        // LOCF imputation
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
          observed: weeklyStats[i]?.total_mean 
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
            res.classes.forEach((cls: any) => { row[cls.class_id] = +(cls.intercept + cls.slope * i).toFixed(2); }); 
            return row; 
          }));
        }
      }
    } catch {}
    setIsCalcLGCM(false);
    setLgcmDone(true);
  }, [cohorts, weeklyStats]);`);

// Replace LGCM_RESULT usage
content = content.replace(/LGCM_RESULT/g, 'lgcmResult');
// Need to add optional chaining when rendering lgcmResult properties
content = content.replace(/lgcmResult\./g, 'lgcmResult?.');
// remove the lgcmResult?.[h] which might be invalid syntax if it exists
content = content.replace(/lgcmResult\?\.\?\./g, 'lgcmResult?.');

content = content.replace(/LCGA_CLASSES/g, '(lcgaResult?.classes?.map((c: any) => ({ id: c.class_id, label: `Class ${c.class_id} (${Math.round(c.proportion*100)}%)`, color: c.class_id === 1 ? "#2e7d32" : c.class_id === 2 ? "#1565c0" : "#e65100" })) || [])');

// Remove static mock arrays from mapping if any
content = content.replace(/lcgaTrajectories\.forEach\(cls => \{ row\[cls\.id\] = cls\.trajectory\[i\]\.score; \}\);/g, '');

fs.writeFileSync(path, content);
