/**
 * src/pages/UserRegistrationPage.tsx
 * 学生以外の役割（大学教員・校内指導教員・評価者・研究者・研究協力者・教育委員会）
 * のユーザー登録フォーム（管理者のみアクセス可）
 */
import React, { useState } from "react";
import {
  Box, Button, Card, CardContent, Chip, Typography, TextField,
  FormControl, InputLabel, Select, MenuItem, Alert, Snackbar,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Paper, Divider, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions,
} from "@mui/material";
import PersonAddIcon       from "@mui/icons-material/PersonAdd";
import SchoolIcon          from "@mui/icons-material/School";
import ScienceIcon         from "@mui/icons-material/Science";
import VerifiedUserIcon    from "@mui/icons-material/VerifiedUser";
import GroupsIcon          from "@mui/icons-material/Groups";
import AccountBalanceIcon  from "@mui/icons-material/AccountBalance";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import DeleteIcon          from "@mui/icons-material/Delete";
import EditIcon            from "@mui/icons-material/Edit";
import ContentCopyIcon     from "@mui/icons-material/ContentCopy";
import type { UserRole } from "../types";

// ── 役割別設定 ──
const ROLE_CONFIGS: Array<{
  role: UserRole;
  label: string;
  color: string;
  icon: React.ReactNode;
  description: string;
  fields: string[];
}> = [
  {
    role: "univ_teacher",
    label: "大学教員",
    color: "#388e3c",
    icon: <SchoolIcon />,
    description: "1〜3年生の日誌観察・大学コメント入力・人間評価入力（RQ2）",
    fields: ["department", "position"],
  },
  {
    role: "school_mentor",
    label: "校内指導教員",
    color: "#f57c00",
    icon: <SchoolIcon sx={{ color: "#f57c00" }} />,
    description: "4年生の実習日誌コメント入力・現場指導",
    fields: ["school_name", "school_type", "position"],
  },
  {
    role: "evaluator",
    label: "評価者",
    color: "#e64a19",
    icon: <VerifiedUserIcon />,
    description: "過去日誌50件への人間評価入力（RQ2 信頼性検証）",
    fields: ["affiliation"],
  },
  {
    role: "researcher",
    label: "研究者",
    color: "#0288d1",
    icon: <ScienceIcon />,
    description: "全分析機能アクセス・データエクスポート（論文2・3）",
    fields: ["affiliation", "research_area"],
  },
  {
    role: "collaborator",
    label: "研究協力者",
    color: "#00897b",
    icon: <GroupsIcon />,
    description: "統計・コーホートデータの閲覧のみ",
    fields: ["affiliation"],
  },
  {
    role: "board_observer",
    label: "教育委員会",
    color: "#5e35b1",
    icon: <AccountBalanceIcon />,
    description: "統計サマリー・学校別データの閲覧のみ",
    fields: ["organization", "position"],
  },
  {
    role: "admin",
    label: "管理者",
    color: "#7b1fa2",
    icon: <AdminPanelSettingsIcon />,
    description: "全機能アクセス・ユーザー管理",
    fields: ["department"],
  },
];

const SCHOOL_TYPES = [
  { value: "elementary", label: "小学校" },
  { value: "middle",     label: "中学校" },
  { value: "high",       label: "高等学校" },
  { value: "special",    label: "特別支援学校" },
];

interface RegisteredUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  extra: Record<string, string>;
  created_at: string;
}

