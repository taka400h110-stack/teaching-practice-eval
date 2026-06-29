// @ts-nocheck

/**
 * StudentChatLogsPage.tsx
 * 学生別 AI対話ログ閲覧ページ
 *
 * 教員・メンター・研究者・管理者・委員会が、各学生の生成AIとの対話ログを
 * 一人ひとり確認できる閲覧専用ページ。
 *   左: 学生一覧（セッション数・メッセージ数つき）
 *   中: 選択した学生のセッション（日誌）一覧
 *   右: 選択したセッションの会話全文
 */
import React, { useMemo, useState } from "react";
import {
  Box, Card, CardContent, Chip, CircularProgress, Divider, List, ListItemButton,
  ListItemText, Paper, Typography, Avatar, Stack, Alert, TextField, InputAdornment,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import ChatIcon from "@mui/icons-material/Chat";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import SearchIcon from "@mui/icons-material/Search";
import ForumIcon from "@mui/icons-material/Forum";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../api/client";
import { LoadingView, ErrorView, EmptyView } from "../components/StateViews";
import type { ChatSession, ChatMessage } from "../types";

const PHASE_LABELS: Record<string, string> = {
  phase0: "Phase0: 前週目標確認",
  phase1: "Phase1: 省察深化",
  bridge: "Bridge: 気づき→目標",
  phase2: "Phase2: SMART目標確定",
  completed: "セッション完了",
};

type StudentGroup = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  sessions: ChatSession[];
  totalMessages: number;
};

