/**
 * OnboardingPage.tsx
 * 初回ログイン時の基本情報入力（役割別ステップ）
 *
 * 【学生（student）】
 *   Step0: 研究倫理同意
 *   Step1: プロフィール（氏名・性別・学年・学籍番号）
 *   Step2: 実習情報（校種・実習形態・週数・学校名・指導教員）
 *   Step3: BigFive パーソナリティ測定
 *   Step4: 目標設定（SMART）
 *   Step5: 完了
 *
 * 【学生以外の全役割】
 *   Step0: 研究倫理同意
 *   Step1: プロフィール（氏名・所属機関・役職）
 *   Step2: 完了
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Card, CardContent, Chip, Step, StepLabel, Stepper,
  TextField, Typography, FormControl, InputLabel, Select, MenuItem,
  Alert, Slider, LinearProgress, Checkbox, FormControlLabel,
  Table, TableBody, TableCell, TableHead, TableRow, Paper,
  Accordion, AccordionSummary, AccordionDetails, Divider,
} from "@mui/material";
import SchoolIcon          from "@mui/icons-material/School";
import PersonIcon          from "@mui/icons-material/Person";
import CheckCircleIcon     from "@mui/icons-material/CheckCircle";
import KeyboardArrowLeft   from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight  from "@mui/icons-material/KeyboardArrowRight";
import GavelIcon           from "@mui/icons-material/Gavel";
import PsychologyIcon      from "@mui/icons-material/Psychology";
import TrackChangesIcon    from "@mui/icons-material/TrackChanges";
import ExpandMoreIcon      from "@mui/icons-material/ExpandMore";
import BusinessIcon        from "@mui/icons-material/Business";
import mockApi, { bfiApi } from "../api/client";
import type { UserRole } from "../types";

// ── 役割ラベル ──
const ROLE_LABELS: Record<UserRole, string> = {
  student:        "実習生",
  univ_teacher:   "大学教員",
  school_mentor:  "校内指導教員",
  evaluator:      "評価者",
  researcher:     "研究者",
  collaborator:   "研究協力者",
  board_observer: "教育委員会",
  admin:          "管理者",
};

// ── 学生用ステップ ──
const STUDENT_STEPS = [
  "研究倫理同意",
  "プロフィール設定",
  "実習情報入力",
  "性格特性アンケート（並川ら, 2012）",
  "目標設定",
  "完了",
];

// ── 学生以外用ステップ ──
const STAFF_STEPS = [
  "研究倫理同意",
  "プロフィール設定",
  "完了",
];

import { NAMIKAWA_29_ITEMS, BIG_FIVE_FACTORS, LIKERT_5_MARKS } from "../constants/bigFive";


// 同意確認項目（全役割共通）
const CONSENT_ITEMS = [
  { key: "purpose"   as const, label: "研究の目的・内容について説明を受け、理解しました" },
  { key: "voluntary" as const, label: "参加は自由意志であり、辞退しても不利益を被らないことを理解しました" },
  { key: "privacy"   as const, label: "個人情報は匿名化処理され、研究目的以外に使用されないことを理解しました" },
  { key: "withdraw"  as const, label: "研究期間中いつでも参加を撤回できることを理解しました" },
  { key: "storage"   as const, label: "データは研究終了後5年間保管されることを理解しました" },
];

export default function OnboardingPage() {
  const navigate = useNavigate();

  // ログイン中ユーザーの役割を取得
  const currentUser = mockApi.getCurrentUser();
  const role: UserRole = currentUser?.role ?? "student";
  const isStudent = role === "student";

  const STEPS = isStudent ? STUDENT_STEPS : STAFF_STEPS;

  const [activeStep, setActiveStep] = useState(0);

  // ── Step 0: 倫理同意 ──
  const [consentChecks, setConsentChecks] = useState({
    purpose: false, voluntary: false, privacy: false, withdraw: false, storage: false,
  });

  // ── Step 1 (学生): プロフィール ──
  const [studentProfile, setStudentProfile] = useState({
    student_id: "", name: "", grade: "2", gender: "male",
  });

  // ── Step 1 (学生以外): プロフィール ──
  const [staffProfile, setStaffProfile] = useState({
    name: "", organization: "", position: "",
  });

  // ── Step 2 (学生): 実習情報 ──
  const [internship, setInternship] = useState({
    school_type: "elementary", internship_type: "intensive",
    weeks: "10", school_name: "", supervisor: "",
  });

  // ── Step 3 (学生): BigFive ──
  const [bigFiveScores, setBigFiveScores] = useState<Record<string, number>>(
    Object.fromEntries(NAMIKAWA_29_ITEMS.map((i) => [i.id, 3]))
  );

  // ── Step 4 (学生): 目標 ──
  const [goals, setGoals] = useState(["", "", ""]);

  const allConsentChecked = Object.values(consentChecks).every(Boolean);

  // ── 進行可否判定 ──
  const canProceed = (): boolean => {
    if (activeStep === 0) return allConsentChecked;
    if (activeStep === 1) {
      if (isStudent) return studentProfile.name.trim() !== "" && studentProfile.student_id.trim() !== "";
      return staffProfile.name.trim() !== "";
    }
    return true;
  };

  const handleNext = () => {
    const user = mockApi.getCurrentUser();
    if (user && isStudent && activeStep === 3) {
      bfiApi.saveResponses(user.id, bigFiveScores);
    }
    if (activeStep === STEPS.length - 1) {
      const user = mockApi.getCurrentUser();
      if (user) mockApi.completeOnboarding(user.id);
      if (user.role === "student") {
        bfiApi.saveResponses(user.id, bigFiveScores);
      }
      navigate("/dashboard");
    } else {
      setActiveStep((s) => s + 1);
    }
  };
  const handleBack = () => setActiveStep((s) => s - 1);

  // BigFive 因子平均
  const calcFactorAvg = (factorKey: string) => {
    const items = NAMIKAWA_29_ITEMS.filter((i) => i.factor === factorKey);
    const sum = items.reduce((acc, i) => {
      const val = bigFiveScores[i.id] ?? 3;
      return acc + (i.reverse ? (6 - val) : val);
    }, 0);
    return (sum / items.length).toFixed(2);
  };

  // 完了画面のチップ（役割によって変える）
  const completionChips = isStudent
    ? [
        studentProfile.name && <Chip key="name" icon={<PersonIcon />} label={studentProfile.name} color="primary" />,
        <Chip key="grade" label={`${studentProfile.grade}年生`} variant="outlined" />,
        <Chip key="type" label={internship.internship_type === "intensive" ? "集中実習" : "分散実習"} variant="outlined" />,
        <Chip key="weeks" label={`${internship.weeks}週間`} variant="outlined" />,
      ]
    : [
        staffProfile.name && <Chip key="name" icon={<PersonIcon />} label={staffProfile.name} color="primary" />,
        <Chip key="role" label={ROLE_LABELS[role]} color="secondary" />,
        staffProfile.organization && <Chip key="org" icon={<BusinessIcon />} label={staffProfile.organization} variant="outlined" />,
      ];

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="grey.50"
      p={2}
      sx={{ background: "linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)" }}
    >
      <Card sx={{ width: "100%", maxWidth: 700, boxShadow: 4, borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
          {/* ヘッダー */}
          <Box display="flex" alignItems="center" gap={1.5} mb={3}>
            <SchoolIcon color="primary" sx={{ fontSize: 36 }} />
            <Box>
              <Typography variant="h5" fontWeight="bold" color="primary">初期設定</Typography>
              <Typography variant="caption" color="text.secondary">
                教育実習評価システム — 初回ログイン設定
                {" "}
                <Chip label={ROLE_LABELS[role]} size="small" color={isStudent ? "primary" : "secondary"} sx={{ ml: 0.5, height: 18, fontSize: 10 }} />
              </Typography>
            </Box>
          </Box>

          {/* ステッパー */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }} alternativeLabel>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel sx={{ "& .MuiStepLabel-label": { fontSize: 10 } }}>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* ═══════════════════ Step 0: 研究倫理同意（全役割共通） ═══════════════════ */}
          {activeStep === 0 && (
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <GavelIcon color="warning" />
                <Typography variant="subtitle1" fontWeight="bold">研究参加同意書</Typography>
              </Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                本研究はXX大学倫理審査委員会の承認を得て実施します（承認番号：〇〇〇）。
                以下の項目をご確認のうえ、同意される場合はチェックを入れてください。
              </Alert>

              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2" fontWeight="bold">研究の概要</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                    本研究は、AIを活用した教育実習評価システムの有効性を検証することを目的とします。
                    {isStudent
                      ? "実習生の日誌記録、AI評価結果、週次自己評価データ、チャットBot対話ログ、およびパーソナリティデータを研究データとして収集・分析します。"
                      : "システムへのログイン履歴、入力データ（コメント・評価値等）を研究データとして収集・分析します。"}
                    収集されたデータは匿名化処理のうえ、博士論文および学術論文の執筆に使用されます。
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Box sx={{ mt: 2, p: 2, bgcolor: "grey.50", borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" mb={1}>同意確認事項</Typography>
                {CONSENT_ITEMS.map(({ key, label }) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={consentChecks[key]}
                        onChange={(e) => setConsentChecks((p) => ({ ...p, [key]: e.target.checked }))}
                        color="primary"
                      />
                    }
                    label={<Typography variant="body2">{label}</Typography>}
                    sx={{ display: "block", mb: 0.5 }}
                  />
                ))}
              </Box>

              {!allConsentChecked && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  すべての項目に同意していただく必要があります。
                </Alert>
              )}
            </Box>
          )}

          {/* ═══════════════════ Step 1: プロフィール（学生） ═══════════════════ */}
          {activeStep === 1 && isStudent && (
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <PersonIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="bold">あなたの基本情報</Typography>
              </Box>
              <TextField
                label="学籍番号"
                value={studentProfile.student_id}
                onChange={(e) => setStudentProfile({ ...studentProfile, student_id: e.target.value })}
                fullWidth size="small" sx={{ mb: 2 }} required
                placeholder="例: 2024A001"
                helperText="大学発行の学籍番号を入力してください"
              />
              <TextField
                label="氏名（フルネーム）"
                value={studentProfile.name}
                onChange={(e) => setStudentProfile({ ...studentProfile, name: e.target.value })}
                fullWidth size="small" sx={{ mb: 2 }} required
                helperText="実名で入力してください（研究データとして使用する場合は匿名化されます）"
              />
              <Box display="flex" gap={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>性別</InputLabel>
                  <Select value={studentProfile.gender} label="性別"
                    onChange={(e) => setStudentProfile({ ...studentProfile, gender: e.target.value })}>
                    <MenuItem value="male">男性</MenuItem>
                    <MenuItem value="female">女性</MenuItem>
                    <MenuItem value="other">その他・回答しない</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>学年</InputLabel>
                  <Select value={studentProfile.grade} label="学年"
                    onChange={(e) => setStudentProfile({ ...studentProfile, grade: e.target.value })}>
                    {["1", "2", "3", "4"].map((g) => (
                      <MenuItem key={g} value={g}>{g}年生</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          )}

          {/* ═══════════════════ Step 1: プロフィール（学生以外） ═══════════════════ */}
          {activeStep === 1 && !isStudent && (
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <PersonIcon color="secondary" />
                <Typography variant="subtitle1" fontWeight="bold">プロフィール設定</Typography>
                <Chip label={ROLE_LABELS[role]} color="secondary" size="small" />
              </Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                氏名と所属機関を入力してください。学籍番号・実習情報・パーソナリティ測定は実習生のみ必要です。
              </Alert>
              <TextField
                label="氏名（フルネーム）"
                value={staffProfile.name}
                onChange={(e) => setStaffProfile({ ...staffProfile, name: e.target.value })}
                fullWidth size="small" sx={{ mb: 2 }} required
                helperText="実名で入力してください"
              />
              <TextField
                label="所属機関・組織名"
                value={staffProfile.organization}
                onChange={(e) => setStaffProfile({ ...staffProfile, organization: e.target.value })}
                fullWidth size="small" sx={{ mb: 2 }}
                placeholder={
                  role === "univ_teacher"   ? "例: ○○大学 教育学部" :
                  role === "school_mentor"  ? "例: ○○市立△△小学校" :
                  role === "evaluator"      ? "例: △△教員養成評価機構" :
                  role === "researcher"     ? "例: ○○大学大学院 教育研究科" :
                  role === "collaborator"   ? "例: □□教育センター" :
                  role === "board_observer" ? "例: ○○市教育委員会" :
                  "例: ○○大学"
                }
              />
              <TextField
                label="役職・職名"
                value={staffProfile.position}
                onChange={(e) => setStaffProfile({ ...staffProfile, position: e.target.value })}
                fullWidth size="small"
                placeholder={
                  role === "univ_teacher"   ? "例: 准教授・講師" :
                  role === "school_mentor"  ? "例: 担任教諭・副担任" :
                  role === "evaluator"      ? "例: 外部評価者" :
                  role === "researcher"     ? "例: 博士課程研究員" :
                  role === "board_observer" ? "例: 指導主事" :
                  "例: 担当者"
                }
              />
            </Box>
          )}

          {/* ═══════════════════ Step 2 (学生): 実習情報 ═══════════════════ */}
          {activeStep === 2 && isStudent && (
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <SchoolIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="bold">実習情報を入力してください</Typography>
              </Box>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>実習校種別</InputLabel>
                <Select value={internship.school_type} label="実習校種別"
                  onChange={(e) => setInternship({ ...internship, school_type: e.target.value })}>
                  <MenuItem value="elementary">小学校</MenuItem>
                  <MenuItem value="middle">中学校</MenuItem>
                  <MenuItem value="high">高等学校</MenuItem>
                  <MenuItem value="special">特別支援学校</MenuItem>
                </Select>
              </FormControl>
              <Box display="flex" gap={2} sx={{ mb: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>実習形態</InputLabel>
                  <Select value={internship.internship_type} label="実習形態"
                    onChange={(e) => setInternship({ ...internship, internship_type: e.target.value })}>
                    <MenuItem value="intensive">集中実習</MenuItem>
                    <MenuItem value="distributed">分散実習</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="実習週数"
                  type="number"
                  value={internship.weeks}
                  onChange={(e) => setInternship({ ...internship, weeks: e.target.value })}
                  fullWidth size="small"
                  slotProps={{ input: { inputProps: { min: 1, max: 15 } } }}
                  helperText="通常4〜10週間"
                />
              </Box>
              <TextField
                label="実習校名"
                value={internship.school_name}
                onChange={(e) => setInternship({ ...internship, school_name: e.target.value })}
                fullWidth size="small" sx={{ mb: 2 }}
                placeholder="〇〇市立△△小学校"
              />
              <TextField
                label="指導教員名"
                value={internship.supervisor}
                onChange={(e) => setInternship({ ...internship, supervisor: e.target.value })}
                fullWidth size="small"
              />
            </Box>
          )}

          {/* ═══════════════════ Step 3 (学生): BigFive ═══════════════════ */}
          {activeStep === 3 && isStudent && (
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <PsychologyIcon color="secondary" />
                <Typography variant="subtitle1" fontWeight="bold">
                  パーソナリティ測定（Big Five Inventory）
                </Typography>
              </Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                以下の25項目について、あなた自身にどの程度当てはまるかを1〜5で評価してください。
                このデータはRQ3の分析（外向性と成長軌跡の関連）に使用されます。
              </Alert>

              {BIG_FIVE_FACTORS.map(({ key, label, color }) => {
                const items = NAMIKAWA_29_ITEMS.filter((i) => i.factor === key);
                return (
                  <Accordion key={key} defaultExpanded sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: color }} />
                        <Typography variant="subtitle2" fontWeight="bold">{label}</Typography>
                        <Chip label={`平均: ${calcFactorAvg(key)}`} size="small"
                          sx={{ bgcolor: color, color: "white", fontSize: 10 }} />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                      {items.map((item) => (
                        <Box key={item.id} sx={{ mb: 2 }}>
                          <Typography variant="body2" mb={0.5}>{item.label}</Typography>
                          <Slider
                            value={bigFiveScores[item.id] ?? 3}
                            min={1} max={5} step={1}
                            marks={LIKERT_5_MARKS.map((m) => ({
                              value: m.value,
                              label: m.value === 1 || m.value === 5 ? m.label : "",
                            }))}
                            onChange={(_, v) => setBigFiveScores((p) => ({ ...p, [item.id]: v as number }))}
                            sx={{ color, "& .MuiSlider-markLabel": { fontSize: 9, mt: 0.5 } }}
                          />
                        </Box>
                      ))}
                    </AccordionDetails>
                  </Accordion>
                );
              })}

              <Paper sx={{ p: 2, mt: 2, bgcolor: "grey.50" }}>
                <Typography variant="subtitle2" fontWeight="bold" mb={1}>測定結果サマリー</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>因子</TableCell>
                      <TableCell align="center">平均スコア</TableCell>
                      <TableCell align="center">傾向</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {BIG_FIVE_FACTORS.map(({ key, label, color }) => {
                      const avg = parseFloat(calcFactorAvg(key));
                      return (
                        <TableRow key={key}>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color }} />
                              <Typography variant="caption">{label.split("（")[0]}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <LinearProgress variant="determinate" value={(avg / 5) * 100}
                              sx={{ height: 8, borderRadius: 4, bgcolor: "grey.200",
                                "& .MuiLinearProgress-bar": { bgcolor: color } }} />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={avg >= 4 ? "高" : avg >= 3 ? "中" : "低"}
                              size="small"
                              sx={{
                                bgcolor: avg >= 4 ? color : "grey.300",
                                color: avg >= 4 ? "white" : "text.primary",
                                fontSize: 10,
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Paper>
            </Box>
          )}

          {/* ═══════════════════ Step 4 (学生): 目標設定 ═══════════════════ */}
          {activeStep === 4 && isStudent && (
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <TrackChangesIcon color="success" />
                <Typography variant="subtitle1" fontWeight="bold">実習目標の設定（SMART目標）</Typography>
              </Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                実習期間中に達成したい目標を最大3つ記入してください（任意）。
                SMART基準（Specific・Measurable・Achievable・Relevant・Time-bound）を意識すると効果的です。
              </Alert>
              <Paper sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}>
                <Typography variant="caption" color="text.secondary">
                  📌 SMART目標の例：「第3週までに、特別支援が必要な児童への個別指導計画を3件作成し、
                  指導教員のフィードバックで評価項目1・2で平均4点以上を獲得する」
                </Typography>
              </Paper>
              {goals.map((g, i) => (
                <TextField
                  key={i}
                  label={`目標 ${i + 1}（任意）`}
                  value={g}
                  onChange={(e) => { const n = [...goals]; n[i] = e.target.value; setGoals(n); }}
                  fullWidth size="small" sx={{ mb: 2 }} multiline rows={2}
                  placeholder={
                    i === 0 ? "例：特別支援が必要な児童への対応力を高める" :
                    i === 1 ? "例：授業設計の改善点を毎週の日誌で振り返る" :
                    "例：指導教員との対話を通じて省察の深さを高める"
                  }
                />
              ))}
            </Box>
          )}

          {/* ═══════════════════ 完了ステップ（学生: Step5 / 学生以外: Step2） ═══════════════════ */}
          {activeStep === STEPS.length - 1 && (
            <Box textAlign="center" py={2}>
              <CheckCircleIcon sx={{ fontSize: 72, color: "success.main", mb: 2 }} />
              <Typography variant="h5" fontWeight="bold" mb={1}>設定完了！</Typography>
              <Typography color="text.secondary" mb={3}>
                {isStudent
                  ? "初期設定が完了しました。実習日誌の記録を始めましょう。"
                  : "初期設定が完了しました。ダッシュボードをご確認ください。"}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center", mb: 2 }}>
                {completionChips.filter(Boolean)}
              </Box>
              <Alert severity="info">
                {isStudent
                  ? "BigFiveデータは保存されました。研究分析（RQ3）に使用されます。倫理同意書は電子記録として保管されます。"
                  : "倫理同意書は電子記録として保管されます。"}
              </Alert>
            </Box>
          )}

          {/* ナビゲーションボタン */}
          <Box display="flex" justifyContent="space-between" mt={4}>
            <Button
              onClick={handleBack}
              disabled={activeStep === 0}
              startIcon={<KeyboardArrowLeft />}
              variant="outlined"
            >
              戻る
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!canProceed()}
              endIcon={activeStep < STEPS.length - 1 ? <KeyboardArrowRight /> : undefined}
              color={activeStep === 0 && !allConsentChecked ? "inherit" : "primary"}
            >
              {activeStep === STEPS.length - 1 ? "ダッシュボードへ" : "次へ"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
