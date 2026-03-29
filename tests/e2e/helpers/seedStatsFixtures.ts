import { Page } from '@playwright/test';

export async function seedStatsFixtures(page: Page) {
  await page.route('**/api/data/cohorts', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        cohorts: [
          {
            id: 'u1',
            student_number: '2023A001',
            name: '山田 太郎',
            grade: 3,
            gender: 'M',
            school_type: '中学校',
            internship_type: 'intensive',
            weeks: 4,
            school_name: 'テスト中学校',
            supervisor: '佐藤',
            final_total: 16,
            final_factor1: 4,
            final_factor2: 4,
            final_factor3: 4,
            final_factor4: 4,
            growth_delta: 2,
            self_eval_gap: -0.5,
            lps: 3.5,
            big_five: {
              extraversion: 3,
              agreeableness: 4,
              conscientiousness: 4,
              neuroticism: 2,
              openness: 4
            },
            weekly_scores: [
              { week: 1, factor1: 3, factor2: 3, factor3: 3, factor4: 3, total: 12 },
              { week: 2, factor1: 4, factor2: 4, factor3: 4, factor4: 4, total: 16 }
            ]
          }
        ]
      })
    });
  });

  await page.route('**/api/stats/full-reliability', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        icc: { icc: 0.85, ci95: [0.8, 0.9], f: 15, df1: 40, df2: 40, p: 0.001, interpretation: '良好' },
        bland_altman: { bias: 0.1, loa_lower: -0.5, loa_upper: 0.7, points: [] },
        pearson: { r: 0.8, p: 0.001 },
        krippendorff_alpha: { alpha: 0.8, interpretation: '良好' }
      })
    });
  });
}

export async function mockReliabilityStats(page: Page, type: 'malformed' | 'normal' = 'normal') {
  if (type === 'malformed') {
    await page.route('**/api/stats/full-reliability', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          icc: { icc: 'NaN', ci95: [0.9, 0.8], f: 'Infinity', df1: null, df2: -1, p: 2.0, interpretation: null },
          bland_altman: { bias: null, loa_lower: 100, loa_upper: -100, points: [{x: 'a', y: 'b'}] },
          pearson: { r: 1.5, p: -0.5 },
          krippendorff_alpha: { alpha: 'undefined', interpretation: '' }
        })
      });
    });
  }
}

export async function mockLongitudinalStatsMalformed(page: Page) {
  await page.route('**/api/data/cohorts', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        cohorts: [
          {
            id: 'malformed1',
            school_type: '中学校',
            duration_weeks: 4,
            profiles: [
              {
                user_id: 'u1',
                weekly_scores: [
                  { week: null, factor1: -5, factor2: 100, factor3: NaN, factor4: undefined, total: -10 },
                  { week: 2, factor1: null }
                ]
              }
            ]
          }
        ]
      })
    });
  });
}

export async function mockTeacherStatsMalformed(page: Page) {
  await page.route('**/api/data/cohorts', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        cohorts: [
          {
            id: 'malformed_teacher',
            profiles: [
              {
                id: 'u1',
                final_total: -100,
                final_factor1: NaN,
                growth_delta: Infinity,
                weekly_scores: []
              },
              {
                id: 'u2',
                final_total: null,
                growth_delta: -50
              }
            ]
          }
        ]
      })
    });
  });
}

export async function mockLongitudinalStats(page: Page, type: 'normal' | 'empty' | 'boundary' = 'normal') {
  await page.route('**/api/data/cohorts', async route => {
    if (type === 'empty') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ cohorts: [] })
      });
      return;
    }

    const weekly_scores = type === 'boundary' 
      ? [{ week: 1, factor1: 1, factor2: 1, factor3: 1, factor4: 1, total: 4 }]
      : [
          { week: 1, factor1: 3, factor2: 3, factor3: 3, factor4: 3, total: 12 },
          { week: 2, factor1: 4, factor2: 4, factor3: 4, factor4: 4, total: 16 }
        ];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        cohorts: [
          {
            id: 'longitudinal1',
            school_type: '中学校',
            duration_weeks: 4,
            profiles: [
              {
                user_id: 'u1',
                weekly_scores
              }
            ]
          }
        ]
      })
    });
  });
}
