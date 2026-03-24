export interface WeeklyScore {
  week: number;
  factor1: number;
  factor2: number;
  factor3: number;
  factor4: number;
  total: number;
}

export interface CohortProfile {
  id: string;
  name: string;
  weekly_scores: WeeklyScore[];
  weeks?: number;
}

export interface LGCMResult {
  intercept_mean: number;
  intercept_variance: number;
  slope_mean: number;
  slope_variance: number;
  intercept_slope_cov: number;
  cfi: number;
  rmsea: number;
  srmr: number;
  chi2: number;
  chi2_df: number;
  chi2_p: number;
  growth_pattern: string;
}

export interface LCGAClass {
  class_id: number | string;
  proportion: number;
  intercept: number;
  slope: number;
}

export interface LCGAResult {
  classes: LCGAClass[];
}

export interface WeeklyStat {
  week: number;
  f1_mean: number;
  f1_sd: number;
  f2_mean: number;
  f2_sd: number;
  f3_mean: number;
  f3_sd: number;
  f4_mean: number;
  f4_sd: number;
  total_mean: number;
  total_sd: number;
}

export interface OverlayPlotData {
  week: number;
  [key: string]: number; // for user_0, user_1, etc.
}

export interface LCGATrajectoryPoint {
  week: number;
  score: number;
}

export interface LCGATrajectoryClass {
  id: string;
  label: string;
  color: string;
  pct: number;
  desc: string;
  initScore: number;
  finalScore: number;
  slope: number;
  trajectory: LCGATrajectoryPoint[];
}

export type AnalysisStatus = 'no_data' | 'not_run' | 'external_required' | 'completed' | 'failed' | 'sample';
