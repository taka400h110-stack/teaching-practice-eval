import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Card, CardContent, CardActionArea, TextField, Typography, Alert,
  CircularProgress, Divider, Chip, Avatar,
} from "@mui/material";
import SchoolIcon             from "@mui/icons-material/School";
import PersonIcon             from "@mui/icons-material/Person";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import SchoolOutlinedIcon     from "@mui/icons-material/SchoolOutlined";
import SupervisorAccountIcon  from "@mui/icons-material/SupervisorAccount";
import ScienceIcon            from "@mui/icons-material/Science";
import GroupsIcon             from "@mui/icons-material/Groups";
import AccountBalanceIcon     from "@mui/icons-material/AccountBalance";
import AssessmentIcon         from "@mui/icons-material/Assessment";
import LoginIcon              from "@mui/icons-material/Login";
import apiClient from "../api/client";

// ── デモアカウント定義（全8役割・基本情報入り）──
const DEMO_ACCOUNTS = [
  {
    email:    "student@teaching-eval.jp",
    password: "password",
    label:    "実習生",
    name:     "山田 太郎",
    detail1:  "3年生 / 〇〇市立東小学校",
    detail2:  "集中実習（10週）/ 学籍: 2023A001",
    icon:     <PersonIcon />,
    color:    "#1976d2",
    bg:       "#e3f2fd",
    group:    "実習関係者",
    desc:     "日誌作成 / AI評価 / 成長グラフ / チャットBot",
  },
  {
    email:    "teacher@teaching-eval.jp",
    password: "password",
    label:    "大学教員",
    name:     "佐藤 花子",
    detail1:  "〇〇大学 教育学部",
    detail2:  "准教授 / 指導学生: 30名",
    icon:     <SchoolOutlinedIcon />,
    color:    "#388e3c",
    bg:       "#e8f5e9",
    group:    "実習関係者",
    desc:     "学生一覧 / コメント入力 / 人間評価（RQ2）",
  },
  {
    email:    "mentor@teaching-eval.jp",
    password: "password",
    label:    "校内指導教員",
    name:     "鈴木 一郎",
    detail1:  "〇〇市立東小学校",
    detail2:  "担任教諭 / 4年生担当",
    icon:     <SupervisorAccountIcon />,
    color:    "#f57c00",
    bg:       "#fff3e0",
    group:    "実習関係者",
    desc:     "担当実習生の日誌確認 / コメント入力",
  },
  {
    email:    "evaluator@teaching-eval.jp",
    password: "password",
    label:    "評価者",
    name:     "小林 評価者",
    detail1:  "教員養成評価機構",
    detail2:  "外部評価者 / ICC検証担当",
    icon:     <AssessmentIcon />,
    color:    "#e64a19",
    bg:       "#fbe9e7",
    group:    "実習関係者",
    desc:     "人間評価入力 / 信頼性分析（RQ2）",
  },
  {
    email:    "researcher@teaching-eval.jp",
    password: "password",
    label:    "研究者",
    name:     "伊藤 研究者",
    detail1:  "〇〇大学大学院 教育研究科",
    detail2:  "博士課程研究員",
    icon:     <ScienceIcon />,
    color:    "#0288d1",
    bg:       "#e1f5fe",
    group:    "研究・行政",
    desc:     "全統計・SCAT分析・コホート管理・エクスポート",
  },
  {
    email:    "collaborator@teaching-eval.jp",
    password: "password",
    label:    "研究協力者",
    name:     "渡辺 協力者",
    detail1:  "△△教育センター",
    detail2:  "研究協力員",
    icon:     <GroupsIcon />,
    color:    "#00897b",
    bg:       "#e0f2f1",
    group:    "研究・行政",
    desc:     "データ閲覧 / 基本統計の参照",
  },
  {
    email:    "board@teaching-eval.jp",
    password: "password",
    label:    "教育委員会",
    name:     "中村 委員",
    detail1:  "〇〇市教育委員会",
    detail2:  "指導主事",
    icon:     <AccountBalanceIcon />,
    color:    "#5e35b1",
    bg:       "#ede7f6",
    group:    "研究・行政",
    desc:     "統計サマリー / 学校別データ閲覧",
  },
  {
    email:    "admin@teaching-eval.jp",
    password: "password",
    label:    "管理者",
    name:     "田中 管理者",
    detail1:  "〇〇大学 教職センター",
    detail2:  "センター長 / システム管理者",
    icon:     <AdminPanelSettingsIcon />,
    color:    "#7b1fa2",
    bg:       "#f3e5f5",
    group:    "システム",
    desc:     "全機能 / ユーザー登録・管理",
  },
];

const GROUPS = ["実習関係者", "研究・行政", "システム"] as const;

