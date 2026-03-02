import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  AppBar, Box, CssBaseline, Drawer, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Toolbar, Typography, Divider, Avatar, Chip,
  Collapse, Tooltip,
} from "@mui/material";
import MenuIcon              from "@mui/icons-material/Menu";
import DashboardIcon         from "@mui/icons-material/Dashboard";
import MenuBookIcon          from "@mui/icons-material/MenuBook";
import BarChartIcon          from "@mui/icons-material/BarChart";
import SelfImprovementIcon   from "@mui/icons-material/SelfImprovement";
import TimelineIcon          from "@mui/icons-material/Timeline";
import TrackChangesIcon      from "@mui/icons-material/TrackChanges";
import ChatIcon              from "@mui/icons-material/Chat";
import LogoutIcon            from "@mui/icons-material/Logout";
import AssessmentIcon        from "@mui/icons-material/Assessment";
import GroupsIcon            from "@mui/icons-material/Groups";
import CompareArrowsIcon     from "@mui/icons-material/CompareArrows";
import AccountTreeIcon       from "@mui/icons-material/AccountTree";
import ArticleIcon           from "@mui/icons-material/Article";
import PsychologyIcon        from "@mui/icons-material/Psychology";
import EqualizerIcon         from "@mui/icons-material/Equalizer";
import SchoolIcon            from "@mui/icons-material/School";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import ExpandLessIcon        from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon        from "@mui/icons-material/ExpandMore";
import VerifiedUserIcon      from "@mui/icons-material/VerifiedUser";
import ScienceIcon           from "@mui/icons-material/Science";
import AccountBalanceIcon    from "@mui/icons-material/AccountBalance";
import mockApi from "../api/client";
import type { UserRole } from "../types";

const DRAWER_WIDTH = 260;

type NavItem = {
  label: string;
  path:  string;
  icon:  React.ReactNode;
};

type NavGroup = {
  group: string;
  items: NavItem[];
};