// ── ローカルストレージで登録ユーザーを管理（本番ではAPIに差し替え） ──
const STORAGE_KEY = "registered_users";
function loadUsers(): RegisteredUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RegisteredUser[]) : [];
  } catch {
    return [];
  }
}
function saveUsers(users: RegisteredUser[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

export default function UserRegistrationPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>("univ_teacher");
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [users, setUsers]   = useState<RegisteredUser[]>(loadUsers);
  const [snackMsg, setSnackMsg] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<RegisteredUser | null>(null);
  const [editTarget, setEditTarget]     = useState<RegisteredUser | null>(null);

  const roleConfig = ROLE_CONFIGS.find((r) => r.role === selectedRole)!;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name?.trim())  errs.name  = "氏名は必須です";
    if (!form.email?.trim()) errs.email = "メールアドレスは必須です";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "有効なメールアドレスを入力してください";
    if (users.some((u) => u.email === form.email && u.id !== editTarget?.id))
      errs.email = "このメールアドレスはすでに登録されています";
    roleConfig.fields.forEach((f) => {
      if (!form[f]?.trim()) errs[f] = "このフィールドは必須です";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    if (editTarget) {
      const updated = users.map((u) =>
        u.id === editTarget.id
          ? { ...u, name: form.name, email: form.email, role: selectedRole, extra: { ...form } }
          : u
      );
      saveUsers(updated);
      setUsers(updated);
      setSnackMsg(`${form.name} の情報を更新しました`);
      setEditTarget(null);
    } else {
      const newUser: RegisteredUser = {
        id:         `user-${Date.now()}`,
        email:      form.email,
        name:       form.name,
        role:       selectedRole,
        extra:      { ...form },
        created_at: new Date().toISOString(),
      };
      const updated = [...users, newUser];
      saveUsers(updated);
      setUsers(updated);
      setSnackMsg(`${form.name}（${roleConfig.label}）を登録しました`);
    }
    setForm({});
    setErrors({});
  };

  const handleDelete = (user: RegisteredUser) => {
    const updated = users.filter((u) => u.id !== user.id);
    saveUsers(updated);
    setUsers(updated);
    setSnackMsg(`${user.name} を削除しました`);
    setDeleteTarget(null);
  };

  const handleEdit = (user: RegisteredUser) => {
    setSelectedRole(user.role);
    setForm({ ...user.extra, name: user.name, email: user.email });
    setEditTarget(user);
  };

  const handleCopyPassword = (email: string) => {
    const tmpPw = "Edu2024#" + email.split("@")[0].slice(0, 4).toUpperCase();
    void navigator.clipboard.writeText(tmpPw);
    setSnackMsg(`仮パスワードをコピーしました: ${tmpPw}`);
  };

  const fieldLabel = (field: string): string => ({
    department:    "所属学科・部署",
    position:      "役職・肩書き",
    school_name:   "勤務校名",
    school_type:   "学校種別",
    affiliation:   "所属機関",
    research_area: "研究領域",
    organization:  "所属組織",
  }[field] ?? field);

  return (
    <Box maxWidth={1100} mx="auto">
      {/* ヘッダー */}
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <PersonAddIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>ユーザー登録管理</Typography>
        <Chip label="管理者のみ" size="small" color="secondary" />
      </Box>

      <Box display="flex" gap={3} flexWrap="wrap" alignItems="flex-start">
        {/* ── 登録フォーム ── */}
        <Card sx={{ flex: "1 1 420px", minWidth: 320 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} mb={2} display="flex" alignItems="center" gap={1}>
              {editTarget ? <EditIcon fontSize="small" /> : <PersonAddIcon fontSize="small" />}
              {editTarget ? "ユーザー情報を編集" : "新規ユーザーを登録"}
            </Typography>

            {/* 役割選択 */}
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>役割</InputLabel>
              <Select
                value={selectedRole}
                label="役割"
                onChange={(e) => {
                  setSelectedRole(e.target.value as UserRole);
                  setErrors({});
                }}
              >
                {ROLE_CONFIGS.map((r) => (
                  <MenuItem key={r.role} value={r.role}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip
                        label={r.label}
                        size="small"
                        sx={{ bgcolor: r.color, color: "white", fontSize: 11, height: 20 }}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* 役割説明 */}
            <Alert severity="info" sx={{ mb: 2, py: 0.5, fontSize: 12 }}>
              {roleConfig.description}
            </Alert>

            {/* 共通フィールド */}
            <TextField
              label="氏名（フルネーム）"
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={!!errors.name}
              helperText={errors.name}
              fullWidth size="small" sx={{ mb: 1.5 }} required
            />
            <TextField
              label="メールアドレス"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={!!errors.email}
              helperText={errors.email ?? "ログインIDになります"}
              fullWidth size="small" sx={{ mb: 1.5 }} required
            />

            <Divider sx={{ my: 1.5 }}>
              <Typography variant="caption" color="text.secondary">役割別情報</Typography>
            </Divider>

            {/* 役割別追加フィールド */}
            {roleConfig.fields.map((field) => (
              field === "school_type" ? (
                <FormControl key={field} fullWidth size="small" sx={{ mb: 1.5 }} error={!!errors[field]}>
                  <InputLabel>{fieldLabel(field)}</InputLabel>
                  <Select
                    value={form[field] ?? ""}
                    label={fieldLabel(field)}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  >
                    {SCHOOL_TYPES.map((t) => (
                      <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                    ))}
                  </Select>
                  {errors[field] && (
                    <Typography variant="caption" color="error" sx={{ ml: 1.5, mt: 0.3 }}>
                      {errors[field]}
                    </Typography>
                  )}
                </FormControl>
              ) : (
                <TextField
                  key={field}
                  label={fieldLabel(field)}
                  value={form[field] ?? ""}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  error={!!errors[field]}
                  helperText={errors[field]}
                  fullWidth size="small" sx={{ mb: 1.5 }}
                  required
                />
              )
            ))}

            <Box display="flex" gap={1} mt={1}>
              {editTarget && (
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => { setEditTarget(null); setForm({}); setErrors({}); }}
                >
                  キャンセル
                </Button>
              )}
              <Button
                variant="contained"
                fullWidth
                startIcon={editTarget ? <EditIcon /> : <PersonAddIcon />}
                onClick={handleSubmit}
                sx={{ bgcolor: roleConfig.color }}
              >
                {editTarget ? "更新" : "登録"}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* ── 登録ユーザー一覧 ── */}
        <Card sx={{ flex: "2 1 500px", minWidth: 340 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              登録済みユーザー一覧
              <Chip label={`${users.length} 名`} size="small" sx={{ ml: 1 }} />
            </Typography>

            {/* 役割フィルター */}
            <Box display="flex" gap={0.5} flexWrap="wrap" mb={2}>
              {ROLE_CONFIGS.map((r) => {
                const cnt = users.filter((u) => u.role === r.role).length;
                return (
                  <Chip
                    key={r.role}
                    label={`${r.label} (${cnt})`}
                    size="small"
                    sx={{
                      bgcolor: cnt > 0 ? r.color : "grey.300",
                      color: cnt > 0 ? "white" : "text.secondary",
                      fontSize: 10,
                    }}
                  />
                );
              })}
            </Box>

            {users.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>
                登録済みユーザーはいません
              </Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ bgcolor: "#f5f5f5" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>氏名</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>役割</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>メール</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>登録日</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((u) => {
                      const cfg = ROLE_CONFIGS.find((r) => r.role === u.role);
                      return (
                        <TableRow key={u.id} hover>
                          <TableCell>{u.name}</TableCell>
                          <TableCell>
                            <Chip
                              label={cfg?.label ?? u.role}
                              size="small"
                              sx={{ bgcolor: cfg?.color ?? "grey.400", color: "white", fontSize: 10, height: 18 }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: 11, color: "text.secondary" }}>{u.email}</TableCell>
                          <TableCell sx={{ fontSize: 11 }}>
                            {new Date(u.created_at).toLocaleDateString("ja-JP")}
                          </TableCell>
                          <TableCell align="center">
                            <Box display="flex" gap={0.5} justifyContent="center">
                              <Tooltip title="仮パスワードをコピー">
                                <IconButton size="small" onClick={() => handleCopyPassword(u.email)}>
                                  <ContentCopyIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="編集">
                                <IconButton size="small" color="primary" onClick={() => handleEdit(u)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="削除">
                                <IconButton size="small" color="error" onClick={() => setDeleteTarget(u)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* ── 削除確認ダイアログ ── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>ユーザーを削除しますか？</DialogTitle>
        <DialogContent>
          <Typography>
            <strong>{deleteTarget?.name}</strong>（{ROLE_CONFIGS.find((r) => r.role === deleteTarget?.role)?.label}）
            を削除します。この操作は取り消せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>キャンセル</Button>
          <Button color="error" variant="contained" onClick={() => deleteTarget && handleDelete(deleteTarget)}>
            削除する
          </Button>
        </DialogActions>
      </Dialog>

      {/* スナックバー */}
      <Snackbar
        open={!!snackMsg}
        autoHideDuration={4000}
        onClose={() => setSnackMsg("")}
        message={snackMsg}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}
