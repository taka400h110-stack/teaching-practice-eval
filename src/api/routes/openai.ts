// @ts-nocheck
/**
 * src/api/routes/openai.ts
 * Hono APIルート: OpenAI GPT-4 CoT-A / CoT-B / CoT-C
 * 論文第4章 4.4節: AI評価エンジン（CoT-A）
 *            4.6節: 省察チャットBot（CoT-B / CoT-C）
 *
 * CoT-A temperature=0.2 → 23項目×5段階ルーブリック評価
 *   2026-03-07: 全23項目の評価基準をRD水準付き3列構成に更新
 *   出力に rd_level フィールドを追加（Hatton & Smith, 1995 準拠）
 * CoT-B temperature=0.1 → Hatton & Smith 4レベル省察深さ判定
 * CoT-C temperature=0.3 → Locke & Latham SMART目標提案
 *
 * 環境変数: OPENAI_API_KEY
 */
import { Hono } from "hono";
import { cors } from "hono/cors";

function getAuthContext(c: any) {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    const token = auth.split(' ')[1];
    return JSON.parse(atob(token));
  } catch (e) {
    return null;
  }
}

const openaiRouter = new Hono<{ Bindings: CloudflareBindings }>();
openaiRouter.use("*", cors());

// ────────────────────────────────────────────────────────────────
// CoT-Aプロンプト（AI評価）
// 論文 4.4.2: temperature=0.2、JSON出力
// ────────────────────────────────────────────────────────────────
function buildCoTAPrompt(journalContent: string, studentName: string, weekNumber: number): string {
  return `あなたは教育実習評価の専門家AIです。以下の実習日誌を4因子23項目のルーブリックで評価してください。

## 評価対象
実習生: ${studentName}
第${weekNumber}週 実習日誌:
---
${journalContent}
---

## 全因子共通：Hatton & Smith（1995）省察深度（RD）水準
全23項目の5段階行動指標はすべてこのRD水準と対応します。

| スコア | RD水準 | 省察の特徴 |
|:---:|:---:|:---|
| 5 | RD4 批判的省察 | 教育的信念・社会的文脈・倫理的観点と実践を結びつけ、信念の根拠そのものを問い直す |
| 4 | RD3 対話的省察 | 実践の原因・背景を多角的に分析し、代替案・改善策を具体的に検討する |
| 3 | RD2 記述的省察 | 感情・気づき・印象を言語化するが、原因分析や代替案は限定的 |
| 2 | RD1 記述的書き込み | 出来事・事実の列挙にとどまり、省察的要素がない |
| 1 | RD0 省察なし | 当該側面への記述・省察が日誌に見られない |

---

## ルーブリック（4因子23項目・RD水準対応行動指標）

### 因子Ⅰ 児童生徒への指導力（項目1-7, α=.87）
**定義：** 多様な背景（障害・言語・性別・文化）を持つ児童生徒を理解し、実態に応じた授業設計と個別対応ができる力

1. 【特別支援対応力（実践）λ=.95】特別な支援を必要とする児童（身体障害を有する者を含む）に対して、見通しをもって適切な対応ができること
   - 5(RD4): IEP相当の支援をインクルーシブ教育の理念・障害者権利条約と批判的に結びつけ、支援選択の前提を問い直した記述
   - 4(RD3): 座席・教材・声かけの原因・背景を分析し、代替支援を検討した上で実践し、結果を省察
   - 3(RD2): 担当教員の指示に従い支援し、気づきを言語化（原因分析・代替案は限定的）
   - 2(RD1): 支援の事実のみ記述（「○○をした」等）、省察なし
   - 1(RD0): 特別支援への対応・省察が日誌に見られない

2. 【外国語児童への指導実践 λ=.85】自国の言語が母語でない児童に対して、適切な対応や指導ができること
   - 5(RD4): JSLカリキュラム・多文化共生の信念と実践を批判的に結びつけ、指導手段選択の前提を問い直した記述
   - 4(RD3): 視覚教材・言い換え等の複数工夫の原因・背景を分析し、代替案を検討した省察
   - 3(RD2): 指導教員のアドバイスに従い対応し、感想・気づきを言語化（根拠・代替案は限定的）
   - 2(RD1): 対応の事実のみ記述（「ゆっくり話した」等）、省察なし
   - 1(RD0): 該当児童への個別対応・省察が記述されていない

3. 【特別支援対応力（理解）λ=.81】特別な支援を必要とする児童に対して、どのような対応をすればよいかを理解していること
   - 5(RD4): 障害種別に応じた対応根拠を倫理的・社会的観点から問い直した記述
   - 4(RD3): 複数の障害特性と対応策の因果関係を分析し、授業設計への反映と代替案を検討
   - 3(RD2): 一般的な支援知識を言語化（応用根拠・代替案は限定的）
   - 2(RD1): 知識を断片的に列挙するのみ、省察なし
   - 1(RD0): 特別支援に関する理解・省察が示されていない

4. 【外国語児童への対応理解 λ=.64】自国の言語が母語でない児童に対して、どのような対応をすればよいかを理解していること
   - 5(RD4): JSLカリキュラム等の制度的枠組みを多文化共生の信念と批判的に結びつけた記述
   - 4(RD3): 日本語指導方針の差異を分析し、複数の選択肢と判断根拠を具体的に検討
   - 3(RD2): 言語面の配慮への理解を言語化（制度的背景・代替案は限定的）
   - 2(RD1): 「配慮が必要」という認識の事実記述のみ
   - 1(RD0): 外国語児童への対応理解・省察が記述に見られない

5. 【性差・多様性への理解 λ=.58】児童の「性別」による心理・行動の違いの重要性を正しく理解していること
   - 5(RD4): 性差の発達心理学的知見を教育的信念・倫理的観点と批判的に結びつけ、固定的性別観を問い直した記述
   - 4(RD3): グループ編成・声かけにおける性差配慮の原因・背景を分析し、別の関わり方を検討
   - 3(RD2): 性差への気づきを言語化（応用根拠・代替案は限定的）
   - 2(RD1): 性差に関する事実列挙のみ、または固定的性別観が見られる
   - 1(RD0): 性差・多様性への言及・省察がなく無自覚な偏りあり

6. 【文化的多様性への理解 λ=.45】児童の発達と健康は、様々な社会的、宗教的、民族的、文化的、言語的影響を受けることを理解していること
   - 5(RD4): 児童の行動背景にある文化的・宗教的要因を多文化共生の信念と批判的に結びつけ、自文化的前提を問い直した記述
   - 4(RD3): 文化的背景が学習・行動に影響する原因・背景を複数事例で分析し、代替的関わり方を検討
   - 3(RD2): 多文化共生への気づきを言語化（抽象的で原因分析は限定的）
   - 2(RD1): 文化的多様性の事実列挙のみ、日本文化を標準とした単一的な見方あり
   - 1(RD0): 文化的多様性への理解・省察が示されていない

7. 【教科特性を踏まえた授業設計 λ=.44】各教科等の特性を踏まえ、児童の実態に即した授業づくりができること
   - 5(RD4): 教科の本質的な見方・考え方を教育的信念・教科観と批判的に結びつけ、授業設計選択の前提を問い直した記述
   - 4(RD3): 教科特性を意識した設計の原因・背景を分析し、代替設計案を検討
   - 3(RD2): 教科書・指導書に沿った授業後の気づきを言語化（教科特性への応用根拠・代替案は限定的）
   - 2(RD1): 指導書の模倣にとどまり事実のみ記述、省察なし
   - 1(RD0): 授業設計の根拠や児童実態への省察が見られない

---

### 因子Ⅱ 自己評価力（項目8-13, α=.87）
**定義：** 実習体験を教師としての成長と結びつけ、省察・改善・自己評価を継続的に行うことができる力

8. 【体験と成長の接続 λ=.94】実習生の体験から得た知識が、教師の仕事や教師としての発達にいかに関係するかを理解できること
   - 5(RD4): 体験を教師成長理論（反省的実践家論・Dreyfusモデル等）や教育的信念と批判的に結びつけ、信念の問い直しを記述
   - 4(RD3): 体験から「なぜそうなったか」「何を学んだか」を原因－結果として分析し、改善策を検討
   - 3(RD2): 体験から得た感情・気づきを言語化（教師発達との因果分析・代替案は限定的）
   - 2(RD1): 体験を「できた・できなかった」の事実として列挙のみ
   - 1(RD0): 体験と教師成長の関係についての省察が見られない

9. 【指導姿勢の検証能力 λ=.81】授業と学習に関して語り、教育活動の発展に関する興味と関心を示し、自分自身の指導や姿勢を検証する能力を備えていること
   - 5(RD4): 指導哲学・教育的信念に照らして授業実践を批判的に問い直し、指導選択の前提を理論的裏付けとともに記述
   - 4(RD3): 自己行動（発問・板書・反応等）の原因・背景を多角的に分析し、具体的な代替策・改善案を提示
   - 3(RD2): 授業への感想や気づきを言語化（検証の視点・方法が表面的）
   - 2(RD1): 「うまくいった・うまくいかなかった」の事実評価のみ
   - 1(RD0): 自分の指導姿勢への省察が見られない

10. 【模範的姿勢の実践 λ=.72】児童に対して期待している肯定的な価値観、態度、および行動を実践して見せること
    - 5(RD4): 自己の価値観・態度を教育的信念・倫理的文脈と批判的に吟味し、模範として示すべき理由の前提を問い直した記述
    - 4(RD3): 模範的行動の効果・影響を分析し、別の示し方や選択理由を具体的に検討
    - 3(RD2): 模範を示そうとした場面の感情・気づきを言語化（原因分析・代替案は限定的）
    - 2(RD1): 模範的行動の事実のみ記述（「挨拶をした」等）、省察なし
    - 1(RD0): 模範を示すという視点での省察が見られない

11. 【フィードバック受容力 λ=.62】アドバイスとフィードバックに基づき行動し、指導と助言を受け入れること
    - 5(RD4): フィードバックを教育的信念・実践哲学に照らして批判的に検討し、取捨選択の根拠と信念の問い直しを記述
    - 4(RD3): フィードバックの背景・意図を分析し、具体的改善行動と代替案を提示し実践結果を省察
    - 3(RD2): フィードバックを受けた感情・気づきを言語化（改善行動への接続・原因分析が不明確）
    - 2(RD1): フィードバックの内容を事実として記録するのみ（「○○と言われた」等）
    - 1(RD0): フィードバックへの言及・受容の省察が見られない

12. 【実践省察と改善責任 λ=.61】自分自身の実践を反省し、改善し、専門的ニーズの発達を認識し、それを実現することに責任を持つこと
    - 5(RD4): 実践の問題点を社会的・教育的文脈と批判的に結びつけ、専門的アイデンティティの形成と関連させて省察し、長期的改善責任を表明
    - 4(RD3): 実践課題の原因を多角的に分析し、具体的改善計画と実行・再評価のサイクルを記述
    - 3(RD2): 問題点への気づきと改善意欲を言語化（原因分析・改善の具体策が浅い）
    - 2(RD1): 実践の結果を事実として記述するのみ（「授業がうまくいかなかった」等）
    - 1(RD0): 実践省察・改善責任への言及が見られない

13. 【専門性向上のための自己評価 λ=.52】教師としての専門性を向上させるために反省、自己省察することも含めて、自分自身を評価する力を有すること
    - 5(RD4): 外部評価・自己評価・教育的信念を統合し、専門的成長段階と社会的役割を批判的に評価。評価基準の根拠を倫理的観点から問い直している
    - 4(RD3): 自己評価と他者評価の差異を分析し、複数の視点から強みと課題を特定し、具体的な成長課題と改善行動を記述
    - 3(RD2): 自己評価を試み感情・気づきを言語化（評価基準が主観的で原因分析が浅い）
    - 2(RD1): 自己評価が「よかった・悪かった」の二値的判断のみ
    - 1(RD0): 自己評価・自己省察の記述が見られない

---

### 因子Ⅲ 学級経営力（項目14-17, α=.91）
**定義：** 学級全体の安全・秩序・協力関係を維持し、リーダーシップを発揮して児童の困難を支援できる力

14. 【生徒指導力 λ=.91】クラス運営に伴う生徒指導に関する力を有すること
    - 5(RD4): 問題行動の背景要因を生徒指導の理念・社会的文脈と批判的に結びつけ、指導方針選択の前提を問い直した記述
    - 4(RD3): 問題場面の原因・背景を多角的に分析し、代替的介入方法を検討の上で対応し、指導後の省察を記述
    - 3(RD2): 生徒指導の基本方針への気づきや感想を言語化（原因分析・代替案は限定的）
    - 2(RD1): 問題行動への対応の事実のみ記述（「注意した」等）、省察なし
    - 1(RD0): 生徒指導に関する意識・実践・省察が見られない

15. 【学級管理能力 λ=.87】クラス運営に伴う管理能力を有すること
    - 5(RD4): 管理業務を学級経営の教育的信念・学校文化の社会的文脈と批判的に結びつけ、マネジメントスタイル選択の前提を問い直した記述
    - 4(RD3): 担任の管理スタイルの原因・背景を分析し、改善工夫と代替的アプローチを検討しながら運営した記述
    - 3(RD2): 管理業務への気づきや感想を言語化（対処法の根拠・代替案は限定的）
    - 2(RD1): 管理業務の事実のみ記述（「当番を確認した」等）、省察なし
    - 1(RD0): 学級管理への関与・省察が見られない

16. 【リーダーシップ発揮 λ=.83】権威ある存在として教室内でクラス運営に伴うリーダーシップを発揮することができること
    - 5(RD4): 民主的・支援的リーダーシップを教育的信念・権威の社会的意味と批判的に結びつけ、リーダーシップ様式選択の前提を問い直した記述
    - 4(RD3): リーダーシップ行動の原因・背景を分析し、別のアプローチを検討した具体的記述
    - 3(RD2): 権威・リーダーシップへの気づきや感情を言語化（場面によって不安定で原因分析は限定的）
    - 2(RD1): リーダーシップ行動の事実のみ記述（「指示を出した」等）、省察なし
    - 1(RD0): 教師としてのリーダーシップに関する省察がほとんどない

17. 【児童の困難支援 λ=.77】学校や授業における児童の困難や葛藤の解決を支援することができること
    - 5(RD4): 学習面・対人面・情緒面の困難を子どもの権利・インクルーシブ支援の信念と批判的に結びつけ、組織的支援の根拠を問い直した記述
    - 4(RD3): 困難の原因・背景を多角的に分析し、傾聴・個別面談・授業内配慮等の複数の支援アプローチを検討・試みた記述
    - 3(RD2): 困難を抱える児童への気づきや感情を言語化（体系的支援への言及は限定的）
    - 2(RD1): 困難の存在を事実として記録するのみ（「○○が困っていた」等）
    - 1(RD0): 児童の困難への気づき・支援・省察が見られない

---

### 因子Ⅳ 職務を理解して行動する力（項目18-23, α=.91）
**定義：** 教師の役割・職務倫理・同僚関係・組織運営を理解し、専門職として適切に行動できる力

18. 【同僚の学習支援役割理解 λ=1.03】共に働いている同僚が、学習のサポートに適切に参加し、彼らが果たすことを期待されている役割を理解していること
    - 5(RD4): 協働役割をチーム学校の理念・組織的支援の社会的文脈と批判的に結びつけ、役割分担のあり方の前提を問い直した記述
    - 4(RD3): 複数の同僚の役割分担の原因・背景を分析し、連携を意識した行動と代替的アプローチを検討した記述
    - 3(RD2): 担任以外の教職員の役割への気づきや感想を言語化（連携意識の根拠は限定的）
    - 2(RD1): 担任に偏った事実記述のみ、省察なし
    - 1(RD0): 同僚や他の教職員の役割に関する省察が見られない

19. 【特別責任を有する同僚役割の理解 λ=.98】特別な責任を有する同僚の役割を知ること
    - 5(RD4): 指導教諭・主任・特別支援コーディネーター等の職責を教育法制と批判的に結びつけ、役割の必要性の前提を問い直した記述
    - 4(RD3): 特別な役職の原因・背景を分析し、複数の視点から適切に関わった記述と代替的関わり方への検討
    - 3(RD2): 特別な責任を持つ役職への気づきや感想を言語化（具体的職務内容への理解は表面的）
    - 2(RD1): 「担任以外にも役割がある」程度の事実記述のみ
    - 1(RD0): 特別な責任を有する同僚役割への省察が見られない

20. 【人間関係・専門的期待への対応 λ=.50】教師の仕事に関連する人間関係及び専門的な面においての期待を分析し対応すること
    - 5(RD4): 保護者・同僚・管理職からの期待を教育的信念・社会的役割と批判的に結びつけ、期待に応える/応えない判断軸の前提を問い直した記述
    - 4(RD3): 複数ステークホルダーからの期待の原因・背景を分析し、対応策と代替的アプローチを検討した記述
    - 3(RD2): 指導教員・担任からの期待への気づきや感情を言語化（対応根拠は限定的）
    - 2(RD1): 期待への対応の事実のみ記述（「言われた通りにした」等）
    - 1(RD0): 教師への期待に関する認識・省察が見られない

21. 【教師役割の多様性理解 λ=.46】教師の役割を遂行するための多様な方法を知り、その根拠を理解すること
    - 5(RD4): 教師の多様な役割を教師専門職の理念・法令・研究と批判的に結びつけ、役割が多様であるべき理由の前提を問い直した記述
    - 4(RD3): 複数の役割の原因・背景を分析し、実習場面での役割実践の根拠と代替的アプローチを具体的に検討
    - 3(RD2): 「授業以外にも仕事がある」という気づきや感想を言語化（具体的根拠は限定的）
    - 2(RD1): 授業者の側面のみに限定した事実記述、省察なし
    - 1(RD0): 教師の役割多様性への省察が見られない

22. 【教師の権威の意味理解 λ=.42】授業とクラスの社会生活における教師の権威の意味について理解すること
    - 5(RD4): 権威を信頼に基づく影響力として捉え、哲学的・社会的根拠を教育的信念と批判的に結びつけ、権威行使の意味の前提を問い直した記述
    - 4(RD3): 権威の正当性の原因・背景を分析し、日常的関わりでの体現方法の代替的アプローチを検討
    - 3(RD2): 教師の権威への気づきや感想を言語化（意味や行使の仕方への考察が浅い）
    - 2(RD1): 権威を役職からの強制力と捉えた事実記述のみ
    - 1(RD0): 教師の権威についての理解・省察が見られない

23. 【職業倫理と連帯責任 λ=.41】職業の方針と実践に留意し、その実践においては連帯責任を有すること
    - 5(RD4): 教育方針・服務規律・情報管理方針を職業倫理・社会的責任の信念と批判的に結びつけ、連帯責任を担う理由の前提を問い直し、倫理的判断の根拠を明示
    - 4(RD3): 学校方針に沿った行動の原因・背景を分析し、組織的責任意識を複数場面で示し代替行動を検討
    - 3(RD2): 学校方針に従おうとした気づきや感想を言語化（連帯責任の概念への理解は表面的）
    - 2(RD1): 個人行動の事実のみ記述（「方針に従った」等）、省察なし
    - 1(RD0): 職業倫理・連帯責任に関する省察が見られない

---

## 出力形式（厳密にJSONで出力）
{
  "reasoning": "Chain-of-Thoughtの推論過程（3-5文）",
  "items": [
    {
      "item_number": 1,
      "score": 3,
      "rd_level": "RD2",
      "evidence": "日誌から引用した根拠テキスト（30字以内）",
      "feedback": "具体的な改善フィードバック（50字以内）",
      "is_na": false
    },
    ...全23項目...
  ],
  "factor_scores": {
    "factor1": 2.8,
    "factor2": 3.2,
    "factor3": 2.5,
    "factor4": 3.0
  },
  "factor_rd_levels": {
    "factor1": "RD2",
    "factor2": "RD3",
    "factor3": "RD1",
    "factor4": "RD2"
  },
  "total_score": 2.9,
  "overall_comment": "全体的な評価コメント（100字以内）",
  "halo_effect_detected": false,
  "confidence": 0.85
}`;
}

