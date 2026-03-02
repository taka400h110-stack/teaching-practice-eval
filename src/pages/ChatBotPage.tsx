/**
 * ChatBotPage.tsx
 * 反省支援AIチャットページ
 */
import React, { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box, Button, Card, CardContent, Chip, CircularProgress, Divider,
  IconButton, Paper, TextField, Typography, Avatar, Tooltip,
} from "@mui/material";
import ChatIcon         from "@mui/icons-material/Chat";
import SendIcon         from "@mui/icons-material/Send";
import SmartToyIcon     from "@mui/icons-material/SmartToy";
import PersonIcon       from "@mui/icons-material/Person";
import RefreshIcon      from "@mui/icons-material/Refresh";
import AutoAwesomeIcon  from "@mui/icons-material/AutoAwesome";
import { useQuery }     from "@tanstack/react-query";
import mockApi from "../api/client";
import type { ChatMessage } from "../types";

const PHASE_LABELS: Record<string, { label: string; color: "default" | "primary" | "success" | "warning" }> = {
  phase0:    { label: "アイスブレイク",     color: "default" },
  phase1:    { label: "フェーズ1: 事実確認", color: "primary" },
  bridge:    { label: "フェーズ橋渡し",     color: "warning" },
  phase2:    { label: "フェーズ2: 深化",    color: "success" },
  completed: { label: "セッション完了",     color: "success" },
};

const PROMPT_SUGGESTIONS = [
  "今日の授業で一番うまくいったことは何ですか？",
  "特別支援が必要な児童への対応で気になる点はありましたか？",
  "次週に向けて改善したいことを具体的に教えてください。",
  "指導教員のアドバイスで印象に残ったことは？",
  "目標を達成するために具体的にどんな行動を取りましたか？",
];

// モック応答生成
function generateResponse(userMsg: string): string {
  const lower = userMsg.toLowerCase();
  if (lower.includes("うまくい")) return "それは素晴らしいですね！うまくいった要因は何だと思いますか？次週もその工夫を続けられそうですか？";
  if (lower.includes("難し") || lower.includes("困")) return "難しかった場面を詳しく教えてください。どんなサポートがあれば改善できそうですか？";
  if (lower.includes("児童") || lower.includes("生徒")) return "その児童/生徒の様子をもう少し詳しく聞かせてください。どんな支援が効果的だと思いましたか？";
  if (lower.includes("目標") || lower.includes("改善")) return "具体的な目標設定ができていますね。SMART基準（Specific/Measurable/Achievable/Relevant/Time-bound）から見るとどうでしょうか？";
  return "なるほど、ありがとうございます。その経験から何を学びましたか？具体的なエピソードをもっと聞かせてください。";
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isBot = msg.role === "assistant";
  const time  = new Date(msg.timestamp).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

  return (
    <Box
      display="flex"
      flexDirection={isBot ? "row" : "row-reverse"}
      alignItems="flex-end"
      gap={1}
      mb={1.5}
    >
      <Avatar
        sx={{
          width: 32, height: 32, flexShrink: 0,
          bgcolor: isBot ? "primary.main" : "grey.400",
        }}
      >
        {isBot ? <SmartToyIcon sx={{ fontSize: 18 }} /> : <PersonIcon sx={{ fontSize: 18 }} />}
      </Avatar>
      <Box sx={{ maxWidth: "75%" }}>
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
          <Typography variant="body2" sx={{ lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{msg.content}</Typography>
        </Paper>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.3, textAlign: isBot ? "left" : "right" }}>
          {isBot ? "AIサポーター" : "あなた"} · {time}
        </Typography>
      </Box>
    </Box>
  );
}

export default function ChatBotPage() {
  const [params] = useSearchParams();
  const journalId = params.get("journalId") ?? "journal-004";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: session } = useQuery({
    queryKey: ["chat", journalId],
    queryFn:  () => mockApi.getChatSession(journalId),
  });

  // セッションメッセージを初期ロード
  useEffect(() => {
    if (session && messages.length === 0) {
      setMessages(session.messages);
    }
  }, [session]);

  // 自動スクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const content = text ?? input.trim();
    if (!content || loading) return;
    setInput("");

    const userMsg: ChatMessage = {
      id:        `u-${Date.now()}`,
      role:      "user",
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));

    const botMsg: ChatMessage = {
      id:        `b-${Date.now()}`,
      role:      "assistant",
      content:   generateResponse(content),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, botMsg]);
    setLoading(false);
  };

  const phase = session?.phase ?? "phase1";
  const phaseCfg = PHASE_LABELS[phase] ?? PHASE_LABELS.phase1;

  return (
    <Box display="flex" flexDirection="column" height="calc(100vh - 90px)">
      {/* ヘッダー */}
      <Box display="flex" alignItems="center" gap={1} mb={1.5} flexWrap="wrap">
        <ChatIcon color="primary" />
        <Typography variant="h5" fontWeight="bold">反省支援チャット</Typography>
        <Chip label={phaseCfg.label} size="small" color={phaseCfg.color} icon={<AutoAwesomeIcon sx={{ fontSize: "14px !important" }} />} />
        <Box ml="auto">
          <Tooltip title="会話をリセット">
            <IconButton size="small" onClick={() => { if (session) setMessages(session.messages.slice(0, 1)); }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* チャット本体 */}
      <Card sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* メッセージエリア */}
        <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
          {messages.length === 0 && (
            <Box textAlign="center" py={4}>
              <SmartToyIcon sx={{ fontSize: 48, color: "primary.light", mb: 1 }} />
              <Typography color="text.secondary" variant="body2">
                AIサポーターが実習の振り返りをお手伝いします。
              </Typography>
              <Typography color="text.secondary" variant="caption">
                日誌の内容について質問に答えながら省察を深めましょう。
              </Typography>
            </Box>
          )}
          {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
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

        {/* 提案プロンプト */}
        <Box sx={{ px: 2, py: 1, bgcolor: "grey.50", overflowX: "auto" }}>
          <Box display="flex" gap={0.8} sx={{ flexWrap: "nowrap", pb: 0.5 }}>
            {PROMPT_SUGGESTIONS.map((s) => (
              <Chip
                key={s}
                label={s.length > 20 ? s.slice(0, 20) + "…" : s}
                size="small"
                clickable
                variant="outlined"
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
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
            placeholder="今日の実習について話しましょう… (Shift+Enterで改行)"
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
      </Card>
    </Box>
  );
}
