/**
 * ChatBotPage.tsx
 * 省察支援AIチャットBot（CoT-B: 省察深さ判定 / CoT-C: SMART目標提案）
 * ルーブリック4因子23項目に基づく対話支援
 */
import React, { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Box, Button, Card, Chip, CircularProgress, Divider,
  IconButton, Paper, TextField, Typography, Avatar, Tooltip,
  LinearProgress, Accordion, AccordionSummary, AccordionDetails,
  Alert, Dialog, DialogTitle, DialogContent, List, ListItem,
  ListItemButton, ListItemText, ListItemIcon, Badge,
} from "@mui/material";
import ChatIcon           from "@mui/icons-material/Chat";
import HistoryIcon        from "@mui/icons-material/History";
import MenuBookIcon       from "@mui/icons-material/MenuBook";
import SendIcon           from "@mui/icons-material/Send";
import SmartToyIcon       from "@mui/icons-material/SmartToy";
import PersonIcon         from "@mui/icons-material/Person";
import RefreshIcon        from "@mui/icons-material/Refresh";
import AutoAwesomeIcon    from "@mui/icons-material/AutoAwesome";
import PsychologyIcon     from "@mui/icons-material/Psychology";
import TrackChangesIcon   from "@mui/icons-material/TrackChanges";
import ExpandMoreIcon     from "@mui/icons-material/ExpandMore";
import { useQuery }       from "@tanstack/react-query";
import mockApi from "../api/client";
import type { ChatMessage } from "../types";
import {
  RUBRIC_FACTORS as _RUBRIC_FACTORS,
  RUBRIC_ITEMS,
  REFLECTION_DEPTH_LEVELS,
  getItemsByFactor,
} from "../constants/rubric";

// ────────────────────────────────────────────
// ルーブリック定義（rubric.ts から統一利用）
// 2026-03-07: 全4因子・全23項目にRD水準を適用
// ────────────────────────────────────────────
const RUBRIC_FACTORS = _RUBRIC_FACTORS.map((f) => ({
  key: f.roman,
  label: f.label,
  color: f.color,
  items: getItemsByFactor(f.key).map((item) => ({ num: item.num, label: item.label })),
}));

// フェーズラベル
const PHASE_LABELS: Record<string, { label: string; color: "default" | "primary" | "success" | "warning" }> = {
  phase0:    { label: "Phase0: 前週目標確認",     color: "default" },
  phase1:    { label: "Phase1: 省察深化",         color: "primary" },
  bridge:    { label: "Bridge: 気づき→目標",      color: "warning" },
  phase2:    { label: "Phase2: SMART目標確定",    color: "success" },
  completed: { label: "セッション完了",            color: "success" },
};

// ────────────────────────────────────────────
// CoT-B: 省察深さ判定ロジック（模擬）
// ────────────────────────────────────────────
function estimateReflectionDepth(text: string): number {
  const lower = text.toLowerCase();
  // 批判的・変容的省察の指標語
  if (lower.includes("なぜなら") && (lower.includes("社会") || lower.includes("倫理") || lower.includes("価値観"))) return 5;
  if (lower.includes("なぜなら") || lower.includes("なぜ") || lower.includes("理由は")) {
    if (lower.includes("視点") || lower.includes("考え方") || lower.includes("一方")) return 4;
    return 3;
  }
  if (lower.includes("思う") || lower.includes("感じた") || lower.includes("気づいた")) return 2;
  return 1;
}