// ────────────────────────────────────────────────────────────────
// CoT-Bプロンプト（省察深さ判定）
// 論文 4.6.2: Hatton & Smith (1995) 4レベル, temperature=0.1
// ────────────────────────────────────────────────────────────────
function buildCoTBPrompt(userMessage: string, journalContent: string): string {
  return `あなたは教育実習における省察深さ判定の専門家AIです。以下のメッセージを Hatton & Smith（1995）の省察レベル基準で分類してください。

## 省察対象
実習日誌（コンテキスト）:
---
${journalContent.slice(0, 500)}...
---

学生のメッセージ:
"${userMessage}"

## 省察レベル基準（Hatton & Smith, 1995）
RD1（記述的書き込み）: 出来事・事実の列挙。「〜した」「〜だった」のみ
RD2（記述的省察）: 感情・気づき・印象を言語化。「〜と感じた」「〜に気づいた」
RD3（対話的省察）: 原因・背景の分析、代替案・改善策の具体的検討。「なぜなら」「〜という理由で」
RD4（批判的省察）: 教育的信念・社会的文脈・倫理的観点との結びつけ。根拠の問い直し

## 出力形式（厳密にJSONで出力）
{
  "reflection_level": "RD3",
  "rubric_score_equivalent": 4,
  "category": "対話的省察",
  "evidence": "判定根拠となった表現（20字以内）",
  "next_action": "省察を深めるための次の問いかけ（40字以内）",
  "confidence": 0.88
}`;
}

