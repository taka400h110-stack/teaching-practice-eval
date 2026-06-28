#!/usr/bin/env python3
"""
Fix E seed: BFI data for user-001 + 3 additional students with full data.
- Resolves N=1 statistics limitation (empty histograms / correlation matrices).
- Makes BFI personalization demonstrable end-to-end.
Each student gets a DISTINCT Big Five profile so that goal-difficulty
adjustment and integrated-analysis feedback visibly differ per individual.
"""
import sqlite3, glob, os, sys, random

random.seed(42)

DB = sorted(glob.glob(".wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite"),
            key=os.path.getmtime, reverse=True)[0]
print("DB:", DB)
c = sqlite3.connect(DB)
cur = c.cursor()

# Reuse user-001 bcrypt hash for "password"
PW_HASH = cur.execute("SELECT password_hash FROM users WHERE id='user-001'").fetchone()[0]

# factorMap from data.ts (negative = reverse-scored, abs id is item)
FACTOR_MAP = {
    "extraversion":      [1, 2, 3, 4, -5],
    "neuroticism":       [6, 7, 8, 9, 10],
    "openness":          [11, 12, 13, 14, 15, 16],
    "agreeableness":     [17, 18, 19, -20, -21, -22],
    "conscientiousness": [23, 24, -25, -26, -27, -28, -29],
}

def responses_for_target(targets):
    """Build 29 item responses (1-5) so each factor mean ~ target.
    For reverse items, store raw such that 6-raw contributes to target."""
    resp = {}
    for factor, items in FACTOR_MAP.items():
        t = targets[factor]
        for sid in items:
            iid = abs(sid)
            # desired contribution ~ t; add small jitter
            contrib = max(1, min(5, round(t + random.uniform(-0.4, 0.4))))
            raw = (6 - contrib) if sid < 0 else contrib
            raw = max(1, min(5, raw))
            resp[iid] = raw
    return resp

def calc_scores(resp):
    out = {}
    for factor, items in FACTOR_MAP.items():
        s = 0; n = 0
        for sid in items:
            v = resp[abs(sid)]
            s += (6 - v) if sid < 0 else v
            n += 1
        out[factor] = round(s / n, 2)
    return out

# ---- Distinct personality profiles (1-5 scale) ----
# user-001: balanced/high conscientiousness  -> High difficulty goals
# user-101: high neuroticism (情緒不安定)      -> Low difficulty (small steps)
# user-102: high openness, low conscientious  -> Medium difficulty
# user-103: high extraversion+agreeableness   -> balanced
PROFILES = {
    "user-001": {"extraversion":3.6,"neuroticism":2.2,"openness":3.8,"agreeableness":3.9,"conscientiousness":4.2},
    "user-101": {"extraversion":2.4,"neuroticism":4.1,"openness":3.0,"agreeableness":3.4,"conscientiousness":2.8},
    "user-102": {"extraversion":3.1,"neuroticism":2.7,"openness":4.4,"agreeableness":3.2,"conscientiousness":2.6},
    "user-103": {"extraversion":4.3,"neuroticism":2.1,"openness":3.5,"agreeableness":4.5,"conscientiousness":3.6},
}

NEW_STUDENTS = {
    "user-101": ("student2@teaching-eval.jp", "高橋 美咲", "2023A101", 3),
    "user-102": ("student3@teaching-eval.jp", "渡部 健太", "2023A102", 3),
    "user-103": ("student4@teaching-eval.jp", "中島 由香", "2023A103", 4),
}

# 1) Create new student users (idempotent)
for uid, (email, name, sno, grade) in NEW_STUDENTS.items():
    cur.execute("""INSERT OR IGNORE INTO users (id,email,name,role,student_number,grade,password_hash)
                   VALUES (?,?,?,?,?,?,?)""",
                (uid, email, name, "student", sno, grade, PW_HASH))
print("students ensured")

# 2) BFI responses + scores for ALL 4 students (idempotent: clear then insert)
for uid, targets in PROFILES.items():
    resp = responses_for_target(targets)
    cur.execute("DELETE FROM namikawa_bfi_responses WHERE user_id=?", (uid,))
    for iid in range(1, 30):
        cur.execute("INSERT INTO namikawa_bfi_responses (user_id,item_id,score) VALUES (?,?,?)",
                    (uid, iid, resp[iid]))
    sc = calc_scores(resp)
    cur.execute("DELETE FROM user_bfi_scores WHERE user_id=?", (uid,))
    cur.execute("""INSERT INTO user_bfi_scores
        (user_id,extraversion,neuroticism,openness,agreeableness,conscientiousness,is_completed)
        VALUES (?,?,?,?,?,?,1)""",
        (uid, sc["extraversion"], sc["neuroticism"], sc["openness"],
         sc["agreeableness"], sc["conscientiousness"]))
    print(f"BFI {uid}: {sc}")

