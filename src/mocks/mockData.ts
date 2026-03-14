import type {
  User, JournalEntry, EvaluationResult, GrowthData, WeeklyScore,
  ChatSession, SelfEvaluation, LpsWeek, GoalEntry, StudentProfile,
} from "../types";

// ══════════════════════════════════════════════
// ユーザー（8役割 デモ用）
// ══════════════════════════════════════════════
export const MOCK_USER: User = {
  id:    "user-001",
  email: "student@teaching-eval.jp",
  name:  "山田 太郎",
  role:  "student",
  student_id: "2023A001",
};

// ══════════════════════════════════════════════
// 実習生ユーザー（山田 太郎 / 3年生・小学校実習）
// ══════════════════════════════════════════════
// 週次サイクルヘルパー
function ws(week: number, f1: number, f2: number, f3: number, f4: number): WeeklyScore {
  return { week, factor1: f1, factor2: f2, factor3: f3, factor4: f4, total: +((f1*7+f2*6+f3*4+f4*6)/23).toFixed(2) };
}

// ══════════════════════════════════════════════
// 実習日誌（山田太郎 10週分）
// week 1-6: evaluated / week 7-8: submitted / week 9-10: draft
// ══════════════════════════════════════════════
function makeHourRecords(
  journalId: string,
  week: number,
  subject1: string,
  goal1: string,
  body1: string,
  subject2: string,
  goal2: string,
  body2: string,
  lunchBody: string,
  afternoonSubject: string,
  afternoonBody: string,
) {
  return [
    {
      id: `${journalId}-r0`, order: 0,
      time_label: "朝の会", time_start: "08:15", time_end: "08:30",
      subject: "", lesson_goal: "", difficulty: "", devise: "",
      body: week <= 3
        ? "出席確認・健康観察・今日の予定を伝えた。緊張して声が小さくなってしまった。"
        : week <= 6
        ? "出席確認・健康観察・今日の連絡事項を伝えた。日直のA君に活動を任せることができた。"
        : "出席確認・健康観察・委員会からの連絡。B子さんが欠席で隣席の配慮を指示した。",
    },
    {
      id: `${journalId}-r1`, order: 1,
      time_label: "1時限", time_start: "08:30", time_end: "09:15",
      subject: subject1, lesson_goal: goal1, difficulty: "", devise: "",
      body: body1,
    },
    {
      id: `${journalId}-r2`, order: 2,
      time_label: "2時限", time_start: "09:20", time_end: "10:05",
      subject: subject2, lesson_goal: goal2, difficulty: "", devise: "",
      body: body2,
    },
    {
      id: `${journalId}-r3`, order: 3,
      time_label: "休み時間", time_start: "10:05", time_end: "10:25",
      subject: "", lesson_goal: "", difficulty: "", devise: "",
      body: week <= 4
        ? "休み時間の過ごし方を観察した。C君が一人でいたため声をかけると、一緒にドッジボールに参加した。"
        : "休み時間にD君からトラブルの相談を受けた。当事者双方の話を聞いてアドバイスした。",
    },
    {
      id: `${journalId}-r4`, order: 4,
      time_label: "3時限", time_start: "10:25", time_end: "11:10",
      subject: "理科", lesson_goal: "植物の成長条件を実験で確認する", difficulty: "", devise: "",
      body: week <= 3
        ? "実験の手順説明に時間がかかり、活動時間が圧縮された。手順カードを事前に配布すべきだった。"
        : "実験の手順カードを事前配布したことで、スムーズに進行できた。観察記録の書き方も具体的に示した。",
    },
    {
      id: `${journalId}-r5`, order: 5,
      time_label: "給食・昼休み", time_start: "12:00", time_end: "13:20",
      subject: "", lesson_goal: "", difficulty: "", devise: "",
      body: lunchBody,
    },
    {
      id: `${journalId}-r6`, order: 6,
      time_label: "5時限", time_start: "13:25", time_end: "14:10",
      subject: afternoonSubject, lesson_goal: "本時の目標を振り返り次時への見通しをもつ", difficulty: "", devise: "",
      body: afternoonBody,
    },
    {
      id: `${journalId}-r7`, order: 7,
      time_label: "帰りの会・清掃", time_start: "15:05", time_end: "15:30",
      subject: "", lesson_goal: "", difficulty: "", devise: "",
      body: week <= 3
        ? "清掃指導が不十分で、担任の先生に補助いただいた。次回は事前に分担表を確認する。"
        : "清掃分担を板書で明示したことで円滑に進んだ。帰りの会では日直への感謝を伝えた。",
    },
  ];
}