// ────────────────────────────────────────────
// CoT-B ベースの応答生成（ルーブリック因子参照）
// ────────────────────────────────────────────
function generateCoTResponse(userMsg: string, rdLevel: number): string {
  const lower = userMsg.toLowerCase();

  // F1: 児童生徒への指導力
  if (lower.includes("特別支援") || lower.includes("配慮") || lower.includes("インクルーシブ")) {
    if (rdLevel <= 2) {
      return `ルーブリック F1（児童生徒への指導力）に関連する内容ですね。\n\nその場面で、あなたはなぜその支援方法を選びましたか？児童の背景（障害特性・文化的背景等）をどのように把握していましたか？[省察深さ: RD-${rdLevel} → もう少し掘り下げてみましょう]`;
    }
    return `F1の視点からの深い省察ですね。\n\nその支援の背景にある理念（インクルーシブ教育の原則など）と、あなたの実践がどう結びついているかを次の目標に反映できそうですか？[RD-${rdLevel}]`;
  }

  // F2: 自己評価力
  if (lower.includes("授業") || lower.includes("教材") || lower.includes("学習目標") || lower.includes("指導")) {
    if (rdLevel <= 2) {
      return `ルーブリック F2（自己評価力）に関連しますね。\n\nその体験から、あなた自身の指導や姿勢についてどんな気づきがありましたか？評価項目8-13の視点から振り返ってみてください。[RD-${rdLevel}]`;
    }
    return `F2（自己評価力）の観点から深い省察ができています。\n\n実践の省察と改善責任（項目12）と関連付けて、SMART目標として具体化してみましょう。例：「第〇週までに〇〇を実施し、自己評価力の平均〇点以上を目指す」[RD-${rdLevel}]`;
  }

  // F3: 学級経営力
  if (lower.includes("学級") || lower.includes("児童") || lower.includes("生徒") || lower.includes("クラス")) {
    if (rdLevel <= 2) {
      return `ルーブリック F3（学級経営力）の視点ですね。\n\n学級の雰囲気や児童間の関係性について、どのような変化を感じましたか？あなたのリーダーシップとどんな関係がありそうですか？[RD-${rdLevel}]`;
    }
    return `F3（学級経営力）の深い省察ですね。学級経営の改善に向けた具体的なアクションプランを立ててみましょう。（項目14-17を参照）[RD-${rdLevel}]`;
  }

  // F4: 職務を理解して行動する力
  if (lower.includes("省察") || lower.includes("振り返") || lower.includes("フィードバック") || lower.includes("成長") || lower.includes("同僚") || lower.includes("職務")) {
    if (rdLevel <= 2) {
      return `ルーブリック F4（職務を理解して行動する力）に関連しています。\n\nその気づきは、教師としての役割・職務倫理とどうつながりますか？以前の自分の考え方とどう違いますか？[RD-${rdLevel} → より深い省察を目指しましょう]`;
    }
    if (rdLevel >= 4) {
      return `優れた批判的省察（RD-${rdLevel}）です！\n\nこの洞察を次週のSMART目標に落とし込みましょう。何を・いつまでに・どのように測定しますか？`;
    }
  }

  // SMART目標支援
  if (lower.includes("目標") || lower.includes("改善")) {
    return `良い方向性ですね！SMART基準で目標を整理しましょう：\n\n• Specific（具体的）: 何を改善しますか？\n• Measurable（測定可能）: どのルーブリック項目で何点を目指しますか？\n• Achievable（達成可能）: 実習期間内で現実的ですか？\n• Relevant（関連性）: あなたの課題に直結していますか？\n• Time-bound（期限）: 何週目までにやりますか？`;
  }

  // デフォルト（省察深さに応じた深化促進）
  if (rdLevel <= 2) {
    return `ありがとうございます。\n\nその経験について「なぜそうなったのか」「どうすれば改善できるか」を、ルーブリックの4つの因子（F1:児童生徒への指導力・F2:自己評価力・F3:学級経営力・F4:職務理解）の観点から振り返ってみましょう。[現在の省察深さ: RD-${rdLevel}]`;
  }
  return `深い省察ができています（RD-${rdLevel}）。\n\nこの洞察を具体的な行動目標に変換するために、次週のSMART目標として書き出してみましょう。`;
}

