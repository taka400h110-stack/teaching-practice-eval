const fs = require('fs');
const path = '/home/user/webapp/src/api/client.ts';
let content = fs.readFileSync(path, 'utf8');

// Replace getGrowthData
content = content.replace(/getGrowthData: async \(\): Promise<GrowthData> => \{[\s\S]*?\},/, `getGrowthData: async (): Promise<GrowthData> => {
    try {
      const res = await fetch('/api/data/growth/user-001');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      return {
        id: 'growth-001',
        student_id: data.student_id,
        weekly_scores: data.weekly_scores.map((w: any) => ({
          week: w.week_number,
          factor1: w.factor1_score,
          factor2: w.factor2_score,
          factor3: w.factor3_score,
          factor4: w.factor4_score,
          total: w.total_score
        }))
      };
    } catch {
      return MOCK_GROWTH_DATA;
    }
  },`);

// Replace getCohortProfiles
content = content.replace(/getCohortProfiles: async \(\) => \{[\s\S]*?\},/, `getCohortProfiles: async () => {
    try {
      const res = await fetch('/api/data/cohorts');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      return data.cohorts;
    } catch {
      return MOCK_COHORT_PROFILES;
    }
  },`);

fs.writeFileSync(path, content);