const GROUP_COLS: Record<string, number> = {
  "実習関係者": 2,
  "研究・行政": 2,
  "システム": 1,
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState("student@teaching-eval.jp");
  const [password, setPassword] = useState("password");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [loggingIn, setLoggingIn] = useState<string | null>(null); // どのアカウントでログイン中か

  const doLogin = async (loginEmail: string, loginPw: string) => {
    setLoading(true);
    setLoggingIn(loginEmail);
    setError("");
    try {
      const result = await apiClient.login(loginEmail, loginPw) as any;
      const user = apiClient.getCurrentUser();
      console.log("LOGIN RESULT", result, "USER", user);
      if (result.requiresOnboarding) {
        navigate("/onboarding");
      } else {
        const user = apiClient.getCurrentUser();
        const rawRole = user?.role || user?.user?.role || user?.roles?.[0] || 'student';
        const role = typeof rawRole === 'string' ? rawRole : (Array.isArray(rawRole) ? rawRole[0] : 'student');
        if (role === 'admin' || role === 'researcher') {
          navigate("/admin");
        } else if (role === 'teacher' || role === 'univ_teacher' || role === 'school_mentor') {
          navigate("/teacher-dashboard");
        } else {
          navigate("/dashboard");
        }
      }
    } catch {
      setError("ログインに失敗しました。");
      setLoggingIn(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="flex-start"
      minHeight="100vh"
      sx={{ background: "linear-gradient(135deg, #1565C0 0%, #0D47A1 40%, #1a237e 100%)", py: 4, px: 2 }}
    >
      <Box sx={{ width: "100%", maxWidth: 860 }}>
        {/* ── ヘッダー ── */}
        <Box textAlign="center" mb={3}>
          <Box sx={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 64, height: 64, borderRadius: "50%", bgcolor: "white",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)", mb: 1.5,
          }}>
            <SchoolIcon sx={{ fontSize: 36, color: "primary.main" }} />
          </Box>
          <Typography variant="h5" fontWeight="bold" color="white" gutterBottom>
            教育実習評価システム
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
            AI-Supported Teaching Practice Evaluation System
          </Typography>
        </Box>

        {/* ── ログインフォーム ── */}
        <Card sx={{ boxShadow: "0 8px 40px rgba(0,0,0,0.3)", borderRadius: 3, mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box display="flex" gap={2} alignItems="flex-end" flexWrap="wrap">
              <TextField
                label="メールアドレス" value={email}
                onChange={(e) => setEmail(e.target.value)}
                size="small" sx={{ flex: "1 1 220px" }}
                onKeyDown={(e) => e.key === "Enter" && doLogin(email, password)}
              />
              <TextField
                label="パスワード" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                size="small" sx={{ flex: "1 1 140px" }}
                onKeyDown={(e) => e.key === "Enter" && doLogin(email, password)}
              />
              <Button
                variant="contained" onClick={() => doLogin(email, password)}
                disabled={loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <LoginIcon />}
                sx={{ height: 40, fontWeight: "bold", minWidth: 120 }}
              >
                ログイン
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* ── デモアカウント一覧 ── */}
        <Card sx={{ boxShadow: "0 8px 40px rgba(0,0,0,0.3)", borderRadius: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" mb={0.5}>
              デモアカウント一覧
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
              カードをクリックするとワンクリックでログインできます。パスワードはすべて{" "}
              <Box component="span" sx={{ fontFamily: "monospace", bgcolor: "grey.100", px: 0.5, borderRadius: 0.5 }}>password</Box>
            </Typography>

            {GROUPS.map((group) => {
              const accounts = DEMO_ACCOUNTS.filter((a) => a.group === group);
              const cols = GROUP_COLS[group];
              return (
                <Box key={group} mb={3}>
                  <Divider sx={{ mb: 1.5 }}>
                    <Chip label={group} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                  </Divider>
                  <Box sx={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                    gap: 1.5,
                  }}>
                    {accounts.map((acc) => {
                      const isActive = loggingIn === acc.email;
                      return (
                        <Card
                          key={acc.email}
                          variant="outlined"
                          sx={{
                            border: `1.5px solid ${acc.color}30`,
                            bgcolor: acc.bg,
                            transition: "all 0.15s",
                            opacity: loggingIn && !isActive ? 0.5 : 1,
                            "&:hover": {
                              boxShadow: `0 2px 12px ${acc.color}40`,
                              borderColor: acc.color,
                              transform: "translateY(-1px)",
                            },
                          }}
                        >
                          <CardActionArea
                            onClick={() => { setEmail(acc.email); setPassword(acc.password); void doLogin(acc.email, acc.password); }}
                            disabled={!!loggingIn}
                            sx={{ p: 1.5 }}
                          >
                            <Box display="flex" alignItems="flex-start" gap={1.5}>
                              {/* アバター */}
                              <Avatar sx={{ bgcolor: acc.color, width: 40, height: 40, flexShrink: 0 }}>
                                {isActive ? <CircularProgress size={20} sx={{ color: "white" }} /> : acc.icon}
                              </Avatar>

                              {/* 情報 */}
                              <Box flex={1} minWidth={0}>
                                <Box display="flex" alignItems="center" gap={0.5} mb={0.2}>
                                  <Typography variant="body2" fontWeight="bold" fontSize={13}>
                                    {acc.name}
                                  </Typography>
                                  <Chip
                                    label={acc.label}
                                    size="small"
                                    sx={{ height: 16, fontSize: 9, bgcolor: acc.color, color: "white", fontWeight: "bold" }}
                                  />
                                </Box>
                                <Typography variant="caption" display="block" color="text.secondary" fontSize={11} lineHeight={1.4}>
                                  {acc.detail1}
                                </Typography>
                                <Typography variant="caption" display="block" color="text.secondary" fontSize={11} lineHeight={1.4}>
                                  {acc.detail2}
                                </Typography>
                                <Typography variant="caption" display="block" sx={{ mt: 0.5, color: acc.color, fontSize: 10 }}>
                                  {acc.desc}
                                </Typography>
                                <Typography variant="caption" display="block" sx={{ mt: 0.3, color: "text.disabled", fontSize: 9, fontFamily: "monospace" }}>
                                  {acc.email}
                                </Typography>
                              </Box>
                            </Box>
                          </CardActionArea>
                        </Card>
                      );
                    })}
                  </Box>
                </Box>
              );
            })}
          </CardContent>
        </Card>

        <Typography variant="caption" color="rgba(255,255,255,0.4)" display="block" textAlign="center" mt={2}>
          © 2026 AI-Supported Teaching Practice Evaluation System v2.0 — Demo Environment
        </Typography>
      </Box>
    </Box>
  );
}