// ────────────────────────────────────────────
// メッセージバブルコンポーネント
// ────────────────────────────────────────────
function MessageBubble({ msg, rdLevel }: { msg: ChatMessage; rdLevel?: number }) {
  const isBot = msg.role === "assistant";
  const time  = new Date(msg.timestamp).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  const rdInfo = !isBot && rdLevel ? REFLECTION_DEPTH_LEVELS[rdLevel - 1] : null;

  return (
    <Box display="flex" flexDirection={isBot ? "row" : "row-reverse"} alignItems="flex-end" gap={1} mb={2}>
      <Avatar sx={{ width: 32, height: 32, flexShrink: 0, bgcolor: isBot ? "primary.main" : "grey.400" }}>
        {isBot ? <SmartToyIcon sx={{ fontSize: 18 }} /> : <PersonIcon sx={{ fontSize: 18 }} />}
      </Avatar>
      <Box sx={{ maxWidth: "78%" }}>
        {rdInfo && (
          <Chip
            label={rdInfo.label}
            size="small"
            sx={{ mb: 0.5, bgcolor: rdInfo.color, fontSize: 9, height: 16, display: "block", width: "fit-content", ml: "auto" }}
          />
        )}
        <Paper
          sx={{
            p: 1.5, borderRadius: 2,
            borderBottomLeftRadius: isBot ? 0 : 2,
            borderBottomRightRadius: isBot ? 2 : 0,
            bgcolor: isBot ? "primary.main" : "grey.100",
            color: isBot ? "white" : "text.primary",
            boxShadow: 1,
          }}
        >
          <Typography variant="body2" sx={{ lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{msg.content}</Typography>
        </Paper>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.3, textAlign: isBot ? "left" : "right" }}>
          {isBot ? "AI省察サポーター（CoT-B）" : "あなた"} · {time}
        </Typography>
      </Box>
    </Box>
  );
}

