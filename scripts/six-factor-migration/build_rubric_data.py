# -*- coding: utf-8 -*-
"""6因子40項目ルーブリックデータ定義（真実の源）。
各項目に short label と 5段階×RD行動指標を付与する。
RD水準: 5=RD4批判的省察, 4=RD3対話的省察, 3=RD2記述的省察, 2=RD1記述的書き込み, 1=RD0省察なし
"""
import json

FACTORS = [
    {"key":"factor1","roman":"Ⅰ","label":"教科指導力","alpha":0.94,"color":"#1976d2",
     "definition":"教科内容・カリキュラム・教授法・評価を理解し、児童の学習ニーズに応じて効果的に指導・評価できる力"},
    {"key":"factor2","roman":"Ⅱ","label":"職務理解力","alpha":0.93,"color":"#388e3c",
     "definition":"教師の役割・職務・権威・同僚関係・組織運営を理解し、専門職として適切に行動できる力"},
    {"key":"factor3","roman":"Ⅲ","label":"保護者・外部連携力","alpha":0.95,"color":"#f57c00",
     "definition":"保護者・家庭・外部の専門家と連携し、児童の学習・成長を支えるために協働できる力"},
    {"key":"factor4","roman":"Ⅳ","label":"児童理解力","alpha":0.91,"color":"#7b1fa2",
     "definition":"多様な背景（言語・性別・文化・困り）をもつ児童一人ひとりを理解し、その実態に応じて対応できる力"},
    {"key":"factor5","roman":"Ⅴ","label":"学級経営力","alpha":0.91,"color":"#c2185b",
     "definition":"学級全体の秩序・協力関係を維持し、リーダーシップを発揮して児童・関係者と効果的に関わる力"},
    {"key":"factor6","roman":"Ⅵ","label":"授業改善力","alpha":0.92,"color":"#0097a7",
     "definition":"データや研究に基づいて授業を計画・実施し、自己評価を通じて授業の質を高めていく力"},
]

# 因子間相関（CFA/EFA, Sheet1下段より）
INTERCORR = {
 ("factor1","factor2"):0.567,("factor1","factor3"):0.703,("factor1","factor4"):0.741,("factor1","factor5"):0.679,("factor1","factor6"):0.713,
 ("factor2","factor3"):0.591,("factor2","factor4"):0.564,("factor2","factor5"):0.591,("factor2","factor6"):0.575,
 ("factor3","factor4"):0.685,("factor3","factor5"):0.657,("factor3","factor6"):0.658,
 ("factor4","factor5"):0.640,("factor4","factor6"):0.657,
 ("factor5","factor6"):0.599,
}

print("FACTORS defined:", len(FACTORS))
json.dump({"factors":FACTORS}, open("/home/user/work/factors.json","w"), ensure_ascii=False, indent=1)
