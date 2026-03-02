import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Card, CardContent, TextField, Typography, Alert,
  CircularProgress, Divider, Chip, List, ListItemButton, ListItemText, ListItemIcon,
} from "@mui/material";
import SchoolIcon       from "@mui/icons-material/School";
import PersonIcon       from "@mui/icons-material/Person";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import ScienceIcon from "@mui/icons-material/Science";
import mockApi from "../api/client";

interface DemoAccount {
  email: string;
  password: string;
  label: string;
  role: string;
  icon: React.ReactNode;
  color: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: "student@teaching-eval.jp", password: "password", label: "実習生",       role: "student",       icon: <PersonIcon />,                 color: "#1976d2" },
  { email: "teacher@teaching-eval.jp", password: "password", label: "大学教員",     role: "univ_teacher",  icon: <SchoolOutlinedIcon />,          color: "#388e3c" },
  { email: "mentor@teaching-eval.jp",  password: "password", label: "校内指導教員", role: "school_mentor", icon: <SupervisorAccountIcon />,       color: "#f57c00" },
  { email: "admin@teaching-eval.jp",   password: "password", label: "管理者",       role: "admin",         icon: <AdminPanelSettingsIcon />,      color: "#7b1fa2" },
  { email: "researcher@teaching-eval.jp", password: "password", label: "研究者",   role: "researcher",    icon: <ScienceIcon />,                 color: "#0288d1" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState("admin@teaching-eval.jp");
  const [password, setPassword] = useState("password");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async (e?: string, p?: string) => {
    setLoading(true);
    setError("");
    const loginEmail = e ?? email;
    const loginPw    = p ?? password;
    try {
      await mockApi.login(loginEmail, loginPw);
      navigate("/dashboard");
    } catch {
      setError("ログインに失敗しました。メールアドレスとパスワードを確認してください。");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword(acc.password);
    void handleLogin(acc.email, acc.password);
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{
        background: "linear-gradient(135deg, #1565C0 0%, #0D47A1 40%, #1a237e 100%)",
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 480, px: 2 }}>
        {/* ヘッダー */}
        <Box textAlign="center" mb={3}>
          <Box
            sx={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 64, height: 64, borderRadius: "50%", bgcolor: "white",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)", mb: 1.5,
            }}
          >
            <SchoolIcon sx={{ fontSize: 36, color: "primary.main" }} />
          </Box>
          <Typography variant="h5" fontWeight="bold" color="white" gutterBottom>
            教育実習評価システム
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
            Teaching Practice Evaluation System
          </Typography>
        </Box>

        <Card sx={{ boxShadow: "0 8px 40px rgba(0,0,0,0.3)", borderRadius: 3 }}>
          <CardContent sx={{ p: 3 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TextField
              label="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth size="small" sx={{ mb: 2 }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <TextField
              label="パスワード"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth size="small" sx={{ mb: 2 }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <Button
              variant="contained"
              fullWidth
              onClick={() => handleLogin()}
              disabled={loading}
              size="large"
              sx={{ py: 1.2, fontWeight: "bold", borderRadius: 2 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "ログイン"}
            </Button>

            <Divider sx={{ my: 2.5 }}>
              <Typography variant="caption" color="text.secondary">デモアカウント</Typography>
            </Divider>

            <List dense disablePadding sx={{ bgcolor: "grey.50", borderRadius: 2, overflow: "hidden" }}>
              {DEMO_ACCOUNTS.map((acc, idx) => (
                <React.Fragment key={acc.email}>
                  {idx > 0 && <Divider />}
                  <ListItemButton
                    onClick={() => handleDemoLogin(acc)}
                    sx={{ py: 0.8, "&:hover": { bgcolor: "primary.50" } }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: acc.color }}>
                      {acc.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight="bold">{acc.label}</Typography>
                          <Chip label={acc.role} size="small" sx={{ fontSize: 9, height: 16, bgcolor: acc.color, color: "white" }} />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">{acc.email}</Typography>
                      }
                    />
                  </ListItemButton>
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>

        <Typography variant="caption" color="rgba(255,255,255,0.5)" display="block" textAlign="center" mt={2}>
          © 2026 Teaching Practice Evaluation System
        </Typography>
      </Box>
    </Box>
  );
}
