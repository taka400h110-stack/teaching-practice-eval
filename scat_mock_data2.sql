-- Mock Data for SCAT Student Mastery
INSERT INTO scat_student_mastery (student_id, element_code, mastered, first_journal_id, first_week_number) VALUES
('user-001', 'M1', 1, 'journal-101', 1),
('user-001', 'M2', 1, 'journal-102', 2),
('user-001', 'M3', 1, 'journal-103', 3),
('user-001', 'M5', 1, 'journal-104', 4),
('user-001', 'M10', 1, 'journal-105', 5);

INSERT INTO scat_journal_elements (journal_id, element_code, present) VALUES
('journal-101', 'M1', 1),
('journal-102', 'M2', 1),
('journal-103', 'M3', 1),
('journal-104', 'M5', 1),
('journal-105', 'M10', 1);

INSERT INTO scat_runs (id, journal_id, student_id, run_date, status) VALUES
('run-101', 'journal-101', 'user-001', CURRENT_TIMESTAMP, 'completed');

INSERT INTO scat_segments (id, run_id, journal_id, segment_text, segment_order) VALUES
('seg-101-1', 'run-101', 'journal-101', '今日は授業参観で緊張しました。', 1),
('seg-101-2', 'run-101', 'journal-101', '生徒の反応が良くて嬉しかったです。', 2);

INSERT INTO scat_concepts (id, segment_id, code1, code2, code3, code4) VALUES
('con-101-1', 'seg-101-1', '授業参観', '緊張', '参観での緊張', '教員のプレッシャー'),
('con-101-2', 'seg-101-2', '生徒の反応', '喜び', '良い反応', '児童理解と喜び');

