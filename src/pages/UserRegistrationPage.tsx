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
    role: "student",
    label: "実習生",
    color: "#1976d2",
    icon: <PersonAddIcon />,
    description: "実習日誌の作成・自己評価の入力などを行う学生アカウント",
    fields: ["student_number", "grade", "school_type"],
  },
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
  roles: UserRole[];
  extra: Record<string, string>;
  created_at: string;
}

// ── ローカルストレージで登録ユーザーを管理（本番ではAPIに差し替え） ──
const STORAGE_KEY = "registered_users";

// デモ用初期ユーザー
const DEMO_INITIAL_USERS: RegisteredUser[] = [
  { id: "user-001", email: "student@teaching-eval.jp",      name: "山田 太郎",   roles: ["student"],        extra: { student_number: "2023A001", grade: "3年" }, created_at: "2026-04-01T09:00:00Z" },
  { id: "user-002", email: "teacher@teaching-eval.jp",      name: "佐藤 花子",   roles: ["univ_teacher"],   extra: { department: "教育学部", position: "准教授" }, created_at: "2026-03-01T09:00:00Z" },
  { id: "user-003", email: "mentor@teaching-eval.jp",       name: "鈴木 一郎",   roles: ["school_mentor"],  extra: { school_name: "○○市立東小学校", school_type: "elementary", position: "担任教諭" }, created_at: "2026-03-01T09:00:00Z" },
  { id: "user-004", email: "admin@teaching-eval.jp",        name: "田中 管理者", roles: ["admin"],          extra: {}, created_at: "2026-01-01T09:00:00Z" },
  { id: "user-005", email: "researcher@teaching-eval.jp",   name: "伊藤 研究者", roles: ["researcher"],     extra: { institution: "△△大学", research_field: "教育評価学" }, created_at: "2026-03-01T09:00:00Z" },
  { id: "user-006", email: "collaborator@teaching-eval.jp", name: "渡辺 協力者", roles: ["collaborator"],   extra: { organization: "□□教育センター" }, created_at: "2026-03-01T09:00:00Z" },
  { id: "user-007", email: "board@teaching-eval.jp",        name: "中村 委員",   roles: ["board_observer"], extra: { board_name: "〇〇市教育委員会" }, created_at: "2026-03-01T09:00:00Z" },
  { id: "user-008", email: "evaluator@teaching-eval.jp",    name: "小林 評価者", roles: ["evaluator"],      extra: { affiliation: "教員養成評価機構" }, created_at: "2026-03-01T09:00:00Z" },
];

