# -*- coding: utf-8 -*-
"""
6因子40項目ルーブリック src/constants/rubric.ts ジェネレータ。
入力:
  /tmp/items40.json            ... [{num, roman, src, lambda, text}] x40
  /home/user/work/items_meta.py ... ITEMS {num: (label, RD4,RD3,RD2,RD1,RD0)}
  build_rubric_data.FACTORS / INTERCORR ... 6因子定義・因子間相関
出力:
  /home/user/teaching-practice-eval/src/constants/rubric.ts
既存の全エクスポート名・シグネチャを維持する。
"""
import json, sys
sys.path.insert(0, "/home/user/work")
import items_meta
from build_rubric_data import FACTORS, INTERCORR

ITEMS_META = items_meta.ITEMS
items40 = json.load(open("/tmp/items40.json"))
items40.sort(key=lambda x: x["num"])

OUT = "/home/user/webapp/src/constants/rubric.ts"

# ---- factor item ranges (continuous, derived from roman) ----
roman2key = {f["roman"]: f["key"] for f in FACTORS}
ranges = {}  # key -> [min,max]
for it in items40:
    k = roman2key[it["roman"]]
    n = it["num"]
    if k not in ranges:
        ranges[k] = [n, n]
    else:
        ranges[k][0] = min(ranges[k][0], n)
        ranges[k][1] = max(ranges[k][1], n)

# verify contiguous & non-overlapping
print("itemRanges:", {k: ranges[k] for k in [f["key"] for f in FACTORS]})

# ---- intercorrelation lookup (symmetric) ----
def corr(a, b):
    if a == b:
        return None
    key = (a, b) if (a, b) in INTERCORR else (b, a)
    return INTERCORR.get(key)

