import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  AppBar, Box, CssBaseline, Drawer, Container, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Toolbar, Typography, Divider, Avatar, Chip,
  Collapse, Tooltip,
} from "@mui/material";
import MenuIcon               from "@mui/icons-material/Menu";
import DashboardIcon          from "@mui/icons-material/Dashboard";
import MenuBookIcon           from "@mui/icons-material/MenuBook";
import SelfImprovementIcon    from "@mui/icons-material/SelfImprovement";
import TimelineIcon           from "@mui/icons-material/Timeline";
import TrackChangesIcon       from "@mui/icons-material/TrackChanges";
import ChatIcon               from "@mui/icons-material/Chat";
import LogoutIcon             from "@mui/icons-material/Logout";
import AssessmentIcon         from "@mui/icons-material/Assessment";
import GroupsIcon             from "@mui/icons-material/Groups";
import CompareArrowsIcon      from "@mui/icons-material/CompareArrows";
import PsychologyIcon         from "@mui/icons-material/Psychology";
import EqualizerIcon          from "@mui/icons-material/Equalizer";
import SchoolIcon             from "@mui/icons-material/School";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import ExpandLessIcon         from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon         from "@mui/icons-material/ExpandMore";
import VerifiedUserIcon       from "@mui/icons-material/VerifiedUser";
import PersonAddIcon          from "@mui/icons-material/PersonAdd";
import DownloadIcon           from "@mui/icons-material/Download";
import AccountBalanceIcon     from "@mui/icons-material/AccountBalance";
import ScienceIcon            from "@mui/icons-material/Science";
import mockApi from "../api/client";
import type { UserRole } from "../types";

const DRAWER_WIDTH = 260;

type NavItem  = { label: string; path: string; icon: React.ReactNode };
type NavGroup = { group: string; items: NavItem[] };

// ────────────────────────────────────────────
const ROLE_LABEL: Record<UserRole, string> = {
  student:        "実習生",
  univ_teacher:   "大学教員",
  school_mentor:  "校内指導教員",
  evaluator:      "評価者（RQ2）",
  researcher:     "研究者",
  collaborator:   "研究協力者",
  board_observer: "教育委員会",
  admin:          "管理者",
};

const ROLE_COLOR: Record<UserRole, string> = {
  student:        "#1976d2",
  univ_teacher:   "#388e3c",
  school_mentor:  "#f57c00",
  evaluator:      "#e64a19",
  researcher:     "#0288d1",
  collaborator:   "#00897b",
  board_observer: "#5e35b1",
  admin:          "#7b1fa2",
};