// 週ごとのデータ定義
const WEEKLY_JOURNAL_DATA = [
  {
    week: 1, subject1: "算数", goal1: "分数の足し算の意味を理解する",
    body1: "教科書の問題を解かせた後、板書で解説した。発問に対して挙手する児童が少なく、どう促すか悩んだ。ウォン君（外国籍）が手順を理解していない様子だったが適切な対応ができなかった。",
    subject2: "国語", goal2: "物語の登場人物の気持ちを読み取る",
    body2: "音読後に発問した。指名した児童だけが答え、クラス全体への広げ方がわからなかった。担任の先生のフォローに助けられた。",
    lunch: "給食を一緒に食べながら児童の様子を観察した。緊張して会話がうまくできず、雰囲気づくりの大切さを感じた。",
    aftSubject: "道徳",
    afternoon: "教科書通りに進めたが、児童の発言を引き出せなかった。発問のタイミングが難しかった。",
    reflection: "初めての授業担当で緊張が続いた。発問に対する児童の反応を引き出す方法がわからず、担任の先生の授業と比べて反省が多い。ウォン君への個別支援も十分にできなかった。次週は事前に指導案を丁寧に作り、発問計画を立てたい。",
    status: "evaluated" as const,
    univComment: "初めての実習お疲れ様でした。緊張の中でも最後まで授業をやり遂げた点は評価します。ウォン君への対応は、視覚支援ツール（絵カード・ルビ）の準備が有効です。次週は発問後に「3秒待つ」を意識してみてください。",
  },
  {
    week: 2, subject1: "算数", goal1: "分数の通分の手順を習得する",
    body1: "前時の復習をクイズ形式で行ったところ全員が積極的に参加した。ウォン君には絵カードを用意し、手順を視覚的に示した。理解できた様子で笑顔が見られた。",
    subject2: "国語", goal2: "登場人物の心情変化を叙述から捉える",
    body2: "発問後に3秒待つことを意識した。すると手を挙げる児童が増え、指名する際にグループ全体に広げることができた。",
    lunch: "給食時に意識的に児童に話しかけた。A君が算数が苦手と打ち明けてくれたので、放課後に個別フォローを計画した。",
    aftSubject: "体育",
    afternoon: "準備運動の後、グループに分かれてゲームを行った。ルール説明が長くなってしまい活動時間が短くなった反省がある。",
    reflection: "前週のフィードバックを受け、発問後に待つことを実践した。手を挙げる児童が確実に増え、効果を実感した。ウォン君への絵カード支援も機能した。体育では準備の段取りをもっと考える必要がある。次週はICTも活用してみたい。",
    status: "evaluated" as const,
    univComment: "発問後の「待ち時間」が機能しています。ウォン君への視覚支援は事前準備があってこそ。引き続き継続してください。体育の準備段取りは指導案に時間配分を明記すると改善されます。",
  },
  {
    week: 3, subject1: "算数", goal1: "分数の大小比較をマスターする",
    body1: "タブレットを使った問題演習を取り入れた。操作に慣れない児童もいたが、隣の児童が自然に教え合う場面が生まれた。ウォン君はルビ付き問題で自力解決できた。",
    subject2: "国語", goal2: "意見文の構成（主張・根拠・まとめ）を理解する",
    body2: "意見文の構成をA4シートで視覚化した。ペアで下書きを読み合う活動が盛り上がり、互いに朱書きでコメントしていた。",
    lunch: "放課後にA君の個別フォローを行った。少し時間をかけて説明すると「わかった！」と言ってくれた。信頼関係が少し築けた気がする。",
    aftSubject: "社会",
    afternoon: "地図帳を使って都道府県の特色を調べる活動を行った。グループで発表資料をまとめる際、役割分担が偏る班があり仲裁に入った。",
    reflection: "ICTを授業に取り入れることで児童の主体性が増した。学び合いが自然に生まれる環境づくりが重要と実感した。一方で、活動中の机間指導のルーティンをまだ確立できていない。次週は「誰を見るか」を事前に決めて机間指導する計画を立てる。",
    status: "evaluated" as const,
    univComment: "ICT活用と学び合いのデザインが効果を上げています。机間指導の焦点化（誰を・何のために見るか）は授業観察の核心です。指導案に「机間支援計画」を盛り込んでみましょう。",
  },
  {
    week: 4, subject1: "算数", goal1: "小数と分数の関係を理解する",
    body1: "数直線を使って視覚的に示した。机間支援計画を事前に作り、特にウォン君・A君・E子さんの3名を重点的に確認した。3名とも本時の目標を達成できた。",
    subject2: "国語", goal2: "意見文を相互評価する観点を身につける",
    body2: "ルーブリックを用いた相互評価を初めて実施した。評価観点を明確にしたことで、児童のコメントの質が向上した。",
    lunch: "給食後の掃除指導で分担板書を活用。清掃がスムーズに進み、担任の先生に「上達しましたね」とコメントをいただいた。",
    aftSubject: "音楽",
    afternoon: "リコーダーの個人練習と合奏を組み合わせた。全員が演奏できるよう個人のペースを尊重しながら進めることができた。",
    reflection: "机間支援計画の効果を実感した。事前に誰を見るかを決めておくと、授業全体を俯瞰しながら個別対応できる。ルーブリック評価も学習の目標を明確にする効果があった。来週は単元末の振り返り活動を工夫したい。",
    status: "evaluated" as const,
    univComment: "机間支援の事前計画が機能しています。ルーブリック評価の導入も適切です。単元末の振り返りでは、学習の「つながり」を児童自身が気づけるような発問を工夫しましょう。",
  },
  {
    week: 5, subject1: "算数", goal1: "分数・小数・整数の統合理解を深める",
    body1: "単元末の振り返りテストを実施した。テスト後に間違い直しの時間を設け、ペアで解説し合う活動を取り入れた。理解の定着が確認できた。",
    subject2: "国語", goal2: "自分の意見文を完成させ発表する",
    body2: "各自の意見文の発表会を行った。緊張している児童には「自分の言葉で」と声をかけた。全員が発表できた達成感を共有できた。",
    lunch: "昼休みに自由参加の算数補習（放課後学習）を実施した。5名が参加し、理解の確認ができた。",
    aftSubject: "総合",
    afternoon: "「地域を調べよう」テーマで調べ学習を開始した。情報の取捨選択の仕方を指導した。",
    reflection: "単元が一区切りつき、達成感を児童と共有できた。ペア活動による主体的な学びが定着しつつある。しかし、評価規準の設定と授業改善のサイクルがまだ弱い。次のサイクルでは単元全体を見通した計画をより丁寧に作成したい。",
    status: "evaluated" as const,
    univComment: "単元を通した学習設計の意識が育っています。ペアによる説明活動は理解の定着に効果的です。評価規準の設定と授業改善のサイクルについては、次の単元で「指導と評価の一体化」を意識した指導案を作成してみましょう。",
  },
  {
    week: 6, subject1: "算数", goal1: "比の概念と計算を理解する",
    body1: "導入でスポーツのスコアを題材にしたことで児童の関心を引き出せた。ウォン君には母語ルビ付きの問題カードを準備し、自力解決できた。クラス全体の理解率が前単元より向上した。",
    subject2: "国語", goal2: "説明文の要点をまとめる技術を身につける",
    body2: "要点整理のフレーム（トピック・サポート・コンクルージョン）を示した。グループで要約したものを発表させ、互いのまとめ方を比較した。",
    lunch: "F子さんが学校に来たくないと相談してきた。担任の先生に速やかに引き継ぎ、チームで対応した。",
    aftSubject: "図工",
    afternoon: "版画の下描き。個々のアイデアを尊重しながら技法の説明を行った。作業の途中経過を言語化させることで、思考と表現の結びつきを意識させた。",
    reflection: "日常的な題材で算数への関心を引き出せた。F子さんへの対応では、自分だけで抱え込まずすぐに担任に引き継いだことで適切なチーム対応ができた。専門的な問題は連携して解決することが大切だと学んだ。次週以降はいよいよ研究授業の準備に入る。",
    status: "evaluated" as const,
    univComment: "日常事象との結びつけが学習意欲を高めています。F子さんへの対応は判断が適切でした。チーム対応の重要性を実体験できたことは大きな学びです。研究授業の準備、一緒に考えましょう。",
  },
  {
    week: 7, subject1: "算数", goal1: "研究授業に向けた授業設計の検討",
    body1: "指導案のドラフトを指導教員に見ていただいた。発問の精選と板書計画の再設計をアドバイスいただいた。具体的な修正点が明確になった。",
    subject2: "国語", goal2: "物語文の精読を通じて叙述の根拠を示す",
    body2: "「根拠を本文から探す」活動を重点的に行った。付箋で根拠を書き出す活動が活発で、全員が参加できた。",
    lunch: "昼休みに放課後の個別学習支援を継続。A君の理解が着実に進んでいる。",
    aftSubject: "社会",
    afternoon: "調べ学習の発表資料をまとめた。プレゼン構成をフィードバックしながら個別対応した。",
    reflection: "研究授業の準備が具体化してきた。指導案の精度を上げることで自分の授業設計力が高まっていることを実感する。根拠を示して説明する活動は国語だけでなく他教科にも応用できると気づいた。",
    status: "submitted" as const,
    univComment: undefined,
  },
  {
    week: 8, subject1: "算数（研究授業）", goal1: "速さの概念を理解し、単位の換算を正確に行う",
    body1: "研究授業本番。指導案通りに進めることができた。途中、予想外の児童の発言が学習を深める方向に展開し、柔軟に対応した。参観した先生方からもコメントをいただいた。",
    subject2: "国語", goal2: "研究授業の振り返りと評価",
    body2: "研究授業後の研究協議会に参加した。参観された先生方の視点は自分とは異なり、多くの気づきを得た。",
    lunch: "研究協議会後、指導担当の先生と個別に振り返りを行った。成果と課題を整理した。",
    aftSubject: "道徳",
    afternoon: "研究授業の疲れを感じながらも、通常授業を最後まで丁寧に行った。",
    reflection: "研究授業を終えて、準備の重要性と柔軟な対応力の両方が必要だと実感した。予想外の展開を活かせたことは大きな自信になった。研究協議会での先生方のコメントから、まだ見えていない視点があることを謙虚に受け止めた。",
    status: "submitted" as const,
    univComment: undefined,
  },
  {
    week: 9, subject1: "算数", goal1: "単元の総復習と応用問題への挑戦",
    body1: "研究授業後の単元のまとめ。個々の理解度に応じた問題セットを用意した（3段階）。",
    subject2: "国語", goal2: "読書感想文の構成を学ぶ",
    body2: "読書感想文のテンプレートを示し、段落構成の基礎を指導した。",
    lunch: "残り2週間であることを意識し、担任の先生と引き継ぎの準備について相談した。",
    aftSubject: "体育",
    afternoon: "跳び箱の技の習得。段差別グループで個別対応し、全員が目標を達成できた。",
    reflection: "実習の終盤になり、ここまでの成長と残りの課題を整理したい。個別対応力はついてきたが、授業全体の構成力をさらに高める必要がある。担任への引き継ぎを丁寧に行い、児童への責任を果たしたい。",
    status: "draft" as const,
    univComment: undefined,
  },
  {
    week: 10, subject1: "算数", goal1: "最終週のまとめと振り返り",
    body1: "実習最終日の授業。「先生の授業で一番楽しかったこと」を児童に書いてもらった。ウォン君が「えカードがわかりやすかった」と書いてくれた。",
    subject2: "国語", goal2: "お別れ会の計画と実施",
    body2: "児童が自主的にお別れ会を計画してくれた。一人ひとりにメッセージカードを書いてくれた。",
    lunch: "最後の給食。全員と会話し、一人ひとりへの感謝を伝えた。",
    aftSubject: "学活",
    afternoon: "実習の締めくくりとして、10週間の振り返りを児童に話した。担任の先生への感謝も改めて伝えた。",
    reflection: "10週間の実習が終わった。最初の緊張から、今では子どもたちの名前と顔を全員把握し、個性を理解した上で関わることができるようになった。ウォン君への視覚支援、A君の個別フォロー、F子さんへのチーム対応など、それぞれの場面で学んだことは一生の財産だ。教師という仕事の奥深さと責任の重さを実感した10週間だった。",
    status: "draft" as const,
    univComment: undefined,
  },
];