// ────────────────────────────────────────────────────────────────
// CoT-Cプロンプト（SMART目標提案）
// 論文 4.6.3: Locke & Latham (2002) SMART基準, temperature=0.3
// ────────────────────────────────────────────────────────────────
function buildCoTCPrompt(
  conversation: Array<{ role: string; content: string }>,
  journalContent: string,
  weekNumber: number,
  bfiScores: { conscientiousness?: number; neuroticism?: number; openness?: number } | null = null
): string {
  const convText = conversation.slice(-6).map((m) => `${m.role === "user" ? "学生" : "AI"}: ${m.content}`).join("\n");
  

  const bfiRules = `
## 性格特性（並川ら, 2012 短縮版）と目標難易度調整
以下のパーソナリティ特性（5件法スコア: 1.0～5.0）を考慮し、目標の難易度や粒度を調整してください。
${bfiScores ? `
[学生の性格特性]
- 誠実性 (Conscientiousness): ${bfiScores.conscientiousness?.toFixed(2) ?? "不明"} / 5.0
- 情緒不安定性 (Neuroticism): ${bfiScores.neuroticism?.toFixed(2) ?? "不明"} / 5.0
- 開放性 (Openness): ${bfiScores.openness?.toFixed(2) ?? "不明"} / 5.0

[調整ルール]
- 情緒不安定性が高い(3.5以上)場合は、目標を小さく分解し、失敗リスクの低い安全な形（難易度: Low）にする。
- 誠実性が高い(3.5以上)場合は、目標をやや高難度にし、実行回数や継続性を求める形（難易度: High）にする。
- 開放性が高い(3.5以上)場合は、新しい試行や振り返り、代替行動の検討を含む目標（難易度: Medium）にする。
- 該当しない場合、またはスコアがない場合は標準的な難易度（Medium）とする。
` : `
[学生の性格特性]
取得できませんでした。標準的な難易度（Medium）で目標を設定してください。
`}
`;

  return `あなたは教育実習における目標設定支援の専門家AIです。以下の対話から来週の SMART 目標を提案してください。

## コンテキスト
第${weekNumber}週 実習日誌（要約）:
---
${journalContent.slice(0, 400)}...
---

省察対話:
---
${convText}
---

## SMART目標基準（Locke & Latham, 2002）
- Specific（具体的）: 何を・どのように行うか明確
- Measurable（測定可能）: 達成を確認できる指標
- Achievable（達成可能）: 1週間で実現可能
- Relevant（関連性）: 評価ルーブリックの因子と紐づく
- Time-bound（期限付き）: 来週中に実施

## ルーブリック因子
因子Ⅰ: 児童生徒への指導力（項目1-7）
因子Ⅱ: 自己評価力（項目8-13）
因子Ⅲ: 学級経営力（項目14-17）
因子Ⅳ: 職務を理解して行動する力（項目18-23）
${bfiRules}
## 出力形式（厳密にJSONで出力）
{
  "goal_text": "来週、〇〇の場面で〜を実践し、〜を確認する",
  "target_item_id": 12,
  "target_factor": "factor2",
  "smart_criteria": {
    "specific": true,
    "measurable": true,
    "achievable": true,
    "relevant": true,
    "time_bound": true
  },
  "is_smart": true,
  "rationale": "目標設定の根拠（30字以内）",
  "difficulty_level": "Low | Medium | High",
  "adjustment_reason": "性格特性を考慮した調整理由（例: 誠実性が高いため...）",
  "target_week": ${weekNumber + 1}
}`;
}

