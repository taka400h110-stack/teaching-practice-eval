-- ============================================================
-- v3: エクスポート要求のサンプルデータ
-- ============================================================

INSERT OR IGNORE INTO dataset_export_requests (
  id, requester_user_id, requester_role, request_type, dataset_type, scope_level,
  cohort_id, requested_anonymization_level, status, purpose, justification,
  approval_required, created_at, updated_at
) VALUES
  ('exp-req-001','user-005','researcher','export','journals','cohort',
   'demo-cohort-001','pseudonymized','approved',
   '実習日誌の縦断的分析','研究倫理委員会承認済 (R6-001)',
   1, '2025-04-15T09:00:00Z','2025-04-16T10:00:00Z'),
  ('exp-req-002','user-005','researcher','export','evaluations','cohort',
   'demo-cohort-001','aggregated','completed',
   'AI評価とヒト評価の信頼性検証','学会発表用 (日本教育工学会)',
   1, '2025-04-20T11:00:00Z','2025-04-22T15:30:00Z'),
  ('exp-req-003','user-006','collaborator','download','scat_codes','course',
   NULL,'pseudonymized','pending',
   '質的コーディング結果の共同分析','共同研究プロジェクト',
   1, '2025-05-01T14:00:00Z','2025-05-01T14:00:00Z'),
  ('exp-req-004','user-007','board_observer','export','aggregated_stats','course',
   NULL,'aggregated','approved',
   '実習効果の経年比較レポート作成','教育委員会報告',
   1, '2025-05-10T08:30:00Z','2025-05-11T09:00:00Z'),
  ('exp-req-005','user-005','researcher','raw_access','scat_codes','cohort',
   'demo-cohort-001','pseudonymized','rejected',
   '個別事例の質的研究','匿名化レベル要再検討',
   1, '2025-05-12T13:00:00Z','2025-05-13T16:00:00Z');