export const MOCK_JOURNALS: JournalEntry[] = WEEKLY_JOURNAL_DATA.map((d) => {
  const id = `journal-${String(d.week).padStart(3, "0")}`;
  const date = new Date(2026, 3, 7 + (d.week - 1) * 7).toISOString().split("T")[0];
  const hourRecords = makeHourRecords(
    id, d.week,
    d.subject1, d.goal1, d.body1,
    d.subject2, d.goal2, d.body2,
    d.lunch, d.aftSubject, d.afternoon,
  );
  return {
    id,
    student_id:      "user-001",
    student_grade:   3,
    title:           `${date} の実習日誌（第${d.week}週）`,
    content:         JSON.stringify({ version: 2, records: hourRecords, reflection: d.reflection }),
    reflection_text: d.reflection,
    entry_date:      date,
    status:          d.status,
    week_number:     d.week,
    univ_teacher_comment: d.univComment,
  };
});

// ══════════════════════════════════════════════
// AI評価結果（週1〜6の評価済み日誌に対応）
// ══════════════════════════════════════════════

// 週別の23項目スコア（成長曲線を反映）
const WEEK_SCORES: Record<number, number[]> = {
  1: [2.5, 2.3, 2.0, 2.2, 2.1, 2.3, 2.4,  2.8, 2.6, 2.5, 2.7, 2.4, 2.5,  2.3, 2.1, 2.0, 2.2,  2.4, 2.5, 2.3, 2.2, 2.4, 2.3],
  2: [3.0, 2.8, 2.5, 2.7, 2.4, 2.8, 2.9,  3.2, 3.0, 2.9, 3.1, 2.8, 3.0,  2.7, 2.5, 2.4, 2.6,  2.8, 2.9, 2.7, 2.6, 2.8, 2.7],
  3: [3.2, 3.0, 2.7, 2.9, 2.6, 3.0, 3.1,  3.4, 3.3, 3.1, 3.3, 3.1, 3.2,  2.9, 2.8, 2.7, 2.9,  3.1, 3.2, 3.0, 2.9, 3.1, 3.0],
  4: [3.4, 3.2, 3.0, 3.1, 2.9, 3.2, 3.3,  3.7, 3.5, 3.4, 3.6, 3.3, 3.5,  3.2, 3.0, 2.9, 3.1,  3.3, 3.4, 3.2, 3.1, 3.3, 3.2],
  5: [3.5, 3.4, 3.2, 3.3, 3.1, 3.4, 3.5,  3.8, 3.7, 3.5, 3.7, 3.5, 3.7,  3.4, 3.2, 3.1, 3.3,  3.5, 3.6, 3.4, 3.3, 3.5, 3.4],
  6: [3.7, 3.6, 3.4, 3.5, 3.3, 3.6, 3.7,  4.0, 3.8, 3.7, 3.9, 3.7, 3.8,  3.6, 3.4, 3.3, 3.5,  3.7, 3.8, 3.6, 3.5, 3.7, 3.6],
};

const ITEM_META: Array<{ factor: string; label: string }> = [
  { factor: "factor1", label: "特別支援対応力（実践）" },
  { factor: "factor1", label: "外国語児童への指導実践" },
  { factor: "factor1", label: "特別支援対応力（理解）" },
  { factor: "factor1", label: "多文化共生の指導" },
  { factor: "factor1", label: "ジェンダー平等な指導" },
  { factor: "factor1", label: "文化的多様性の活用" },
  { factor: "factor1", label: "教科専門知識の活用" },
  { factor: "factor2", label: "実習体験からの学び" },
  { factor: "factor2", label: "自己の実践を評価する力" },
  { factor: "factor2", label: "積極的な学習態度" },
  { factor: "factor2", label: "フィードバックの受容" },
  { factor: "factor2", label: "専門的成長への意欲" },
  { factor: "factor2", label: "自己評価の正確性" },
  { factor: "factor3", label: "生徒指導（問題解決）" },
  { factor: "factor3", label: "安全・安心な環境形成" },
  { factor: "factor3", label: "学級秩序の維持" },
  { factor: "factor3", label: "学習の個別化" },
  { factor: "factor4", label: "チームティーチング" },
  { factor: "factor4", label: "教師としての役割理解" },
  { factor: "factor4", label: "学習困難の早期発見" },
  { factor: "factor4", label: "行動特性への理解" },
  { factor: "factor4", label: "発達段階の理解" },
  { factor: "factor4", label: "多様な学習スタイル対応" },
];

