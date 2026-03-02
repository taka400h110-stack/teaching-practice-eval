import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Card, CardContent, TextField, Typography, Alert,
  CircularProgress, Divider, Chip, List, ListItemButton, ListItemText, ListItemIcon,
  Collapse,
} from "@mui/material";
import SchoolIcon              from "@mui/icons-material/School";
import PersonIcon              from "@mui/icons-material/Person";
import AdminPanelSettingsIcon  from "@mui/icons-material/AdminPanelSettings";
import SchoolOutlinedIcon      from "@mui/icons-material/SchoolOutlined";
import SupervisorAccountIcon   from "@mui/icons-material/SupervisorAccount";
import ScienceIcon             from "@mui/icons-material/Science";
import GroupsIcon              from "@mui/icons-material/Groups";
import AccountBalanceIcon      from "@mui/icons-material/AccountBalance";
import AssessmentIcon          from "@mui/icons-material/Assessment";
import ExpandMoreIcon          from "@mui/icons-material/ExpandMore";
import ExpandLessIcon          from "@mui/icons-material/ExpandLess";
import mockApi from "../api/client";

interface DemoAccount {
  email: string;
  password: string;
  label: string;
  role: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  group: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "student@teaching-eval.jp", password: "password",
    label: "実習生", role: "student",
    description: "日誌作成・AI評価・成長確認",
    icon: <PersonIcon />, color: "#1976d2", group: "実習関係者",
  },
  {
    email: "teacher@teaching-eval.jp", password: "password",
    label: "大学教員", role: "univ_teacher",
    description: "指導学生の評価・統計閲覧",
    icon: <SchoolOutlinedIcon />, color: "#388e3c", group: "実習関係者",
  },
  {
    email: "mentor@teaching-eval.jp", password: "password",
    label: "校内指導教員", role: "school_mentor",
    description: "担当実習生の評価・コメント",
    icon: <SupervisorAccountIcon />, color: "#f57c00", group: "実習関係者",
  },
  {
    email: "evaluator@teaching-eval.jp", password: "password",
    label: "評価者（RQ2）", role: "evaluator",
    description: "研究用人間評価入力（ICC検証）",
    icon: <AssessmentIcon />, color: "#e64a19", group: "実習関係者",
  },
  {
    email: "researcher@teaching-eval.jp", password: "password",
    label: "研究者", role: "researcher",
    description: "全統計・分析・コーホート管理",
    icon: <ScienceIcon />, color: "#0288d1", group: "研究・行政",
  },
  {
    email: "collaborator@teaching-eval.jp", password: "password",
    label: "研究協力者", role: "collaborator",
    description: "データ閲覧・基本統計の参照",
    icon: <GroupsIcon />, color: "#00897b", group: "研究・行政",
  },
  {
    email: "board@teaching-eval.jp", password: "password",
    label: "教育委員会", role: "board_observer",
    description: "統計サマリー・学校別データ閲覧",
    icon: <AccountBalanceIcon />, color: "#5e35b1", group: "研究・行政",
  },
  {
    email: "admin@teaching-eval.jp", password: "password",
    label: "管理者", role: "admin",
    description: "全機能・ユーザー管理・システム設定",
    icon: <AdminPanelSettingsIcon />, color: "#7b1fa2", group: "システム",
  },
];

const GROUPS = ["実習関係者", "研究・行政", "システム"];

export default function LoginPage() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState("student@teaching-eval.jp");
  const [password, setPassword] = useState("password");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "実習関係者": true, "研究・行政": false, "システム": false,
  });

  const handleLogin = async (e?: string, p?: string) => {
    setLoading(true);
    setError("");
    const loginEmail = e ?? email;
    const loginPw    = p ?? password;
    try {
      const result = await mockApi.login(loginEmail, loginPw);
      // 初回ログインかどうかでルーティングを分岐
      if ((result as { requiresOnboarding?: boolean }).requiresOnboarding) {
        navigate("/onboarding");
      } else {
        navigate("/dashboard");
      }
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

  const toggleGroup = (group: string) => {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
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
      <Box sx={{ width: "100%", maxWidth: 520, px: 2 }}>
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
            AI-Supported Teaching Practice Evaluation System
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

            <Divider sx={{ my: 2 }}>
              <Typography variant="caption" color="text.secondary">デモアカウント（役割別）</Typography>
            </Divider>

            {/* 役割グループ別アコーディオン */}
            {GROUPS.map((group) => {
              const accounts = DEMO_ACCOUNTS.filter((a) => a.group === group);
              return (
                <Box key={group} sx={{ mb: 0.5 }}>
                  <ListItemButton
                    dense
                    onClick={() => toggleGroup(group)}
                    sx={{ bgcolor: "grey.100", borderRadius: 1, py: 0.5 }}
                  >
                    <ListItemText
                      primary={group}
                      primaryTypographyProps={{ fontSize: 11, fontWeight: 700, color: "text.secondary" }}
                    />
                    {openGroups[group] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                  </ListItemButton>
                  <Collapse in={openGroups[group]}>
                    <List dense disablePadding sx={{ bgcolor: "grey.50", borderRadius: 1, overflow: "hidden", mt: 0.25 }}>
                      {accounts.map((acc, idx) => (
                        <React.Fragment key={acc.email}>
                          {idx > 0 && <Divider />}
                          <ListItemButton
                            onClick={() => handleDemoLogin(acc)}
                            sx={{ py: 0.6, "&:hover": { bgcolor: "primary.50" } }}
                          >
                            <ListItemIcon sx={{ minWidth: 34, color: acc.color }}>
                              {acc.icon}
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <Typography variant="body2" fontWeight="bold" fontSize={12}>{acc.label}</Typography>
                                  <Chip label={acc.role} size="small" sx={{ fontSize: 8, height: 14, bgcolor: acc.color, color: "white" }} />
                                </Box>
                              }
                              secondary={
                                <Typography variant="caption" color="text.secondary" fontSize={10}>{acc.description}</Typography>
                              }
                            />
                          </ListItemButton>
                        </React.Fragment>
                      ))}
                    </List>
                  </Collapse>
                </Box>
              );
            })}
          </CardContent>
        </Card>

        <Typography variant="caption" color="rgba(255,255,255,0.5)" display="block" textAlign="center" mt={2}>
          © 2026 AI-Supported Teaching Practice Evaluation System v2.0
        </Typography>
      </Box>
    </Box>
  );
}
