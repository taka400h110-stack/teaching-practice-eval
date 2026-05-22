INSERT INTO evaluations (id, journal_id, eval_type, total_score, factor1_score, factor2_score, factor3_score, factor4_score)
SELECT lower(hex(randomblob(16))), id, 'ai', 3.5, 3.2, 3.8, 3.5, 3.6
FROM journal_entries
WHERE NOT EXISTS (SELECT 1 FROM evaluations WHERE journal_id = journal_entries.id AND eval_type = 'ai');

INSERT INTO human_evaluations (id, journal_id, evaluator_id, total_score, factor1_score, factor2_score, factor3_score, factor4_score)
SELECT lower(hex(randomblob(16))), id, 'user-008', 3.4, 3.1, 3.9, 3.4, 3.5
FROM journal_entries
WHERE NOT EXISTS (SELECT 1 FROM human_evaluations WHERE journal_id = journal_entries.id);