// 週別の証拠テキスト（選択的に表示）
const EVIDENCE_BY_WEEK: Record<number, string[]> = {
  1: [
    "「ウォン君への適切な対応ができなかった」という自己認識が記されている",
    "「担任の先生のフォローに助けられた」という記述から外国語支援の実践経験が窺える",
    "外国籍児童の存在認識はあるが、具体的支援方法の記述が少ない",
    "多文化への言及が朝の会の体調確認のみに留まっている",
    "性差に関する言及なし",
    "多様な見方を意識した記述は見られない",
    "教科書通りの進行で教科専門知識の積極的活用は確認できない",
    "「反省が多い」「次週は丁寧に」という成長意欲が確認できる",
    "「担任と比べて反省」という自己評価の記述がある",
    "緊張しながらも最後まで実施した積極性が窺える",
    "フィードバックへの言及は少ないが受け入れる姿勢は確認できる",
    "「次週は〜したい」という成長への責任感がある",
    "自己評価はやや低め（過小評価の傾向）",
    "トラブル対応の記述なし（初週のため）",
    "安全確認の意識は日常的に存在している",
    "「声が小さくなってしまった」という秩序維持の課題認識がある",
    "個別対応の記述が少なく一斉指導が中心",
    "担任との協働を積極的に行う姿勢がある",
    "「担任の先生のフォローに助けられた」という記述",
    "「ウォン君が理解していない様子」という早期認識はある",
    "行動特性への具体的言及は少ない",
    "発達段階を意識した記述は少ない",
    "全員一斉指導が中心",
  ],
  2: [
    "「ウォン君には絵カードを用意し、手順を視覚的に示した」",
    "前時から改善し、絵カードを事前準備した記述がある",
    "「理解できた様子で笑顔が見られた」という支援効果の確認ができる",
    "絵カードによる視覚支援が多文化対応として機能している",
    "性差に関する意識的な言及なし",
    "クラス全体への発問の広げ方を工夫した記述がある",
    "「分数の通分」という教科内容の適切な理解が窺える",
    "「効果を実感した」という実習経験からの具体的学びがある",
    "「手を挙げる児童が増え」という客観的な自己評価の視点がある",
    "前週の課題を主体的に改善した積極性が確認できる",
    "「発問後に3秒待つ」というフィードバックへの具体的な実践がある",
    "「ICTも活用してみたい」という次週への成長意欲がある",
    "自己の成長を客観的に捉える記述が増えている",
    "「A君が算数が苦手」を受け止め個別フォロー計画を立てた",
    "給食・昼休みの行動観察が記録されている",
    "体育の時間配分の課題を認識している",
    "個別フォロー計画の設定という個別化の意識がある",
    "放課後個別フォローの計画を担任に報告している",
    "「準備の段取りをもっと考える」という職務への責任意識がある",
    "「A君が算数が苦手」という個別の学習ニーズ認識がある",
    "行動面への特段の言及はない",
    "体育の活動水準を全員が参加できる形で設定している",
    "体育のルール説明の長さという問題認識がある",
  ],
  4: [
    "「机間支援計画を事前に作り、特にウォン君・A君・E子さんを重点的に確認」",
    "個別支援計画に基づいた外国籍児童への対応ができている",
    "「3名とも本時の目標を達成できた」という支援効果の確認",
    "複数の特別支援ニーズ児童への計画的対応が実践されている",
    "複数名への均等な個別対応（ウォン君・A君・E子さん）ができている",
    "多様なニーズを持つ児童を個別に計画的に支援している",
    "「小数と分数の関係」という教科内容の系統的理解が窺える",
    "「机間支援計画の効果を実感した」という実習から具体的な学びが得られている",
    "「事前計画の効果」という観点で自己実践を評価できている",
    "個別支援計画を自主的に作成した積極性が確認できる",
    "「担任の先生に上達しましたね」というフィードバックへの言及と受容がある",
    "「来週は単元末の振り返り活動を工夫したい」という継続的成長意欲がある",
    "自己の成長を具体的な証拠（3名の達成）で評価している",
    "「A君が友達とトラブルになっていたが、双方の話を聞いて仲裁した」（過去週より継続）",
    "清掃指導の改善（分担板書）が安心な環境づくりに貢献している",
    "「分担板書」により学級秩序の維持が改善されている",
    "「特にウォン君・A君・E子さんの3名を重点的に確認した」という個別化の実践",
    "担任の先生との連携が良好（コメントあり）",
    "清掃指導への責任感が向上している",
    "「ウォン君・A君・E子さん」という個別の学習ニーズ把握が深化している",
    "トラブル仲裁の経験が行動特性への理解につながっている",
    "3名それぞれの発達段階に応じた個別支援ができている",
    "「机間支援計画」により多様な学習スタイルへの対応が組織化されている",
  ],
  6: [
    "「ウォン君には母語ルビ付きの問題カードを準備し、自力解決できた」",
    "母語ルビ付き教材という高度な視覚支援ツールを自主作成している",
    "「クラス全体の理解率が前単元より向上した」という組織的な支援効果の確認",
    "日常的な題材（スポーツのスコア）での文化的文脈への配慮がある",
    "「グループ発表」での均等参加の意識が確認できる",
    "「各自の要約を比較」という多様な見方の尊重がある",
    "比率の日常的題材との接続という教科専門知識の活用がある",
    "F子さんへのチーム対応体験から「連携して解決することが大切」という学びがある",
    "「専門的な問題は連携して解決する」という実践評価の視点を獲得している",
    "F子さんへの迅速な対応という積極的姿勢が確認できる",
    "担任への迅速な引き継ぎという適切なフィードバック（連携）の実践がある",
    "「研究授業の準備に入る」という次のステップへの明確な意欲がある",
    "自己評価と実際の成果（理解率向上）が一致している",
    "「F子さんが学校に来たくないと相談してきた。担任の先生に速やかに引き継ぎ」",
    "連携対応による安全・安心な環境維持の実践がある",
    "「クラス全体の理解率が前単元より向上した」という秩序維持の成果がある",
    "「比の概念：3段階問題セット」による個別化の意識がある（前週末の計画より）",
    "担任への迅速な引き継ぎという模範的なチームワークがある",
    "F子さんへの対応での「専門的問題は連携」という役割理解の深化がある",
    "F子さんの「学校に来たくない」という心理的SOSの早期検知ができた",
    "F子さんへの適切な対応（当事者に過介入せず専門家に繋ぐ）がある",
    "「スポーツのスコア」という児童の日常と繋いだ発達段階への配慮がある",
    "要約活動での多様なまとめ方の尊重という多様な学習スタイルへの対応がある",
  ],
};

function makeEvaluation(journalId: string, week: number): EvaluationResult {
  const scores = WEEK_SCORES[week] ?? WEEK_SCORES[6];
  const evidence = EVIDENCE_BY_WEEK[week] ?? EVIDENCE_BY_WEEK[6];
  const f1Scores = scores.slice(0, 7);
  const f2Scores = scores.slice(7, 13);
  const f3Scores = scores.slice(13, 17);
  const f4Scores = scores.slice(17, 23);
  const avg = (arr: number[]) => +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2);
  const factor1 = avg(f1Scores);
  const factor2 = avg(f2Scores);
  const factor3 = avg(f3Scores);
  const factor4 = avg(f4Scores);
  const totalScore = Math.round(((factor1 * 7 + factor2 * 6 + factor3 * 4 + factor4 * 6) / 23) * 100) / 100;

  const OVERALL_COMMENTS: Record<number, string> = {
    1: "初回の実習お疲れ様でした。緊張の中でも最後まで授業をやり遂げた点は評価できます。ウォン君への対応に課題感を持てていることは省察力の高さを示しています。次週は発問後の「待ち時間」を意識することで、より多くの児童の思考を引き出せるでしょう。",
    2: "前週のフィードバックを受け、「待ち時間」の実践が明確に機能しています。ウォン君への絵カード支援も効果を上げており、事前準備の重要性を実践で学べています。体育の時間配分課題など、自己の実践を多角的に評価できる力が育っています。",
    3: "ICTを活用した学び合いのデザインが効果を上げています。学習者が主体的に動ける環境づくりへの意識が高まっています。机間指導の焦点化という次のステップも適切に見えており、確実な成長が確認できます。",
    4: "机間支援の事前計画化と個別支援の実践が高く評価できます。3名（ウォン君・A君・E子さん）それぞれのニーズを把握した上での計画的支援は、専門的な実践と言えます。ルーブリック評価の導入も適切です。",
    5: "単元全体を見通した学習設計への意識が育っています。ペア活動による主体的学びが定着し、全員発表という達成感を共有できました。評価規準の設定と授業改善のサイクルを意識した次単元の設計に期待します。",
    6: "母語ルビ付き教材という高度な支援ツールの自主作成と、F子さんへのチーム対応という専門職連携の実践が特に評価できます。「連携して解決する」という職務理解の深化は、教師としての重要な成長を示しています。",
  };

  return {
    id:             `eval-${String(week).padStart(3, "0")}`,
    journal_id:     journalId,
    status:         "completed",
    overall_comment: OVERALL_COMMENTS[week] ?? OVERALL_COMMENTS[6],
    total_score:    totalScore,
    factor_scores:  { factor1, factor2, factor3, factor4 },
    evaluated_item_count: 23,
    tokens_used:    1800 + week * 150,
    halo_check:     false,
    evaluation_items: ITEM_META.map((meta, i) => ({
      item_number:       i + 1,
      factor:            meta.factor,
      is_evaluated:      true,
      score:             scores[i] ?? 3.0,
      evidence:          evidence[i] ?? "日誌の記述から評価しました。",
      feedback:          `${meta.label}に関する実践が${scores[i] >= 3.5 ? "高く" : scores[i] >= 2.5 ? "適切に" : "芽生えつつ"}評価できます。`,
      next_level_advice: `${meta.label}のさらなる向上のため、次週の実践計画に具体的な目標を設定しましょう。`,
    })),
  };
}

export const MOCK_EVALUATION_RESULT = makeEvaluation("journal-004", 4);

// 全週分の評価結果（週1〜6）
export const MOCK_ALL_EVALUATIONS: EvaluationResult[] = [1, 2, 3, 4, 5, 6].map((week) =>
  makeEvaluation(`journal-${String(week).padStart(3, "0")}`, week)
);