// ────────────────────────────────────────────
// 役割別ナビゲーション（論文2 RQ2 ＆ 論文3 RQ3）
// ────────────────────────────────────────────
function getNavGroups(role: UserRole): NavGroup[] {

  // ── 実習生（student）: 統合ワークフロー ──
  if (role === "student") {
    return [
      {
        group: "週次サイクル（RQ3）",
        items: [
          { label: "ダッシュボード",              path: "/dashboard",        icon: <DashboardIcon /> },
          { label: "実習日誌ワークフロー",        path: "/journal-workflow", icon: <MenuBookIcon /> },
          { label: "手書き日誌OCR読み込み",       path: "/ocr",              icon: <AssessmentIcon /> },
          { label: "過去の日誌一覧",              path: "/journals",         icon: <AssessmentIcon /> },
          { label: "チャット履歴",                path: "/chat",             icon: <ChatIcon /> },
        ],
      },
      {
        group: "自己評価・成長（RQ3）",
        items: [
          { label: "自己評価入力",               path: "/self-evaluation",  icon: <SelfImprovementIcon /> },
          { label: "成長グラフ",                  path: "/growth",           icon: <TimelineIcon /> },
          { label: "目標履歴（SMART）",           path: "/goals",            icon: <TrackChangesIcon /> },
        ],
      },
    ];
  }

    // ── 大学教員（univ_teacher）: RQ3 学生コメント ──
  if (role === "univ_teacher") {
    return [
      {
        group: "ダッシュボード",
        items: [
          { label: "教員ダッシュボード", path: "/teacher-dashboard", icon: <DashboardIcon /> },
        ],
      },
      {
        group: "実習生指導（分散実習）",
        items: [
          { label: "日誌一覧・コメント", path: "/journals", icon: <MenuBookIcon /> },
        ],
      },
      {
        group: "学生管理（RQ3）",
        items: [
          { label: "コーホート管理",     path: "/cohorts",      icon: <GroupsIcon /> },
          { label: "統計ダッシュボード", path: "/statistics",   icon: <EqualizerIcon /> },
          { label: "高度分析 (NLP/SEM)", path: "/advanced",    icon: <ScienceIcon /> },
        ],
      },
    ];
  }

    // ── 校内指導教員（school_mentor）: 4年生日誌コメント入力 ──
  if (role === "school_mentor") {
    return [
      {
        group: "ダッシュボード",
        items: [
          { label: "教員ダッシュボード", path: "/teacher-dashboard", icon: <DashboardIcon /> },
        ],
      },
      {
        group: "実習生指導（集中実習）",
        items: [
          { label: "日誌一覧・コメント", path: "/journals",  icon: <MenuBookIcon /> },
        ],
      },
    ];
  }

  // ── 評価者（evaluator）: RQ2 人間評価専担 ──
  if (role === "evaluator") {
    return [
      {
        group: "評価業務（RQ2）",
        items: [
          { label: "評価一覧",           path: "/evaluations",       icon: <AssessmentIcon /> },
          { label: "人間評価入力",       path: "/evaluations/journal-001/human", icon: <VerifiedUserIcon /> },
          { label: "AI vs 人間比較",     path: "/comparison",        icon: <CompareArrowsIcon /> },
          { label: "信頼性分析（ICC）",  path: "/reliability",       icon: <EqualizerIcon /> },
        ],
      },
    ];
  }

  // ── 研究者（researcher）: 全分析機能 ──
  if (role === "researcher" || role === ("collaborator" as any)) {
    return [
      {
        group: "研究ダッシュボード",
        items: [
          { label: "管理者ダッシュボード", path: "/admin", icon: <DashboardIcon /> },
        ],
      },
      {
        group: "AI評価信頼性（RQ2）",
        items: [
          { label: "評価一覧",           path: "/evaluations",  icon: <AssessmentIcon /> },
          { label: "人間評価入力",       path: "/evaluations/journal-001/human", icon: <VerifiedUserIcon /> },
          { label: "AI vs 人間比較",     path: "/comparison",   icon: <CompareArrowsIcon /> },
          { label: "信頼性分析（ICC）",  path: "/reliability",  icon: <EqualizerIcon /> },
        ],
      },
      {
        group: "縦断成長分析（RQ3）",
        items: [
          { label: "コーホート管理",     path: "/cohorts",      icon: <GroupsIcon /> },
          { label: "縦断分析（LGCM）",   path: "/longitudinal", icon: <TimelineIcon /> },
          { label: "SCAT 質的分析",      path: "/scat",         icon: <PsychologyIcon /> },
          { label: "統計ダッシュボード", path: "/statistics",   icon: <EqualizerIcon /> },
        ],
      },
      {
        group: "国際比較（RQ1）",
        items: [
          { label: "国際比較（4カ国）",  path: "/international", icon: <SchoolIcon /> },
        ],
      },
      {
        group: "データエクスポート",
        items: [
          { label: "データ出力（CSV/R/Mplus）", path: "/statistics", icon: <DownloadIcon /> },
        ],
      },
    ];
  }

  // ── 研究協力者（collaborator）: 閲覧・集計のみ ──
  if (role === ("collaborator" as any)) {
    return [
      {
        group: "データ閲覧",
        items: [
          { label: "統計ダッシュボード", path: "/statistics",   icon: <EqualizerIcon /> },
          { label: "コーホート一覧",     path: "/cohorts",      icon: <GroupsIcon /> },
          { label: "縦断データ",         path: "/longitudinal", icon: <TimelineIcon /> },
        ],
      },
      {
        group: "評価参照",
        items: [
          { label: "評価一覧（閲覧）",   path: "/evaluations",  icon: <AssessmentIcon /> },
          { label: "人間評価入力",       path: "/evaluations/journal-001/human", icon: <VerifiedUserIcon /> },
          { label: "AI vs 人間比較",     path: "/comparison",   icon: <CompareArrowsIcon /> },
        ],
      },
    ];
  }

  // ── 教育委員会（board_observer）: サマリー・学校別 ──
  if (role === "board_observer") {
    return [
      {
        group: "統計サマリー",
        items: [
          { label: "統計ダッシュボード", path: "/statistics",   icon: <EqualizerIcon /> },
          { label: "コーホート・学校別", path: "/cohorts",      icon: <AccountBalanceIcon /> },
          { label: "成長分析（縦断）",   path: "/longitudinal", icon: <TimelineIcon /> },
        ],
      },
      {
        group: "評価参照",
        items: [
          { label: "評価サマリー",       path: "/evaluations",  icon: <AssessmentIcon /> },
          { label: "AI vs 人間比較",     path: "/comparison",   icon: <CompareArrowsIcon /> },
        ],
      },
    ];
  }

  // ── 管理者（admin）: 全メニュー ──
  return [
    {
      group: "管理",
      items: [
        { label: "管理ダッシュボード",   path: "/admin",             icon: <AdminPanelSettingsIcon /> },
        { label: "ユーザー登録",         path: "/register-user",     icon: <PersonAddIcon /> },
      ],
    },
    {
      group: "実習生機能（RQ3）",
      items: [
        { label: "実習ダッシュボード",   path: "/dashboard",         icon: <DashboardIcon /> },
        { label: "実習日誌",             path: "/journals",           icon: <MenuBookIcon /> },
        { label: "省察チャットBot",      path: "/chat",              icon: <ChatIcon /> },
        { label: "自己評価",             path: "/self-evaluation",   icon: <SelfImprovementIcon /> },
        { label: "成長グラフ",           path: "/growth",            icon: <TimelineIcon /> },
        { label: "目標履歴",             path: "/goals",             icon: <TrackChangesIcon /> },
      ],
    },
    {
      group: "評価（RQ2）",
      items: [
        { label: "教員ダッシュボード",   path: "/teacher-dashboard", icon: <SchoolIcon /> },
        { label: "評価一覧",             path: "/evaluations",       icon: <AssessmentIcon /> },
        { label: "人間評価入力",       path: "/evaluations/journal-001/human", icon: <VerifiedUserIcon /> },
        { label: "AI vs 人間比較",       path: "/comparison",        icon: <CompareArrowsIcon /> },
        { label: "信頼性分析（ICC）",    path: "/reliability",       icon: <VerifiedUserIcon /> },
      ],
    },
    {
      group: "分析（RQ3）",
      items: [
        { label: "コーホート管理",       path: "/cohorts",           icon: <GroupsIcon /> },
        { label: "縦断分析（LGCM）",     path: "/longitudinal",      icon: <TimelineIcon /> },
        { label: "SCAT 質的分析",        path: "/scat",              icon: <PsychologyIcon /> },
        { label: "統計ダッシュボード",   path: "/statistics",        icon: <EqualizerIcon /> },
        { label: "高度分析ダッシュボード", path: "/advanced",          icon: <ScienceIcon /> },
      ],
    },
    {
      group: "データ出力",
      items: [
        { label: "データエクスポート",   path: "/statistics",        icon: <DownloadIcon /> },
      ],
    },
  ];
}