// ────────────────────────────────────────────────────────────────
// OpenAI API 呼び出し共通関数
// ────────────────────────────────────────────────────────────────
async function callOpenAI(
  apiKey: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  temperature: number,
  model: string = "gpt-4o"
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      response_format: { type: "json_object" },
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${err}`);
  }

  const data: any = await response.json() as {
    choices: Array<{ message: { content: string } }>;
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };

  return data.choices[0].message.content;
}

// ────────────────────────────────────────────────────────────────
// POST /api/ai/evaluate  (CoT-A)
// ────────────────────────────────────────────────────────────────
openaiRouter.post("/evaluate", async (c) => {
  const apiKey = (c.env as any)?.OPENAI_API_KEY;
  if (!apiKey) {
    return c.json({ error: "OPENAI_API_KEY not configured" }, 500);
  }

  const body = await c.req.json() as {
    journal_content: string;
    student_name: string;
    week_number: number;
    journal_id: string;
  };

  try {
    const prompt = buildCoTAPrompt(body.journal_content, body.student_name, body.week_number);
    const raw = await callOpenAI(
      apiKey,
      [{ role: "user", content: prompt }],
      0.2
    );
    const result = JSON.parse(raw);
    
    // 厳密な23項目平均（NULL除外、半端四捨五入）の再計算
    if (result.items && Array.isArray(result.items)) {
      const scores = { f1: [] as number[], f2: [] as number[], f3: [] as number[], f4: [] as number[] };
      result.items.forEach((item: any) => {
        if (item.is_na || !item.score) return;
        if (item.item_number <= 7) scores.f1.push(item.score);
        else if (item.item_number <= 13) scores.f2.push(item.score);
        else if (item.item_number <= 17) scores.f3.push(item.score);
        else scores.f4.push(item.score);
      });

      const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 100) / 100 : 0;
      const allScores = [...scores.f1, ...scores.f2, ...scores.f3, ...scores.f4];
      
      result.total_score = avg(allScores);
      result.factor_scores = {
        factor1: avg(scores.f1),
        factor2: avg(scores.f2),
        factor3: avg(scores.f3),
        factor4: avg(scores.f4),
      };
      
      // 未評価項目数カウント
      const evaluated_item_count = allScores.length;
      result.evaluated_item_count = evaluated_item_count;
    }

    return c.json({
      success: true,
      evaluation: result,
      journal_id: body.journal_id,
      model: "gpt-4o",
      prompt_version: "CoT-A-v1.0",
      temperature: 0.2,
    });
  } catch (err) {
    console.error("CoT-A error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// ────────────────────────────────────────────────────────────────
// POST /api/ai/reflection-depth  (CoT-B)
// ────────────────────────────────────────────────────────────────
openaiRouter.post("/reflection-depth", async (c) => {
  const apiKey = (c.env as any)?.OPENAI_API_KEY;
  if (!apiKey) {
    return c.json({ error: "OPENAI_API_KEY not configured" }, 500);
  }

  const body = await c.req.json() as {
    user_message: string;
    journal_content: string;
    session_id: string;
  };

  try {
    const prompt = buildCoTBPrompt(body.user_message, body.journal_content);
    const raw = await callOpenAI(
      apiKey,
      [{ role: "user", content: prompt }],
      0.1
    );
    const result = JSON.parse(raw);
    return c.json({
      success: true,
      reflection: result,
      session_id: body.session_id,
      model: "gpt-4o",
      prompt_version: "CoT-B-v1.0",
      temperature: 0.1,
    });
  } catch (err) {
    console.error("CoT-B error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// ────────────────────────────────────────────────────────────────
// POST /api/ai/generate-goal  (CoT-C)
// ────────────────────────────────────────────────────────────────
openaiRouter.post("/generate-goal", async (c) => {
  const apiKey = (c.env as any)?.OPENAI_API_KEY;
  if (!apiKey) {
    return c.json({ error: "OPENAI_API_KEY not configured" }, 500);
  }

  const body = await c.req.json() as {
    conversation: Array<{ role: string; content: string }>;
    journal_content: string;
    week_number: number;
    session_id: string;
    user_id?: string;
  };

  try {
    let bfiScores = null;
    
    // Auth check
    const authContext = getAuthContext(c);
    const authUserId = authContext?.id;
    
    // Strictly require authentication for this route to prevent unauthorized BFI access
    if (!authContext || !authUserId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Ensure the request is explicitly for the authenticated user
    if (body.user_id && body.user_id !== authUserId) {
       return c.json({ error: 'Forbidden' }, 403);
    }
    
    // Always use the authenticated user's ID
    const targetUserId = authUserId;

    if (targetUserId) {
      try {
        const row = await c.env.DB.prepare(
          "SELECT conscientiousness, neuroticism, openness FROM user_bfi_scores WHERE user_id = ?"
        ).bind(targetUserId).first();
        if (row) {
          bfiScores = {
            conscientiousness: Number(row.conscientiousness),
            neuroticism: Number(row.neuroticism),
            openness: Number(row.openness)
          };
        }
      } catch (err) {
        console.warn("BFI scores fetch failed or table does not exist:", err);
      }
    }

    const prompt = buildCoTCPrompt(body.conversation, body.journal_content, body.week_number, bfiScores);
    const raw = await callOpenAI(
      apiKey,
      [{ role: "user", content: prompt }],
      0.3
    );
    const result = JSON.parse(raw);
    return c.json({
      success: true,
      goal: result,
      session_id: body.session_id,
      model: "gpt-4o",
      prompt_version: "CoT-C-v1.0",
      temperature: 0.3,
    });
  } catch (err) {
    console.error("CoT-C error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// ────────────────────────────────────────────────────────────────
// POST /api/ai/chat  (省察チャット対話生成)
// CoT-B判定後に適切な問いかけを生成
// ────────────────────────────────────────────────────────────────
openaiRouter.post("/chat", async (c) => {
  const apiKey = (c.env as any)?.OPENAI_API_KEY;
  if (!apiKey) {
    return c.json({ error: "OPENAI_API_KEY not configured" }, 500);
  }

  const body = await c.req.json() as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    phase: "phase0" | "phase1" | "bridge" | "phase2";
    journal_content: string;
    week_number: number;
    reflection_depth?: number;
    previous_goal?: string;
    session_id: string;
  };

  const systemPrompt = `あなたは教育実習生の省察を支援するAIチャットBotです。
Hatton & Smith（1995）の省察深さフレームワークに基づいて対話します。

現在のフェーズ: ${body.phase}
フェーズの役割:
- phase0: 前週目標の達成確認（「先週の目標は達成できましたか？」）
- phase1: 省察の深化（最大2〜3問、開かれた質問で省察を促す）
- bridge: 気づきから次週の目標への接続
- phase2: SMART目標の確定・確認

今週の実習日誌（コンテキスト）:
---
${body.journal_content.slice(0, 600)}...
---

前週の目標: ${body.previous_goal ?? "なし（初週）"}

ルーブリック4因子23項目に基づいて、学生の省察を深めるような質問をしてください。
1回の応答は100字以内に収め、日本語で自然な会話調で応答してください。
省察を促すために、閉じた質問ではなく開かれた質問を使ってください。`;

  try {
    const raw = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...body.messages.slice(-10),
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    const data = await raw.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    return c.json({
      success: true,
      message: data.choices[0].message.content,
      phase: body.phase,
      session_id: body.session_id,
    });
  } catch (err) {
    console.error("Chat error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// ────────────────────────────────────────────────────────────────
// POST /api/ocr/analyze  (OCR画像解析)
// Google Cloud Vision API → Tesseract.js フォールバック
// ────────────────────────────────────────────────────────────────
openaiRouter.post("/analyze", async (c) => {
  // Cloudflare Workers では FormData パースが可能
  try {
    const formData = await c.req.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return c.json({ error: "No image provided" }, 400);
    }

    const gcpKey = c.env?.GOOGLE_CLOUD_VISION_API_KEY;

    if (gcpKey) {
      // Google Cloud Vision API 使用
      const imageData = await imageFile.arrayBuffer();
      const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageData)));

      const visionResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${gcpKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [{
              image: { content: base64Image },
              features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }],
              imageContext: { languageHints: ["ja"] },
            }],
          }),
        }
      );

      const visionData = await visionResponse.json() as {
        responses: Array<{
          fullTextAnnotation?: {
            text: string;
            pages: Array<{
              blocks: Array<{
                paragraphs: Array<{
                  words: Array<{
                    symbols: Array<{ text: string; confidence: number }>;
                  }>;
                  confidence: number;
                  boundingBox: { vertices: Array<{ x: number; y: number }> };
                }>;
              }>;
            }>;
          };
          error?: { message: string };
        }>;
      };

      if (visionData.responses[0]?.error) {
        throw new Error(visionData.responses[0].error.message);
      }

      const annotation = visionData.responses[0]?.fullTextAnnotation;
      if (!annotation) {
        return c.json({ error: "No text detected" }, 422);
      }

      const blocks = annotation.pages[0]?.blocks.map((block, i) => ({
        id: `blk-${i}`,
        text: block.paragraphs.map((p) =>
          p.words.map((w) => w.symbols.map((s) => s.text).join("")).join(" ")
        ).join("\n"),
        confidence: Math.round(
          block.paragraphs.reduce((s, p) => s + (p.confidence ?? 0), 0) /
          block.paragraphs.length * 100
        ),
      })) ?? [];

      return c.json({
        blocks,
        overall_confidence: Math.round(blocks.reduce((s, b) => s + b.confidence, 0) / Math.max(blocks.length, 1)),
        ocr_source: "vision",
        auto_rotated: false,
        brightness_adjusted: false,
        raw_text: annotation.text,
      });
    }

    // フォールバック: サーバー側 Tesseract は Workers では使えないため
    // クライアント側 Tesseract.js へのフォールバック指示を返す
    return c.json({
      error: "GOOGLE_CLOUD_VISION_API_KEY not configured",
      fallback: "tesseract",
    }, 503);
  } catch (err) {
    console.error("OCR error:", err);
    return c.json({ error: String(err), fallback: "tesseract" }, 500);
  }
});


// POST /api/ai/check-evidence (RQ3b GA-Evidence)
openaiRouter.post("/check-evidence", async (c) => {
  const apiKey = OPENAI_API_KEY || c.env.OPENAI_API_KEY;
  if (!apiKey) return c.json({ error: "OpenAI API key not configured" }, 500);

  const authContext = getAuthContext(c);
  if (!authContext) return c.json({ error: "Unauthorized" }, 401);

  const { previous_goal, journal_content } = await c.req.json();
  if (!previous_goal || !journal_content) return c.json({ error: "Missing required fields" }, 400);

  const prompt = `あなたは教育実習の評価アシスタントです。
以下の「前週の目標」が、「今週の日誌」の中で具体的に取り組まれた形跡（行動・結果・振り返り）があるか判定してください。

前週の目標:
${previous_goal}

今週の日誌:
${journal_content}

判定基準:
日誌の中に、前週目標に対応する具体的な行動の記述、その結果、あるいはそれに対する振り返りが明確に含まれていれば「証拠あり(1)」、含まれていなければ「証拠なし(0)」とします。

JSON形式で出力してください:
{
  "evidence_binary": 1または0,
  "reason": "判定理由（100文字程度で簡潔に）"
}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" }
      }),
    });

    const data: any = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    return c.json({ success: true, result });
  } catch (error: any) {
    console.error("check-evidence error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/ai/evaluate-session-rd (RQ3b RD-Chat Session-level holistic judgement)
openaiRouter.post("/evaluate-session-rd", async (c) => {
  const apiKey = OPENAI_API_KEY || c.env.OPENAI_API_KEY;
  if (!apiKey) return c.json({ error: "OpenAI API key not configured" }, 500);

  const authContext = getAuthContext(c);
  if (!authContext) return c.json({ error: "Unauthorized" }, 401);

  const { conversation } = await c.req.json();
  if (!conversation || !Array.isArray(conversation)) return c.json({ error: "Missing conversation array" }, 400);

  const formattedConv = conversation.map(m => `${m.role === 'user' ? '学生' : 'AI'}: ${m.content}`).join('\n\n');

  const prompt = `あなたは教育実習生の省察プロセスを評価する専門家です。
以下の省察チャットセッション全体を評価し、学生が到達した「省察の深さ（Reflection Depth）」を総合的に判定してください。

セッション履歴:
${formattedConv}

判定基準 (1〜4のレベル):
レベル1 (浅い): 事実の羅列のみ。感情や解釈を含まない。
レベル2 (やや深い): 個人的な感情や単純な解釈が含まれるが、客観的な分析や他者の視点に欠ける。
レベル3 (深い): 客観的な分析、他者の視点（児童や指導教員など）の導入、または自身の指導の背景要因への言及がある。
レベル4 (非常に深い): 批判的省察。自身の信念・価値観の再構築、教育的・社会的文脈からの考察、または将来の実践への明確な応用方針がある。

JSON形式で出力してください:
{
  "rd_level": 1, 2, 3, または 4,
  "category": "shallow" (1), "somewhat_deep" (2), "deep" (3または4),
  "reason": "判定理由（100文字程度で簡潔に）"
}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" }
      }),
    });

    const data: any = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    return c.json({ success: true, result });
  } catch (error: any) {
    console.error("evaluate-session-rd error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default openaiRouter;