// ══════════════════════════════════════════════
// 人間評価データ（RQ2 信頼性検証用）
// 評価者2名が同じ日誌を評価 → AI vs 人間のICC検証
// ══════════════════════════════════════════════
export const MOCK_HUMAN_EVALUATIONS: Array<{
  evaluator_id: string;
  evaluator_name: string;
  journal_id: string;
  week: number;
  items: Array<{ item_number: number; score: number }>;
}> = [
  {
    evaluator_id: "eval-001", evaluator_name: "評価者A（田中）",
    journal_id: "journal-004", week: 4,
    items: [
      { item_number: 1, score: 3.5 }, { item_number: 2, score: 3.0 }, { item_number: 3, score: 3.0 },
      { item_number: 4, score: 3.5 }, { item_number: 5, score: 2.5 }, { item_number: 6, score: 3.0 },
      { item_number: 7, score: 3.5 }, { item_number: 8, score: 3.5 }, { item_number: 9, score: 3.5 },
      { item_number: 10, score: 3.5 }, { item_number: 11, score: 4.0 }, { item_number: 12, score: 3.5 },
      { item_number: 13, score: 3.5 }, { item_number: 14, score: 3.5 }, { item_number: 15, score: 3.0 },
      { item_number: 16, score: 3.0 }, { item_number: 17, score: 3.5 }, { item_number: 18, score: 3.5 },
      { item_number: 19, score: 3.5 }, { item_number: 20, score: 3.5 }, { item_number: 21, score: 3.0 },
      { item_number: 22, score: 3.5 }, { item_number: 23, score: 3.5 },
    ],
  },
  {
    evaluator_id: "eval-002", evaluator_name: "評価者B（鈴木）",
    journal_id: "journal-004", week: 4,
    items: [
      { item_number: 1, score: 3.0 }, { item_number: 2, score: 3.5 }, { item_number: 3, score: 3.0 },
      { item_number: 4, score: 3.0 }, { item_number: 5, score: 3.0 }, { item_number: 6, score: 3.0 },
      { item_number: 7, score: 3.0 }, { item_number: 8, score: 4.0 }, { item_number: 9, score: 3.5 },
      { item_number: 10, score: 3.5 }, { item_number: 11, score: 3.5 }, { item_number: 12, score: 3.5 },
      { item_number: 13, score: 3.5 }, { item_number: 14, score: 3.0 }, { item_number: 15, score: 3.0 },
      { item_number: 16, score: 3.0 }, { item_number: 17, score: 3.0 }, { item_number: 18, score: 3.5 },
      { item_number: 19, score: 3.0 }, { item_number: 20, score: 3.5 }, { item_number: 21, score: 3.0 },
      { item_number: 22, score: 3.5 }, { item_number: 23, score: 3.5 },
    ],
  },
];

// ══════════════════════════════════════════════
// 成長データ（山田太郎 10週分）
// ══════════════════════════════════════════════
export const MOCK_GROWTH_DATA: GrowthData = {
  student_id: "user-001",
  weekly_scores: [
    ws(1,  2.31, 2.60, 2.15, 2.38),
    ws(2,  2.71, 2.97, 2.55, 2.77),
    ws(3,  2.91, 3.20, 2.78, 3.00),
    ws(4,  3.10, 3.50, 3.05, 3.23),
    ws(5,  3.27, 3.68, 3.20, 3.40),
    ws(6,  3.51, 3.82, 3.45, 3.63),
    ws(7,  3.58, 3.85, 3.50, 3.68),
    ws(8,  3.65, 3.90, 3.57, 3.73),
    ws(9,  3.70, 3.93, 3.62, 3.78),
    ws(10, 3.75, 3.95, 3.67, 3.82),
  ],
};

// ══════════════════════════════════════════════
// 自己評価（山田太郎 10週分）
// 成長があるが AI評価よりやや低め（過小評価傾向）
// ══════════════════════════════════════════════
export const MOCK_SELF_EVALUATIONS: SelfEvaluation[] = [
  { id: "se-1",  week: 1,  factor1: 2.0, factor2: 2.3, factor3: 2.0, factor4: 2.2, total: 2.13, comment: "初めての授業で緊張した。ウォン君への支援が不十分で反省が多い。" },
  { id: "se-2",  week: 2,  factor1: 2.5, factor2: 2.8, factor3: 2.3, factor4: 2.5, total: 2.54, comment: "絵カードが効果的だった。発問後の待ち時間を実践できた。" },
  { id: "se-3",  week: 3,  factor1: 2.8, factor2: 3.1, factor3: 2.6, factor4: 2.8, total: 2.84, comment: "ICT活用で学び合いが生まれた。机間指導の計画化が次の課題。" },
  { id: "se-4",  week: 4,  factor1: 3.0, factor2: 3.3, factor3: 2.9, factor4: 3.1, total: 3.09, comment: "机間支援計画が機能した。3名それぞれの目標達成を確認できた。" },
  { id: "se-5",  week: 5,  factor1: 3.2, factor2: 3.5, factor3: 3.1, factor4: 3.3, total: 3.29, comment: "単元のまとめができた。全員発表という達成感を共有できた。" },
  { id: "se-6",  week: 6,  factor1: 3.4, factor2: 3.7, factor3: 3.3, factor4: 3.5, total: 3.49, comment: "母語ルビ付き教材が機能した。チーム対応の大切さを実感した。" },
  { id: "se-7",  week: 7,  factor1: 3.5, factor2: 3.7, factor3: 3.4, factor4: 3.6, total: 3.56, comment: "研究授業の準備が具体化した。指導案の精度が高まっている。" },
  { id: "se-8",  week: 8,  factor1: 3.5, factor2: 3.8, factor3: 3.5, factor4: 3.7, total: 3.63, comment: "研究授業本番。予想外の展開を活かせた。研究協議会で多くを学んだ。" },
  { id: "se-9",  week: 9,  factor1: 3.6, factor2: 3.8, factor3: 3.6, factor4: 3.7, total: 3.68, comment: "実習の終盤。個別対応力はついてきた。総合的な授業力をもっと高めたい。" },
  { id: "se-10", week: 10, factor1: 3.7, factor2: 3.9, factor3: 3.6, factor4: 3.8, total: 3.76, comment: "10週間を振り返り、確実な成長を感じる。教師という仕事の奥深さを実感した。" },
];

// ══════════════════════════════════════════════
// LPS（学習進捗スコア）
// ══════════════════════════════════════════════
export const MOCK_LPS_DATA: LpsWeek[] = [
  { week: 1,  lps: 0.38, self_eval: 2.13, ai_eval: 2.36, growth_rate: 0.00 },
  { week: 2,  lps: 0.45, self_eval: 2.53, ai_eval: 2.70, growth_rate: 0.14 },
  { week: 3,  lps: 0.52, self_eval: 2.83, ai_eval: 2.97, growth_rate: 0.10 },
  { week: 4,  lps: 0.60, self_eval: 3.08, ai_eval: 3.22, growth_rate: 0.08 },
  { week: 5,  lps: 0.67, self_eval: 3.28, ai_eval: 3.39, growth_rate: 0.05 },
  { week: 6,  lps: 0.73, self_eval: 3.48, ai_eval: 3.60, growth_rate: 0.06 },
  { week: 7,  lps: 0.76, self_eval: 3.55, ai_eval: 3.65, growth_rate: 0.01 },
  { week: 8,  lps: 0.79, self_eval: 3.63, ai_eval: 3.71, growth_rate: 0.02 },
  { week: 9,  lps: 0.81, self_eval: 3.68, ai_eval: 3.76, growth_rate: 0.01 },
  { week: 10, lps: 0.83, self_eval: 3.75, ai_eval: 3.80, growth_rate: 0.01 },
];

