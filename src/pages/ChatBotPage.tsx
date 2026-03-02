import React, { useState } from "react";
import { Box, Button, Card, CardContent, TextField, Typography, Chip } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { useQuery } from "@tanstack/react-query";
import mockApi from "../api/client";

export default function ChatBotPage() {
  const { data: session } = useQuery({
    queryKey: ["chat"],
    queryFn:  () => mockApi.getChatSession("journal-004"),
  });
  const [input, setInput] = useState("");

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={1}>省察チャットBot</Typography>
      {session && <Chip label={`フェーズ: ${session.phase}`} size="small" color="primary" sx={{ mb: 2 }} />}
      <Card sx={{ mb: 2, height: 420, overflow: "auto" }}>
        <CardContent>
          {(session?.messages ?? []).map((m) => (
            <Box
              key={m.id}
              sx={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                mb: 1.5,
              }}
            >
              <Box
                sx={{
                  maxWidth: "75%", px: 2, py: 1, borderRadius: 2,
                  bgcolor: m.role === "user" ? "primary.main" : "grey.100",
                  color:   m.role === "user" ? "#fff" : "text.primary",
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{m.content}</Typography>
              </Box>
            </Box>
          ))}
        </CardContent>
      </Card>
      <Box display="flex" gap={1}>
        <TextField
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="メッセージを入力…"
          fullWidth size="small"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); setInput(""); } }}
        />
        <Button variant="contained" endIcon={<SendIcon />} onClick={() => setInput("")} disabled={!input.trim()}>送信</Button>
      </Box>
    </Box>
  );
}
