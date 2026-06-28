#!/usr/bin/env python3
"""
seed_chat_logs.py
学生別 AI対話ログ閲覧機能のデモ用シードデータ投入。

各実習生（user-001/101/102/103）に対し、複数の日誌セッション
（chat_sessions）と、その省察支援対話（chat_messages：学生発言＋AI応答）
を投入する。閲覧UI（学生別 AI対話ログ）の動作確認に使用。
"""
import glob
import os
import sqlite3
import time
import random

DB_GLOB = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite"

# 実習生 → 代表的な日誌ID（最初の2件にチャットログを付与）
STUDENT_JOURNALS = {
    "user-001": ["j-001-w1-d1", "j-001-w2-d1"],
    "user-101": ["user-101-j01", "user-101-j02"],
    "user-102": ["user-102-j01", "user-102-j02"],
    "user-103": ["user-103-j01", "user-103-j02"],
}

# Phase 進行に沿った対話テンプレート（学生発言 / AI応答 / phase / RD）
CONVERSATION = [
    ("user", "今日の授業では、子どもたちの反応がいまひとつで、思ったように進みませんでした。", "phase0", 1),
    ("assistant", "うまく進まなかったと感じたのですね。具体的にはどの場面で、子どもたちのどんな反応が気になりましたか？", "phase0", None),
    ("user", "導入の発問で全員が静まり返ってしまい、誰も手を挙げませんでした。発問が難しすぎたのかもしれません。", "phase1", 2),
    ("assistant", "「発問が難しすぎた」という仮説を立てられたのですね。その発問は、子どもたちのどんな既習事項を前提にしていましたか？前時の学習とのつながりを振り返ってみましょう。", "phase1", None),
    ("user", "前の時間に扱った内容を当然知っている前提で発問していました。でも実際には半分くらいの子が忘れていたようです。だから何を聞かれているのか分からなかったのだと思います。", "phase1", 3),
    ("assistant", "前時とのつながりを丁寧に確認する必要があった、という気づきですね。とても重要な省察です。では次回、同じような導入をするとき、どんな手立てを取れば子どもたちが安心して発言できそうですか？", "bridge", None),
    ("user", "導入の前に前時の振り返りを短く入れて、簡単な発問から段階的に難しくしていこうと思います。", "bridge", 3),
    ("assistant", "具体的な改善案が出ましたね。それをSMART目標にしてみましょう。「いつ・何を・どの程度」達成するか、測定できる形で表現するとどうなりますか？", "phase2", None),
    ("user", "次回の授業（来週水曜）で、導入の最初の3分で前時の振り返りを行い、易→難の順に3つの発問を用意して、最初の発問では7割以上の児童が挙手できる状態を目指します。", "phase2", 4),
    ("assistant", "とても明確なSMART目標ですね。期限・手立て・測定可能な指標がそろっています。この目標で次の授業に臨み、結果をまた一緒に振り返りましょう。", "completed", None),
]


def find_db():
    files = glob.glob(DB_GLOB)
    if not files:
        raise SystemExit("D1 sqlite not found. Run migrations first.")
    return files[0]


def main():
    db = find_db()
    print("DB:", db)
    con = sqlite3.connect(db)
    cur = con.cursor()

    # 既存のシードを冪等にするためデモセッションを削除
    journal_ids = [j for js in STUDENT_JOURNALS.values() for j in js]
    qmarks = ",".join("?" * len(journal_ids))
    cur.execute(f"SELECT id FROM chat_sessions WHERE journal_id IN ({qmarks})", journal_ids)
    old_session_ids = [r[0] for r in cur.fetchall()]
    if old_session_ids:
        qm2 = ",".join("?" * len(old_session_ids))
        cur.execute(f"DELETE FROM chat_messages WHERE session_id IN ({qm2})", old_session_ids)
        cur.execute(f"DELETE FROM chat_sessions WHERE id IN ({qm2})", old_session_ids)
        print(f"removed {len(old_session_ids)} existing demo sessions")

    n_sessions = 0
    n_messages = 0
    for student_id, journals in STUDENT_JOURNALS.items():
        for ji, journal_id in enumerate(journals):
            session_id = f"chat-seed-{student_id}-{ji}"
            # 学生ごとに少し異なる到達フェーズにする（多様性）
            if ji == 0:
                convo = CONVERSATION
            else:
                # 2件目は途中（bridgeまで）で止めたセッション
                convo = CONVERSATION[:6]

            phases = [c[2] for c in convo]
            phase_reached = phases[-1]
            max_rd = max([c[3] for c in convo if c[3] is not None] or [0])
            completed = 1 if phase_reached == "completed" else 0
            goal_set = 1 if phase_reached in ("phase2", "completed") else 0
            total_turns = sum(1 for c in convo if c[0] == "user")

            cur.execute(
                """
                INSERT INTO chat_sessions
                  (id, student_id, journal_id, current_state, phase_reached, total_turns,
                   question_count, max_rd_chat_level, goal_set, goal_is_smart,
                   session_duration_sec, completed, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                """,
                (
                    session_id, student_id, journal_id, phase_reached, phase_reached,
                    total_turns, total_turns, max_rd, goal_set, goal_set,
                    random.randint(240, 720), completed,
                ),
            )
            n_sessions += 1

            for order, (role, content, phase, rd) in enumerate(convo, start=1):
                msg_id = f"{session_id}-m{order}"
                cur.execute(
                    """
                    INSERT INTO chat_messages
                      (id, session_id, message_order, phase, role, content, reflection_depth, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
                    """,
                    (msg_id, session_id, order, phase, role, content, rd),
                )
                n_messages += 1

    con.commit()

    cur.execute("SELECT COUNT(*) FROM chat_sessions")
    total_s = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM chat_messages")
    total_m = cur.fetchone()[0]
    print(f"seeded {n_sessions} sessions, {n_messages} messages")
    print(f"totals -> chat_sessions={total_s}, chat_messages={total_m}")
    con.close()


if __name__ == "__main__":
    main()