// ══════════════════════════════════════════════
// 目標履歴（SMART目標）
// ══════════════════════════════════════════════
export const MOCK_GOAL_HISTORY: GoalEntry[] = [
  {
    id: "g-1", week: 1,
    goal_text: "発問後に「3秒」待つ習慣を毎回の授業で実践する（次週の全発問で確認）",
    is_smart: true, achieved: true, created_at: "2026-04-14T10:00:00Z",
  },
  {
    id: "g-2", week: 2,
    goal_text: "ウォン君のために絵カードを事前に3枚以上準備して毎日の授業で活用する",
    is_smart: true, achieved: true, created_at: "2026-04-21T10:00:00Z",
  },
  {
    id: "g-3", week: 3,
    goal_text: "机間指導で「重点観察児童リスト」を作り授業ごとに記録する",
    is_smart: true, achieved: true, created_at: "2026-04-28T10:00:00Z",
  },
  {
    id: "g-4", week: 4,
    goal_text: "ルーブリック評価を算数の単元末テストに導入し評価基準を児童と共有する",
    is_smart: true, achieved: true, created_at: "2026-05-05T10:00:00Z",
  },
  {
    id: "g-5", week: 5,
    goal_text: "省察の記述量を毎回600文字以上にし、改善点を必ず1つ以上記載する",
    is_smart: true, achieved: true, created_at: "2026-05-12T10:00:00Z",
  },
  {
    id: "g-6", week: 6,
    goal_text: "母語ルビ付き教材を算数・国語で各1枚ずつ自作してウォン君に使用する",
    is_smart: true, achieved: true, created_at: "2026-05-19T10:00:00Z",
  },
  {
    id: "g-7", week: 7,
    goal_text: "研究授業の指導案に「机間支援計画」「評価規準」を明記し担当教員に提出する",
    is_smart: true, achieved: true, created_at: "2026-05-26T10:00:00Z",
  },
  {
    id: "g-8", week: 8,
    goal_text: "研究授業後の研究協議会でコメントを3つ以上記録し次の授業改善に反映する",
    is_smart: true, achieved: true, created_at: "2026-06-02T10:00:00Z",
  },
  {
    id: "g-9", week: 9,
    goal_text: "実習最終週の引き継ぎメモを作成し担任の先生に提出する（A4 1枚以上）",
    is_smart: true, achieved: false, created_at: "2026-06-09T10:00:00Z",
  },
  {
    id: "g-10", week: 10,
    goal_text: "10週間の実習全体の省察レポートを2000文字以上で書き指導教員に提出する",
    is_smart: true, achieved: false, created_at: "2026-06-16T10:00:00Z",
  },
];

// ══════════════════════════════════════════════
// チャットセッション（省察支援 Phase0→Phase2）
// ══════════════════════════════════════════════
export const MOCK_CHAT_SESSION: ChatSession = {
  id:         "chat-004",
  journal_id: "journal-004",
  phase:      "phase2",
  created_at: "2026-05-06T09:00:00Z",
  messages: [
    {
      id: "m1", role: "assistant",
      content: "【Phase 0: 出来事の記述】\n今週の日誌を読みました。机間支援計画を実践した第4週ですね。今週特に印象に残った出来事を、できるだけ具体的に教えてください。",
      timestamp: "2026-05-06T09:00:00Z",
    },
    {
      id: "m2", role: "user",
      content: "事前に「重点観察児童リスト」を作って、ウォン君・A君・E子さんの3人に重点的に机間支援しました。3人とも今日の目標を達成できました。",
      timestamp: "2026-05-06T09:01:00Z",
    },
    {
      id: "m3", role: "assistant",
      content: "3人全員の目標達成、素晴らしいですね！「重点観察児童リスト」を使った机間支援が機能したということですが、実際に机間を回っているとき、その3人の様子を見てどう感じましたか？",
      timestamp: "2026-05-06T09:01:30Z",
    },
    {
      id: "m4", role: "user",
      content: "ウォン君は絵カードを手がかりに自分で解き始めていて、前の週と全然違うと思いました。A君は少し難しい問題でも諦めずに取り組んでいました。E子さんは理解が早くて「次の問題に進んでいい？」と聞いてきました。",
      timestamp: "2026-05-06T09:02:00Z",
    },
    {
      id: "m5", role: "assistant",
      content: "【Phase 1: 省察・分析】\n3人それぞれの変化をとても細かく観察できていますね。特にウォン君の「前の週と全然違う」という変化について、何がその変化を生んだと思いますか？",
      timestamp: "2026-05-06T09:02:30Z",
    },
    {
      id: "m6", role: "user",
      content: "毎週絵カードを使い続けたことで、ウォン君自身が「絵カードを見ればわかる」という自信がついたんだと思います。最初は私が説明しながら使っていたけど、今週は自分から手を伸ばして使っていました。",
      timestamp: "2026-05-06T09:03:30Z",
    },
    {
      id: "m7", role: "assistant",
      content: "「支援ツールを自ら使うようになった」という変化は、教育学的に言うと「足場かけ（scaffolding）の撤去」に相当する重要な成長です。ウォン君が自律した学習者になっている証拠ですね。\n\nそれを生み出したのは、あなたが毎週継続して同じツールを使い続けたことです。この「継続性」はなぜ重要だと思いますか？",
      timestamp: "2026-05-06T09:04:00Z",
    },
    {
      id: "m8", role: "user",
      content: "子どもが「これがあれば大丈夫」という安心感を持てるからだと思います。毎回違う方法だと、その方法を覚えることに認知的な負荷がかかってしまう。",
      timestamp: "2026-05-06T09:05:00Z",
    },
    {
      id: "m9", role: "assistant",
      content: "「認知的負荷」という概念を自然に使えていますね！まさにその通りです。Swellerの認知負荷理論では、ツールの一貫性が外在的負荷を下げ、本質的学習（内在的負荷）に集中できる環境を作ると説明されます。\n\n【Bridge】\nでは、E子さんの「次の問題に進んでいい？」という場面についても考えてみましょう。あなたはその時どう対応しましたか？また、どう対応すべきだったと今は思いますか？",
      timestamp: "2026-05-06T09:06:00Z",
    },
    {
      id: "m10", role: "user",
      content: "「いいよ、でも終わったら隣の子を助けてあげて」と言いました。その場の判断でしたが、E子さんも嬉しそうにしていたし、隣の子も助けてもらっていました。",
      timestamp: "2026-05-06T09:07:00Z",
    },
    {
      id: "m11", role: "assistant",
      content: "【Phase 2: 概念化・一般化】\nそれは素晴らしい即興の対応です！E子さんを「教える役」にすることで、E子さん自身の理解がより深まるという「プロテジェ効果（Protégé Effect）」が働いています。\n\nここまでの省察を整理すると：\n① 継続的な視覚支援 → 学習者の自律性向上（足場かけと撤去）\n② 事前計画型机間支援 → 個別ニーズへの的確な対応\n③ 理解の早い学習者を「教え手」に → 全員の学びの深化\n\nこれらに共通する教育観を一言で表現すると、あなたはどう言いますか？",
      timestamp: "2026-05-06T09:08:00Z",
    },
    {
      id: "m12", role: "user",
      content: "「一人ひとりの強みを活かして、全員が学べる環境をつくる」でしょうか。",
      timestamp: "2026-05-06T09:09:30Z",
    },
    {
      id: "m13", role: "assistant",
      content: "完璧な言語化です。それはインクルーシブ教育の核心であり、UDL（学びのユニバーサルデザイン）の理念と一致しています。\n\n来週の目標として、この教育観をどう実践に落とし込みますか？SMART形式で設定してみましょう。",
      timestamp: "2026-05-06T09:10:00Z",
    },
    {
      id: "m14", role: "user",
      content: "「来週の算数では、理解の早い児童2名をピア・チューターとして位置づけ、授業の最後10分でペア説明活動を実施する。ペア活動後に全員に自己評価カードを書かせて効果を確認する。」",
      timestamp: "2026-05-06T09:11:00Z",
    },
    {
      id: "m15", role: "assistant",
      content: "✅ SMART目標として完璧です！\n- Specific: ピア・チューター2名・算数・最後10分\n- Measurable: 自己評価カードで効果確認\n- Achievable: 現在の力から実現可能\n- Relevant: 今週の省察から直結した実践\n- Time-bound: 来週の授業で実施\n\nこの省察セッションで、あなたは出来事の記述から概念化まで素晴らしい省察の深化を見せてくれました。来週の実践を楽しみにしています！",
      timestamp: "2026-05-06T09:12:00Z",
    },
  ],
};