export default function StudentChatLogsPage() {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedJournalId, setSelectedJournalId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // 全学生の全セッション（特権ロールはstudent_id未指定で全件取得）
  const { data: allSessions = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["all-chat-sessions"],
    queryFn: () => apiClient.getAllChatSessions(),
  });

  // 選択したセッション（会話全文）の詳細
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["chat-session-detail", selectedJournalId],
    queryFn: () => apiClient.getChatSession(selectedJournalId as string),
    enabled: !!selectedJournalId,
  });

  // 学生ごとにグルーピング
  const groups: StudentGroup[] = useMemo(() => {
    const map = new Map<string, StudentGroup>();
    for (const s of allSessions as ChatSession[]) {
      const sid = s.student_id || "unknown";
      if (!map.has(sid)) {
        map.set(sid, {
          studentId: sid,
          studentName: s.student_name || sid,
          studentEmail: s.student_email || "",
          sessions: [],
          totalMessages: 0,
        });
      }
      const g = map.get(sid)!;
      g.sessions.push(s);
      g.totalMessages += s.message_count || 0;
    }
    let arr = Array.from(map.values());
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(
        (g) =>
          g.studentName.toLowerCase().includes(q) ||
          g.studentEmail.toLowerCase().includes(q) ||
          g.studentId.toLowerCase().includes(q)
      );
    }
    return arr.sort((a, b) => a.studentName.localeCompare(b.studentName, "ja"));
  }, [allSessions, search]);

  const selectedGroup = groups.find((g) => g.studentId === selectedStudentId) || null;
  const messages: ChatMessage[] = (detail?.messages as ChatMessage[]) || [];

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
        <ForumIcon color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            学生別 AI対話ログ
          </Typography>
          <Typography variant="body2" color="text.secondary">
            各実習生の生成AI（省察支援チャット）との対話ログを一人ひとり閲覧できます。
          </Typography>
        </Box>
      </Stack>
      <Divider sx={{ mb: 2 }} />

      {isLoading ? (
        <LoadingView label="対話ログを読み込み中…" />
      ) : isError ? (
        <ErrorView message="対話ログの取得に失敗しました。" onRetry={() => void refetch()} />
      ) : (allSessions as ChatSession[]).length === 0 ? (
        <EmptyView
          icon={<ForumIcon />}
          title="まだ対話ログがありません"
          description="実習生が省察支援チャットを利用すると、ここに表示されます。"
        />
      ) : (
        <Grid container spacing={2}>
          {/* 左: 学生一覧 */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  実習生 ({groups.length}名)
                </Typography>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="氏名・IDで検索"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  sx={{ mb: 1 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <List dense disablePadding>
                  {groups.map((g) => (
                    <ListItemButton
                      key={g.studentId}
                      selected={g.studentId === selectedStudentId}
                      onClick={() => {
                        setSelectedStudentId(g.studentId);
                        setSelectedJournalId(null);
                      }}
                      sx={{ borderRadius: 1, mb: 0.5 }}
                    >
                      <Avatar sx={{ width: 28, height: 28, mr: 1, bgcolor: "primary.main", fontSize: 14 }}>
                        {g.studentName.charAt(0)}
                      </Avatar>
                      <ListItemText
                        primary={g.studentName}
                        secondary={`${g.sessions.length}セッション / ${g.totalMessages}件`}
                        primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
                        secondaryTypographyProps={{ fontSize: 12 }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* 中: セッション一覧 */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  セッション
                </Typography>
                {!selectedGroup ? (
                  <Typography variant="body2" color="text.secondary">
                    左側で実習生を選択してください。
                  </Typography>
                ) : (
                  <List dense disablePadding>
                    {selectedGroup.sessions
                      .slice()
                      .sort((a, b) =>
                        String(b.updated_at || b.created_at).localeCompare(
                          String(a.updated_at || a.created_at)
                        )
                      )
                      .map((s) => (
                        <ListItemButton
                          key={s.id}
                          selected={s.journal_id === selectedJournalId}
                          onClick={() => setSelectedJournalId(s.journal_id)}
                          sx={{ borderRadius: 1, mb: 0.5 }}
                        >
                          <ChatIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
                          <ListItemText
                            primary={`日誌: ${s.journal_id}`}
                            secondary={
                              <>
                                <Chip
                                  size="small"
                                  label={PHASE_LABELS[s.current_state || s.phase || "phase1"] || s.current_state || "—"}
                                  sx={{ mr: 0.5, fontSize: 10, height: 18 }}
                                />
                                {s.message_count || 0}件
                              </>
                            }
                            primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
                            secondaryTypographyProps={{ fontSize: 11, component: "span" }}
                          />
                        </ListItemButton>
                      ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* 右: 会話全文 */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ height: "100%", minHeight: 400 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  対話全文
                  {selectedGroup && selectedJournalId && (
                    <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      （{selectedGroup.studentName} / {selectedJournalId}）
                    </Typography>
                  )}
                </Typography>
                {!selectedJournalId ? (
                  <Typography variant="body2" color="text.secondary">
                    セッションを選択すると会話全文が表示されます。
                  </Typography>
                ) : detailLoading ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress size={28} />
                  </Box>
                ) : messages.length === 0 ? (
                  <Alert severity="info">このセッションにはメッセージがありません。</Alert>
                ) : (
                  <Stack spacing={1.5} sx={{ maxHeight: "65vh", overflowY: "auto", pr: 1 }}>
                    {messages.map((m) => {
                      const isUser = m.role === "user";
                      return (
                        <Box
                          key={m.id}
                          sx={{
                            display: "flex",
                            flexDirection: isUser ? "row-reverse" : "row",
                            alignItems: "flex-start",
                            gap: 1,
                          }}
                        >
                          <Avatar
                            sx={{
                              width: 30,
                              height: 30,
                              bgcolor: isUser ? "primary.main" : "secondary.main",
                            }}
                          >
                            {isUser ? <PersonIcon fontSize="small" /> : <SmartToyIcon fontSize="small" />}
                          </Avatar>
                          <Paper
                            elevation={0}
                            sx={{
                              p: 1.2,
                              maxWidth: "80%",
                              bgcolor: isUser ? "primary.50" : "grey.100",
                              border: "1px solid",
                              borderColor: isUser ? "primary.200" : "grey.300",
                              borderRadius: 2,
                            }}
                          >
                            <Typography variant="caption" color="text.secondary">
                              {isUser ? "実習生" : "AI"}
                              {m.timestamp ? ` ・ ${new Date(m.timestamp).toLocaleString("ja-JP")}` : ""}
                            </Typography>
                            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mt: 0.3 }}>
                              {m.content}
                            </Typography>
                          </Paper>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