// ────────────────────────────────────────────
// 役割ラベル・カラー
// ────────────────────────────────────────────
const ROLE_LABEL: Record<UserRole, string> = {
  student:        "実習生",
  univ_teacher:   "大学教員",
  school_mentor:  "校内指導教員",
  evaluator:      "評価者",
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
// 役割別ナビゲーション定義
// ────────────────────────────────────────────
function getNavGroups(role: UserRole): NavGroup[] {
  // 実習生（student）
  if (role === "student") {
    return [
      {
        group: "メイン",
        items: [
          { label: "ダッシュボード", path: "/dashboard", icon: <DashboardIcon /> },
          { label: "実習日誌",       path: "/journals",  icon: <MenuBookIcon /> },
          { label: "省察チャットBot", path: "/chat",     icon: <ChatIcon /> },
        ],
      },
      {
        group: "評価・フィードバック",
        items: [
          { label: "AI評価一覧",  path: "/evaluations",    icon: <AssessmentIcon /> },
          { label: "自己評価",    path: "/self-evaluation", icon: <SelfImprovementIcon /> },
        ],
      },
      {
        group: "成長・目標",
        items: [
          { label: "成長グラフ",        path: "/growth", icon: <TimelineIcon /> },
          { label: "LPSダッシュボード", path: "/lps",    icon: <BarChartIcon /> },
          { label: "目標履歴（SMART）", path: "/goals",  icon: <TrackChangesIcon /> },
        ],
      },
    ];
  }

  // 大学教員（univ_teacher）
  if (role === "univ_teacher") {
    return [
      {
        group: "メイン",
        items: [
          { label: "教員ダッシュボード", path: "/teacher-dashboard", icon: <DashboardIcon /> },
        ],
      },
      {
        group: "評価",
        items: [
          { label: "評価一覧",      path: "/evaluations",         icon: <AssessmentIcon /> },
          { label: "人間評価入力",  path: "/evaluations/human",   icon: <VerifiedUserIcon /> },
          { label: "AI vs 人間比較", path: "/comparison",         icon: <CompareArrowsIcon /> },
        ],
      },
      {
        group: "学生管理・統計",
        items: [
          { label: "コーホート管理", path: "/cohorts",           icon: <GroupsIcon /> },
          { label: "教員統計",       path: "/teacher-statistics", icon: <EqualizerIcon /> },
        ],
      },
    ];
  }

  // 校内指導教員（school_mentor）
  if (role === "school_mentor") {
    return [
      {
        group: "メイン",
        items: [
          { label: "教員ダッシュボード", path: "/teacher-dashboard", icon: <DashboardIcon /> },
        ],
      },
      {
        group: "評価",
        items: [
          { label: "評価一覧",     path: "/evaluations", icon: <AssessmentIcon /> },
          { label: "人間評価入力", path: "/evaluations/human", icon: <VerifiedUserIcon /> },
        ],
      },
      {
        group: "統計",
        items: [
          { label: "教員統計", path: "/teacher-statistics", icon: <EqualizerIcon /> },
        ],
      },
    ];
  }

  // 評価者（evaluator）：RQ2用人間評価入力専門
  if (role === "evaluator") {
    return [
      {
        group: "評価業務",
        items: [
          { label: "評価一覧",     path: "/evaluations",       icon: <AssessmentIcon /> },
          { label: "人間評価入力", path: "/evaluations/human", icon: <VerifiedUserIcon /> },
          { label: "AI vs 人間比較", path: "/comparison",      icon: <CompareArrowsIcon /> },
        ],
      },
      {
        group: "信頼性分析",
        items: [
          { label: "信頼性分析（ICC）", path: "/reliability", icon: <AssessmentIcon /> },
        ],
      },
    ];
  }

  // 研究者（researcher）：全分析機能
  if (role === "researcher") {
    return [
      {
        group: "メイン",
        items: [
          { label: "管理者ダッシュボード", path: "/admin", icon: <DashboardIcon /> },
        ],
      },
      {
        group: "評価・信頼性（RQ2）",
        items: [
          { label: "評価一覧",          path: "/evaluations", icon: <AssessmentIcon /> },
          { label: "AI vs 人間比較",    path: "/comparison",  icon: <CompareArrowsIcon /> },
          { label: "信頼性分析（ICC）", path: "/reliability", icon: <VerifiedUserIcon /> },
        ],
      },
      {
        group: "縦断・成長分析（RQ3）",
        items: [
          { label: "コーホート管理",  path: "/cohorts",           icon: <GroupsIcon /> },
          { label: "縦断分析（LGCM）",path: "/longitudinal",      icon: <TimelineIcon /> },
          { label: "高度統計分析",    path: "/advanced-analysis", icon: <AccountTreeIcon /> },
          { label: "統計ダッシュボード", path: "/statistics",     icon: <EqualizerIcon /> },
        ],
      },
      {
        group: "論文分析",
        items: [
          { label: "Paper2 分析",       path: "/paper2",    icon: <ArticleIcon /> },
          { label: "SCAT 質的分析",     path: "/scat",      icon: <PsychologyIcon /> },
        ],
      },
    ];
  }

  // 研究協力者（collaborator）：閲覧・基本統計のみ
  if (role === "collaborator") {
    return [
      {
        group: "データ閲覧",
        items: [
          { label: "統計ダッシュボード", path: "/statistics",      icon: <EqualizerIcon /> },
          { label: "コーホート一覧",     path: "/cohorts",         icon: <GroupsIcon /> },
          { label: "縦断データ",         path: "/longitudinal",    icon: <TimelineIcon /> },
        ],
      },
      {
        group: "評価参照",
        items: [
          { label: "評価一覧（閲覧）", path: "/evaluations", icon: <AssessmentIcon /> },
          { label: "AI vs 人間比較",   path: "/comparison",  icon: <CompareArrowsIcon /> },
        ],
      },
    ];
  }

  // 教育委員会（board_observer）：サマリー・学校別データ
  if (role === "board_observer") {
    return [
      {
        group: "統計サマリー",
        items: [
          { label: "統計ダッシュボード",   path: "/statistics",      icon: <EqualizerIcon /> },
          { label: "コーホート・学校別",   path: "/cohorts",         icon: <AccountBalanceIcon /> },
          { label: "成長分析（縦断）",     path: "/longitudinal",    icon: <TimelineIcon /> },
        ],
      },
      {
        group: "評価参照",
        items: [
          { label: "評価サマリー",    path: "/evaluations", icon: <AssessmentIcon /> },
          { label: "AI vs 人間比較",  path: "/comparison",  icon: <CompareArrowsIcon /> },
        ],
      },
    ];
  }

  // 管理者（admin）：全メニュー
  return [
    {
      group: "メイン",
      items: [
        { label: "管理ダッシュボード",  path: "/admin",             icon: <AdminPanelSettingsIcon /> },
        { label: "実習生ダッシュボード",path: "/dashboard",         icon: <DashboardIcon /> },
        { label: "教員ダッシュボード",  path: "/teacher-dashboard", icon: <SchoolIcon /> },
      ],
    },
    {
      group: "実習・日誌",
      items: [
        { label: "実習日誌",    path: "/journals",  icon: <MenuBookIcon /> },
        { label: "省察チャットBot", path: "/chat", icon: <ChatIcon /> },
        { label: "自己評価",    path: "/self-evaluation", icon: <SelfImprovementIcon /> },
        { label: "目標履歴",    path: "/goals",     icon: <TrackChangesIcon /> },
        { label: "LPS",         path: "/lps",       icon: <BarChartIcon /> },
      ],
    },
    {
      group: "評価（RQ2）",
      items: [
        { label: "評価一覧",          path: "/evaluations", icon: <AssessmentIcon /> },
        { label: "AI vs 人間比較",    path: "/comparison",  icon: <CompareArrowsIcon /> },
        { label: "信頼性分析（ICC）", path: "/reliability", icon: <VerifiedUserIcon /> },
      ],
    },
    {
      group: "統計・分析（RQ3）",
      items: [
        { label: "コーホート管理",     path: "/cohorts",           icon: <GroupsIcon /> },
        { label: "縦断分析（LGCM）",   path: "/longitudinal",      icon: <TimelineIcon /> },
        { label: "高度統計分析",       path: "/advanced-analysis", icon: <AccountTreeIcon /> },
        { label: "統計ダッシュボード", path: "/statistics",        icon: <EqualizerIcon /> },
        { label: "教員統計",           path: "/teacher-statistics",icon: <SchoolIcon /> },
      ],
    },
    {
      group: "論文分析",
      items: [
        { label: "Paper2 分析",   path: "/paper2", icon: <ArticleIcon /> },
        { label: "SCAT 質的分析", path: "/scat",   icon: <PsychologyIcon /> },
      ],
    },
    {
      group: "システム管理",
      items: [
        { label: "成長グラフ", path: "/growth", icon: <TimelineIcon /> },
      ],
    },
    {
      group: "研究者向け",
      items: [
        { label: "科研 Paper2", path: "/paper2", icon: <ScienceIcon /> },
      ],
    },
  ];
}

// ────────────────────────────────────────────
// コンポーネント本体
// ────────────────────────────────────────────
export default function AppLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const user = mockApi.getCurrentUser() as { id: string; name: string; role: UserRole } | null;
  const role: UserRole = user?.role ?? "student";

  const navGroups = getNavGroups(role);
  const allItems: NavItem[] = navGroups.flatMap((g) => g.items);

  const handleLogout = async () => {
    await mockApi.logout();
    navigate("/login");
  };

  const toggleGroup = (group: string) => {
    setCollapsed((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* ロゴ */}
      <Toolbar sx={{ bgcolor: "primary.main", minHeight: "48px !important", px: 2 }}>
        <SchoolIcon sx={{ color: "white", mr: 1, fontSize: 20 }} />
        <Typography variant="subtitle2" color="white" fontWeight="bold" lineHeight={1.3} fontSize={11}>
          教育実習評価システム
        </Typography>
      </Toolbar>
      <Divider />

      {/* ユーザー情報 */}
      {user && (
        <Box sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
          <Avatar
            sx={{
              width: 34, height: 34,
              bgcolor: ROLE_COLOR[role] ?? "primary.main",
              fontSize: 14, fontWeight: "bold",
            }}
          >
            {user.name?.[0] ?? "U"}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight="bold" noWrap fontSize={12}>{user.name}</Typography>
            <Chip
              label={ROLE_LABEL[role] ?? role}
              size="small"
              sx={{ fontSize: 9, height: 16, bgcolor: ROLE_COLOR[role], color: "white", mt: 0.2 }}
            />
          </Box>
        </Box>
      )}
      <Divider />

      {/* ナビゲーション */}
      <Box sx={{ flexGrow: 1, overflow: "auto" }}>
        {navGroups.map(({ group, items }) => (
          <React.Fragment key={group}>
            <ListItemButton
              dense
              onClick={() => toggleGroup(group)}
              sx={{ py: 0.5, bgcolor: "#f5f5f5" }}
            >
              <ListItemText
                primary={group}
                primaryTypographyProps={{
                  fontSize: 10, fontWeight: 700, color: "text.secondary", textTransform: "uppercase",
                }}
              />
              {collapsed[group] ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
            </ListItemButton>
            <Collapse in={!collapsed[group]}>
              <List dense disablePadding>
                {items.map((item) => {
                  const selected =
                    location.pathname === item.path ||
                    (item.path !== "/dashboard" && location.pathname.startsWith(item.path + "/"));
                  return (
                    <Tooltip key={item.path} title={item.label} placement="right" disableHoverListener>
                      <ListItemButton
                        selected={selected}
                        onClick={() => { navigate(item.path); setMobileOpen(false); }}
                        sx={{
                          pl: 2,
                          "&.Mui-selected": {
                            bgcolor: ROLE_COLOR[role] ?? "primary.main",
                            color: "white",
                            "& .MuiListItemIcon-root": { color: "white" },
                          },
                          "&.Mui-selected:hover": { bgcolor: ROLE_COLOR[role] ?? "primary.dark" },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 32, fontSize: 18 }}>{item.icon}</ListItemIcon>
                        <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 12 }} />
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

      {/* ロールバッジ & ログアウト */}
      <Box sx={{ p: 1, bgcolor: "grey.50" }}>
        <Typography variant="caption" color="text.secondary" sx={{ px: 1, display: "block", mb: 0.5 }}>
          ログイン中: {ROLE_LABEL[role] ?? role}
        </Typography>
      </Box>
      <List dense>
        <ListItemButton onClick={handleLogout}>
          <ListItemIcon sx={{ minWidth: 36 }}><LogoutIcon /></ListItemIcon>
          <ListItemText primary="ログアウト" primaryTypographyProps={{ fontSize: 13 }} />
        </ListItemButton>
      </List>
    </Box>
  );

  const currentLabel =
    allItems.find((n) =>
      location.pathname === n.path || location.pathname.startsWith(n.path + "/")
    )?.label ?? "教育実習評価システム";

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
          bgcolor: ROLE_COLOR[role] ?? "primary.main",
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
          flexGrow: 1, p: 2.5,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: "48px",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
