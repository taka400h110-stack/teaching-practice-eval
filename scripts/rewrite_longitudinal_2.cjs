const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/LongitudinalAnalysisPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Update States
const statesOld = `  const [lgcmResult, setLgcmResult] = useState<any>(LGCM_RESULT);
  const [lcgaResult, setLcgaResult] = useState<any>(null);
  const [lgcmMode, setLgcmMode] = useState<"legacy" | "rigorous">("rigorous");
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
  const [lgcmPlotData, setLgcmPlotData] = useState<any[]>([]);
  const [lcgaPlotData, setLcgaPlotData] = useState<any[]>([]);
  const [overlayPlotData, setOverlayPlotData] = useState<any[]>([]);`;

const statesNew = `  const [lgcmResult, setLgcmResult] = useState<LGCMResult | null>(null);
  const [lcgaResult, setLcgaResult] = useState<LCGAResult | null>(null);
  const [lgcmMode, setLgcmMode] = useState<"legacy" | "rigorous">("rigorous");
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([]);
  const [lgcmPlotData, setLgcmPlotData] = useState<any[]>([]);
  const [overlayPlotData, setOverlayPlotData] = useState<OverlayPlotData[]>([]);

  const [lgcmStatus, setLgcmStatus] = useState<AnalysisStatus>('not_run');
  const [lcgaStatus, setLcgaStatus] = useState<AnalysisStatus>('external_required');
  const [isSampleMode, setIsSampleMode] = useState<boolean>(false);`;

content = content.replace(statesOld, statesNew);

// Fix cohorts type
content = content.replace('const { data: cohorts, isLoading } = useQuery({', 'const { data: cohorts, isLoading } = useQuery<CohortProfile[]>({');
content = content.replace('return data.cohorts || [];', 'return (data.cohorts || []) as CohortProfile[];');

content = content.replace('const { data: growthData } = useQuery({', 'const { data: growthData } = useQuery<WeeklyScore[][]>({');

// Fix weeks useMemo types
content = content.replace('flatMap((c: any) => c.weekly_scores?.map((ws: any) => ws.week) || [])', 'flatMap((c: CohortProfile) => c.weekly_scores?.map((ws: WeeklyScore) => ws.week) || [])');

// Fix lcgaTrajectories
content = content.replace('const lcgaTrajectories = React.useMemo(() => genLCGATrajectories(weeks, lcgaResult), [weeks, lcgaResult]);', 'const lcgaTrajectories = React.useMemo(() => genLCGATrajectories(weeks, lcgaResult, isSampleMode), [weeks, lcgaResult, isSampleMode]);');

// Fix useEffect mapping
content = content.replace('const stats = Array.from({ length: maxWeek }, (_, i) => {', 'const stats: WeeklyStat[] = Array.from({ length: maxWeek }, (_, i) => {');
content = content.replace('const weekScores = cohorts.map((c: any) => c.weekly_scores.find((ws: any) => ws.week === week)).filter(Boolean);', 'const weekScores = cohorts.map((c: CohortProfile) => c.weekly_scores.find((ws: WeeklyScore) => ws.week === week)).filter((ws): ws is WeeklyScore => Boolean(ws));');
content = content.replace('const mean = (k: string) => weekScores.length ? weekScores.reduce((a: number, b: any) => a + (b[k]||0), 0) / weekScores.length : 0;', 'const mean = (k: keyof WeeklyScore) => weekScores.length ? weekScores.reduce((a: number, b: WeeklyScore) => a + (Number(b[k])||0), 0) / weekScores.length : 0;');
content = content.replace('const sd = (k: string, m: number) => weekScores.length ? Math.sqrt(weekScores.reduce((a: number, b: any) => a + Math.pow((b[k]||0) - m, 2), 0) / weekScores.length) : 0;', 'const sd = (k: keyof WeeklyScore, m: number) => weekScores.length ? Math.sqrt(weekScores.reduce((a: number, b: WeeklyScore) => a + Math.pow((Number(b[k])||0) - m, 2), 0) / weekScores.length) : 0;');

// Update handleLGCM
const handleLGCMOld = `  const handleLGCM = useCallback(async () => {
    if (!cohorts) return;
    setIsCalcLGCM(true);

    try {
      const weeklyMatrix = (cohorts ?? []).slice(0, 30).map((p) =>
        p.weekly_scores.map((ws) => ws.total)
      );
      const resp = await apiFetch("/api/stats/lgcm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekly_scores: weeklyMatrix, factor: "total" }),
      });
      if (resp.ok) {
        await resp.json();
      }
    } catch {
      // APIが使えない場合は論文値を表示
    }

    setLgcmDone(true);
    setIsCalcLGCM(false);
    setSnackbar({ open: true, msg: "LGCM分析が完了しました（論文掲載値を表示）" });
  }, [cohorts]);`;

const handleLGCMNew = `  const handleLGCM = useCallback(async () => {
    if (!cohorts || cohorts.length === 0) {
      setLgcmStatus('no_data');
      setSnackbar({ open: true, msg: "データが不足しています" });
      return;
    }
    setIsCalcLGCM(true);

    try {
      const weeklyMatrix = cohorts.slice(0, 30).map((p) =>
        p.weekly_scores.map((ws) => ws.total)
      );
      const resp = await apiFetch("/api/stats/lgcm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekly_scores: weeklyMatrix, factor: "total" }),
      });
      if (resp.ok) {
        const data = await resp.json() as LGCMResult;
        setLgcmResult(data);
        setLgcmStatus('completed');
        setSnackbar({ open: true, msg: "LGCM分析が完了しました" });
      } else {
        throw new Error('API Error');
      }
    } catch {
      // APIが使えない場合は論文値をサンプルとして表示
      setLgcmResult(LGCM_RESULT);
      setLgcmStatus('sample');
      setSnackbar({ open: true, msg: "LGCM分析に失敗しました（サンプルデータを表示します）" });
    }

    setLgcmDone(true);
    setIsCalcLGCM(false);
  }, [cohorts]);`;

content = content.replace(handleLGCMOld, handleLGCMNew);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done 7-10');
