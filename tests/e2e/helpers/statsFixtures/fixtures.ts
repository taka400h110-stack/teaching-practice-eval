export const reliabilityNormal = {
  icc: 0.85,
  ci: { lower: 0.81, upper: 0.89 },
  krippendorff: 0.84,
  pearson: 0.88,
  blandAltman: [
    { mean: 3.5, diff: 0.2 },
    { mean: 4.0, diff: -0.1 },
    { mean: 2.5, diff: 0.5 }
  ]
};

export const reliabilityEmpty = {
  icc: null,
  ci: null,
  krippendorff: null,
  pearson: null,
  blandAltman: []
};

export const reliabilityMalformed = {
  icc: "invalid",
  blandAltman: "not-an-array"
};

export const longitudinalNormal = [
  {
    cohort: 'Cohort A',
    weeks: [
      { week: 1, selfScore: 3.2, teacherScore: 3.0 },
      { week: 2, selfScore: 3.5, teacherScore: 3.2 },
      { week: 3, selfScore: 3.8, teacherScore: 3.5 }
    ],
    growth: {
      self: 0.6,
      teacher: 0.5
    }
  }
];

export const longitudinalEmpty = [];
