import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  AppBar, Box, CssBaseline, Drawer, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Toolbar, Typography, Divider, Avatar, Chip,
  Collapse,
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
import mockApi from "../api/client";

const DRAWER_WIDTH = 250;

type NavItem = {
  label: string;
  path:  string;
  icon:  React.ReactNode;
  children?: NavItem[];
};

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: "メイン",
    items: [
      { label: "ダッシュボード",      path: "/dashboard",        icon: <DashboardIcon /> },
      { label: "実習日誌",            path: "/journals",         icon: <MenuBookIcon /> },
      { label: "チャットBot",         path: "/chat",             icon: <ChatIcon /> },
    ],
  },
  {
    group: "評価",
    items: [
      { label: "評価一覧",            path: "/evaluations",      icon: <AssessmentIcon /> },
      { label: "AI vs 人間比較",      path: "/comparison",       icon: <CompareArrowsIcon /> },
    ],
  },
  {
    group: "個人分析",
    items: [
      { label: "成長グラフ",          path: "/growth",           icon: <TimelineIcon /> },
      { label: "自己評価",            path: "/self-evaluation",  icon: <SelfImprovementIcon /> },
      { label: "LPSダッシュボード",   path: "/lps",              icon: <BarChartIcon /> },
      { label: "目標履歴",            path: "/goals",            icon: <TrackChangesIcon /> },
    ],
  },
  {
    group: "研究・統計",
    items: [
      { label: "縦断分析",            path: "/longitudinal",     icon: <TimelineIcon /> },
      { label: "高度統計分析",        path: "/advanced-analysis",icon: <AccountTreeIcon /> },
      { label: "統計ダッシュボード",  path: "/statistics",       icon: <EqualizerIcon /> },
      { label: "コーホート管理",      path: "/cohorts",          icon: <GroupsIcon /> },
      { label: "Paper2分析",          path: "/paper2",           icon: <ArticleIcon /> },
      { label: "SCAT質的分析",        path: "/scat",             icon: <PsychologyIcon /> },
      { label: "信頼性分析(ICC)",     path: "/reliability",      icon: <AssessmentIcon /> },
    ],
  },
  {
    group: "管理",
    items: [
      { label: "教員ダッシュボード",  path: "/teacher-dashboard",icon: <SchoolIcon /> },
      { label: "教員統計",            path: "/teacher-statistics",icon: <SchoolIcon /> },
      { label: "管理者",              path: "/admin",            icon: <AdminPanelSettingsIcon /> },
    ],
  },
];

// 全アイテムフラット（AppBarタイトル用）
const ALL_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export default function AppLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const user = mockApi.getCurrentUser();

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
      <Toolbar sx={{ bgcolor: "primary.main", minHeight: "48px !important" }}>
        <Typography variant="subtitle2" color="white" fontWeight="bold" lineHeight={1.3}>
          教育実習評価システム
        </Typography>
      </Toolbar>
      <Divider />
      {/* ユーザー情報 */}
      {user && (
        <Box sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
          <Avatar sx={{ width: 30, height: 30, bgcolor: "primary.main", fontSize: 12 }}>
            {user.name?.[0] ?? "U"}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight="bold" noWrap fontSize={12}>{user.name}</Typography>
            <Chip label={user.role} size="small" sx={{ fontSize: 9, height: 14 }} />
          </Box>
        </Box>
      )}
      <Divider />
      {/* ナビゲーション */}
      <Box sx={{ flexGrow: 1, overflow: "auto" }}>
        {NAV_GROUPS.map(({ group, items }) => (
          <React.Fragment key={group}>
            <ListItemButton dense onClick={() => toggleGroup(group)}
              sx={{ py: 0.5, bgcolor: "#f5f5f5" }}>
              <ListItemText
                primary={group}
                primaryTypographyProps={{ fontSize: 11, fontWeight: 700, color: "text.secondary", textTransform: "uppercase" }}
              />
              {collapsed[group] ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
            </ListItemButton>
            <Collapse in={!collapsed[group]}>
              <List dense disablePadding>
                {items.map((item) => (
                  <ListItemButton
                    key={item.path}
                    selected={location.pathname === item.path || location.pathname.startsWith(item.path + "/")}
                    onClick={() => { navigate(item.path); setMobileOpen(false); }}
                    sx={{
                      pl: 2,
                      "&.Mui-selected": { bgcolor: "primary.main", color: "white",
                        "& .MuiListItemIcon-root": { color: "white" } },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, fontSize: 18 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 12 }} />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
          </React.Fragment>
        ))}
      </Box>
      <Divider />
      <List dense>
        <ListItemButton onClick={handleLogout}>
          <ListItemIcon sx={{ minWidth: 36 }}><LogoutIcon /></ListItemIcon>
          <ListItemText primary="ログアウト" primaryTypographyProps={{ fontSize: 13 }} />
        </ListItemButton>
      </List>
    </Box>
  );

  const currentLabel = ALL_ITEMS.find((n) =>
    location.pathname === n.path || location.pathname.startsWith(n.path + "/")
  )?.label ?? "教育実習評価システム";

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{ width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, ml: { sm: `${DRAWER_WIDTH}px` } }}
      >
        <Toolbar variant="dense">
          <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)}
            sx={{ mr: 2, display: { sm: "none" } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="subtitle1" fontWeight="bold" noWrap>
            {currentLabel}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: "block", sm: "none" }, "& .MuiDrawer-paper": { width: DRAWER_WIDTH } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: "none", sm: "block" }, "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" } }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: 2.5, width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, mt: "48px" }}>
        <Outlet />
      </Box>
    </Box>
  );
}
