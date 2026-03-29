# Statistics Fixture Matrix

| Page | Fixture Category | API Expectation | UI Expectation | Export Expectation |
|---|---|---|---|---|
| ReliabilityAnalysisPage | normal | 200 OK, valid stats (e.g. ICC > 0.8) | ICC values and charts displayed properly | Export contains normal data |
| ReliabilityAnalysisPage | empty | 200 OK, empty arrays | Safe fallback message "No data available" | Export disabled or returns empty template |
| ReliabilityAnalysisPage | malformed | 500 or 400 | Error boundary / graceful error message | Export disabled |
| ReliabilityAnalysisPage | boundary | 200 OK, extreme ICC (e.g. 0.99 or 0.01) | Extremes properly scaled on charts | Export contains extreme values |
| LongitudinalAnalysisPage | normal | 200 OK, valid growth scores | Multi-line charts show growth trends | Export contains score differences |
| LongitudinalAnalysisPage | empty | 200 OK, empty arrays | Safe fallback message | Export disabled |
| LongitudinalAnalysisPage | single_cohort | 200 OK, one cohort | Chart renders single line without errors | Export contains single cohort |
| SCATAnalysisPage | normal | 200 OK, full text analysis | Keyword bubbles/tables visible | Export contains analysis text |
| SCATAnalysisPage | empty | 200 OK, no text data | Fallback "Not enough journal data" | Export disabled |
| StatisticsPage (Global) | normal | 200 OK, full KPI data | Summary cards show > 0 counts | Export contains global KPIs |
| StatisticsPage (Global) | empty | 200 OK, zero counts | Summary cards show 0, no charts | Export disabled |
| TeacherStatisticsPage | normal | 200 OK, valid data | Teacher-specific KPIs visible | Export available |
| TeacherStatisticsPage | empty | 200 OK, no data | Safe fallback, 0 scores | Export disabled |
| InternationalComparisonPage| normal | 200 OK, multi-country | Radar charts and tables display | Export contains multi-country |
| InternationalComparisonPage| empty | 200 OK, no data | Fallback message | Export disabled |
