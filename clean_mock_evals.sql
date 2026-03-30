DELETE FROM evaluation_items WHERE evaluation_id IN (SELECT id FROM evaluations WHERE model_name = 'gpt-4o-mock');
DELETE FROM evaluations WHERE model_name = 'gpt-4o-mock';