// ══════════════════════════════════════════════
// コーホートプロフィール（30名 リアル版）
// 論文3 RQ3a: LGCM縦断分析用
// ══════════════════════════════════════════════
const STUDENT_DATA: Array<{
  name: string; gender: "male"|"female"; grade: 2|3|4;
  school_type: "elementary"|"middle"|"high"|"special";
  internship_type: "intensive"|"distributed";
  weeks: number; school_suffix: string; supervisor: string;
  big5: [number,number,number,number,number];
  f1s: number; f2s: number; f3s: number; f4s: number;
  f1e: number; f2e: number; f3e: number; f4e: number;
}> = [
  // 小学校・集中実習 10名
  { name: "山田 太郎",   gender: "male",   grade: 3, school_type: "elementary", internship_type: "intensive",   weeks: 10, school_suffix: "東小",   supervisor: "田中 誠一",  big5: [3.2,3.8,3.5,2.8,3.2], f1s:2.3,f2s:2.6,f3s:2.2,f4s:2.4, f1e:3.8,f2e:4.0,f3e:3.7,f4e:3.8 },
  { name: "佐藤 花子",   gender: "female", grade: 3, school_type: "elementary", internship_type: "intensive",   weeks: 10, school_suffix: "西小",   supervisor: "佐藤 めぐみ", big5: [2.8,4.0,3.8,3.2,3.6], f1s:2.5,f2s:2.8,f3s:2.4,f4s:2.6, f1e:3.6,f2e:3.9,f3e:3.5,f4e:3.7 },
  { name: "鈴木 健一",   gender: "male",   grade: 4, school_type: "elementary", internship_type: "intensive",   weeks: 10, school_suffix: "南小",   supervisor: "山田 浩二",  big5: [3.5,3.5,3.2,2.5,2.8], f1s:2.8,f2s:3.0,f3s:2.6,f4s:2.8, f1e:3.7,f2e:3.8,f3e:3.6,f4e:3.8 },
  { name: "高橋 美咲",   gender: "female", grade: 4, school_type: "elementary", internship_type: "intensive",   weeks: 10, school_suffix: "北小",   supervisor: "高橋 雅子",  big5: [3.0,4.2,4.0,2.0,3.5], f1s:3.0,f2s:3.2,f3s:2.8,f4s:3.0, f1e:4.0,f2e:4.2,f3e:3.9,f4e:4.0 },
  { name: "中村 翔太",   gender: "male",   grade: 2, school_type: "elementary", internship_type: "intensive",   weeks: 10, school_suffix: "中央小", supervisor: "木村 恵子",  big5: [2.5,3.5,3.0,3.5,3.8], f1s:2.0,f2s:2.3,f3s:1.9,f4s:2.1, f1e:3.2,f2e:3.4,f3e:3.0,f4e:3.2 },
  { name: "伊藤 亜衣",   gender: "female", grade: 3, school_type: "elementary", internship_type: "intensive",   weeks: 10, school_suffix: "東小",   supervisor: "田中 誠一",  big5: [3.8,3.6,3.4,2.2,3.0], f1s:2.7,f2s:3.0,f3s:2.5,f4s:2.7, f1e:3.8,f2e:4.0,f3e:3.7,f4e:3.9 },
  { name: "渡辺 大輝",   gender: "male",   grade: 2, school_type: "elementary", internship_type: "intensive",   weeks: 10, school_suffix: "西小",   supervisor: "佐藤 めぐみ", big5: [2.0,3.2,2.8,4.0,3.5], f1s:2.1,f2s:2.4,f3s:2.0,f4s:2.2, f1e:3.0,f2e:3.3,f3e:2.9,f4e:3.1 },
  { name: "加藤 沙織",   gender: "female", grade: 4, school_type: "elementary", internship_type: "intensive",   weeks: 10, school_suffix: "南小",   supervisor: "山田 浩二",  big5: [3.2,4.5,4.2,1.8,3.2], f1s:3.1,f2s:3.3,f3s:2.9,f4s:3.1, f1e:4.0,f2e:4.3,f3e:3.9,f4e:4.1 },
  { name: "木村 浩二",   gender: "male",   grade: 3, school_type: "elementary", internship_type: "intensive",   weeks: 10, school_suffix: "北小",   supervisor: "高橋 雅子",  big5: [3.0,3.0,3.5,3.0,4.0], f1s:2.4,f2s:2.7,f3s:2.3,f4s:2.5, f1e:3.5,f2e:3.7,f3e:3.4,f4e:3.6 },
  { name: "清水 麻衣",   gender: "female", grade: 2, school_type: "elementary", internship_type: "intensive",   weeks: 10, school_suffix: "中央小", supervisor: "木村 恵子",  big5: [2.8,4.0,3.6,2.5,3.3], f1s:2.2,f2s:2.5,f3s:2.1,f4s:2.3, f1e:3.3,f2e:3.6,f3e:3.2,f4e:3.4 },
  // 中学校・集中実習 5名
  { name: "岡田 直樹",   gender: "male",   grade: 4, school_type: "middle",     internship_type: "intensive",   weeks: 10, school_suffix: "東中",   supervisor: "田中 誠一",  big5: [3.5,3.2,3.8,2.5,3.0], f1s:2.9,f2s:3.1,f3s:2.7,f4s:2.9, f1e:3.8,f2e:4.0,f3e:3.7,f4e:3.9 },
  { name: "松本 裕子",   gender: "female", grade: 3, school_type: "middle",     internship_type: "intensive",   weeks: 10, school_suffix: "西中",   supervisor: "佐藤 めぐみ", big5: [2.5,4.0,3.5,2.8,3.8], f1s:2.6,f2s:2.9,f3s:2.5,f4s:2.7, f1e:3.5,f2e:3.8,f3e:3.4,f4e:3.6 },
  { name: "橋本 龍一",   gender: "male",   grade: 2, school_type: "middle",     internship_type: "intensive",   weeks: 10, school_suffix: "南中",   supervisor: "山田 浩二",  big5: [3.8,2.8,3.0,3.2,3.5], f1s:2.2,f2s:2.5,f3s:2.1,f4s:2.3, f1e:3.3,f2e:3.5,f3e:3.2,f4e:3.4 },
  { name: "石川 由美",   gender: "female", grade: 4, school_type: "middle",     internship_type: "intensive",   weeks: 10, school_suffix: "北中",   supervisor: "高橋 雅子",  big5: [2.8,4.2,4.0,2.0,3.2], f1s:3.0,f2s:3.2,f3s:2.8,f4s:3.0, f1e:3.9,f2e:4.1,f3e:3.8,f4e:4.0 },
  { name: "林 大介",     gender: "male",   grade: 3, school_type: "middle",     internship_type: "intensive",   weeks: 10, school_suffix: "中央中", supervisor: "木村 恵子",  big5: [3.2,3.5,3.3,2.7,3.0], f1s:2.5,f2s:2.7,f3s:2.4,f4s:2.6, f1e:3.6,f2e:3.8,f3e:3.5,f4e:3.7 },
  // 小学校・分散実習 5名
  { name: "小林 奈々",   gender: "female", grade: 2, school_type: "elementary", internship_type: "distributed", weeks: 8,  school_suffix: "東小",   supervisor: "田中 誠一",  big5: [2.5,3.8,3.2,3.0,3.5], f1s:2.1,f2s:2.4,f3s:2.0,f4s:2.2, f1e:3.1,f2e:3.4,f3e:3.0,f4e:3.2 },
  { name: "山口 健太",   gender: "male",   grade: 3, school_type: "elementary", internship_type: "distributed", weeks: 8,  school_suffix: "西小",   supervisor: "佐藤 めぐみ", big5: [3.0,3.2,3.5,2.8,3.8], f1s:2.3,f2s:2.6,f3s:2.2,f4s:2.4, f1e:3.2,f2e:3.5,f3e:3.1,f4e:3.3 },
  { name: "松田 千尋",   gender: "female", grade: 4, school_type: "elementary", internship_type: "distributed", weeks: 10, school_suffix: "南小",   supervisor: "山田 浩二",  big5: [2.8,4.5,4.2,1.5,3.0], f1s:2.9,f2s:3.1,f3s:2.7,f4s:2.9, f1e:3.7,f2e:3.9,f3e:3.6,f4e:3.8 },
  { name: "野村 拓也",   gender: "male",   grade: 2, school_type: "elementary", internship_type: "distributed", weeks: 6,  school_suffix: "北小",   supervisor: "高橋 雅子",  big5: [2.0,3.0,2.8,4.2,4.0], f1s:1.9,f2s:2.2,f3s:1.8,f4s:2.0, f1e:2.8,f2e:3.1,f3e:2.7,f4e:2.9 },
  { name: "藤田 恵子",   gender: "female", grade: 3, school_type: "elementary", internship_type: "distributed", weeks: 8,  school_suffix: "中央小", supervisor: "木村 恵子",  big5: [3.5,4.0,3.8,2.0,3.2], f1s:2.6,f2s:2.9,f3s:2.5,f4s:2.7, f1e:3.5,f2e:3.8,f3e:3.4,f4e:3.6 },
  // 高校 5名
  { name: "坂本 涼太",   gender: "male",   grade: 4, school_type: "high",       internship_type: "intensive",   weeks: 10, school_suffix: "東高",   supervisor: "田中 誠一",  big5: [3.5,3.0,4.0,2.5,3.8], f1s:2.8,f2s:3.0,f3s:2.6,f4s:2.8, f1e:3.7,f2e:3.9,f3e:3.6,f4e:3.8 },
  { name: "吉田 梨花",   gender: "female", grade: 3, school_type: "high",       internship_type: "intensive",   weeks: 10, school_suffix: "西高",   supervisor: "佐藤 めぐみ", big5: [2.8,4.2,3.5,2.2,3.0], f1s:2.7,f2s:2.9,f3s:2.5,f4s:2.7, f1e:3.6,f2e:3.8,f3e:3.5,f4e:3.7 },
  { name: "山田 悠",     gender: "male",   grade: 2, school_type: "high",       internship_type: "distributed", weeks: 8,  school_suffix: "南高",   supervisor: "山田 浩二",  big5: [3.0,3.5,3.2,3.0,4.5], f1s:2.2,f2s:2.5,f3s:2.1,f4s:2.3, f1e:3.1,f2e:3.4,f3e:3.0,f4e:3.2 },
  { name: "田村 詩織",   gender: "female", grade: 4, school_type: "high",       internship_type: "intensive",   weeks: 10, school_suffix: "北高",   supervisor: "高橋 雅子",  big5: [2.5,4.5,4.5,1.5,3.2], f1s:3.0,f2s:3.2,f3s:2.8,f4s:3.0, f1e:4.0,f2e:4.2,f3e:3.9,f4e:4.1 },
  { name: "前田 隆",     gender: "male",   grade: 3, school_type: "high",       internship_type: "intensive",   weeks: 10, school_suffix: "中央高", supervisor: "木村 恵子",  big5: [3.8,3.0,3.5,2.8,3.5], f1s:2.6,f2s:2.8,f3s:2.4,f4s:2.6, f1e:3.5,f2e:3.7,f3e:3.4,f4e:3.6 },
  // 特別支援 5名
  { name: "中田 玲奈",   gender: "female", grade: 4, school_type: "special",    internship_type: "intensive",   weeks: 10, school_suffix: "東特支", supervisor: "田中 誠一",  big5: [3.0,4.5,4.2,1.8,3.0], f1s:3.2,f2s:3.4,f3s:3.0,f4s:3.2, f1e:4.1,f2e:4.3,f3e:4.0,f4e:4.2 },
  { name: "森田 健悟",   gender: "male",   grade: 3, school_type: "special",    internship_type: "intensive",   weeks: 10, school_suffix: "西特支", supervisor: "佐藤 めぐみ", big5: [2.8,4.0,3.8,2.5,3.5], f1s:2.8,f2s:3.0,f3s:2.6,f4s:2.8, f1e:3.8,f2e:4.0,f3e:3.7,f4e:3.9 },
  { name: "川口 絵里",   gender: "female", grade: 2, school_type: "special",    internship_type: "distributed", weeks: 8,  school_suffix: "南特支", supervisor: "山田 浩二",  big5: [2.5,4.2,4.0,2.0,3.0], f1s:2.3,f2s:2.6,f3s:2.2,f4s:2.4, f1e:3.3,f2e:3.6,f3e:3.2,f4e:3.4 },
  { name: "竹内 隼人",   gender: "male",   grade: 4, school_type: "special",    internship_type: "intensive",   weeks: 10, school_suffix: "北特支", supervisor: "高橋 雅子",  big5: [3.2,3.8,4.2,2.0,3.5], f1s:3.0,f2s:3.2,f3s:2.8,f4s:3.0, f1e:3.9,f2e:4.1,f3e:3.8,f4e:4.0 },
  { name: "原田 智子",   gender: "female", grade: 3, school_type: "special",    internship_type: "intensive",   weeks: 10, school_suffix: "中央特支",supervisor: "木村 恵子", big5: [2.8,4.3,3.8,2.2,3.2], f1s:2.7,f2s:2.9,f3s:2.5,f4s:2.7, f1e:3.7,f2e:3.9,f3e:3.6,f4e:3.8 },
];

