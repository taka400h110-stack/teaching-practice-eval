/**
 * External Stats Provider Adapter
 * 外部API (https://teaching-stats-api.onrender.com) への接続と内部フォールバックを管理する層
 */

export interface StatsProviderOptions {
  apiUrl?: string;
  timeoutMs?: number;
}

export class ExternalFirstStatsProvider {
  private apiUrl: string;
  private timeoutMs: number;
  
  constructor(options: StatsProviderOptions = {}) {
    this.apiUrl = options.apiUrl || "https://teaching-stats-api.onrender.com";
    this.timeoutMs = options.timeoutMs || 5000;
  }

  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  public async computeICC(ratings: number[][], factor: string = "total", internalFallback: () => any): Promise<{source: string, data: any}> {
    try {
      const res = await this.fetchWithTimeout(`${this.apiUrl}/api/icc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratings, factor })
      });
      if (res.ok) {
        const data = await res.json();
        return { source: "external", data };
      }
      console.warn(`External ICC failed with status ${res.status}`);
    } catch (e) {
      console.warn(`External ICC fetch error: ${e}`);
    }
    return { source: "internal", data: internalFallback() };
  }

  public async computeBlandAltman(method1: number[], method2: number[], factor: string = "total", internalFallback: () => any): Promise<{source: string, data: any}> {
    try {
      const res = await this.fetchWithTimeout(`${this.apiUrl}/api/bland-altman`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method1, method2, factor })
      });
      if (res.ok) {
        const data = await res.json();
        return { source: "external", data };
      }
      console.warn(`External Bland-Altman failed with status ${res.status}`);
    } catch (e) {
      console.warn(`External Bland-Altman fetch error: ${e}`);
    }
    return { source: "internal", data: internalFallback() };
  }

  public async computeLGCM(weeklyScores: number[][], factor: string = "total", internalFallback: () => any): Promise<{source: string, data: any}> {
    try {
      const res = await this.fetchWithTimeout(`${this.apiUrl}/api/lgcm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekly_scores: weeklyScores, factor })
      });
      if (res.ok) {
        const data = await res.json();
        return { source: "external", data };
      }
      console.warn(`External LGCM failed with status ${res.status}`);
    } catch (e) {
      console.warn(`External LGCM fetch error: ${e}`);
    }
    return { source: "internal", data: internalFallback() };
  }
  
  public async computeLCGA(weeklyScores: number[][], maxClasses: number = 5, internalFallback: () => any): Promise<{source: string, data: any}> {
    try {
      const res = await this.fetchWithTimeout(`${this.apiUrl}/api/lcga`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekly_scores: weeklyScores, max_classes: maxClasses })
      });
      if (res.ok) {
        const data = await res.json();
        return { source: "external", data };
      }
      console.warn(`External LCGA failed with status ${res.status}`);
    } catch (e) {
      console.warn(`External LCGA fetch error: ${e}`);
    }
    return { source: "internal", data: internalFallback() };
  }

  public async computeMissingData(dataArray: (number | null)[][], method: string = "listwise", internalFallback: () => any): Promise<{source: string, data: any}> {
    try {
      const res = await this.fetchWithTimeout(`${this.apiUrl}/api/missing-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: dataArray, method })
      });
      if (res.ok) {
        const data = await res.json();
        return { source: "external", data };
      }
      console.warn(`External MissingData failed with status ${res.status}`);
    } catch (e) {
      console.warn(`External MissingData fetch error: ${e}`);
    }
    return { source: "internal", data: internalFallback() };
  }
}

export const statsProvider = new ExternalFirstStatsProvider();