function loadUsers(): RegisteredUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RegisteredUser[];
      if (parsed.length > 0) return parsed;
    }
  } catch {}
  // 初回はデモデータを返してlocalStorageに保存
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_INITIAL_USERS));
  return [...DEMO_INITIAL_USERS];
}
function saveUsers(users: RegisteredUser[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

export default function UserRegistrationPage() {
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(["univ_teacher"]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [users, setUsers]   = useState<RegisteredUser[]>(loadUsers);
  const [snackMsg, setSnackMsg] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<RegisteredUser | null>(null);
  const [editTarget, setEditTarget]     = useState<RegisteredUser | null>(null);

  const roleConfigs = selectedRoles.map(sr => ROLE_CONFIGS.find((r) => r.role === sr)).filter(Boolean) as typeof ROLE_CONFIGS;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name?.trim())  errs.name  = "氏名は必須です";
    if (!form.email?.trim()) errs.email = "メールアドレスは必須です";
    if (form.email) {
      const emails = form.email.split(',').map(e => e.trim()).filter(Boolean);
      if (emails.length === 0) {
        errs.email = "有効なメールアドレスを入力してください";
      } else {
        const invalidEmails = emails.filter(e => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
        if (invalidEmails.length > 0) {
          errs.email = `無効な形式が含まれています: ${invalidEmails.join(', ')}`;
        } else {
          const existingEmails = users
            .filter(u => u.id !== editTarget?.id)
            .flatMap(u => u.email.split(',').map(e => e.trim()));
          const duplicate = emails.find(e => existingEmails.includes(e));
          if (duplicate) {
            errs.email = `すでに登録済みのメールアドレスがあります: ${duplicate}`;
          }
        }
      }
    }
    roleConfigs.flatMap(rc => rc.fields).forEach((f) => {
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
          ? { ...u, name: form.name, email: form.email, roles: selectedRoles, extra: { ...form } }
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
        roles:      selectedRoles,
        extra:      { ...form },
        created_at: new Date().toISOString(),
      };
      const updated = [...users, newUser];
      saveUsers(updated);
      setUsers(updated);
      setSnackMsg(`${form.name}（${roleConfigs.map(rc => rc.label).join('、')}）を登録しました`);
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
    setSelectedRoles(user.roles || []);
    setForm({ ...user.extra, name: user.name, email: user.email });
    setEditTarget(user);
  };

  const handleCopyPassword = (email: string) => {
    const primaryEmail = email.split(",")[0].trim();
    const tmpPw = "Edu2024#" + primaryEmail.split("@")[0].slice(0, 4).toUpperCase();
    void navigator.clipboard.writeText(tmpPw);
    setSnackMsg(`仮パスワードをコピーしました: ${tmpPw}`);
  };

  const fieldLabel = (field: string): string => ({
    student_number:"学籍番号",
    grade:         "学年",
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
                multiple
                value={selectedRoles}
                label="役割"
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedRoles(typeof val === 'string' ? val.split(',') as UserRole[] : val as UserRole[]);
                  setErrors({});
                }}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as UserRole[]).map((value) => {
                      const cfg = ROLE_CONFIGS.find(r => r.role === value);
                      return cfg ? <Chip key={value} label={cfg.label} size="small" sx={{ bgcolor: cfg.color, color: "#fff", fontSize: 10, height: 20 }} /> : null;
                    })}
                  </Box>
                )}
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
              {roleConfigs.map(rc => rc.description).join(' / ')}
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
              label="メールアドレス（複数ある場合はカンマ区切り）"
              type="text"
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={!!errors.email}
              helperText={errors.email ?? "ログインIDになります。カンマ(,)で複数入力可能"}
              fullWidth size="small" sx={{ mb: 1.5 }} required
            />

            <Divider sx={{ my: 1.5 }}>
              <Typography variant="caption" color="text.secondary">役割別情報</Typography>
            </Divider>

            {/* 役割別追加フィールド */}
            {Array.from(new Set(roleConfigs.flatMap(rc => rc.fields))).map((field) => (
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
                sx={{ bgcolor: roleConfigs[0]?.color || 'primary.main' }}
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
                const cnt = users.filter((u) => u.roles && u.roles.includes(r.role)).length;
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
                      const cfgs = (u.roles || []).map(role => ROLE_CONFIGS.find((r) => r.role === role)).filter(Boolean);
                      return (
                        <TableRow key={u.id} hover>
                          <TableCell>{u.name}</TableCell>
                          <TableCell>
                            {cfgs.filter(Boolean).map(c => (
                              <Chip
                                key={c?.role}
                                label={c?.label ?? "不明"}
                                size="small"
                                sx={{ bgcolor: c?.color ?? "grey.400", color: "white", fontSize: 10, height: 18, mr: 0.5, mb: 0.5 }}
                              />
                            ))}
                          </TableCell>
                          <TableCell sx={{ fontSize: 11, color: "text.secondary" }}>
                            {u.email.split(",").map(e => <div key={e}>{e.trim()}</div>)}
                          </TableCell>
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
            <strong>{deleteTarget?.name}</strong>（{(deleteTarget?.roles || []).map(role => ROLE_CONFIGS.find((r) => r.role === role)?.label).join('、')}）
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
