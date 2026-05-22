-- 日誌へのコメントカラムを追加
-- 大学教員 / 校内指導教員 / 管理者がそれぞれ日誌へコメントを残せるようにする
ALTER TABLE journal_entries ADD COLUMN univ_teacher_comment TEXT;
ALTER TABLE journal_entries ADD COLUMN school_mentor_comment TEXT;
ALTER TABLE journal_entries ADD COLUMN teacher_comment TEXT;
