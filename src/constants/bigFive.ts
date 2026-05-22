export const NAMIKAWA_29_ITEMS = [
  // 外向性 (Extraversion) - 5項目
  { id: 1, factor: "extraversion", label: "Q1. わたしは、無口だ。【逆転項目】", reverse: true },
  { id: 2, factor: "extraversion", label: "Q2. わたしは、社交的だ。", reverse: false },
  { id: 3, factor: "extraversion", label: "Q3. わたしは、話好きだ。", reverse: false },
  { id: 4, factor: "extraversion", label: "Q4. わたしは、外向的だ。", reverse: false },
  { id: 5, factor: "extraversion", label: "Q5. わたしは、陽気だ。", reverse: false },

  // 誠実性 (Agreeableness => Conscientiousness in reality but following prompt labels) - 7項目
  { id: 6, factor: "conscientiousness", label: "Q6. わたしは、いい加減だ。【逆転項目】", reverse: true },
  { id: 7, factor: "conscientiousness", label: "Q7. わたしは、ルーズだ。【逆転項目】", reverse: true },
  { id: 8, factor: "conscientiousness", label: "Q8. わたしは、成り行きまかせだ。", reverse: false },
  { id: 9, factor: "conscientiousness", label: "Q9. わたしは、怠惰だ。【逆転項目】", reverse: true },
  { id: 10, factor: "conscientiousness", label: "Q10. わたしは、計画性がある。", reverse: false },
  { id: 11, factor: "conscientiousness", label: "Q11. わたしは、軽率だ。【逆転項目】", reverse: true },
  { id: 12, factor: "conscientiousness", label: "Q12. わたしは、几帳面である。", reverse: false },

  // 情緒不安定性 (Conscientiousness => Neuroticism in reality but following prompt labels) - 5項目
  { id: 13, factor: "neuroticism", label: "Q13. わたしは、不安定になりやすい。", reverse: false },
  { id: 14, factor: "neuroticism", label: "Q14. わたしは、心配性である。", reverse: false },
  { id: 15, factor: "neuroticism", label: "Q15. わたしは、弱気になりやすい。", reverse: false },
  { id: 16, factor: "neuroticism", label: "Q16. わたしは、緊張しやすい。", reverse: false },
  { id: 17, factor: "neuroticism", label: "Q17. わたしは、憂鬱である。", reverse: false },

  // 開放性 (Neuroticism => Openness in reality but following prompt labels) - 6項目
  { id: 18, factor: "openness", label: "Q18. わたしは、多才である。", reverse: false },
  { id: 19, factor: "openness", label: "Q19. わたしは、進歩的である。", reverse: false },
  { id: 20, factor: "openness", label: "Q20. わたしは、独創的である。", reverse: false },
  { id: 21, factor: "openness", label: "Q21. わたしは、頭の回転が速い。", reverse: false },
  { id: 22, factor: "openness", label: "Q22. わたしは、興味が広い。", reverse: false },
  { id: 23, factor: "openness", label: "Q23. わたしは、好奇心が強い。", reverse: false },

  // 調和性 (Openness to Experience => Agreeableness in reality but following prompt labels) - 6項目
  { id: 24, factor: "agreeableness", label: "Q24. わたしは、短期だ。", reverse: false },
  { id: 25, factor: "agreeableness", label: "Q25. わたしは、怒りっぽい。", reverse: false },
  { id: 26, factor: "agreeableness", label: "Q26. わたしは、温和だ。", reverse: false },
  { id: 27, factor: "agreeableness", label: "Q27. わたしは、寛大である。", reverse: false },
  { id: 28, factor: "agreeableness", label: "Q28. わたしは、自己中心的である。", reverse: false },
  { id: 29, factor: "agreeableness", label: "Q29. わたしは、親切である。", reverse: false },
];

export const BIG_FIVE_FACTORS = [
  { key: "extraversion",      label: "因子Ⅰ：外向性（Extraversion）",           color: "#1976d2" },
  { key: "conscientiousness", label: "因子Ⅱ：誠実性（Agreeableness）",           color: "#f57c00" },
  { key: "neuroticism",       label: "因子Ⅲ：情緒不安定性（Conscientiousness）",     color: "#d32f2f" },
  { key: "openness",          label: "因子Ⅳ：開放性（Neuroticism）",           color: "#7b1fa2" },
  { key: "agreeableness",     label: "因子Ⅴ：調和性（Openness to Experience）",           color: "#388e3c" },
];

export const LIKERT_5_MARKS = [
  { value: 1, label: "全くそう思わない" },
  { value: 2, label: "そう思わない" },
  { value: 3, label: "どちらともいえない" },
  { value: 4, label: "そう思う" },
  { value: 5, label: "強くそう思う" },
];