// ────────────────────────────────────────────
// メインコンポーネント
// ────────────────────────────────────────────
export default function ChatBotPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const journalId = params.get("journalId") ?? "journal-004";
  const [messages, setMessages]    = useState<ChatMessage[]>([]);
  const [rdHistory, setRdHistory]  = useState<number[]>([]);
  const [input, setInput]          = useState("");
  const [loading, setLoading]      = useState(false);
  const [showRubric, setShowRubric] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: session } = useQuery({
    queryKey: ["chat", journalId],
    queryFn:  () => mockApi.getChatSession(journalId),
  });

  // 全チャットセッション一覧
  const { data: allSessions = [] } = useQuery({
    queryKey: ["allChatSessions"],
    queryFn:  () => (mockApi as unknown as { getAllChatSessions: () => Promise<import("../types").ChatSession[]> }).getAllChatSessions(),
  });

  // 日誌一覧（セッションに対応する日誌タイトルを表示するため）
  const { data: allJournals = [] } = useQuery({
    queryKey: ["journals"],
    queryFn:  () => mockApi.getJournals(),
  });

  useEffect(() => {
    setMessages([]);
    setRdHistory([]);
  }, [journalId]);

  useEffect(() => {
    if (session && messages.length === 0) {
      setMessages(session.messages);
    }
  }, [session]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 過去セッション切り替え
  const switchSession = (jId: string) => {
    setParams({ journalId: jId });
    setHistoryOpen(false);
  };

  const sendMessage = async (text?: string) => {
    const content = text ?? input.trim();
    if (!content || loading) return;
    setInput("");

    const rdLevel = estimateReflectionDepth(content);
    setRdHistory((prev) => [...prev, rdLevel]);

    const userMsg: ChatMessage = {
      id:        `u-${Date.now()}`,
      role:      "user",
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // OpenAI API 経由で応答を生成（CoT-B + CoT-C）
      const journalData = allJournals.find((j) => j.id === journalId);
      const journalContent = (journalData as unknown as { content?: string })?.content ?? "";

      const [chatResp, cotBResp] = await Promise.allSettled([
        fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
            phase: phase,
            journal_content: journalContent,
            week_number: journalData?.week_number ?? 1,
            reflection_depth: rdLevel,
            session_id: journalId,
          }),
        }).then((r) => r.json()),

        fetch("/api/ai/reflection-depth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_message: content,
            journal_content: journalContent,
            session_id: journalId,
          }),
        }).then((r) => r.json()),
      ]);

      let botContent: string;

      if (chatResp.status === "fulfilled" && (chatResp.value as { success?: boolean; message?: string }).success) {
        botContent = (chatResp.value as { message: string }).message;

        // CoT-B の省察深さ情報を付加
        if (cotBResp.status === "fulfilled" && (cotBResp.value as { success?: boolean }).success) {
          const rd = cotBResp.value as { reflection: { reflection_level: string; category: string; next_action: string } };
          botContent += `\n\n📊 省察レベル: **${rd.reflection.reflection_level}**（${rd.reflection.category}）`;
        }
      } else {
        // フォールバック: ローカルCoT応答
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));
        botContent = generateCoTResponse(content, rdLevel);
      }

      const botMsg: ChatMessage = {
        id:        `b-${Date.now()}`,
        role:      "assistant",
        content:   botContent,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      // エラー時フォールバック
      await new Promise((r) => setTimeout(r, 600));
      const botMsg: ChatMessage = {
        id:        `b-${Date.now()}`,
        role:      "assistant",
        content:   generateCoTResponse(content, rdLevel),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  const phase    = session?.phase ?? "phase1";
  const phaseCfg = PHASE_LABELS[phase] ?? PHASE_LABELS.phase1;
  const avgRd    = rdHistory.length > 0 ? (rdHistory.reduce((a, b) => a + b, 0) / rdHistory.length).toFixed(1) : "-";
  const currentRd = rdHistory[rdHistory.length - 1] ?? 0;

  // Phase別プロンプト提案（ルーブリック因子別）
  const PHASE_PROMPTS: Record<string, string[]> = {
    phase0:    ["先週の目標はどこまで達成できましたか？", "前週と今週で変化した点は何ですか？"],
    phase1:    [
      "今日の授業でF1（児童生徒への指導力）で気づいたことは？",
      "自己評価力（F2）：自分の指導姿勢を振り返ってみてください",
      "学級経営力（F3）で児童の反応はどうでしたか？",
      "フィードバックを受けてどう感じましたか？（F4:職務理解）",
    ],
    bridge:    ["今日の気づきを1文で表現すると？", "次週に向けて取り組みたい課題は何ですか？"],
    phase2:    ["SMART目標を書いてみてください", "いつまでにどのルーブリック項目で何点を目指しますか？"],
    completed: ["セッションを振り返ってどうでしたか？"],
  };
  const suggestions = PHASE_PROMPTS[phase] ?? PHASE_PROMPTS.phase1;

  return (
    <Box display="flex" flexDirection="column" height="calc(100vh - 90px)">
      {/* ヘッダー */}
      <Box display="flex" alignItems="center" gap={1} mb={1.5} flexWrap="wrap">
        <ChatIcon color="primary" />
        <Typography variant="h5" fontWeight="bold">省察支援チャットBot</Typography>
        <Chip label={phaseCfg.label} size="small" color={phaseCfg.color}
          icon={<AutoAwesomeIcon sx={{ fontSize: "14px !important" }} />} />
        {/* 現在の日誌 */}
        {(() => {
          const j = allJournals.find((j) => j.id === journalId);
          return j ? (
            <Chip
              icon={<MenuBookIcon sx={{ fontSize: "14px !important" }} />}
              label={`Week ${j.week_number}: ${j.title.slice(0, 20)}...`}
              size="small"
              variant="outlined"
              color="primary"
            />
          ) : null;
        })()}
        {avgRd !== "-" && (
          <Chip
            label={`省察深さ: RD-${avgRd}`}
            size="small"
            icon={<PsychologyIcon sx={{ fontSize: "14px !important" }} />}
            sx={{ bgcolor: REFLECTION_DEPTH_LEVELS[Math.round(parseFloat(avgRd)) - 1]?.color ?? "grey.300" }}
          />
        )}
        <Box ml="auto" display="flex" gap={0.5}>
          <Tooltip title="チャット履歴">
            <Badge badgeContent={allSessions.length} color="primary" max={99}>
              <IconButton size="small" color="primary" onClick={() => setHistoryOpen(true)}>
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Badge>
          </Tooltip>
          <Tooltip title="ルーブリック参照">
            <IconButton size="small" onClick={() => setShowRubric((p) => !p)} color={showRubric ? "primary" : "default"}>
              <TrackChangesIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="会話をリセット">
            <IconButton size="small" onClick={() => setMessages(session?.messages.slice(0, 1) ?? [])}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* 過去チャット履歴ダイアログ */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <HistoryIcon color="primary" />
            <Typography fontWeight="bold">チャット履歴</Typography>
            <Chip label={`${allSessions.length}件`} size="small" color="primary" sx={{ ml: "auto" }} />
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {allSessions.length === 0 ? (
            <Box p={3} textAlign="center">
              <Typography color="text.secondary">チャット履歴がありません</Typography>
            </Box>
          ) : (
            <List dense>
              {allSessions.map((s) => {
                const j = allJournals.find((j) => j.id === s.journal_id);
                const lastMsg = s.messages[s.messages.length - 1];
                const isActive = s.journal_id === journalId;
                return (
                  <ListItem key={s.id} disablePadding sx={{ borderLeft: isActive ? "3px solid #1976d2" : "3px solid transparent" }}>
                    <ListItemButton onClick={() => switchSession(s.journal_id)} selected={isActive}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <ChatIcon sx={{ color: isActive ? "#1976d2" : "text.secondary", fontSize: 20 }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" fontWeight={isActive ? "bold" : "normal"}>
                              {j ? `Week ${j.week_number}: ${j.title.slice(0, 25)}` : s.journal_id}
                            </Typography>
                            {isActive && <Chip label="現在" size="small" color="primary" sx={{ height: 16, fontSize: 10 }} />}
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {lastMsg ? lastMsg.content.slice(0, 60) + "..." : "メッセージなし"} ・ {s.messages.length}件
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          )}
          <Box p={1.5} borderTop="1px solid" borderColor="divider">
            <Button
              fullWidth
              variant="outlined"
              startIcon={<MenuBookIcon />}
              onClick={() => { setHistoryOpen(false); navigate("/journals"); }}
            >
              日誌一覧から選ぶ
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* CoTシステム説明 */}
      <Alert severity="info" sx={{ mb: 1, py: 0.5 }} icon={<AutoAwesomeIcon />}>
        <Typography variant="caption">
          このチャットボットはCoT-B（省察深さ判定）とCoT-C（SMART目標提案）を実装しており、
          ルーブリック4因子23項目に基づいてフィードバックを生成します。
        </Typography>
      </Alert>

      {/* ルーブリック参照パネル */}
      {showRubric && (
        <Card sx={{ mb: 1, maxHeight: 220, overflowY: "auto" }}>
          <Box sx={{ p: 1.5 }}>
            <Typography variant="subtitle2" fontWeight="bold" mb={1}>
              ルーブリック参照（4因子23項目）
            </Typography>
            {RUBRIC_FACTORS.map((factor) => (
              <Accordion key={factor.key} disableGutters sx={{ mb: 0.5 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 32, py: 0 }}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: factor.color }} />
                    <Typography variant="caption" fontWeight="bold">
                      {factor.key}: {factor.label}（{factor.items.length}項目）
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, pb: 0.5 }}>
                  {factor.items.map((item) => (
                    <Typography key={item.num} variant="caption" display="block" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                      {item.num}. {item.label}
                    </Typography>
                  ))}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Card>
      )}

      {/* 省察深さ進捗バー */}
      {rdHistory.length > 0 && (
        <Box sx={{ mb: 1, px: 0.5 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.3}>
            <Typography variant="caption" color="text.secondary">省察の深さ推移（CoT-B判定）</Typography>
            <Chip
              label={REFLECTION_DEPTH_LEVELS[currentRd - 1]?.label ?? ""}
              size="small"
              sx={{ bgcolor: REFLECTION_DEPTH_LEVELS[currentRd - 1]?.color ?? "grey.300", fontSize: 9, height: 16 }}
            />
          </Box>
          <LinearProgress
            variant="determinate"
            value={(currentRd / 5) * 100}
            sx={{
              height: 6, borderRadius: 3,
              bgcolor: "grey.200",
              "& .MuiLinearProgress-bar": {
                bgcolor: REFLECTION_DEPTH_LEVELS[currentRd - 1]?.color ?? "primary.main",
              },
            }}
          />
        </Box>
      )}

      {/* チャット本体 */}
      <Card sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* メッセージエリア */}
        <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
          {messages.length === 0 && (
            <Box textAlign="center" py={4}>
              <SmartToyIcon sx={{ fontSize: 48, color: "primary.light", mb: 1 }} />
              <Typography color="text.secondary" variant="body2" mb={0.5}>
                AI省察サポーター（CoT-B/C）が実習振り返りを支援します
              </Typography>
              <Typography color="text.secondary" variant="caption">
                ルーブリック4因子23項目に基づき、省察の深さを高めるフィードバックを提供します
              </Typography>
            </Box>
          )}
          {messages.map((msg, idx) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              rdLevel={msg.role === "user" ? rdHistory[Math.floor(idx / 2)] : undefined}
            />
          ))}
          {loading && (
            <Box display="flex" alignItems="center" gap={1} mb={1.5}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
                <SmartToyIcon sx={{ fontSize: 18 }} />
              </Avatar>
              <Paper sx={{ p: 1.5, borderRadius: 2, borderBottomLeftRadius: 0, bgcolor: "primary.main" }}>
                <CircularProgress size={14} sx={{ color: "white" }} />
              </Paper>
            </Box>
          )}
          <div ref={bottomRef} />
        </Box>

        <Divider />

        {/* フェーズ別プロンプト提案 */}
        <Box sx={{ px: 2, py: 0.8, bgcolor: "grey.50", overflowX: "auto" }}>
          <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
            💡 {phaseCfg.label} の質問例：
          </Typography>
          <Box display="flex" gap={0.8} sx={{ flexWrap: "nowrap", pb: 0.3 }}>
            {suggestions.map((s) => (
              <Chip
                key={s}
                label={s.length > 22 ? s.slice(0, 22) + "…" : s}
                size="small"
                clickable
                variant="outlined"
                color="primary"
                onClick={() => sendMessage(s)}
                sx={{ fontSize: 11, flexShrink: 0 }}
              />
            ))}
          </Box>
        </Box>

        {/* 入力エリア */}
        <Box display="flex" gap={1} p={1.5}>
          <TextField
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); }
            }}
            placeholder="今日の実習について話しましょう… (ルーブリック因子を意識して書くとフィードバックが充実します)"
            fullWidth
            size="small"
            multiline
            maxRows={3}
          />
          <Button
            variant="contained"
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            sx={{ minWidth: 48, px: 1.5 }}
          >
            <SendIcon />
          </Button>
        </Box>
        <Box mt={2} display="flex" justifyContent="center">
          <Button variant="outlined" color="success" startIcon={<TrackChangesIcon />}
            onClick={async () => {
              if (messages.length > 0) {
                const user = JSON.parse(localStorage.getItem("user_info") || "{}");
                const j = allJournals.find((j) => j.id === journalId);
                const weekNum = j?.week_number || 1;
                if (user.id) {
                  try {
                    const authHeader = btoa(JSON.stringify({ id: user.id, role: user.role }));
                    const res = await fetch("/api/ai/evaluate-session-rd", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authHeader}` },
                      body: JSON.stringify({ conversation: messages })
                    });
                    const rdData = await res.json();
                    if (rdData.success) {
                      await mockApi.saveRq3bOutcomes({
                        userId: user.id,
                        week_number: weekNum,
                        rd_chat_raw_level: rdData.result.rd_level,
                        rd_chat_category: rdData.result.category
                      });
                    }
                  } catch (e) {
                    console.error("Failed to evaluate RD", e);
                  }
                }
              }
              navigate("/goals");
            }}>
            チャットを終了して目標を設定する (RD-Chat保存)
          </Button>
        </Box>
      </Card>
    </Box>
  );
}