# 3) Full data (journals+evals+self-eval+growth) for the 3 NEW students.
#    Base each new student's trajectory on a distinct growth slope so
#    statistics (histograms / correlations) have N>1 variance.
WEEKS = 10
def factor_score(base, slope, wk, jitter=0.3):
    return round(min(5.0, max(1.0, base + slope*wk + random.uniform(-jitter, jitter))), 2)

# growth params per student (base, slope) tied loosely to conscientiousness
GROWTH = {
    "user-101": (2.4, 0.12),
    "user-102": (2.6, 0.18),
    "user-103": (3.0, 0.15),
}

for uid in NEW_STUDENTS:
    base, slope = GROWTH[uid]
    # clear prior seeded data for idempotency
    jids = [r[0] for r in cur.execute("SELECT id FROM journal_entries WHERE student_id=?", (uid,)).fetchall()]
    for jid in jids:
        cur.execute("DELETE FROM evaluations WHERE journal_id=?", (jid,))
    cur.execute("DELETE FROM journal_entries WHERE student_id=?", (uid,))
    cur.execute("DELETE FROM self_evaluations WHERE student_id=?", (uid,))
    cur.execute("DELETE FROM learning_progress_scores WHERE student_id=?", (uid,))

    for wk in range(1, WEEKS+1):
        jid = f"{uid}-j{wk:02d}"
        edate = f"2024-{4 + (wk-1)//4:02d}-{((wk-1)%4)*7+3:02d}"
        content = f"第{wk}週の実習を振り返り、児童の反応を観察し授業改善を試みた。" * 4
        cur.execute("""INSERT INTO journal_entries
            (id,student_id,entry_date,week_number,title,content,word_count,status)
            VALUES (?,?,?,?,?,?,?, 'submitted')""",
            (jid, uid, edate, wk, f"第{wk}週 実習日誌", content, len(content)))
        f = [factor_score(base, slope, wk) for _ in range(6)]
        total = round(sum(f)/6, 2)
        eid = f"{uid}-e{wk:02d}"
        cur.execute("""INSERT INTO evaluations
            (id,journal_id,eval_type,total_score,
             factor1_score,factor2_score,factor3_score,factor4_score,factor5_score,factor6_score,
             overall_comment)
            VALUES (?,?, 'ai', ?,?,?,?,?,?,?,?)""",
            (eid, jid, total, f[0],f[1],f[2],f[3],f[4],f[5],
             f"第{wk}週の省察は具体的な児童の姿に基づいており成長が見られます。"))
        # self-eval (slightly different from AI, every week)
        sf = [factor_score(base-0.2, slope, wk) for _ in range(6)]
        cur.execute("""INSERT INTO self_evaluations
            (id,student_id,week_number,journal_id,
             factor1_score,factor2_score,factor3_score,factor4_score,factor5_score,factor6_score,
             total_score,rd_journal_level,comment)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (f"{uid}-se{wk:02d}", uid, wk, jid,
             sf[0],sf[1],sf[2],sf[3],sf[4],sf[5], round(sum(sf)/6,2),
             min(4, 1+wk//3), f"自己評価: 第{wk}週"))
        # learning progress
        cur.execute("""INSERT INTO learning_progress_scores
            (id,student_id,week_number,
             factor1_score,factor2_score,factor3_score,factor4_score,factor5_score,factor6_score,
             total_score,rd_journal_level,ga_self,ga_evidence,growth_pattern)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (f"{uid}-lp{wk:02d}", uid, wk,
             f[0],f[1],f[2],f[3],f[4],f[5], total,
             min(4, 1+wk//3), 1, 1,
             "steady" if slope < 0.15 else "accelerating"))
    print(f"full data seeded for {uid}")

c.commit()

# ---- verify ----
print("\n=== VERIFY ===")
for t in ['users','journal_entries','evaluations','self_evaluations',
          'learning_progress_scores','namikawa_bfi_responses','user_bfi_scores']:
    print(t, cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0])
print("students:", cur.execute("SELECT COUNT(*) FROM users WHERE role='student'").fetchone()[0])
print("students w/ BFI:", cur.execute("SELECT COUNT(*) FROM user_bfi_scores WHERE is_completed=1").fetchone()[0])
c.close()
print("DONE")