// ────────────────────────────────────────────
// コンポーネント本体
// ────────────────────────────────────────────
export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed]   = useState<Record<string, boolean>>({});

  const user = mockApi.getCurrentUser() as { id: string; name: string; role: UserRole } | null;
  const role: UserRole = user?.role ?? "student";
  const navGroups = getNavGroups(role);
  const allItems  = navGroups.flatMap((g) => g.items);

  const handleLogout = async () => {
    await mockApi.logout();
    navigate("/login");
  };

  const toggleGroup = (group: string) =>
    setCollapsed((prev) => ({ ...prev, [group]: !prev[group] }));

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "white" }}>
      {/* ロゴ */}
      <Box sx={{ bgcolor: ROLE_COLOR[role] ?? "primary.main", px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
        <SchoolIcon sx={{ color: "white", fontSize: 22 }} />
        <Box>
          <Typography variant="caption" color="rgba(255,255,255,0.8)" fontSize={9} display="block" lineHeight={1}>
            AI支援
          </Typography>
          <Typography variant="subtitle2" color="white" fontWeight="bold" fontSize={11} lineHeight={1.2}>
            教育実習評価システム
          </Typography>
        </Box>
      </Box>
      <Divider />

      {/* ユーザー情報 */}
      {user && (
        <Box sx={{ p: 1.5, display: "flex", alignItems: "flex-start", gap: 1.5, bgcolor: "grey.50" }}>
          <Avatar
            sx={{
              width: 40, height: 40,
              bgcolor: ROLE_COLOR[role] ?? "primary.main",
              fontSize: 16, fontWeight: "bold",
              flexShrink: 0,
            }}
          >
            {user.name?.[0] ?? "U"}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" fontWeight="bold" noWrap fontSize={13}>{user.name}</Typography>
            <Chip
              label={ROLE_LABEL[role] ?? role}
              size="small"
              sx={{
                fontSize: 9, height: 16,
                bgcolor: ROLE_COLOR[role] ?? "primary.main",
                color: "white", mt: 0.3, mb: 0.3,
              }}
            />
            {/* 実習生：学籍番号・学年・実習情報 */}
            {role === "student" && (
              <Box>
                {(user as { student_number?: string }).student_number && (
                  <Typography variant="caption" display="block" color="text.secondary" fontSize={10} noWrap>
                    学籍: {(user as { student_number?: string }).student_number}
                  </Typography>
                )}
                {(user as { grade?: number }).grade && (
                  <Typography variant="caption" display="block" color="text.secondary" fontSize={10} noWrap>
                    {(user as { grade?: number }).grade}年生
                    {(user as { school_type?: string }).school_type &&
                      ` / ${
                        ({ elementary: "小学校", middle: "中学校", high: "高等学校", special: "特別支援" } as Record<string, string>)[
                          (user as { school_type?: string }).school_type ?? ""
                        ] ?? ""
                      }`
                    }
                  </Typography>
                )}
                {(user as { internship_type?: string }).internship_type && (
                  <Typography variant="caption" display="block" color="text.secondary" fontSize={10} noWrap>
                    {(user as { internship_type?: string }).internship_type === "intensive" ? "集中実習" : "分散実習"}
                    {(user as { weeks?: number }).weeks ? ` ${(user as { weeks?: number }).weeks}週間` : ""}
                  </Typography>
                )}
              </Box>
            )}
            {/* 実習生以外：所属・役職 */}
            {role !== "student" && (
              <Box>
                {(user as { organization?: string }).organization && (
                  <Typography variant="caption" display="block" color="text.secondary" fontSize={10} sx={{ lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {(user as { organization?: string }).organization}
                  </Typography>
                )}
                {(user as { position?: string }).position && (
                  <Typography variant="caption" display="block" color="text.secondary" fontSize={10} noWrap>
                    {(user as { position?: string }).position}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>
      )}
      <Divider />

      {/* ナビゲーション */}
      <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
        {navGroups.map(({ group, items }) => (
          <React.Fragment key={group}>
            <ListItemButton
              dense
              onClick={() => toggleGroup(group)}
              sx={{ py: 0.5, px: 1.5, bgcolor: "#f8f8f8" }}
            >
              <ListItemText
                primary={group}
                primaryTypographyProps={{
                  fontSize: 9, fontWeight: 700,
                  color: "text.secondary",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              />
              {collapsed[group] ? <ExpandMoreIcon sx={{ fontSize: 14, color: "text.disabled" }} /> : <ExpandLessIcon sx={{ fontSize: 14, color: "text.disabled" }} />}
            </ListItemButton>
            <Collapse in={!collapsed[group]}>
              <List dense disablePadding>
                {items.map((item) => {
                  const isActive =
                    location.pathname === item.path ||
                    (item.path !== "/dashboard" && location.pathname.startsWith(item.path + "/"));
                  return (
                    <Tooltip key={`${item.path}-${item.label}`} title={item.label} placement="right" disableHoverListener>
                      <ListItemButton
                        selected={isActive}
                        onClick={() => { navigate(item.path); setMobileOpen(false); }}
                        sx={{
                          pl: 2, py: 0.6,
                          "&.Mui-selected": {
                            bgcolor: `${ROLE_COLOR[role] ?? "#1976d2"}18`,
                            borderRight: `3px solid ${ROLE_COLOR[role] ?? "#1976d2"}`,
                            "& .MuiListItemIcon-root": { color: ROLE_COLOR[role] ?? "#1976d2" },
                            "& .MuiListItemText-primary": { color: ROLE_COLOR[role] ?? "#1976d2", fontWeight: 700 },
                          },
                          "&.Mui-selected:hover": {
                            bgcolor: `${ROLE_COLOR[role] ?? "#1976d2"}28`,
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 30, "& .MuiSvgIcon-root": { fontSize: 18 } }}>
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{ fontSize: 12 }}
                        />
                      </ListItemButton>
                    </Tooltip>
                  );
                })}
              </List>
            </Collapse>
          </React.Fragment>
        ))}
      </Box>

      <Divider />
      {/* ログアウト */}
      <List dense>
        <ListItemButton onClick={handleLogout} sx={{ color: "text.secondary" }}>
          <ListItemIcon sx={{ minWidth: 30 }}><LogoutIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="ログアウト" primaryTypographyProps={{ fontSize: 12 }} />
        </ListItemButton>
      </List>
    </Box>
  );

  const currentLabel =
    allItems.find(
      (n) => location.pathname === n.path || location.pathname.startsWith(n.path + "/")
    )?.label ?? "AI支援 教育実習評価システム";

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml:    { sm: `${DRAWER_WIDTH}px` },
          bgcolor: ROLE_COLOR[role] ?? "primary.main",
          boxShadow: 1,
        }}
      >
        <Toolbar variant="dense">
          <IconButton
            color="inherit" edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="subtitle1" fontWeight="bold" noWrap sx={{ flexGrow: 1 }}>
            {currentLabel}
          </Typography>
          <Chip
            label={ROLE_LABEL[role] ?? role}
            size="small"
            sx={{ bgcolor: "rgba(255,255,255,0.25)", color: "white", fontSize: 10, height: 20 }}
          />
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": { width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1, p: { xs: 1.5, sm: 2.5 },
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: "48px",
          bgcolor: "#f5f7fa",
          minHeight: "calc(100vh - 48px)",
        }}
      >
        <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}
