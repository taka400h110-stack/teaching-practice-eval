-- 0020_sync_evaluated_journal_status.sql
-- AI評価（evaluations.eval_type='ai'）が既に保存されているにもかかわらず、
-- journal_entries.status が 'submitted' のままで「AI評価済み」が
-- 研究者・教員の一覧に反映されていない不具合を修正するデータ移行。
--
-- 背景: runJournalAutoPipeline が evaluations へ INSERT する一方で、
--       journal_entries.status を 'evaluated' へ更新していなかったため
--       過去に評価済みの日誌が submitted のまま残っていた。
--       コード側は status 更新を追加済み（本移行は既存データのバックフィル）。

UPDATE journal_entries
SET status = 'evaluated'
WHERE status = 'submitted'
  AND id IN (
    SELECT DISTINCT journal_id
    FROM evaluations
    WHERE eval_type = 'ai'
      AND journal_id IS NOT NULL
  );