function makeWeeklyScoresFromData(
  f1s: number, f2s: number, f3s: number, f4s: number,
  f1e: number, f2e: number, f3e: number, f4e: number,
  weeks: number
): WeeklyScore[] {
  return Array.from({ length: weeks }, (_, i) => {
    const t = weeks === 1 ? 1 : i / (weeks - 1);
    // 成長は緩やかな非線形（logistic風）
    const curve = 1 / (1 + Math.exp(-6 * (t - 0.5)));
    const f1 = +(f1s + (f1e - f1s) * curve + (Math.random() - 0.5) * 0.05).toFixed(2);
    const f2 = +(f2s + (f2e - f2s) * curve + (Math.random() - 0.5) * 0.05).toFixed(2);
    const f3 = +(f3s + (f3e - f3s) * curve + (Math.random() - 0.5) * 0.05).toFixed(2);
    const f4 = +(f4s + (f4e - f4s) * curve + (Math.random() - 0.5) * 0.05).toFixed(2);
    return { week: i + 1, factor1: f1, factor2: f2, factor3: f3, factor4: f4, total: +((f1*7+f2*6+f3*4+f4*6)/23).toFixed(2) };
  });
}

export const MOCK_COHORT_PROFILES: StudentProfile[] = STUDENT_DATA.map((d, i) => {
  const totalFinal = (d.f1e * 7 + d.f2e * 6 + d.f3e * 4 + d.f4e * 6) / 23;
  const totalStart = (d.f1s * 7 + d.f2s * 6 + d.f3s * 4 + d.f4s * 6) / 23;
  const schoolTypeLabel = { elementary: "小", middle: "中", high: "高", special: "特別支援" }[d.school_type];
  return {
    id:             `student-${String(i + 1).padStart(3, "0")}`,
    student_number: `2023${d.grade}${String(i + 1).padStart(4, "0")}`,
    name:           d.name,
    gender:         d.gender,
    grade:          d.grade,
    school_type:    d.school_type,
    internship_type: d.internship_type,
    weeks:          d.weeks,
    school_name:    `〇〇市立${d.school_suffix}学校`.replace("小学校", `${schoolTypeLabel}学校`).replace("中学校", `${schoolTypeLabel}学校`).replace("高学校", "高校").replace("特別支援学校", "特別支援学校"),
    supervisor:     d.supervisor,
    big_five: {
      extraversion:      d.big5[0],
      agreeableness:     d.big5[1],
      conscientiousness: d.big5[2],
      neuroticism:       d.big5[3],
      openness:          d.big5[4],
      measured_at:       "2026-04-01",
    },
    final_factor1: d.f1e,
    final_factor2: d.f2e,
    final_factor3: d.f3e,
    final_factor4: d.f4e,
    final_total:   +totalFinal.toFixed(2),
    growth_delta:  +(totalFinal - totalStart).toFixed(2),
    self_eval_gap: +(Math.abs(d.f2e - d.f2s) * 0.3).toFixed(2),
    lps:           +(0.5 + (totalFinal - 2.5) * 0.2).toFixed(2),
    weekly_scores: makeWeeklyScoresFromData(d.f1s, d.f2s, d.f3s, d.f4s, d.f1e, d.f2e, d.f3e, d.f4e, d.weeks),
  };
});