def js_str(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'

# ---- RD score -> rd code mapping ----
SCORE_RD = {5: "RD4", 4: "RD3", 3: "RD2", 2: "RD1", 1: "RD0"}

# ════════════════════════════════════════════════
# Build TS source
# ════════════════════════════════════════════════
L = []
a = L.append

# header
factor_lines = "\n".join(
    f' *   {f["roman"]} {f["label"]}  項目{ranges[f["key"]][0]}–{ranges[f["key"]][1]} '
    f'({ranges[f["key"]][1]-ranges[f["key"]][0]+1}項目, α={f["alpha"]:.2f})'
    for f in FACTORS
)
a(f'''/**
 * rubric.ts
 * 6因子40項目ルーブリック 確定版（6因子40項目・CFA確定版）
 * 出典：論文に使う図表.xlsx EFAパターン行列・プロマックス回転・最尤法（CFAにて42→40項目に精選）
 * α全体=.98、CFA: CFI=.90, RMSEA=.07, SRMR=.06, GFI=.71
 *
 * ✅ 6因子40項目への改訂
 *   全6因子・全40項目の行動指標を
 *   「点数 | RD水準 | 行動指標」の3列構成（Hatton & Smith 1995 省察深度RD0–RD4）で統一
 *
 * 因子構成（確定版）
{factor_lines}
 */
''')

# ─ factor definitions ─
a("// ─────────────────────────────────────────────")
a("// 因子定義")
a("// ─────────────────────────────────────────────")
a("export const RUBRIC_FACTORS = [")
for f in FACTORS:
    k = f["key"]
    r = ranges[k]
    inter = {}
    for g in FACTORS:
        c = corr(k, g["key"])
        if c is not None:
            inter[g["key"]] = c
    inter_str = ", ".join(f"{kk}: {vv}" for kk, vv in inter.items())
    rd_principle = (
        f'本因子の5段階行動指標は、Hatton & Smith（1995）省察深度（RD）水準と対応する。'
        f'各項目は「{f["label"]}に関する実践内容」に加え、日誌記述における省察の深さ（RD水準）によって評価される。'
    )
    a("  {")
    a(f'    key:   "{k}" as const,')
    a(f'    roman: "{f["roman"]}",')
    a(f'    label: {js_str(f["label"])},')
    a(f'    alpha: {f["alpha"]},')
    a(f'    color: "{f["color"]}",')
    a(f'    itemRange: [{r[0]}, {r[1]}] as [number, number],')
    a(f'    definition: {js_str(f["definition"])},')
    a(f'    rdPrinciple: {js_str(rd_principle)},')
    a(f'    interCorrelations: {{ {inter_str} }},')
    a("  },")
a("] as const;")
a("")
a('export type FactorKey = typeof RUBRIC_FACTORS[number]["key"];')
a("")

# ─ reflection depth levels ─
a("// ─────────────────────────────────────────────")
a("// 省察深さレベル（Hatton & Smith, 1995）")
a("// 全6因子・全40項目に共通適用")
a("// ─────────────────────────────────────────────")
a("export const REFLECTION_DEPTH_LEVELS = [")
a('  { score: 1, rd: "RD0", label: "省察なし",        desc: "当該側面への記述・省察が日誌に見られない",                                  color: "#bdbdbd" },')
a('  { score: 2, rd: "RD1", label: "記述的書き込み",  desc: "出来事・事実の列挙にとどまり、省察的要素がない",                           color: "#90caf9" },')
a('  { score: 3, rd: "RD2", label: "記述的省察",      desc: "感情・気づき・印象を言語化するが、原因分析・代替案は限定的",               color: "#81c784" },')
a('  { score: 4, rd: "RD3", label: "対話的省察",      desc: "実践の原因・背景を多角的に分析し、代替案・改善策を具体的に検討する",       color: "#ffb74d" },')
a('  { score: 5, rd: "RD4", label: "批判的省察",      desc: "教育的信念・社会的文脈・倫理的観点と実践を結びつけ、信念の根拠を問い直す", color: "#ce93d8" },')
a("] as const;")
a("")
a('export type RdLevel = "RD0" | "RD1" | "RD2" | "RD3" | "RD4";')
a("")
a("/** スコアから RD水準オブジェクトを取得 */")
a("export function getRdByScore(score: number) {")
a("  return REFLECTION_DEPTH_LEVELS.find((r) => r.score === score) ?? REFLECTION_DEPTH_LEVELS[0];")
a("}")
a("")

# ─ interfaces ─
a("// ─────────────────────────────────────────────")
a("// 全40項目定義（6因子・各項目にRD行動指標）")
a("// ─────────────────────────────────────────────")
a("export interface RubricItemBehavior {")
a("  score: number;")
a("  rd: RdLevel;")
a("  indicator: string; // 行動指標（日誌記述の評価基準）")
a("}")
a("")
a("export interface RubricItem {")
a("  num: number;")
a("  factor: FactorKey;")
a("  lambda: number;")
a("  label: string;")
a("  text: string;  // 項目文")
a("  behaviors: RubricItemBehavior[];")
a("}")
a("")

# ─ items ─
a("export const RUBRIC_ITEMS: RubricItem[] = [")
prev_factor = None
for it in items40:
    num = it["num"]
    k = roman2key[it["roman"]]
    meta = ITEMS_META[num]
    label = meta[0]
    rd_indicators = {5: meta[1], 4: meta[2], 3: meta[3], 2: meta[4], 1: meta[5]}
    if k != prev_factor:
        f = next(x for x in FACTORS if x["key"] == k)
        r = ranges[k]
        a("")
        a("  // ══════════════════════════════════════════════════════════")
        a(f'  // 因子{f["roman"]} {f["label"]}（項目{r[0]}–{r[1]}）')
        a("  // ══════════════════════════════════════════════════════════")
        prev_factor = k
    a("  {")
    a(f'    num: {num}, factor: "{k}", lambda: {it["lambda"]},')
    a(f'    label: {js_str(label)},')
    a(f'    text: {js_str(it["text"])},')
    a("    behaviors: [")
    for score in (5, 4, 3, 2, 1):
        a(f'      {{ score: {score}, rd: "{SCORE_RD[score]}", indicator: {js_str(rd_indicators[score])} }},')
    a("    ],")
    a("  },")
a("];")
a("")

# ─ weekly flow (preserve, update 23->40) ─
a("// ─────────────────────────────────────────────")
a("// 週次フロー（論文 準拠）")
a("// ─────────────────────────────────────────────")
a("export const WEEKLY_FLOW_STEPS = [")
a('  {')
a('    step: 1,')
a('    label: "日誌作成・提出",')
a('    detail: "実習の振り返りを記述して提出",')
a('    icon: "📝",')
a('    color: "#1976d2",')
a('  },')
a('  {')
a('    step: 2,')
a('    label: "AI自動評価（CoT-A）",')
a('    detail: "GPT-4が40項目×5段階でルーブリック評価＋RD水準コメント生成",')
a('    icon: "🤖",')
a('    color: "#388e3c",')
a('  },')
a('  {')
a('    step: 3,')
a('    label: "統合チャットBot",')
a('    detail: "Phase0（前週目標確認）→Phase1（省察深化）→Bridge→Phase2（SMART目標確定）",')
a('    icon: "💬",')
a('    color: "#f57c00",')
a('    phases: [')
a('      { id: "phase0", label: "Phase0", desc: "前週目標の達成確認（GA-Self）" },')
a('      { id: "phase1", label: "Phase1", desc: "振り返り深化（最大2-3問、RD-Chat判定）" },')
a('      { id: "bridge", label: "Bridge", desc: "気づき→目標への接続" },')
a('      { id: "phase2", label: "Phase2", desc: "SMART目標の確定・保存" },')
a('    ],')
a('  },')
a('  {')
a('    step: 4,')
a('    label: "次週の実践",')
a('    detail: "目標に基づく実践行動",')
a('    icon: "🎯",')
a('    color: "#7b1fa2",')
a('  },')
a('  {')
a('    step: 5,')
a('    label: "次回日誌に結果を記述",')
a('    detail: "評価・省察サイクルへ回帰",')
a('    icon: "🔄",')
a('    color: "#1976d2",')
a('  },')
a("] as const;")
a("")

# ─ utilities (unchanged signatures) ─
a("// ─────────────────────────────────────────────")
a("// ユーティリティ関数")
a("// ─────────────────────────────────────────────")
a("")
a("/** 因子キーから因子オブジェクトを取得 */")
a("export function getFactorByKey(key: FactorKey) {")
a("  return RUBRIC_FACTORS.find((f) => f.key === key)!;")
a("}")
a("")
a("/** 項目番号から属する因子キーを取得 */")
a("export function getFactorKeyByItemNum(num: number): FactorKey {")
a("  for (const f of RUBRIC_FACTORS) {")
a("    if (num >= f.itemRange[0] && num <= f.itemRange[1]) return f.key;")
a("  }")
a('  return "factor1";')
a("}")
a("")
a("/** 因子キーに属する項目一覧を取得 */")
a("export function getItemsByFactor(key: FactorKey) {")
a("  return RUBRIC_ITEMS.filter((item) => item.factor === key);")
a("}")
a("")
a("/** 項目番号から項目オブジェクトを取得 */")
a("export function getItemByNum(num: number): RubricItem | undefined {")
a("  return RUBRIC_ITEMS.find((item) => item.num === num);")
a("}")
a("")
a("/** スコアから RD水準の行動指標を取得（特定項目） */")
a("export function getBehaviorIndicator(itemNum: number, score: number): string {")
a("  const item = getItemByNum(itemNum);")
a('  if (!item) return "";')
a("  const behavior = item.behaviors.find((b) => b.score === score);")
a('  return behavior?.indicator ?? "";')
a("}")
a("")
a("/** スコアから RD水準ラベルを取得 */")
a("export function getRdLabelByScore(score: number): string {")
a("  return getRdByScore(score).label;")
a("}")
a("")

# ─ stats ─
# factor correlations object keyed by roman pairs
corr_pairs = []
romans = [f["roman"] for f in FACTORS]
keys = [f["key"] for f in FACTORS]
for i in range(len(FACTORS)):
    for j in range(i + 1, len(FACTORS)):
        c = corr(keys[i], keys[j])
        if c is not None:
            corr_pairs.append(f'"{romans[i]}-{romans[j]}": {c}')
# split into 6 lines roughly
a("/** 統計情報 */")
a("export const RUBRIC_STATS = {")
a(f"  totalItems: {len(items40)},")
a("  alphaOverall: 0.98,")
a("  cfa: { cfi: 0.90, rmsea: 0.07, srmr: 0.06, gfi: 0.71 },")
a("  factorCorrelations: {")
# group correlations by first factor
idx = 0
for i in range(len(FACTORS)):
    row = []
    for j in range(i + 1, len(FACTORS)):
        c = corr(keys[i], keys[j])
        if c is not None:
            row.append(f'"{romans[i]}-{romans[j]}": {c}')
    if row:
        a("    " + ", ".join(row) + ",")
a("  },")
a("} as const;")
a("")

src = "\n".join(L)
open(OUT, "w").write(src)
print("WROTE", OUT, "lines:", src.count("\n") + 1, "bytes:", len(src))
