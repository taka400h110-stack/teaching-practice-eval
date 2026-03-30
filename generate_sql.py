import json

with open("import_data.json", "r", encoding="utf-8") as f:
    data = json.load(f)

sql_statements = []
for entry in data:
    id_val = entry["id"].replace("'", "''")
    student_id = entry["student_id"].replace("'", "''")
    title = entry["title"].replace("'", "''")
    entry_date = entry["entry_date"].replace("'", "''")
    week_number = entry["week_number"]
    
    # 構造化されたJSONを作成
    content_obj = {
        "version": 2,
        "records": [
            {
                "id": "rec-1",
                "order": 0,
                "time_label": "実習記録",
                "time_start": "08:30",
                "time_end": "17:00",
                "body": entry["content"]
            }
        ],
        "reflection": entry["reflection_text"]
    }
    
    content_json = json.dumps(content_obj, ensure_ascii=False)
    content_escaped = content_json.replace("'", "''")
    
    status = entry["status"].replace("'", "''")
    created_at = entry["created_at"].replace("'", "''")
    
    sql = f"""
    INSERT OR REPLACE INTO journal_entries 
    (id, student_id, title, entry_date, week_number, content, status, created_at, updated_at) 
    VALUES 
    ('{id_val}', '{student_id}', '{title}', '{entry_date}', {week_number}, '{content_escaped}', '{status}', '{created_at}', '{created_at}');
    """
    sql_statements.append(sql.strip())

with open("import_journals.sql", "w", encoding="utf-8") as f:
    f.write("\n".join(sql_statements))

print("Generated import_journals.sql with JSON content")
